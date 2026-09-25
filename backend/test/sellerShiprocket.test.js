import test from 'node:test';
import assert from 'node:assert/strict';
import { syncSellerShipRocket } from '../src/controllers/sellerController.js';
import Product from '../src/models/Product.js';
import Order from '../src/models/Order.js';
import ShipRocketSetting from '../src/models/ShipRocketSetting.js';

function setup(t, createResponse, awbResponse = { response: { data: { awb_code: 'AWB123' } } }) {
  const product = { _id: 'product', length: 10, breadth: 10, height: 10, actualWeight: 1 };
  const order = { orderNumber: 'ORD1', items: [{ product: 'product', sellerStatus: 'Ready to Dispatch', price: 100, quantity: 1 }], shipping: { syncPayload: {} }, address: { name: 'Customer', email: 'customer@example.com', phone: '9876543210', postalCode: '400001', city: 'Mumbai', state: 'Maharashtra', shippingAddress: 'Delivery address' }, payment: { provider: 'cod' }, timeline: [], save: async () => {} };
  const calls = [];
  t.mock.method(Product, 'find', () => ({ distinct: async () => ['product'], select: async () => [product] }));
  t.mock.method(Order, 'findOne', () => ({ populate: async () => order }));
  t.mock.method(ShipRocketSetting, 'findOne', async () => ({ email: 'api@example.com', password: 'test', preferredCourierId: '999' }));
  t.mock.method(globalThis, 'fetch', async (url, options) => {
    calls.push({ url: String(url), body: options?.body ? JSON.parse(options.body) : null });
    const data = url.includes('/auth/login') ? { token: 'token' }
      : url.includes('/serviceability/') ? { data: { available_courier_companies: [{ courier_company_id: 7, rate: 80 }] } }
      : url.includes('/create/adhoc') ? createResponse
      : url.includes('/assign/awb') ? awbResponse : {};
    return { ok: true, status: 200, json: async () => data };
  });
  const seller = { _id: 'seller', shippingMode: 'shiprocket', sellerNumber: 'S1', address: 'Pickup address', city: 'Delhi', state: 'Delhi', pinCode: '110001', mobile: '9876543210' };
  const run = () => new Promise((resolve, reject) => syncSellerShipRocket({ seller, params: { orderId: 'order' } }, { status() { return this; }, json: resolve }, reject));
  return { run, calls, order };
}

test('HTTP success without a shipment ID surfaces validation errors and never assigns AWB', async t => {
  const { run, calls } = setup(t, { errors: { billing_address: ['Invalid address'] } });
  await assert.rejects(run(), /billing_address: Invalid address/);
  assert.equal(calls.some(call => call.url.includes('/assign/awb')), false);
});

test('nested shipment response uses a serviceable courier instead of unavailable preference', async t => {
  const { run, calls, order } = setup(t, { data: { order_id: 123, shipment_id: 456 } });
  await run();
  assert.equal(order.shipping.shipmentId, '456');
  assert.equal(order.shipping.awbCode, 'AWB123');
  assert.equal(calls.find(call => call.url.includes('/assign/awb')).body.courier_id, 7);
});

test('AWB rejection retains shipment ID and retries without creating a second order', async t => {
  const { run, calls, order } = setup(t, { order_id: 123, shipment_id: 456 }, { message: 'Insufficient wallet balance' });
  await assert.rejects(run(), /Insufficient wallet balance/);
  assert.equal(order.shipping.shipmentId, '456');
  await assert.rejects(run(), /Insufficient wallet balance/);
  assert.equal(calls.filter(call => call.url.includes('/create/adhoc')).length, 1);
});

test('missing shipment data and address fields are named before contacting ShipRocket', async t => {
  const { run, calls, order } = setup(t, {});
  delete order.shipping.syncPayload;
  order.address.city = '';
  order.address.phone = '';
  await assert.rejects(run(), error => {
    assert.doesNotMatch(error.message, /shipping.syncPayload/);
    assert.match(error.message, /Delivery city/);
    assert.match(error.message, /Customer phone number/);
    assert.doesNotMatch(error.message, /Delivery state/);
    return true;
  });
  assert.equal(calls.length, 0);
});

test('parcel diagnostics identify the product and only its invalid measurements', async t => {
  const { run, calls } = setup(t, {});
  t.mock.method(Product, 'find', () => ({ distinct: async () => ['product'], select: async () => [{ _id: 'product', length: 10, breadth: 0, height: 10, actualWeight: 0 }] }));
  await assert.rejects(run(), /product: Width, Actual Weight/);
  assert.equal(calls.length, 0);
});

 test('legacy seller order without saved payload is rebuilt and dispatched', async t => {
  const { run, calls, order } = setup(t, { order_id: 123, shipment_id: 456 });
  delete order.shipping.syncPayload;
  await run();
  const payload = calls.find(call => call.url.includes('/create/adhoc')).body;
  assert.equal(payload.payment_method, 'COD');
  assert.equal(payload.shipping_is_billing, false);
  assert.equal(payload.billing_country, 'India');
  assert.equal(payload.weight, 1);
 });
