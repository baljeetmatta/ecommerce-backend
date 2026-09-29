import test from 'node:test';
import assert from 'node:assert/strict';
import { ensureSellerPickup, getSellerPickupVerification } from '../src/services/sellerPickupService.js';
import { checkSellerPickupVerification } from '../src/controllers/sellerPickupController.js';
import ShipRocketSetting from '../src/models/ShipRocketSetting.js';

const seller = { _id: 'seller1', sellerNumber: 'HRS123456', approvalStatus: 'approved', address: '10 Main Road', city: 'Delhi', state: 'Delhi', pinCode: '110001', mobile: '9876543210' };
const location = { pickup_location: 'warehouse', address: seller.address, city: seller.city, state: seller.state, pin_code: seller.pinCode, phone: seller.mobile, phone_verified: 1 };
const replyWith = (t, locations) => t.mock.method(globalThis, 'fetch', async () => ({ ok: true, json: async () => ({ data: { shipping_address: locations } }) }));
for (const value of [0, '0', undefined, false, 'false']) {
  test(`registered pickup remains unverified when phone_verified is ${String(value)}`, async (t) => {
    replyWith(t, [{ ...location, phone_verified: value }]);
    const result = await getSellerPickupVerification(seller, 'token');
    assert.equal(result.registered, true);
    assert.equal(result.status, 'unverified');
    assert.equal(result.requiresShiprocketPanel, true);
  });
}
test('verified phone and matching saved address are reported verified', async (t) => {
  replyWith(t, [location]);
  const result = await getSellerPickupVerification(seller, 'token');
  assert.equal(result.status, 'verified');
  assert.equal(result.verificationMethod, 'shiprocket_pickup_phone');
  assert.equal(result.requiresShiprocketPanel, false);
  assert.equal(result.phone, undefined);
});
test('another contact at a shared address cannot verify this seller', async (t) => {
  replyWith(t, [{ ...location, phone: '9123456789' }]);
  const result = await getSellerPickupVerification(seller, 'token');
  assert.equal(result.status, 'unverified');
  assert.match(result.message, /different contact number/);
});
test('changed or inactive address loses its verified state', async (t) => {
  replyWith(t, [location]);
  assert.equal((await getSellerPickupVerification({ ...seller, address: '20 New Road' }, 'token')).status, 'unverified');
  replyWith(t, [{ ...location, is_active: 0 }]);
  assert.equal((await getSellerPickupVerification(seller, 'token')).registered, false);
});
test('missing location is not registered or verified; checking performs no write', async (t) => {
  const fetch = replyWith(t, []);
  const result = await getSellerPickupVerification(seller, 'token');
  assert.equal(result.registered, false);
  assert.equal(result.status, 'unverified');
  assert.equal(fetch.mock.calls[0].arguments[1].method, 'GET');
});
test('pickup registration sends the ShipRocket verification flag to mark the address verified', async (t) => {
  const fetchCalls = [];
  t.mock.method(globalThis, 'fetch', async (url, init = {}) => {
    fetchCalls.push({ url, init });
    if (url.endsWith('/auth/login')) return { ok: true, json: async () => ({ token: 'token' }) };
    if (url.includes('settings/company/pickup')) return { ok: true, json: async () => ({ data: { shipping_address: [] } }) };
    if (url.includes('settings/company/addpickup')) return { ok: true, json: async () => ({ success: true, status: 1 }) };
    return { ok: true, json: async () => ({}) };
  });
  await ensureSellerPickup(seller, 'token');
  const addPickup = fetchCalls.find(({ url }) => url.includes('settings/company/addpickup'));
  assert.ok(addPickup);
  assert.equal(JSON.parse(addPickup.init.body).phone_verified, 1);
});
const invoke = (req) => new Promise((resolve, reject) => {
  const res = { statusCode: 200, status(code) { this.statusCode = code; return this; }, json(value) { resolve(value); } };
  checkSellerPickupVerification(req, res, (error) => { error.httpStatus = res.statusCode; reject(error); });
});
test('unapproved seller cannot register through verification endpoint', async (t) => {
  t.mock.method(ShipRocketSetting, 'findOne', () => { throw new Error('Must not contact ShipRocket'); });
  await assert.rejects(invoke({ method: 'POST', seller: { ...seller, approvalStatus: 'pending' } }), (error) => error.httpStatus === 409);
});
test('verification uses authenticated seller, ignoring supplied IDs and addresses', async (t) => {
  t.mock.method(ShipRocketSetting, 'findOne', async () => ({ email: 'api', password: 'test' }));
  t.mock.method(globalThis, 'fetch', async (url) => ({ ok: true, json: async () => url.endsWith('/auth/login') ? { token: 'token' } : { data: { shipping_address: [location] } } }));
  const result = await invoke({ method: 'GET', seller, body: { sellerId: 'someone-else', address: 'Other address' } });
  assert.equal(result.status, 'verified');
});
