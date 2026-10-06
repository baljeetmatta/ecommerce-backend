import test from 'node:test';
import assert from 'node:assert/strict';
import AddressChange from '../src/models/AddressChange.js';
import AddressProof from '../src/models/AddressProof.js';
import Seller from '../src/models/Seller.js';
import ShipRocketSetting from '../src/models/ShipRocketSetting.js';
import { validateAddress, escapedSearch } from '../src/utils/addressChange.js';
import { applyApprovedAddress, reviewAddressChange, submitAddressChange } from '../src/controllers/addressChangeController.js';
const address = { houseNumber: '12', roadArea: 'Road 7', city: 'Gohana', state: 'Haryana', pinCode: '131301' };
const owner = '507f1f77bcf86cd799439011';
const requestId = '507f1f77bcf86cd799439012';
test('uploaded image and PDF proof metadata validates as an embedded document', async () => {
  for (const type of ['image/png', 'application/pdf']) {
    const proof = { url: 'http://localhost:5001/uploads/general/2026-10/proof.webp', name: 'imagefit.png', type };
    const item = new AddressChange({ role: 'seller', owner, proof });
    await item.validate();
    assert.deepEqual(item.proof.toObject(), proof);
  }
});
const call = (handler, req) => new Promise(resolve => {
  const res = { statusCode: 200, status(code) { this.statusCode = code; return this; }, json(data) { resolve({ status: this.statusCode, data }); } };
  handler(req, res, error => resolve({ status: res.statusCode, error }));
});
test('validates address fields and pickup, ignores injected fields', () => {
  const value = validateAddress({ ...address, status: 'approved', owner: 'other' }, 'seller');
  assert.equal(value.address, '12, Road 7'); assert.equal(value.pickupAddress, value.address); assert.equal(value.status, undefined);
  for (const value of [{ ...address, pinCode: '123' }, { ...address, state: '' }, { ...address, pickupSameAsBusiness: 'false' }, { ...address, pickupSameAsBusiness: false }]) assert.throws(() => validateAddress(value, 'seller'));
  assert.equal(validateAddress(address, 'reseller').pickupAddress, undefined);
  assert.equal(escapedSearch('a.*[b]'), 'a\\.\\*\\[b\\]');
});
test('pending request index prevents duplicate requests for the same owner and role', () => {
  assert.ok(AddressChange.schema.indexes().some(([fields, options]) => fields.role === 1 && fields.owner === 1 && options.unique && options.partialFilterExpression.status === 'pending'));
});
test('submission requires proof belonging to the authenticated account', async () => {
  const original = AddressProof.findOne; const originalExists = AddressChange.exists; let filter;
  AddressChange.exists = async () => null;
  AddressProof.findOne = async value => { filter = value; return null; };
  try {
    const result = await call(submitAddressChange, { seller: { _id: owner }, body: { address, proofId: requestId, owner: 'attacker' } });
    assert.equal(result.status, 400); assert.equal(String(filter.owner), owner); assert.equal(filter.role, 'seller');
  } finally { AddressProof.findOne = original; AddressChange.exists = originalExists; }
});
test('rejection needs a reason and reviewed requests cannot be reviewed again', async () => {
  assert.equal((await call(reviewAddressChange, { params: { id: requestId }, body: { status: 'rejected' } })).status, 400);
  const original = AddressChange.findOneAndUpdate; let filter;
  AddressChange.findOneAndUpdate = async value => { filter = value; return null; };
  try {
    assert.equal((await call(reviewAddressChange, { params: { id: requestId }, body: { status: 'approved' }, user: { _id: owner } })).status, 409);
    assert.equal(filter.status, 'pending');
  } finally { AddressChange.findOneAndUpdate = original; }
});
test('approval applies the profile with a version guard and records failed sync for retry', async () => {
  const originals = [Seller.findById, Seller.findOneAndUpdate, ShipRocketSetting.findOne];
  const proposed = { ...validateAddress(address, 'seller') }; let mutation;
  const item = { _id: requestId, owner, role: 'seller', previousVersion: 0, previous: { toObject: () => ({ address: 'Old', city: 'Delhi' }) }, proposed: { toObject: () => proposed }, save: async () => item };
  Seller.findById = async () => ({ address: 'Old' });
  Seller.findOneAndUpdate = async (filter, update) => { mutation = { filter, update }; return { ...proposed, addressChangeRequestId: requestId }; };
  ShipRocketSetting.findOne = async () => null;
  try {
    await applyApprovedAddress(item);
    assert.equal(mutation.filter.address, 'Old'); assert.equal(mutation.filter.$or[0].addressVersion, 0);
    assert.equal(mutation.update.$inc.addressVersion, 1); assert.equal(mutation.update.$set.addressChangeRequestId, requestId);
    assert.ok(item.profileAppliedAt); assert.equal(item.syncStatus, 'failed'); assert.match(item.syncError, /not configured/);
    Seller.findById = async () => ({ ...proposed, addressChangeRequestId: requestId });
    Seller.findOneAndUpdate = async () => { throw new Error('Retry must not apply twice'); };
    await applyApprovedAddress(item);
    assert.equal(item.syncStatus, 'failed');
    Seller.findById = async () => ({ addressChangeRequestId: 'a-newer-request' });
    await applyApprovedAddress(item); assert.equal(item.syncStatus, 'superseded');
  } finally { [Seller.findById, Seller.findOneAndUpdate, ShipRocketSetting.findOne] = originals; }
});
test('address changed since submission cannot be overwritten on approval', async () => {
  const originals = [Seller.findById, Seller.findOneAndUpdate];
  Seller.findById = async () => ({ address: 'Newer address' }); Seller.findOneAndUpdate = async () => null;
  try { await assert.rejects(applyApprovedAddress({ role: 'seller', owner, _id: requestId, previousVersion: 0, previous: { toObject: () => ({ address: 'Old' }) }, proposed: { toObject: () => address } }), /changed since/); }
  finally { [Seller.findById, Seller.findOneAndUpdate] = originals; }
});
test('rejection records reviewer and reason without applying a profile', async () => {
  const original = AddressChange.findOneAndUpdate; let update;
  AddressChange.findOneAndUpdate = async (_filter, value) => { update = value; return { status: 'rejected' }; };
  try {
    const result = await call(reviewAddressChange, { params: { id: requestId }, body: { status: 'rejected', note: 'Document address does not match' }, user: { _id: owner } });
    assert.equal(result.status, 200); assert.equal(result.data.status, 'rejected'); assert.equal(update.$set.reviewNote, 'Document address does not match'); assert.equal(update.$set.reviewedBy, owner); assert.ok(update.$set.reviewedAt);
  } finally { AddressChange.findOneAndUpdate = original; }
});

test('pending requests block new submissions for both sellers and resellers before proof or address processing', async () => {
  const original = AddressChange.exists;
  let filter;
  AddressChange.exists = async value => { filter = value; return { _id: requestId }; };
  try {
    for (const role of ['seller', 'reseller']) {
      const result = await call(submitAddressChange, { [role]: { _id: owner }, body: {} });
      assert.equal(result.status, 409);
      assert.match(result.error.message, /approves or rejects/);
      assert.equal(filter.role, role); assert.equal(filter.owner, owner); assert.equal(filter.status, 'pending');
    }
  } finally { AddressChange.exists = original; }
});
