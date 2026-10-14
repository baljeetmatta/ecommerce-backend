import test from 'node:test';
import assert from 'node:assert/strict';
import StorefrontSetting from '../src/models/StorefrontSetting.js';
import { updateStorefrontSettings } from '../src/controllers/settingsController.js';

const invoke = (body) => new Promise((resolve, reject) => {
  updateStorefrontSettings({ body }, { json: resolve }, reject);
});

test('storefront save retains the WhatsApp number and returns it after reloading', async (t) => {
  const settings = new StorefrontSetting({});
  let persisted;
  t.mock.method(StorefrontSetting, 'findOne', async () => settings);
  t.mock.method(settings, 'save', async () => {
    await settings.validate();
    persisted = settings.toObject();
  });
  const query = { populate() { return this; }, then(resolve, reject) { return Promise.resolve(new StorefrontSetting(persisted)).then(resolve, reject); } };
  t.mock.method(StorefrontSetting, 'findById', () => query);

  const saved = await invoke({ whatsappSupportNumber: '+91 98765 43210' });
  assert.equal(persisted.whatsappSupportNumber, '919876543210');
  assert.equal(saved.whatsappSupportNumber, '919876543210');

  const cleared = await invoke({ whatsappSupportNumber: '' });
  assert.equal(cleared.whatsappSupportNumber, '');
});

test('invalid WhatsApp numbers fail validation', () => {
  for (const value of ['abc', '0000000000', '123', '1234567890123456']) {
    const settings = new StorefrontSetting({ whatsappSupportNumber: value });
    assert.ok(settings.validateSync()?.errors.whatsappSupportNumber);
  }
});
