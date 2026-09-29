import test from 'node:test';
import assert from 'node:assert/strict';
import Seller from '../src/models/Seller.js';
import { requestSellerRegistrationOtp, updateSellerByAdmin, approveSeller } from '../src/controllers/sellerController.js';
import { sellerDuplicateKeyMessage } from '../src/utils/sellerDuplicateMessage.js';
import { issueTaxVerificationToken } from '../src/services/gstVerificationService.js';
import ShipRocketSetting from '../src/models/ShipRocketSetting.js';

const body = { name: 'Seller', companyName: 'Test company', address: '10 Main Road', city: 'Delhi', state: 'Delhi', pinCode: '110001', mobile: '9876543210', email: 'seller@example.com', declarationAccepted: true };
const invoke = (handler, req) => new Promise((resolve, reject) => {
  const res = { statusCode: 200, status(code) { this.statusCode = code; return this; }, json(value) { resolve({ status: this.statusCode, value }); } };
  handler(req, res, (error) => { error.httpStatus = res.statusCode; reject(error); });
});
for (const [field, label] of [['email', 'Email'], ['mobile', 'Mobile number'], ['gstNumber', 'GSTIN']]) {
  test(`registration identifies duplicate ${field}`, async (t) => {
    const payload = { ...body };
    if (field === 'gstNumber') {
      Object.assign(payload, { isGstRegistered: true, gstNumber: '07ABCDE1234F1Z5', gstCertificate: '/uploads/test.pdf' });
      payload.taxVerificationToken = issueTaxVerificationToken({ kind: 'gstin', value: payload.gstNumber });
    }
    t.mock.method(Seller, 'find', () => ({ select: () => ({ lean: async () => [{ [field]: payload[field] }] }) }));
    await assert.rejects(invoke(requestSellerRegistrationOtp, { body: payload }), (error) => error.httpStatus === 409 && error.message === `${label} is already registered`);
    assert.equal(sellerDuplicateKeyMessage({ keyPattern: { [field]: 1 } }), `${label} is already registered`);
  });
}
test('registration lists simultaneous conflicts from different accounts', async (t) => {
  t.mock.method(Seller, 'find', () => ({ select: () => ({ lean: async () => [{ email: body.email }, { mobile: body.mobile }] }) }));
  await assert.rejects(invoke(requestSellerRegistrationOtp, { body }), /Email, Mobile number are already registered/);
});
test('admin update rejects a serialized React element before saving or calling ShipRocket', async (t) => {
  t.mock.method(Seller, 'findById', async () => new Seller(body));
  await assert.rejects(invoke(updateSellerByAdmin, { params: { id: 'test' }, body: { companyName: { props: { children: 'test' } } } }), (error) => error.httpStatus === 400 && error.message === 'companyName must be text');
});
test('approval surfaces ShipRocket permission errors and does not save approval', async (t) => {
  let saved = false;
  const seller = { ...body, commissionRate: 20, bankDetails: { accountType: 'current', accountNumber: '123456', ifsc: 'TEST0000001', bankName: 'Test', accountHolderName: 'Seller' }, kyc: Object.fromEntries(['pan', 'addressProof', 'aadharFront', 'aadharBack', 'cancelledCheque'].map((key) => [key, { status: 'approved' }])), save: async () => { saved = true; } };
  t.mock.method(Seller, 'findById', async () => seller);
  t.mock.method(ShipRocketSetting, 'findOne', async () => ({ email: 'api', password: 'test' }));
  t.mock.method(globalThis, 'fetch', async (url) => url.endsWith('/auth/login') ? { ok: true, json: async () => ({ token: 'test' }) } : { ok: false, status: 403, json: async () => ({ message: 'Unauthorized. You do not have permission for this action.' }) });
  await assert.rejects(invoke(approveSeller, { params: { id: 'test' }, user: { _id: 'admin' } }), /ShipRocket denied pickup-address access/);
  assert.equal(saved, false);
});

test('editing an approved seller company name does not require another pickup registration', async (t) => {
  const seller = new Seller({ ...body, approvalStatus: 'approved' });
  let saved = false;
  t.mock.method(Seller, 'findById', async () => seller);
  t.mock.method(seller, 'validate', async () => {});
  t.mock.method(seller, 'save', async () => { saved = true; return seller; });
  t.mock.method(ShipRocketSetting, 'findOne', () => { throw new Error('Unchanged pickup must not call ShipRocket'); });
  const result = await invoke(updateSellerByAdmin, { params: { id: 'test' }, body: { companyName: 'Updated company' } });
  assert.equal(saved, true);
  assert.equal(result.value.companyName, 'Updated company');
});
