import test from 'node:test';
import assert from 'node:assert/strict';
import StorefrontSetting from '../src/models/StorefrontSetting.js';
import { updateStorefrontSettings } from '../src/controllers/settingsController.js';

const save = body => new Promise((resolve, reject) => updateStorefrontSettings({ body }, { json: resolve }, reject));

test('sale banner can be disabled and re-enabled across settings reloads', async t => {
  let stored = new StorefrontSetting({ promoBanner: { imageUrl: '/uploads/sale.webp', linkUrl: '#/products' }, shopName: 'Keep this store name' }).toObject();
  t.mock.method(StorefrontSetting, 'findOne', async () => {
    const document = StorefrontSetting.hydrate(stored);
    document.save = async () => { await document.validate(); stored = document.toObject(); return document; };
    return document;
  });
  t.mock.method(StorefrontSetting, 'findById', () => ({ populate: () => ({ populate: async () => StorefrontSetting.hydrate(stored) }) }));
  for (const isActive of [false, true, false]) {
    const result = await save({ promoBanner: { ...stored.promoBanner, isActive }, showBenefitItems: false });
    assert.equal(result.promoBanner.isActive, isActive);
    assert.equal(StorefrontSetting.hydrate(stored).promoBanner.isActive, isActive);
    assert.equal(result.promoBanner.imageUrl, '/uploads/sale.webp');
    assert.equal(result.shopName, 'Keep this store name');
    assert.equal(result.showBenefitItems, false);
  }
});

test('visibility can be saved before a sale banner image is uploaded', async () => {
  const document = new StorefrontSetting({ promoBanner: { imageUrl: '', isActive: true } });
  await document.validate();
  assert.equal(document.toObject().promoBanner.isActive, true);
});

test('banner dimensions can be cleared, saved and reloaded as automatic', async t => {
  let stored = new StorefrontSetting({ homeSections: [{ title: 'Banner', type: 'custom_banner', items: [{ imageUrl: '/banner.jpg', imageWidth: 800, imageHeight: 300 }] }] }).toObject();
  t.mock.method(StorefrontSetting, 'findOne', async () => {
    const document = StorefrontSetting.hydrate(stored);
    document.save = async () => { await document.validate(); stored = document.toObject(); return document; };
    return document;
  });
  t.mock.method(StorefrontSetting, 'findById', () => ({ populate: () => ({ populate: async () => StorefrontSetting.hydrate(stored) }) }));
  for (const blank of [null, '', ' ', undefined]) {
    await save({ homeSections: [{ ...stored.homeSections[0], items: [{ imageUrl: '/banner.jpg', imageWidth: 800, imageHeight: 300 }] }] });
    const result = await save({ homeSections: [{ ...stored.homeSections[0], items: [{ imageUrl: '/banner.jpg', imageWidth: blank, imageHeight: blank }] }] });
    assert.equal(result.homeSections[0].items[0].imageWidth, undefined);
    assert.equal(result.homeSections[0].items[0].imageHeight, undefined);
    assert.equal(result.homeSections[0].items[0].imageUrl, '/banner.jpg');
  }
});
