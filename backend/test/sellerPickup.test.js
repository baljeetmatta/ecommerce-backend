import test from 'node:test';
import assert from 'node:assert/strict';
import { ensureSellerPickup, registerVerifiedSellerPickup } from '../src/services/sellerPickupService.js';
import ShipRocketSetting from '../src/models/ShipRocketSetting.js';
const seller = { _id: 's1', sellerNumber: 'S1', approvalStatus: 'approved', name: 'Seller', email: 'seller@example.com', mobile: '9876543210', address: '10 Main Road', city: 'Delhi', state: 'Delhi', pinCode: '110001' };
const remote = { pickup_location: 'existing-warehouse', address: ' 10   MAIN Road ', city: 'delhi', state: 'Delhi', pin_code: 110001, is_active: 1 };
test('verification reuses matching address under another alias without adding a duplicate', async t => {
  const calls = [];
  t.mock.method(ShipRocketSetting, 'findOne', async () => ({ email: 'api', password: 'secret' }));
  t.mock.method(globalThis, 'fetch', async url => { calls.push(url); return { ok: true, json: async () => url.includes('/login') ? { token: 'token' } : { data: { shipping_address: [remote] } } }; });
  await registerVerifiedSellerPickup(seller);
  assert.equal(calls.some(url => url.includes('addpickup')), false);
  assert.equal((await ensureSellerPickup(seller, 'token')).alias, 'existing-warehouse');
});
test('registers separate pickup address only when no active matching location exists', async t => {
  let added;
  t.mock.method(globalThis, 'fetch', async (url, options) => { if (options.body) added = JSON.parse(options.body); return { ok: true, json: async () => ({ data: { shipping_address: [remote] } }) }; });
  const result = await ensureSellerPickup({ ...seller, pickupSameAsBusiness: false, pickupAddress: '20 New Road', pickupCity: 'Mumbai', pickupState: 'Maharashtra', pickupPinCode: '400001' }, 'token');
  assert.equal(added.address, '20 New Road');
  assert.equal(result.alias, added.pickup_location);
});
test('failed pickup registration is surfaced instead of silently approving', async t => {
  t.mock.method(globalThis, 'fetch', async (url, options) => ({ ok: true, json: async () => options.body ? { success: false, message: 'Invalid pickup' } : { data: { shipping_address: [] } } }));
  await assert.rejects(ensureSellerPickup(seller, 'token'), /Invalid pickup/);
});
test('unverified sellers never contact ShipRocket', async t => {
  t.mock.method(ShipRocketSetting, 'findOne', () => { throw new Error('Unexpected settings lookup'); });
  await registerVerifiedSellerPickup({ ...seller, approvalStatus: 'pending' });
});
