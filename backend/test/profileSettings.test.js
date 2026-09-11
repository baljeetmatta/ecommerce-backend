import test from 'node:test';
import assert from 'node:assert/strict';
import router from '../src/routes/profileSettingsRoutes.js';
import ProfileSettings from '../src/models/ProfileSettings.js';
const patch = router.stack.find(layer => layer.route?.path === '/:role' && layer.route.methods.patch).route.stack[0].handle;
const call = body => new Promise((resolve, reject) => {
  const res = { statusCode: 200, status(code) { this.statusCode = code; return this; }, json(data) { resolve({ status: this.statusCode, data }); } };
  patch({ body, profileRole: 'seller', seller: { _id: '507f1f77bcf86cd799439011' } }, res, reject);
});
test('rejects unsupported fields, non-booleans and empty updates', async () => {
  for (const body of [{}, { account: 'another-account' }, { notifications: { email: 'false' } }, { notifications: { unknown: true } }, { privacy: [] }, null]) assert.equal((await call(body)).status, 400);
});
test('partial updates are scoped to the authenticated account and role', async () => {
  const original = ProfileSettings.findOneAndUpdate;
  let captured;
  ProfileSettings.findOneAndUpdate = async (...args) => { captured = args; return { notifications: { email: false }, privacy: {} }; };
  try {
    assert.equal((await call({ notifications: { email: false } })).status, 200);
    assert.deepEqual(captured[0], { accountType: 'seller', account: '507f1f77bcf86cd799439011' });
    assert.deepEqual(captured[1], { $set: { 'notifications.email': false } });
    assert.equal(captured[2].upsert, true);
    assert.equal(captured[2].runValidators, true);
  } finally { ProfileSettings.findOneAndUpdate = original; }
});
test('existing accounts receive safe defaults and an account uniqueness index', () => {
  const settings = new ProfileSettings({ accountType: 'partner', account: '507f1f77bcf86cd799439011' });
  assert.equal(settings.notifications.email, true);
  assert.equal(settings.notifications.whatsapp, false);
  assert.equal(settings.privacy.personalizedOffers, false);
  assert.equal(settings.validateSync(), undefined);
  assert.ok(ProfileSettings.schema.indexes().some(([keys, options]) => keys.accountType === 1 && keys.account === 1 && options.unique));
});
