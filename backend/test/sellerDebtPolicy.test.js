import test from 'node:test';
import assert from 'node:assert/strict';
import StorefrontSetting from '../src/models/StorefrontSetting.js';
import { sellerDebtLimit } from '../src/services/sellerDebtPolicy.js';
test('debt limit defaults to 500 and accepts configured values including zero', async (t) => {
 let settings = null;
 t.mock.method(StorefrontSetting, 'findOne', () => ({ select: () => ({ lean: async () => settings }) }));
 assert.equal(await sellerDebtLimit(), 500);
 settings = {sellerSettlement:{walletDebtLimit:1000}};
 assert.equal(await sellerDebtLimit(),1000);
 settings.sellerSettlement.walletDebtLimit=0;
 assert.equal(await sellerDebtLimit(),0);
 const invalid = new StorefrontSetting({sellerSettlement:{walletDebtLimit:-1}});
 assert.ok(invalid.validateSync().errors['sellerSettlement.walletDebtLimit']);
});
