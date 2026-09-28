import test from 'node:test';
import assert from 'node:assert/strict';
import Product from '../src/models/Product.js';
import Seller from '../src/models/Seller.js';
import StorefrontSetting from '../src/models/StorefrontSetting.js';
import ResellerLink from '../src/models/ResellerLink.js';
import { products, createLink, resolveLink } from '../src/controllers/resellerController.js';
const invoke = (handler, req = {}) => new Promise((resolve, reject) => handler(req, {status() {return this;}, json: resolve}, reject));
const settings = t => t.mock.method(StorefrontSetting, 'findOne', () => ({select: () => ({lean: async () => ({sellerSettlement: {walletDebtLimit: 500}})})}));
test('reseller catalog hides accounts below debt limit and restores them at the limit', async t => {
 settings(t);
 const rows = [{_id:'paused', seller:{approvalStatus:'approved',walletBalance:-501}}, {_id:'boundary',seller:{approvalStatus:'approved',walletBalance:-500}}, {_id:'admin'}];
 const query = {select: () => query, populate: () => query, sort: async () => rows};
 t.mock.method(Product, 'find', () => query);
 assert.deepEqual((await invoke(products)).map(p => p._id), ['boundary','admin']);
 rows[0].seller.walletBalance = 0;
 assert.equal((await invoke(products)).length, 3);
});
test('paused seller cannot create or resolve reseller links', async t => {
 settings(t);
 const product = {_id:'p1', seller:'s1', status:'active', approvalStatus:'approved', sellerEnabled:true};
 t.mock.method(Product, 'findById', async () => product);
 t.mock.method(Seller, 'exists', async filter => { assert.deepEqual(filter.walletBalance, {$gte:-500}); return null; });
 t.mock.method(ResellerLink, 'findOneAndUpdate', () => ({populate: async () => ({product})}));
 await assert.rejects(invoke(createLink, {body:{productId:'p1'}}), /not available/);
 await assert.rejects(invoke(resolveLink, {params:{code:'link'}}), /unavailable/);
});
