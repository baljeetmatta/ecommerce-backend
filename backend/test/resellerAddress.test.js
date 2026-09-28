import test from 'node:test';
import assert from 'node:assert/strict';
import { updateResellerAddress } from '../src/controllers/resellerController.js';
const invoke = (req) => new Promise((resolve, reject) => updateResellerAddress(req, { status() { return this; }, json: resolve }, reject));
test('reseller address can be updated after KYC approval without modifying identity or wallet', async () => {
  const reseller = { address: 'Old', city: 'Delhi', status: 'active', walletBalance: 100, kyc: { status: 'approved' }, save: async () => {} };
  await invoke({ reseller, body: { address: ' New address ', city: ' Mumbai ', walletBalance: 999, status: 'suspended' } });
  assert.equal(reseller.address, 'New address'); assert.equal(reseller.city, 'Mumbai');
  assert.equal(reseller.walletBalance, 100); assert.equal(reseller.status, 'active'); assert.equal(reseller.kyc.status, 'approved');
});
test('empty, oversized and non-text addresses are rejected', async () => {
  for (const address of ['', ' ', {}, 'a'.repeat(1001)]) await assert.rejects(invoke({ reseller: {}, body: { address, city: 'Delhi' } }), /complete address/);
});
