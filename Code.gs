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
const RECEIPT_FOLDER_PROPERTY = 'JUANELOS_RECEIPTS_FOLDER_ID';
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
      'handledByName', 'messageStatus', 'lastMessageAt',
      'receiptFileId', 'receiptMimeType', 'receiptName', 'locationViewToken'
    ]
  },
  audit: {
    name: 'Auditoria',
    headers: ['createdAt', 'userId', 'userName', 'action', 'orderId', 'details']
  },
  config: {
    name: 'Configuracion',
    headers: ['key', 'value']
  },
  locations: {
    name: 'Ubicaciones',
    headers: ['orderId', 'writerHash', 'viewerHash', 'latitude', 'longitude', 'accuracy', 'updatedAt', 'expiresAt', 'active', 'paused']
  },
  links: {
    name: 'Enlaces',
    headers: ['id', 'title', 'subtitle', 'url', 'kind', 'sortOrder', 'active', 'updatedAt']
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
    apiVersion: 2,
    capabilities: { receipts: true, liveLocation: true, brandLinks: true },
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
    if (action === 'updateCustomerLocation') return jsonResponse_(updateCustomerLocation_(payload));
    if (action === 'stopCustomerLocation') return jsonResponse_(stopCustomerLocation_(payload));
    if (action === 'pauseCustomerLocation') return jsonResponse_(pauseCustomerLocation_(payload));
    if (action === 'getCustomerLocation') return jsonResponse_(getCustomerLocation_(payload));
    if (action === 'getPublicLinks') return jsonResponse_({ ok: true, links: readBrandLinks_().filter(function (link) { return link.active; }) });

    const permission = action === 'uploadImage' ? 'products' : /^(getBrandLinks|mutateBrandLink)$/.test(action) ? 'links' : 'orders';
    const session = validateAdmin_(payload, permission, backend);
    if (!session.valid) throw new Error('Sesión vencida o sin permisos.');

    if (action === 'getOrders') return jsonResponse_(getOrders_(payload.sinceRevision));
    if (action === 'updateOrder') return jsonResponse_(updateOrder_(payload, session.user, backend));
    if (action === 'deleteOrder') return jsonResponse_(deleteOrder_(payload.orderId, session.user, backend));
    if (action === 'deleteAllOrders') return jsonResponse_(deleteAllOrders_(session.user, backend));
    if (action === 'uploadImage') return jsonResponse_(uploadImage_(payload, session.user));
    if (action === 'getOrderReceipt') return jsonResponse_(getOrderReceipt_(payload.orderId));
    if (action === 'getBrandLinks') return jsonResponse_({ ok: true, links: readBrandLinks_() });
    if (action === 'mutateBrandLink') return jsonResponse_(mutateBrandLink_(payload, session.user));

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
  const receiptBytes = rawOrder.receipt ? validateReceipt_(rawOrder.receipt) : null;
  const sharedLocation = rawOrder.fulfillment === 'delivery' && rawOrder.liveLocation ? validateSharedLocation_(rawOrder.liveLocation) : null;

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
      lastMessageAt: '',
      receiptFileId: '',
      receiptMimeType: '',
      receiptName: '',
      locationViewToken: sharedLocation ? sharedLocation.viewerToken : ''
    };

    let receiptFile = null;
    let locationRow = 0;
    try {
      if (receiptBytes) {
        const receipt = rawOrder.receipt;
        receiptFile = getReceiptFolder_().createFile(Utilities.newBlob(receiptBytes, receipt.mimeType, id + '-comprobante.' + (receipt.mimeType === 'image/png' ? 'png' : receipt.mimeType === 'image/webp' ? 'webp' : 'jpg')));
        // El comprobante permanece privado. Solo se sirve al administrador autenticado.
        row.receiptFileId = receiptFile.getId();
        row.receiptMimeType = receipt.mimeType;
        row.receiptName = cleanText_(receipt.name || 'Comprobante de pago', 120);
      }
      if (sharedLocation) {
        const locationSheet = database.getSheetByName(SHEETS.locations.name);
        appendObject_(locationSheet, SHEETS.locations.headers, {
          orderId: id, writerHash: tokenHash_(sharedLocation.writerToken), viewerHash: tokenHash_(sharedLocation.viewerToken),
          latitude: sharedLocation.latitude, longitude: sharedLocation.longitude, accuracy: sharedLocation.accuracy,
          updatedAt: sharedLocation.observedAt, expiresAt: new Date(Date.now() + 2 * 60 * 60 * 1000).toISOString(), active: true, paused: false
        });
        locationRow = locationSheet.getLastRow();
      }
      appendObject_(orderSheet, SHEETS.orders.headers, row);
    } catch (error) {
      if (receiptFile) receiptFile.setTrashed(true);
      if (locationRow) database.getSheetByName(SHEETS.locations.name).deleteRow(locationRow);
      throw error;
    }
    writeConfig_('nextSequence', String(sequence + 1));
    const revision = bumpRevision_();
    appendAudit_({ id: '', displayName: 'Cliente' }, 'crear_orden', id, { total: total, phone: phone });
    publishOrderEvent_(backend, id, revision, 'created');
    return { ok: true, orderId: id, sequence: sequence, total: total, receiptAttached: Boolean(receiptFile), locationEnabled: Boolean(sharedLocation) };
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
  removeOrderAttachments_(cleanId);
  sheet.deleteRow(rowNumber);
  const revision = bumpRevision_();
  appendAudit_(user, 'eliminar_orden', cleanId, {});
  publishOrderEvent_(backend, cleanId, revision, 'deleted');
  return { ok: true, revision: revision };
}

function deleteAllOrders_(user, backend) {
  const sheet = ensureDatabase_().getSheetByName(SHEETS.orders.name);
  const count = Math.max(0, sheet.getLastRow() - 1);
  readObjects_(sheet, SHEETS.orders.headers).forEach(function (order) { removeOrderAttachments_(order.id); });
  if (count) sheet.deleteRows(2, count);
  const revision = bumpRevision_();
  appendAudit_(user, 'eliminar_todas_ordenes', '*', { deletedCount: count });
  publishOrderEvent_(backend, '*', revision, 'deleted');
  return { ok: true, revision: revision, deletedCount: count };
}

function removeOrderAttachments_(orderId) {
  const database = ensureDatabase_();
  const locations = database.getSheetByName(SHEETS.locations.name);
  const locationRow = findRow_(locations, 'orderId', orderId);
  if (locationRow) locations.deleteRow(locationRow);
  const orders = database.getSheetByName(SHEETS.orders.name);
  const orderRow = findRow_(orders, 'id', orderId);
  if (!orderRow) return;
  const fileId = orders.getRange(orderRow, SHEETS.orders.headers.indexOf('receiptFileId') + 1).getValues()[0][0];
  if (fileId) {
    try { DriveApp.getFileById(fileId).setTrashed(true); }
    catch (error) { console.warn('No se pudo retirar el comprobante de la orden ' + orderId); }
  }
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

function validateReceipt_(receipt) {
  if (!receipt || !/^image\/(png|jpeg|webp)$/.test(receipt.mimeType || '')) throw new Error('El comprobante debe ser PNG, JPG o WebP.');
  const encoded = String(receipt.base64 || '');
  if (encoded.length > Math.ceil(MAX_IMAGE_BYTES / 3) * 4 || !/^[A-Za-z0-9+/]+={0,2}$/.test(encoded)) throw new Error('El comprobante supera el tamaño permitido o es inválido.');
  const bytes = Utilities.base64Decode(encoded);
  const unsigned = bytes.map(function (byte) { return byte & 255; });
  const valid = receipt.mimeType === 'image/jpeg' ? unsigned[0] === 255 && unsigned[1] === 216 && unsigned[2] === 255
    : receipt.mimeType === 'image/png' ? [137, 80, 78, 71, 13, 10, 26, 10].every(function (byte, i) { return unsigned[i] === byte; })
    : [82, 73, 70, 70].every(function (byte, i) { return unsigned[i] === byte; }) && [87, 69, 66, 80].every(function (byte, i) { return unsigned[i + 8] === byte; });
  if (!valid || !bytes.length || bytes.length > MAX_IMAGE_BYTES) throw new Error('El comprobante no es una imagen válida.');
  return bytes;
}

function getReceiptFolder_() {
  const properties = PropertiesService.getScriptProperties();
  const storedId = properties.getProperty(RECEIPT_FOLDER_PROPERTY);
  if (storedId) { try { return DriveApp.getFolderById(storedId); } catch (error) { /* recuperar carpeta */ } }
  const folder = DriveApp.createFolder('Juanelos · Comprobantes privados');
  properties.setProperty(RECEIPT_FOLDER_PROPERTY, folder.getId());
  return folder;
}

function getOrderReceipt_(orderId) {
  const sheet = ensureDatabase_().getSheetByName(SHEETS.orders.name);
  const rowNumber = findRow_(sheet, 'id', cleanText_(orderId, 80));
  if (!rowNumber) throw new Error('La orden no existe.');
  const values = sheet.getRange(rowNumber, 1, 1, SHEETS.orders.headers.length).getValues()[0];
  const fileId = values[SHEETS.orders.headers.indexOf('receiptFileId')];
  const mimeType = values[SHEETS.orders.headers.indexOf('receiptMimeType')];
  if (!fileId || !/^image\/(png|jpeg|webp)$/.test(mimeType)) throw new Error('Esta orden no tiene un comprobante adjunto.');
  const file = DriveApp.getFileById(fileId);
  if (file.isTrashed() || file.getSize() > MAX_IMAGE_BYTES) throw new Error('El comprobante ya no está disponible.');
  return { ok: true, mimeType: mimeType, base64: Utilities.base64Encode(file.getBlob().getBytes()) };
}

function tokenHash_(value) {
  return Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256, String(value || '')).map(function (byte) { return ('0' + (byte & 255).toString(16)).slice(-2); }).join('');
}

function validateCoordinates_(data) {
  const latitude = Number(data.latitude), longitude = Number(data.longitude), accuracy = Number(data.accuracy);
  if (data.latitude === null || data.longitude === null || !Number.isFinite(latitude) || !Number.isFinite(longitude) || !Number.isFinite(accuracy) || Math.abs(latitude) > 90 || Math.abs(longitude) > 180 || accuracy < 0 || accuracy > 100000) throw new Error('La ubicación no es válida.');
  const observedAt = new Date(data.observedAt).getTime();
  if (!Number.isFinite(observedAt) || observedAt > Date.now() + 60000 || observedAt < Date.now() - 5 * 60000) throw new Error('La posición está desactualizada. Vuelve a solicitar tu ubicación.');
  return { latitude: latitude, longitude: longitude, accuracy: accuracy, observedAt: new Date(observedAt).toISOString() };
}

function validateSharedLocation_(data) {
  if (!/^[a-f0-9]{64}$/.test(data.writerToken || '') || !/^[a-f0-9]{64}$/.test(data.viewerToken || '') || data.writerToken === data.viewerToken) throw new Error('No se pudo crear el enlace de ubicación.');
  return Object.assign(validateCoordinates_(data), { writerToken: data.writerToken, viewerToken: data.viewerToken });
}

function locationAccess_(payload, writer) {
  const token = String(writer ? payload.writerToken : payload.viewerToken);
  if (!/^[a-f0-9]{64}$/.test(token)) throw new Error('El enlace de ubicación no es válido.');
  const sheet = ensureDatabase_().getSheetByName(SHEETS.locations.name);
  const rowNumber = findRow_(sheet, 'orderId', cleanText_(payload.orderId, 80));
  if (!rowNumber) throw new Error('La ubicación no está disponible.');
  const values = sheet.getRange(rowNumber, 1, 1, SHEETS.locations.headers.length).getValues()[0];
  const data = SHEETS.locations.headers.reduce(function (object, key, i) { object[key] = values[i]; return object; }, {});
  if (data[writer ? 'writerHash' : 'viewerHash'] !== tokenHash_(token)) throw new Error('El enlace de ubicación no es válido.');
  return { sheet: sheet, rowNumber: rowNumber, data: data };
}

function updateCustomerLocation_(payload) {
  const coords = validateCoordinates_(payload);
  const lock = LockService.getScriptLock(); lock.waitLock(10000);
  try {
    const access = locationAccess_(payload, true);
    if (access.data.active !== true || new Date(access.data.expiresAt).getTime() <= Date.now()) throw new Error('La ubicación compartida terminó.');
    if (new Date(coords.observedAt).getTime() < new Date(access.data.updatedAt).getTime()) return { ok: true, updatedAt: access.data.updatedAt, expiresAt: access.data.expiresAt };
    updateRow_(access.sheet, access.rowNumber, SHEETS.locations.headers, { latitude: coords.latitude, longitude: coords.longitude, accuracy: coords.accuracy, updatedAt: coords.observedAt, paused: false });
    return { ok: true, updatedAt: coords.observedAt, expiresAt: access.data.expiresAt };
  } finally { lock.releaseLock(); }
}

function stopCustomerLocation_(payload) {
  const lock = LockService.getScriptLock(); lock.waitLock(10000);
  try {
    const access = locationAccess_(payload, true);
    updateRow_(access.sheet, access.rowNumber, SHEETS.locations.headers, { active: false, latitude: '', longitude: '', accuracy: '', updatedAt: new Date().toISOString() });
    return { ok: true };
  } finally { lock.releaseLock(); }
}

function getCustomerLocation_(payload) {
  const access = locationAccess_(payload, false), data = access.data;
  if (data.active !== true || new Date(data.expiresAt).getTime() <= Date.now()) return { ok: true, active: false };
  return { ok: true, active: true, paused: data.paused === true, orderId: data.orderId, latitude: Number(data.latitude), longitude: Number(data.longitude), accuracy: Number(data.accuracy), updatedAt: data.updatedAt, expiresAt: data.expiresAt };
}

function pauseCustomerLocation_(payload) {
  const lock = LockService.getScriptLock(); lock.waitLock(10000);
  try { const access = locationAccess_(payload, true); updateRow_(access.sheet, access.rowNumber, SHEETS.locations.headers, { paused: true }); return { ok: true }; }
  finally { lock.releaseLock(); }
}

function readBrandLinks_() {
  return readObjects_(ensureDatabase_().getSheetByName(SHEETS.links.name), SHEETS.links.headers).sort(function (a, b) { return Number(a.sortOrder) - Number(b.sortOrder); });
}

function mutateBrandLink_(payload, user) {
  const data = payload.link || {}, action = payload.operation;
  const lock = LockService.getScriptLock(); lock.waitLock(10000);
  try {
    const sheet = ensureDatabase_().getSheetByName(SHEETS.links.name);
    const id = cleanText_(data.id, 80) || Utilities.getUuid(), row = findRow_(sheet, 'id', id);
    if (action === 'delete') { if (!row) throw new Error('El enlace ya no existe.'); sheet.deleteRow(row); }
    else if (action === 'save') {
      const title = cleanText_(data.title, 60), url = String(data.url || '').trim();
      if (title.length < 2 || url.length > 1000 || !/^https:\/\/[a-z0-9][a-z0-9.-]*(?::[0-9]+)?(?:[/?#][^\s<>]*)?$/i.test(url)) throw new Error('Ingresa un título y un enlace HTTPS válido.');
      const record = { id: id, title: title, subtitle: cleanText_(data.subtitle, 120), url: url,
        kind: ['instagram','tiktok','facebook','whatsapp','web','maps'].indexOf(data.kind) >= 0 ? data.kind : 'web',
        sortOrder: Math.max(0, Math.min(999, Math.floor(Number(data.sortOrder) || 0))), active: data.active === true, updatedAt: new Date().toISOString() };
      if (data.id && !row) throw new Error('El enlace ya no existe. Actualiza la lista.');
      if (row) updateRow_(sheet, row, SHEETS.links.headers, record); else appendObject_(sheet, SHEETS.links.headers, record);
    } else throw new Error('Acción no válida.');
    appendAudit_(user, action === 'delete' ? 'eliminar_enlace' : 'guardar_enlace', id, { title: cleanText_(data.title, 60) });
    return { ok: true, links: readBrandLinks_() };
  } finally { lock.releaseLock(); }
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
  const headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
  const column = headers.indexOf(header) + 1;
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
