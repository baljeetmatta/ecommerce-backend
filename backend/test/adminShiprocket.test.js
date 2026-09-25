import test from 'node:test';
import assert from 'node:assert/strict';
import { syncShipRocketOrder } from '../src/controllers/orderController.js';
import Product from '../src/models/Product.js';
import Order from '../src/models/Order.js';
import ShipRocketSetting from '../src/models/ShipRocketSetting.js';

function setup(t, savedPayload) {
  const order = { orderNumber: 'ORD1', grandTotal: 200, items: [{ product: 'p1', name: 'Parcel', sku: 'SKU', quantity: 2, price: 100 }], shipping: { syncPayload: savedPayload }, address: { name: 'Customer', email: 'customer@example.com', phone: '+91 9876543210', shippingAddress: 'Delivery street', city: 'Mumbai', state: 'Maharashtra', postalCode: '400001' }, payment: { provider: 'cod' }, timeline: [], save: async () => {}, populate: async () => {} };
  const product = { _id: 'p1', length: 10, breadth: 5, height: 2, dimensionUnit: 'in', actualWeight: 500, weightUnit: 'g' };
  const calls = [];
  let failAwb = false;
  t.mock.method(Order, 'findById', async () => order);
  t.mock.method(Product, 'find', () => ({ select: async () => [product] }));
  t.mock.method(ShipRocketSetting, 'findOne', async () => ({ email: 'api@example.com', password: 'test' }));
  t.mock.method(globalThis, 'fetch', async (url, options) => {
    calls.push({ url, body: JSON.parse(options.body) });
    const data = url.includes('/auth/login') ? { token: 'token' }
      : url.includes('/create/adhoc') ? { order_id: 123, shipment_id: 456 }
      : url.includes('/assign/awb') ? (failAwb ? { message: 'Wallet balance' } : { response: { data: { awb_code: 'AWB' } } })
      : { label_url: 'https://example.com/label', manifest_url: 'https://example.com/manifest' };
    return { ok: !(failAwb && url.includes('/assign/awb')), json: async () => data };
  });
  const run = () => new Promise((resolve, reject) => syncShipRocketOrder({ params: { id: 'order' }, user: { _id: 'admin' } }, { status() { return this; }, json: resolve }, reject));
  return { run, calls, order, product, rejectAwb: () => { failAwb = true; } };
}

for (const saved of [undefined, { billing_customer_name: 'Customer', sub_total: 200 }]) {
  test(`admin dispatch repairs ${saved ? 'incomplete' : 'missing'} saved payload`, async t => {
    const { run, calls } = setup(t, saved);
    await run();
    const payload = calls.find(call => call.url.includes('/create/adhoc')).body;
    assert.equal(payload.shipping_is_billing, false);
    assert.equal(payload.billing_last_name, '');
    assert.equal(payload.billing_country, 'India');
    assert.equal(payload.shipping_address, 'Delivery street');
    assert.equal(payload.billing_phone, '9876543210');
    assert.equal(payload.length, 25.4);
    assert.equal(payload.breadth, 12.7);
    assert.equal(payload.height, 5.08);
    assert.equal(payload.weight, 1);
    assert.equal(payload.payment_method, 'COD');
    assert.equal(payload.sub_total, 200);
    assert.equal('channel_id' in payload, false);
  });
}

test('admin dispatch names missing product data before external requests', async t => {
  const { run, calls, product } = setup(t);
  product.actualWeight = 0;
  await assert.rejects(run(), /Parcel: actualWeight/);
  assert.equal(calls.length, 0);
});

test('admin retry reuses a shipment after AWB assignment fails', async t => {
  const { run, calls, order, rejectAwb } = setup(t);
  rejectAwb();
  await assert.rejects(run(), /Wallet balance/);
  assert.equal(order.shipping.shipmentId, 456);
  await assert.rejects(run(), /Wallet balance/);
  assert.equal(calls.filter(call => call.url.includes('/create/adhoc')).length, 1);
});
