import test from 'node:test';
import assert from 'node:assert/strict';
import { resolveAdminPickup } from '../src/services/adminPickupService.js';

const primary = { pickup_location: 'primary', address: '10 Main Road', city: 'Delhi', state: 'Delhi', pin_code: '110001', is_default: 1, phone_verified: 1, is_active: 1 };
const replyWith = (t, locations) => t.mock.method(globalThis, 'fetch', async () => ({ ok: true, json: async () => ({ data: { shipping_address: locations } }) }));

test('admin uses the verified primary address instead of a legacy manual selection', async (t) => {
  replyWith(t, [{ ...primary, pickup_location: 'other', is_default: 0 }, primary]);
  const result = await resolveAdminPickup({ pickupLocation: 'other' }, 'token');
  assert.equal(result.alias, 'primary');
  assert.deepEqual(result.pickup, { address: primary.address, city: primary.city, state: primary.state, pinCode: '110001' });
});

for (const flag of [true, 1, '1']) {
  test(`primary and verification flags support ${String(flag)} (${typeof flag})`, async (t) => {
    replyWith(t, [{ ...primary, is_default: flag, phone_verified: flag }]);
    assert.equal((await resolveAdminPickup({}, 'token')).alias, 'primary');
  });
}

for (const patch of [{ is_default: 0 }, { phone_verified: 0 }, { phone_verified: 'false' }, { is_active: 0 }, { is_active: '0' }, { is_active: false }, { pickup_location: '' }]) {
  test(`admin cannot ship from an unsuitable primary address: ${JSON.stringify(patch)}`, async (t) => {
    replyWith(t, [{ ...primary, ...patch }, { ...primary, pickup_location: 'secondary', is_default: 0 }]);
    await assert.rejects(resolveAdminPickup({}, 'token'), /primary\/default pickup address/);
  });
}

test('missing primary address requires ShipRocket configuration', async (t) => {
  replyWith(t, []);
  await assert.rejects(resolveAdminPickup({}, 'token'), /phone verification/);
});
