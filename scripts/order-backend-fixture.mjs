// Isolated Apps Script adapters: never contacts Google Drive, Sheets or Supabase.
import { readFileSync } from 'node:fs';
import { createContext, runInContext } from 'node:vm';
import { createHash, randomUUID } from 'node:crypto';

export function createBackend() {
  class Sheet {
    rows = [];
    constructor(name) { this.name = name; }
    getLastRow() { return this.rows.length; }
    getLastColumn() { return Math.max(0, ...this.rows.map(row => row.length)); }
    getMaxColumns() { return Math.max(26, this.getLastColumn()); }
    getRange(row, column, height = 1, width = 1) {
      const sheet = this;
      const range = {
        getValues: () => Array.from({ length: height }, (_, i) => Array.from({ length: width }, (_, j) => sheet.rows[row - 1 + i]?.[column - 1 + j] ?? '')),
        setValues(values) { values.forEach((valuesRow, i) => { sheet.rows[row - 1 + i] ||= []; valuesRow.forEach((value, j) => { sheet.rows[row - 1 + i][column - 1 + j] = value; }); }); return range; },
        setValue(value) { return range.setValues([[value]]); },
        setBackground() { return range; }, setFontColor() { return range; }, setFontWeight() { return range; },
        createTextFinder(value) { return { matchEntireCell() { return this; }, findNext() { const index = range.getValues().findIndex(values => String(values[0]) === String(value)); return index < 0 ? null : { getRow: () => row + index }; } }; }
      };
      return range;
    }
    appendRow(row) { this.rows.push([...row]); }
    deleteRow(row) { this.rows.splice(row - 1, 1); }
    deleteRows(row, count) { this.rows.splice(row - 1, count); }
    setFrozenRows() {} autoResizeColumns() {} hideColumns() {}
  }
  const sheets = new Map(), files = new Map(), folders = new Map(), properties = new Map();
  let now = Date.now();
  class ClockDate extends Date { constructor(...args) { super(...(args.length ? args : [now])); } static now() { return now; } }
  const blob = (bytes, mimeType, name) => ({ getBytes: () => [...bytes], mimeType, name });
  const drive = {
    createFolder(name) {
      const id = randomUUID();
      const folder = { getId: () => id, name, createFile(data) {
        const fileId = randomUUID(); let trashed = false, shared = false;
        const file = { getId: () => fileId, getBlob: () => data, getSize: () => data.getBytes().length, isTrashed: () => trashed, setTrashed(value) { trashed = value; }, setSharing() { shared = true; }, get shared() { return shared; } };
        files.set(fileId, file); return file;
      } }; folders.set(id, folder); return folder;
    },
    getFolderById(id) { if (!folders.has(id)) throw Error('Missing folder'); return folders.get(id); },
    getFileById(id) { if (!files.has(id)) throw Error('Missing file'); return files.get(id); },
    Access: { ANYONE_WITH_LINK: 'public' }, Permission: { VIEW: 'view' }
  };
  const database = { getSheetByName: name => sheets.get(name), insertSheet(name) { const sheet = new Sheet(name); sheets.set(name, sheet); return sheet; }, getSheets: () => [...sheets.values()], deleteSheet(sheet) { sheets.delete(sheet.name); }, getId: () => 'test', getUrl: () => 'https://example.invalid/test' };
  const boss = { id: 'boss', displayName: 'Equipo', role: 'jefe', permissions: {} };
  const context = createContext({ console, Date: ClockDate,
    SpreadsheetApp: { openById: () => database }, DriveApp: drive,
    Session: { getScriptTimeZone: () => 'America/Bogota' },
    LockService: { getScriptLock: () => ({ waitLock() {}, releaseLock() {} }) },
    CacheService: { getScriptCache: () => ({ get: () => null, put() {} }) },
    PropertiesService: { getScriptProperties: () => ({ getProperty: name => properties.get(name), setProperty(name, value) { properties.set(name, value); }, setProperties(data) { Object.entries(data).forEach(([key, value]) => properties.set(key, value)); } }) },
    Utilities: { DigestAlgorithm: { SHA_256: 'sha256' }, computeDigest: (_, value) => [...createHash('sha256').update(value).digest()], base64Decode: value => [...Buffer.from(value, 'base64')], base64Encode: bytes => Buffer.from(bytes).toString('base64'), base64EncodeWebSafe: bytes => Buffer.from(bytes).toString('base64url'), newBlob: blob, getUuid: randomUUID, formatDate: () => '20261010' },
    ContentService: { MimeType: { JSON: 'json' }, createTextOutput: value => ({ value, setMimeType() { return this; } }) },
    UrlFetchApp: { fetch(url, options) {
      const data = JSON.parse(options.payload);
      const valid = data.p_token === 'boss-token' || (data.p_token === 'orders-token' && (!data.p_permission || data.p_permission === 'orders')) || (data.p_token === 'links-token' && (!data.p_permission || data.p_permission === 'links'));
      return { getResponseCode: () => 200, getContentText: () => JSON.stringify(url.includes('validate_admin_session') ? { valid, user: boss } : { ok: true }) };
    } }
  });
  runInContext(readFileSync(new URL('../Code.gs', import.meta.url), 'utf8'), context);
  return {
    sheets, files, context,
    advance(ms) { now += ms; }, now: () => now,
    get: () => JSON.parse(context.doGet().value),
    post(action, data = {}) { return JSON.parse(context.doPost({ postData: { contents: JSON.stringify({ action, supabaseUrl: 'https://tests.supabase.co', supabaseAnonKey: 'public-test-key-long-enough', ...data }) } }).value); }
  };
}

export function orderFixture(backend, overrides = {}) {
  return { customerName: 'Cliente de prueba', phone: '3001234567', fulfillment: 'delivery', address: 'Calle 1 # 2-3', neighborhood: 'Centro', subtotal: 12000, deliveryFee: 2000, paymentMethod: 'Transferencia', paymentValue: '123', notes: '', items: [{ productId: 'p1', name: 'Fresas', quantity: 1, unitPrice: 12000, selections: [] }],
    receipt: { name: 'comprobante.png', mimeType: 'image/png', base64: Buffer.from([137,80,78,71,13,10,26,10,0]).toString('base64') },
    liveLocation: { writerToken: 'a'.repeat(64), viewerToken: 'b'.repeat(64), latitude: 4.5, longitude: -74.1, accuracy: 12, observedAt: new Date(backend.now()).toISOString() }, ...overrides };
}
