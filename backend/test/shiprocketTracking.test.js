import test from 'node:test';
import assert from 'node:assert/strict';
import { applyShiprocketTracking, refreshShiprocketTracking, generateShiprocketDocument, synchronizeShiprocketOrders } from '../src/services/shiprocketTrackingService.js';
import { sellerPickupDetails } from '../src/services/shiprocketService.js';
import { getAuthorizedShipment, downloadShipmentDocument } from '../src/controllers/shiprocketController.js';
import Order from '../src/models/Order.js';
import Product from '../src/models/Product.js';
import ShipRocketSetting from '../src/models/ShipRocketSetting.js';

const fixture = () => ({ _id: 'order', orderNumber: 'ORD1', status: 'Shipped', items: [{ product: 'product', seller: 'seller', sellerStatus: 'Shipped', returnApplicable: true, returnDays: 7 }], shipping: { shipmentId: '456', shiprocketOrderId: '123', awbCode: 'AWB' }, timeline: [], save: async () => {} });
const tracking = (status, extra = {}) => ({ shipment_status: 7, shipment_track: [{ current_status: status, ...extra }], shipment_track_activities: [{ date: '2026-09-25 10:00:00', activity: status, location: 'Delhi' }] });

test('delivery sync updates order, items and return deadline once', () => {
  const order = fixture();
  const data = tracking('DELIVERED', { delivered_date: '2026-09-25 10:00:00' });
  applyShiprocketTracking(order, data);
  assert.equal(order.status, 'Delivered');
  assert.equal(order.items[0].sellerStatus, 'Delivered');
  assert.equal(order.items[0].deliveredAt.toISOString(), '2026-09-25T04:30:00.000Z');
  assert.equal(order.items[0].returnWindowClosesAt.toISOString(), '2026-10-02T04:30:00.000Z');
  applyShiprocketTracking(order, data, new Date('2026-10-01'));
  assert.equal(order.timeline.length, 1);
  assert.equal(order.items[0].returnWindowClosesAt.toISOString(), '2026-10-02T04:30:00.000Z');
});

test('stale status never regresses delivery or completed and returned items', () => {
  const order = fixture();
  order.status = 'Delivered';
  order.items = ['Completed', 'Return Requested', 'Returned', 'Delivered'].map(sellerStatus => ({ sellerStatus }));
  applyShiprocketTracking(order, tracking('IN TRANSIT'));
  assert.equal(order.status, 'Delivered');
  assert.deepEqual(order.items.map(item => item.sellerStatus), ['Completed', 'Return Requested', 'Returned', 'Delivered']);
});

test('RTO delivery is not treated as customer delivery', () => {
  const order = fixture();
  applyShiprocketTracking(order, tracking('RTO DELIVERED'));
  assert.equal(order.status, 'RTO');
  assert.equal(order.items[0].deliveredAt, undefined);
});

test('pickup scheduling does not mark a parcel delivered or shipped', () => {
  const order = fixture(); order.status = 'Packed'; order.items[0].sellerStatus = 'Packed';
  applyShiprocketTracking(order, tracking('PICKUP SCHEDULED'));
  assert.equal(order.status, 'Packed');
  assert.equal(order.shipping.carrierStatus, 'PICKUP SCHEDULED');
});

test('status refresh uses shipment tracking without creating an order', async t => {
  const calls = [];
  t.mock.method(globalThis, 'fetch', async (url, options) => {
    calls.push({ url, options });
    return { ok: true, json: async () => ({ tracking_data: tracking('OUT FOR DELIVERY') }) };
  });
  const order = fixture(); await refreshShiprocketTracking(order, 'token');
  assert.equal(order.status, 'Out for Delivery');
  assert.equal(calls.length, 1);
  assert.match(calls[0].url, /track\/shipment\/456$/);
  assert.equal(calls[0].options.method, 'GET');
});

for (const [kind, endpoint, key, body] of [
  ['label', 'courier/generate/label', 'label_url', { shipment_id: [456] }],
  ['invoice', 'orders/print/invoice', 'invoice_url', { ids: [123] }],
  ['manifest', 'manifests/generate', 'manifest_url', { shipment_id: [456] }]
]) test(`${kind} uses the correct ShipRocket ID and document API`, async t => {
  t.mock.method(globalThis, 'fetch', async (url, options) => {
    assert.ok(url.endsWith(endpoint)); assert.deepEqual(JSON.parse(options.body), body);
    return { ok: true, json: async () => ({ [key]: 'https://shiprocket.co/document.pdf' }) };
  });
  assert.equal(await generateShiprocketDocument(fixture(), 'token', kind), 'https://shiprocket.co/document.pdf');
});

test('document not ready is reported without replacing the saved URL', async t => {
  t.mock.method(globalThis, 'fetch', async () => ({ ok: true, json: async () => ({ label_created: 0 }) }));
  const order = fixture(); order.shipping.labelUrl = 'existing';
  await assert.rejects(generateShiprocketDocument(order, 'token', 'label'), /not made the label available/);
  assert.equal(order.shipping.labelUrl, 'existing');
});

test('seller authorization rejects another owner before requesting a document', async t => {
  const order = fixture();
  t.mock.method(Order, 'findById', async () => order);
  t.mock.method(Product, 'find', () => ({ select: async () => [{ _id: 'product', seller: 'seller' }] }));
  const res = { status(code) { this.statusCode = code; return this; } };
  await assert.rejects(getAuthorizedShipment({ seller: { _id: 'other' }, params: { orderId: 'order' } }, res), /Seller shipment not found/);
  assert.equal(res.statusCode, 404);
  assert.equal(await getAuthorizedShipment({ seller: { _id: 'seller' }, params: { orderId: 'order' } }, res), order);
});

test('pickup aliases follow the seller pickup address and change when it changes', () => {
  const seller = { sellerNumber: 'S1', address: 'Business', pickupSameAsBusiness: false, pickupAddress: 'Warehouse', pickupCity: 'Delhi', pickupState: 'Delhi', pickupPinCode: '110001' };
  const first = sellerPickupDetails(seller);
  assert.equal(first.pickup.address, 'Warehouse');
  assert.equal(first.alias, sellerPickupDetails(seller).alias);
  assert.notEqual(first.alias, sellerPickupDetails({ ...seller, pickupAddress: 'New warehouse' }).alias);
  assert.equal(sellerPickupDetails({ ...seller, pickupSameAsBusiness: true }).pickup.address, 'Business');
});

test('background sync continues after an individual tracking failure', async t => {
  const first = fixture(); const second = fixture(); second._id = 'second'; second.shipping.shipmentId = '789';
  const failures = [];
  t.mock.method(ShipRocketSetting, 'findOne', async () => ({ email: 'api', password: 'test' }));
  t.mock.method(Order, 'find', () => ({ sort: () => ({ limit: async () => [first, second] }) }));
  t.mock.method(Order, 'updateOne', async (...args) => failures.push(args));
  t.mock.method(globalThis, 'fetch', async url => ({ ok: true, json: async () => url.endsWith('auth/login') ? { token: 'token' } : { tracking_data: url.endsWith('456') ? { error: 'Not ready' } : tracking('DELIVERED') } }));
  await synchronizeShiprocketOrders();
  assert.equal(failures.length, 1);
  assert.equal(second.status, 'Delivered');
});

test('authorized document download returns a PDF without sharing API credentials', async t => {
  const order = fixture();
  t.mock.method(Order, 'findById', async () => order);
  t.mock.method(ShipRocketSetting, 'findOne', async () => ({ email: 'api', password: 'test' }));
  t.mock.method(globalThis, 'fetch', async (url, options) => {
    if (String(url).includes('document.pdf')) {
      assert.equal(options.headers, undefined);
      return { ok: true, body: (async function* () { yield Buffer.from('%PDF-1.4\nfixture'); })() };
    }
    return { ok: true, json: async () => String(url).includes('auth/login') ? { token: 'secret' } : { label_url: 'https://shiprocket.co/document.pdf' } };
  });
  const result = await new Promise((resolve, reject) => downloadShipmentDocument({ params: { id: 'order', kind: 'label' } }, { statusCode: 200, status(code) { this.statusCode = code; return this; }, json: resolve }, reject));
  assert.equal(result.filename, 'ORD1-label.pdf');
  assert.equal(Buffer.from(result.data, 'base64').toString(), '%PDF-1.4\nfixture');
});
