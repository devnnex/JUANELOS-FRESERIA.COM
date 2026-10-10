import test from 'node:test';
import assert from 'node:assert/strict';
import { createBackend, orderFixture } from './order-backend-fixture.mjs';

test('legacy orders and appended headers preserve existing fields and revisions', () => {
  const api = createBackend();
  assert.equal(api.get().capabilities.receipts, true);
  const result = api.post('createOrder', { order: orderFixture(api, { receipt: null, liveLocation: null }) });
  assert.equal(result.ok, true); assert.equal(result.total, 14000);
  assert.equal(result.receiptAttached, false); assert.equal(result.locationEnabled, false);
  const list = api.post('getOrders', { token: 'orders-token', sinceRevision: -1 });
  assert.equal(list.orders[0].items[0].name, 'Fresas'); assert.equal(list.orders[0].address, 'Calle 1 # 2-3');
  assert.equal(api.post('getOrders', { token: 'orders-token', sinceRevision: list.revision }).changed, false);
  assert.equal(api.post('updateOrder', { token: 'orders-token', orderId: result.orderId, changes: { status: 'despachada' } }).ok, true);
});

test('receipts stay private and only staff with orders permission can retrieve them', () => {
  const api = createBackend(), order = orderFixture(api);
  const result = api.post('createOrder', { order }); assert.equal(result.ok, true); assert.equal(result.receiptAttached, true);
  assert.equal([...api.files.values()][0].shared, false);
  for (const token of [undefined, 'bad', 'links-token']) assert.equal(api.post('getOrderReceipt', { token, orderId: result.orderId }).ok, false);
  assert.equal(api.post('getOrderReceipt', { token: 'orders-token', orderId: result.orderId }).base64, order.receipt.base64);
  assert.equal(api.post('getOrderReceipt', { token: 'boss-token', orderId: 'JUA-nonexistent' }).ok, false);
  for (const receipt of [{ mimeType: 'image/svg+xml', base64: 'YWJj' }, { mimeType: 'image/png', base64: 'YWJj' }, { mimeType: 'image/jpeg', base64: '*invalid*' }, { mimeType: 'image/png', base64: 'A'.repeat(4e6) }]) {
    assert.equal(api.post('createOrder', { order: orderFixture(api, { receipt }) }).ok, false);
  }
  assert.equal(api.post('getOrders', { token: 'boss-token', sinceRevision: -1 }).orders.length, 1);
});

test('location separates viewer/writer tokens, pauses, resumes with a new fix, stops and expires', () => {
  const api = createBackend(), order = orderFixture(api), result = api.post('createOrder', { order });
  assert.equal(result.ok, true);
  const writer = { orderId: result.orderId, writerToken: order.liveLocation.writerToken };
  const viewer = { orderId: result.orderId, viewerToken: order.liveLocation.viewerToken };
  const initial = api.post('getCustomerLocation', viewer); assert.equal(initial.active, true); assert.equal(initial.latitude, 4.5);
  assert.equal(initial.writerHash, undefined); assert.equal(initial.customerName, undefined);
  assert.equal(api.post('getCustomerLocation', { ...viewer, viewerToken: writer.writerToken }).ok, false);
  assert.equal(api.post('updateCustomerLocation', { ...order.liveLocation, ...writer, writerToken: viewer.viewerToken }).ok, false);
  assert.equal(api.post('pauseCustomerLocation', writer).ok, true); assert.equal(api.post('getCustomerLocation', viewer).paused, true);
  api.advance(20000);
  const observedAt = new Date(api.now() - 5000).toISOString();
  assert.equal(api.post('updateCustomerLocation', { ...writer, latitude: 4.6, longitude: -74.2, accuracy: 8, observedAt }).ok, true);
  const current = api.post('getCustomerLocation', viewer); assert.equal(current.paused, false); assert.equal(current.updatedAt, observedAt); assert.equal(current.latitude, 4.6);
  assert.equal(api.post('updateCustomerLocation', { ...writer, ...order.liveLocation }).ok, true); assert.equal(api.post('getCustomerLocation', viewer).latitude, 4.6);
  assert.equal(api.post('updateCustomerLocation', { ...writer, latitude: 99, longitude: 0, accuracy: 8, observedAt }).ok, false);
  assert.equal(api.post('stopCustomerLocation', writer).ok, true); assert.equal(api.post('getCustomerLocation', viewer).active, false);
  assert.equal(api.sheets.get('Ubicaciones').rows[1][3], '');
  assert.equal(api.post('updateCustomerLocation', { ...writer, ...order.liveLocation }).ok, false);
  const next = api.post('createOrder', { order: orderFixture(api) }); api.advance(2 * 60 * 60 * 1000 + 1);
  assert.equal(api.post('getCustomerLocation', { ...viewer, orderId: next.orderId }).active, false);
});

test('deleting orders removes receipt files and invalidates location links, including bulk deletion', () => {
  const api = createBackend();
  const first = api.post('createOrder', { order: orderFixture(api) });
  assert.equal(api.post('deleteOrder', { token: 'orders-token', orderId: first.orderId }).ok, true);
  assert.equal(api.post('getCustomerLocation', { orderId: first.orderId, viewerToken: 'b'.repeat(64) }).ok, false);
  assert.equal([...api.files.values()][0].isTrashed(), true);
  api.post('createOrder', { order: orderFixture(api) }); api.post('createOrder', { order: orderFixture(api) });
  assert.equal(api.post('deleteAllOrders', { token: 'orders-token' }).deletedCount, 2);
  assert.equal(api.sheets.get('Ubicaciones').rows.length, 1);
  assert.ok([...api.files.values()].every(file => file.isTrashed()));
});

test('admin links support create, edit, sorting, hiding, deletion and independent permissions', () => {
  const api = createBackend();
  const link = { title: 'Instagram', subtitle: 'Síguenos', url: 'https://instagram.com/juanelos', kind: 'instagram', sortOrder: 2, active: true };
  assert.equal(api.post('mutateBrandLink', { token: 'orders-token', operation: 'save', link }).ok, false);
  const created = api.post('mutateBrandLink', { token: 'links-token', operation: 'save', link }); assert.equal(created.ok, true);
  const id = created.links[0].id;
  assert.equal(api.post('getPublicLinks').links[0].url, link.url);
  assert.equal(api.post('mutateBrandLink', { token: 'links-token', operation: 'save', link: { ...link, id, url: 'https://instagram.com/juanelosoficial', active: false } }).ok, true);
  assert.equal(api.post('getPublicLinks').links.length, 0);
  for (const url of ['javascript:alert(1)', 'http://example.com', 'https://user:pass@example.com', 'https://example.com/<script>']) assert.equal(api.post('mutateBrandLink', { token: 'links-token', operation: 'save', link: { ...link, url } }).ok, false);
  assert.equal(api.post('getBrandLinks', { token: 'links-token' }).links.length, 1);
  assert.equal(api.post('mutateBrandLink', { token: 'links-token', operation: 'delete', link: { id } }).links.length, 0);
});
