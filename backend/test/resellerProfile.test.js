import test from 'node:test';
import assert from 'node:assert/strict';
import Customer from '../src/models/Customer.js';
import { me } from '../src/controllers/resellerController.js';

const invoke = (req) => new Promise((resolve, reject) => me(req, { json: resolve }, reject));

test('reseller profile loads using authenticated reseller customer without req.customer', async (t) => {
  const reseller = { customer: 'customer1', resellerId: 'HRR123456', kyc: {}, toObject() { return { customer: this.customer, resellerId: this.resellerId }; } };
  t.mock.method(Customer, 'findById', (id) => {
    assert.equal(id, 'customer1');
    return { select: async () => ({ profileImage: '/uploads/profile.jpg' }) };
  });
  const result = await invoke({ reseller });
  assert.equal(result.resellerId, 'HRR123456');
  assert.equal(result.profileImage, '/uploads/profile.jpg');
});

test('reseller profile tolerates a missing customer image', async (t) => {
  t.mock.method(Customer, 'findById', () => ({ select: async () => null }));
  const result = await invoke({ reseller: { customer: 'customer1', kyc: {}, toObject: () => ({ resellerId: 'HRR123456' }) } });
  assert.equal(result.profileImage, '');
});
