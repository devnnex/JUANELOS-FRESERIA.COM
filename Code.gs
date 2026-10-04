/**
 * JUANELOS · Backend de comandas para Google Apps Script
 *
 * Uso: pegar este archivo en un proyecto de Apps Script y desplegarlo como
 * aplicación web (ejecutar como propietario y acceso para cualquiera).
 * La primera visita al URL crea automáticamente las hojas y columnas dentro
 * del archivo de Google Sheets indicado en SPREADSHEET_ID.
 */

const SPREADSHEET_ID = '1sSL9ddfS4Jcp7vgmAxMXx3-B4EJTiPmRRXg-ReQz-Vo';
const IMAGE_FOLDER_PROPERTY = 'JUANELOS_IMAGES_FOLDER_ID';
const BACKEND_URL_PROPERTY = 'JUANELOS_SUPABASE_URL';
const BACKEND_KEY_PROPERTY = 'JUANELOS_SUPABASE_ANON_KEY';
const MAX_IMAGE_BYTES = 2.5 * 1024 * 1024;
let databaseCache_ = null;
let databaseReady_ = false;
let backendCache_ = null;

const SHEETS = Object.freeze({
  orders: {
    name: 'Ordenes',
    headers: [
      'id', 'sequence', 'createdAt', 'updatedAt', 'status', 'customerName', 'phone',
      'fulfillment', 'address', 'neighborhood', 'deliveryFee', 'subtotal', 'total',
      'paymentMethod', 'paymentValue', 'notes', 'itemsJson', 'handledById',
      'handledByName', 'messageStatus', 'lastMessageAt'
    ]
  },
  audit: {
    name: 'Auditoria',
    headers: ['createdAt', 'userId', 'userName', 'action', 'orderId', 'details']
  },
  config: {
    name: 'Configuracion',
    headers: ['key', 'value']
  }
});

const ORDER_STATUSES = ['nueva', 'atendiendo', 'despachada', 'borrador'];
const MESSAGE_STATUSES = ['', 'esperando_pago', 'en_preparacion', 'despachada'];

function doGet() {
  try {
    return jsonResponse_(setupJuanelos());
  } catch (error) {
    return jsonResponse_({
      ok: false,
      error: error.message || String(error),
      spreadsheetId: SPREADSHEET_ID
    });
  }
}

/**
 * Inicializa y verifica la estructura. doGet() la ejecuta automáticamente
 * cuando el sitio llama por primera vez al deployment.
 */
function setupJuanelos() {
  const database = ensureDatabase_();
  return {
    ok: true,
    service: 'Juanelos Orders API',
    databaseId: database.getId(),
    spreadsheetUrl: database.getUrl(),
    sheets: Object.values(SHEETS).map(function (definition) {
      const sheet = database.getSheetByName(definition.name);
      return {
        name: definition.name,
        columns: definition.headers.length,
        ready: Boolean(sheet)
      };
    })
  };
}

function doPost(event) {
  try {
    ensureDatabase_();
    const payload = parsePayload_(event);
    const action = String(payload.action || '');
    const backend = bindBackend_(payload);

    if (action === 'createOrder') return jsonResponse_(createOrder_(payload.order, backend));

    const permission = action === 'uploadImage' ? 'products' : 'orders';
    const session = validateAdmin_(payload, permission, backend);
    if (!session.valid) throw new Error('Sesión vencida o sin permisos.');

    if (action === 'getOrders') return jsonResponse_(getOrders_(payload.sinceRevision));
    if (action === 'updateOrder') return jsonResponse_(updateOrder_(payload, session.user, backend));
    if (action === 'deleteOrder') return jsonResponse_(deleteOrder_(payload.orderId, session.user, backend));
    if (action === 'deleteAllOrders') return jsonResponse_(deleteAllOrders_(session.user, backend));
    if (action === 'uploadImage') return jsonResponse_(uploadImage_(payload, session.user));

    throw new Error('Acción no reconocida.');
  } catch (error) {
    return jsonResponse_({ ok: false, error: error.message || String(error) });
  }
}

function ensureDatabase_() {
  if (databaseCache_ && databaseReady_) return databaseCache_;
  let database;

  try {
    database = SpreadsheetApp.openById(SPREADSHEET_ID);
  } catch (error) {
    throw new Error('No se pudo abrir el archivo de Google Sheets configurado. Verifica que la cuenta que despliega Apps Script tenga acceso de edición.');
  }

  Object.keys(SHEETS).forEach(function (key) {
    const definition = SHEETS[key];
    let sheet = database.getSheetByName(definition.name);
    if (!sheet) sheet = database.insertSheet(definition.name);
    ensureHeaders_(sheet, definition.headers);
  });

  const defaultSheet = database.getSheetByName('Sheet1') || database.getSheetByName('Hoja 1');
  if (defaultSheet && database.getSheets().length > Object.keys(SHEETS).length) database.deleteSheet(defaultSheet);
  initializeConfig_(database.getSheetByName(SHEETS.config.name));
  databaseCache_ = database;
  databaseReady_ = true;
  return database;
}

function ensureHeaders_(sheet, headers) {
  const current = sheet.getLastColumn() > 0
    ? sheet.getRange(1, 1, 1, Math.max(sheet.getLastColumn(), headers.length)).getValues()[0]
    : [];
  const matches = headers.every(function (header, index) { return current[index] === header; });
  if (!matches) {
    sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
    sheet.setFrozenRows(1);
    sheet.getRange(1, 1, 1, headers.length)
      .setBackground('#073b57').setFontColor('#ffffff').setFontWeight('bold');
    sheet.autoResizeColumns(1, headers.length);
  }
  if (sheet.getMaxColumns() > headers.length) {
    sheet.hideColumns(headers.length + 1, sheet.getMaxColumns() - headers.length);
  }
}

function initializeConfig_(sheet) {
  if (sheet.getLastRow() > 1) return;
  sheet.getRange(2, 1, 2, 2).setValues([
    ['nextSequence', '1'],
    ['revision', '0']
  ]);
}

function parsePayload_(event) {
  if (!event || !event.postData || !event.postData.contents) throw new Error('Solicitud vacía.');
  try { return JSON.parse(event.postData.contents); }
  catch (error) { throw new Error('El cuerpo de la solicitud no es JSON válido.'); }
}

function createOrder_(rawOrder, backend) {
  if (!rawOrder || !Array.isArray(rawOrder.items) || !rawOrder.items.length) throw new Error('La orden no tiene productos.');

  const customerName = cleanText_(rawOrder.customerName, 80);
  const phone = cleanText_(rawOrder.phone, 25);
  if (customerName.length < 2 || phone.replace(/\D/g, '').length < 7) throw new Error('Nombre o teléfono inválido.');

  const lock = LockService.getScriptLock();
  lock.waitLock(10000);
  try {
    const database = ensureDatabase_();
    const orderSheet = database.getSheetByName(SHEETS.orders.name);
    const sequence = Number(readConfig_('nextSequence') || 1);
    const now = new Date().toISOString();
    const id = 'JUA-' + Utilities.formatDate(new Date(), Session.getScriptTimeZone() || 'America/Bogota', 'yyyyMMdd') + '-' + String(sequence).padStart(4, '0');
    const subtotal = moneyNumber_(rawOrder.subtotal);
    const deliveryFee = moneyNumber_(rawOrder.deliveryFee);
    const total = subtotal + deliveryFee;
    const items = rawOrder.items.slice(0, 60).map(function (item) {
      return {
        productId: cleanText_(item.productId, 80),
        name: cleanText_(item.name, 120),
        quantity: Math.max(1, Math.min(99, Number(item.quantity) || 1)),
        unitPrice: moneyNumber_(item.unitPrice),
        selections: Array.isArray(item.selections) ? item.selections.slice(0, 30).map(function (value) { return cleanText_(value, 120); }) : []
      };
    });

    const row = {
      id: id,
      sequence: sequence,
      createdAt: now,
      updatedAt: now,
      status: 'nueva',
      customerName: customerName,
      phone: phone,
      fulfillment: rawOrder.fulfillment === 'delivery' ? 'delivery' : 'pickup',
      address: cleanText_(rawOrder.address, 160),
      neighborhood: cleanText_(rawOrder.neighborhood, 80),
      deliveryFee: deliveryFee,
      subtotal: subtotal,
      total: total,
      paymentMethod: cleanText_(rawOrder.paymentMethod, 60),
      paymentValue: cleanText_(rawOrder.paymentValue, 160),
      notes: cleanText_(rawOrder.notes, 300),
      itemsJson: JSON.stringify(items),
      handledById: '',
      handledByName: '',
      messageStatus: '',
      lastMessageAt: ''
    };

    appendObject_(orderSheet, SHEETS.orders.headers, row);
    writeConfig_('nextSequence', String(sequence + 1));
    const revision = bumpRevision_();
    appendAudit_({ id: '', displayName: 'Cliente' }, 'crear_orden', id, { total: total, phone: phone });
    publishOrderEvent_(backend, id, revision, 'created');
    return { ok: true, orderId: id, sequence: sequence, total: total };
  } finally {
    lock.releaseLock();
  }
}

function getOrders_(sinceRevision) {
  const revision = Number(readConfig_('revision') || 0);
  if (Number(sinceRevision) === revision) return { ok: true, changed: false, revision: revision };

  const database = ensureDatabase_();
  const sheet = database.getSheetByName(SHEETS.orders.name);
  const orders = readObjects_(sheet, SHEETS.orders.headers).map(function (order) {
    try { order.items = JSON.parse(order.itemsJson || '[]'); } catch (error) { order.items = []; }
    delete order.itemsJson;
    return order;
  }).sort(function (a, b) { return Number(a.sequence) - Number(b.sequence); });
  const auditSheet = database.getSheetByName(SHEETS.audit.name);
  const histories = {};
  readObjects_(auditSheet, SHEETS.audit.headers).slice(-1200).forEach(function (entry) {
    if (!entry.orderId) return;
    let details = {};
    try { details = JSON.parse(entry.details || '{}'); } catch (error) { details = {}; }
    if (!histories[entry.orderId]) histories[entry.orderId] = [];
    histories[entry.orderId].push({
      createdAt: entry.createdAt,
      userName: entry.userName || 'Sistema',
      action: entry.action,
      status: details.status || '',
      messageStatus: details.messageStatus || ''
    });
  });
  orders.forEach(function (order) {
    order.history = (histories[order.id] || []).slice().reverse();
  });
  return { ok: true, changed: true, revision: revision, orders: orders };
}

function updateOrder_(payload, user, backend) {
  const orderId = cleanText_(payload.orderId, 60);
  const changes = payload.changes || {};
  const sheet = ensureDatabase_().getSheetByName(SHEETS.orders.name);
  const rowNumber = findRow_(sheet, 'id', orderId);
  if (!rowNumber) throw new Error('Orden no encontrada.');

  const allowed = {};
  if (changes.status !== undefined) {
    if (ORDER_STATUSES.indexOf(changes.status) < 0) throw new Error('Estado de orden inválido.');
    allowed.status = changes.status;
  }
  if (changes.messageStatus !== undefined) {
    if (MESSAGE_STATUSES.indexOf(changes.messageStatus) < 0) throw new Error('Tipo de mensaje inválido.');
    allowed.messageStatus = changes.messageStatus;
    allowed.lastMessageAt = changes.messageStatus ? new Date().toISOString() : '';
  }
  allowed.updatedAt = new Date().toISOString();
  allowed.handledById = user.id;
  allowed.handledByName = user.displayName;
  updateRow_(sheet, rowNumber, SHEETS.orders.headers, allowed);
  const revision = bumpRevision_();
  const auditAction = changes.status !== undefined
    ? 'cambiar_estado'
    : changes.messageStatus !== undefined ? 'enviar_mensaje' : 'actualizar_orden';
  appendAudit_(user, auditAction, orderId, allowed);
  publishOrderEvent_(backend, orderId, revision, 'changed');
  return { ok: true, revision: revision };
}

function deleteOrder_(orderId, user, backend) {
  const cleanId = cleanText_(orderId, 60);
  const sheet = ensureDatabase_().getSheetByName(SHEETS.orders.name);
  const rowNumber = findRow_(sheet, 'id', cleanId);
  if (!rowNumber) throw new Error('Orden no encontrada.');
  sheet.deleteRow(rowNumber);
  const revision = bumpRevision_();
  appendAudit_(user, 'eliminar_orden', cleanId, {});
  publishOrderEvent_(backend, cleanId, revision, 'deleted');
  return { ok: true, revision: revision };
}

function deleteAllOrders_(user, backend) {
  const sheet = ensureDatabase_().getSheetByName(SHEETS.orders.name);
  const count = Math.max(0, sheet.getLastRow() - 1);
  if (count) sheet.deleteRows(2, count);
  const revision = bumpRevision_();
  appendAudit_(user, 'eliminar_todas_ordenes', '*', { deletedCount: count });
  publishOrderEvent_(backend, '*', revision, 'deleted');
  return { ok: true, revision: revision, deletedCount: count };
}

function uploadImage_(payload, user) {
  const mimeType = cleanText_(payload.mimeType, 80);
  if (!/^image\/(png|jpe?g|webp)$/i.test(mimeType)) throw new Error('Usa una imagen PNG, JPG o WebP.');
  const bytes = Utilities.base64Decode(String(payload.base64 || '').replace(/^data:[^,]+,/, ''));
  if (!bytes.length || bytes.length > MAX_IMAGE_BYTES) throw new Error('La imagen debe pesar menos de 2.5 MB.');

  const folder = getImageFolder_();
  const extension = mimeType.indexOf('png') >= 0 ? 'png' : mimeType.indexOf('webp') >= 0 ? 'webp' : 'jpg';
  const filename = 'producto-' + Date.now() + '.' + extension;
  const file = folder.createFile(Utilities.newBlob(bytes, mimeType, filename));
  file.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
  appendAudit_(user, 'subir_imagen', file.getId(), { filename: filename });
  bumpRevision_();
  return { ok: true, url: 'https://drive.google.com/uc?export=view&id=' + file.getId() };
}

function getImageFolder_() {
  const properties = PropertiesService.getScriptProperties();
  const storedId = properties.getProperty(IMAGE_FOLDER_PROPERTY);
  if (storedId) {
    try { return DriveApp.getFolderById(storedId); } catch (error) { /* crear de nuevo */ }
  }
  const folder = DriveApp.createFolder('Juanelos · Imágenes de productos');
  properties.setProperty(IMAGE_FOLDER_PROPERTY, folder.getId());
  return folder;
}

function bindBackend_(payload) {
  const requestedUrl = String(payload.supabaseUrl || '').replace(/\/$/, '');
  const requestedKey = String(payload.supabaseAnonKey || '');
  if (!/^https:\/\/[a-z0-9-]+\.supabase\.co$/i.test(requestedUrl) || requestedKey.length < 20) {
    throw new Error('Configuración de Supabase inválida.');
  }

  if (backendCache_ && backendCache_.url === requestedUrl && backendCache_.key === requestedKey) {
    return backendCache_;
  }

  const properties = PropertiesService.getScriptProperties();
  const lock = LockService.getScriptLock();
  lock.waitLock(10000);
  try {
    const storedUrl = properties.getProperty(BACKEND_URL_PROPERTY);
    const storedKey = properties.getProperty(BACKEND_KEY_PROPERTY);
    if (!storedUrl) {
      properties.setProperties({
        [BACKEND_URL_PROPERTY]: requestedUrl,
        [BACKEND_KEY_PROPERTY]: requestedKey
      });
      backendCache_ = { url: requestedUrl, key: requestedKey };
      return backendCache_;
    }
    if (storedUrl !== requestedUrl || storedKey !== requestedKey) throw new Error('Este despliegue está vinculado a otro proyecto de Supabase.');
    backendCache_ = { url: storedUrl, key: storedKey };
    return backendCache_;
  } finally {
    lock.releaseLock();
  }
}

function validateAdmin_(payload, permission, backend) {
  if (!payload.token) return { valid: false };
  const token = String(payload.token);
  const tokenHash = Utilities.base64EncodeWebSafe(
    Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256, token)
  ).slice(0, 40);
  const cache = CacheService.getScriptCache();
  const cacheKey = 'admin-session-' + permission + '-' + tokenHash;
  const cached = cache.get(cacheKey);
  if (cached) {
    try { return JSON.parse(cached); } catch (error) { /* validar nuevamente */ }
  }
  const endpoint = backend.url + '/rest/v1/rpc/validate_admin_session';
  const response = UrlFetchApp.fetch(endpoint, {
    method: 'post',
    contentType: 'application/json',
    headers: {
      apikey: backend.key,
      Authorization: 'Bearer ' + backend.key
    },
    payload: JSON.stringify({ p_token: token, p_permission: permission }),
    muteHttpExceptions: true
  });
  if (response.getResponseCode() < 200 || response.getResponseCode() >= 300) return { valid: false };
  try {
    const session = JSON.parse(response.getContentText());
    if (session && session.valid) cache.put(cacheKey, JSON.stringify(session), 15);
    return session;
  } catch (error) {
    return { valid: false };
  }
}

function publishOrderEvent_(backend, orderId, revision, eventKind) {
  try {
    const response = UrlFetchApp.fetch(backend.url + '/rest/v1/rpc/publish_order_event', {
      method: 'post',
      contentType: 'application/json',
      headers: {
        apikey: backend.key,
        Authorization: 'Bearer ' + backend.key
      },
      payload: JSON.stringify({
        p_order_id: orderId,
        p_revision: Number(revision) || 0,
        p_event_kind: eventKind || 'changed'
      }),
      muteHttpExceptions: true
    });
    if (response.getResponseCode() < 200 || response.getResponseCode() >= 300) {
      console.warn('Supabase rechazó el evento de orden: HTTP ' + response.getResponseCode());
    }
  } catch (error) {
    console.warn('No se pudo publicar el evento de orden: ' + (error.message || error));
  }
}

function appendAudit_(user, action, orderId, details) {
  const sheet = ensureDatabase_().getSheetByName(SHEETS.audit.name);
  appendObject_(sheet, SHEETS.audit.headers, {
    createdAt: new Date().toISOString(),
    userId: user.id || '',
    userName: user.displayName || 'Sistema',
    action: action,
    orderId: orderId || '',
    details: JSON.stringify(details || {})
  });
}

function readConfig_(key) {
  const sheet = ensureDatabase_().getSheetByName(SHEETS.config.name);
  const rows = sheet.getLastRow() > 1 ? sheet.getRange(2, 1, sheet.getLastRow() - 1, 2).getValues() : [];
  const match = rows.find(function (row) { return row[0] === key; });
  return match ? match[1] : '';
}

function writeConfig_(key, value) {
  const sheet = ensureDatabase_().getSheetByName(SHEETS.config.name);
  const rows = sheet.getLastRow() > 1 ? sheet.getRange(2, 1, sheet.getLastRow() - 1, 2).getValues() : [];
  const index = rows.findIndex(function (row) { return row[0] === key; });
  if (index >= 0) sheet.getRange(index + 2, 2).setValue(value);
  else sheet.appendRow([key, value]);
}

function bumpRevision_() {
  const next = Number(readConfig_('revision') || 0) + 1;
  writeConfig_('revision', String(next));
  return next;
}

function appendObject_(sheet, headers, object) {
  sheet.appendRow(headers.map(function (header) { return object[header] === undefined ? '' : object[header]; }));
}

function readObjects_(sheet, headers) {
  if (sheet.getLastRow() < 2) return [];
  return sheet.getRange(2, 1, sheet.getLastRow() - 1, headers.length).getValues().map(function (row) {
    return headers.reduce(function (object, header, index) { object[header] = row[index]; return object; }, {});
  });
}

function findRow_(sheet, header, value) {
  const column = SHEETS.orders.headers.indexOf(header) + 1;
  if (column < 1 || sheet.getLastRow() < 2) return 0;
  const match = sheet.getRange(2, column, sheet.getLastRow() - 1, 1).createTextFinder(value).matchEntireCell(true).findNext();
  return match ? match.getRow() : 0;
}

function updateRow_(sheet, rowNumber, headers, changes) {
  const current = sheet.getRange(rowNumber, 1, 1, headers.length).getValues()[0];
  Object.keys(changes).forEach(function (key) {
    const index = headers.indexOf(key);
    if (index >= 0) current[index] = changes[key];
  });
  sheet.getRange(rowNumber, 1, 1, headers.length).setValues([current]);
}

function cleanText_(value, maxLength) {
  return String(value == null ? '' : value).replace(/[\u0000-\u001F\u007F]/g, ' ').trim().slice(0, maxLength);
}

function moneyNumber_(value) {
  const number = Math.round(Number(value) || 0);
  return Math.max(0, Math.min(number, 50000000));
}

function jsonResponse_(data) {
  return ContentService.createTextOutput(JSON.stringify(data)).setMimeType(ContentService.MimeType.JSON);
}
