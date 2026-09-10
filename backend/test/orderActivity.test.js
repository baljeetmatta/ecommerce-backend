import test from 'node:test';
import assert from 'node:assert/strict';
import Order from '../src/models/Order.js';
import { getOrderActivity, orderActivityFilters } from '../src/controllers/orderActivityController.js';
import { orders as resellerOrders } from '../src/controllers/resellerController.js';

for (const role of ['admin', 'seller', 'reseller']) {
 test(`${role} activity counts pending orders across pages and scopes recent orders`, async t => {
  const req = role === 'admin' ? {user:{role:'Super Admin'}} : {[role]:{_id:`${role}-id`}};
  const {scope,pending} = orderActivityFilters(req);
  if (role === 'seller') {
   assert.deepEqual(scope, {'items.seller':'seller-id'});
   assert.equal(pending.$or[0].items.$elemMatch.seller,'seller-id');
  }
  if (role === 'reseller') assert.deepEqual(scope, {'resellerAttribution.reseller':'reseller-id'});
  assert.deepEqual(pending.$or[0].items.$elemMatch.sellerStatus.$in,['Pending','Placed']);
  assert.ok(pending.status.$nin.includes('Cancelled'));
  t.mock.method(Order,'countDocuments',async filter => {assert.deepEqual(filter,pending);return 137;});
  const filters=[];
  t.mock.method(Order,'find',filter=>{
   filters.push(filter);
   return {select(fields){assert.equal(fields,'orderNumber createdAt');return this;},sort(){return this;},limit(){return this;},lean:async()=>[{_id:'order-id',orderNumber:'ORD-1'}]};
  });
  const result = await new Promise((resolve,reject)=>getOrderActivity(req,{set(){},json:resolve,status(){return this;}},reject));
  assert.equal(result.pendingCount,137);
  assert.deepEqual(filters,[scope,pending]);
 });
}
test('unscoped non-admin activity is forbidden', async t => {
 const find = t.mock.method(Order,'find',()=>{throw new Error('Must not query');});
 await assert.rejects(new Promise((resolve,reject)=>getOrderActivity({user:{role:'Staff'}},{status(code){assert.equal(code,403);return this;},json:resolve},reject)),/not available/);
 assert.equal(find.mock.callCount(),0);
});
test('reseller return evidence is selected only from attributed orders', async t => {
 const evidence=[{category:'Unboxing Video',url:'https://store.example/uploads/video.mp4'}];
 t.mock.method(Order,'find',filter=>{
  assert.equal(filter['resellerAttribution.reseller'],'linked-reseller');
  if (filter['resellerAttribution.status']) return Promise.resolve([]);
  return {select(fields){assert.ok(fields.includes('items.returnRequest'));return this;},sort:async()=>[{items:[{returnRequest:{reason:'Damaged product',evidence}}]}]};
 });
 const result=await new Promise((resolve,reject)=>resellerOrders({reseller:{_id:'linked-reseller'}},{json:resolve},reject));
 assert.deepEqual(result[0].items[0].returnRequest.evidence,evidence);
});
