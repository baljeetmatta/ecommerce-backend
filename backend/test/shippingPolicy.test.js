import test from 'node:test';
import assert from 'node:assert/strict';
import { isRealtimeShipping, isRealtimeCustomerShipping, requiresCodQuote, normalizeSelfShipping } from '../src/utils/shippingPolicy.js';
import { getShippingQuote } from '../src/controllers/storefrontController.js';
import Product from '../src/models/Product.js';
import ShipRocketSetting from '../src/models/ShipRocketSetting.js';

for (const shippingMode of ['free_included','fixed_customer','free_realtime','realtime_customer','estimated_seller']) {
 test(`self shipping bypasses stale ${shippingMode} while preserving customer COD settings`,()=>{
  const product={shippingMode,seller:{shippingMode:'self'},codChargePaidBy:'customer',shippingCharge:99,shippingCost:80};
  assert.equal(isRealtimeShipping(product),false);
  assert.equal(isRealtimeCustomerShipping(product),false);
  assert.equal(requiresCodQuote(product),false);
  normalizeSelfShipping(product);
  assert.equal(product.shippingMode, shippingMode === 'fixed_customer' ? 'fixed_customer' : shippingMode === 'estimated_seller' ? 'estimated_seller' : 'free_included');
  assert.equal(product.shippingCharge, shippingMode === 'fixed_customer' ? 99 : 0);
  assert.equal(product.shippingCost,0);
  assert.equal(product.codChargePaidBy,'customer');
 });
}
test('Shiprocket seller continues to require shipping and COD quotes',()=>{
 const product={seller:{shippingMode:'shiprocket'},shippingMode:'realtime_customer'};
 assert.equal(isRealtimeShipping(product),true);
 assert.equal(requiresCodQuote(product),true);
});
test('self-shipping quote succeeds without Shiprocket credentials or API calls', async (t)=>{
 t.mock.method(Product,'find',()=>({populate:async()=>[{_id:'a'.repeat(24),seller:{shippingMode:'self'},shippingMode:'realtime_customer',codAvailable:true,codChargePaidBy:'customer'}]}));
 t.mock.method(ShipRocketSetting,'findOne',()=>({select:async()=>null}));
 const fetchMock=t.mock.method(globalThis,'fetch',async()=>{throw new Error('Unexpected Shiprocket call');});
 const result=await new Promise((resolve,reject)=>getShippingQuote({body:{pincode:'110001',cod:true,items:[{productId:'a'.repeat(24),quantity:1}]}},{status(){return this;},json:resolve},reject));
 assert.equal(result.shippingAmount,0);
 assert.equal(result.codCharge,0);
 assert.equal(fetchMock.mock.callCount(),0);
});

test('self delivery preserves COD availability and the configured fee', async () => {
 const { selfShippingCustomerCodCharge } = await import('../src/utils/shippingPolicy.js');
 const product = { seller: { shippingMode: 'self' }, codAvailable: true, codChargePaidBy: 'customer', codCharge: 12.5 };
 normalizeSelfShipping(product);
 assert.equal(product.codAvailable, true);
 assert.equal(product.codCharge, 12.5);
 assert.equal(selfShippingCustomerCodCharge(product, 3), 37.5);
 assert.equal(selfShippingCustomerCodCharge({...product, codChargePaidBy: 'seller'}, 3), 0);
 assert.equal(selfShippingCustomerCodCharge({...product, codAvailable: false}, 3), 0);
 assert.equal(selfShippingCustomerCodCharge({...product, seller: {shippingMode: 'shiprocket'}}, 3), 0);
});

test('self-shipping quote charges only customer-paid units without Shiprocket', async t => {
 const id = 'a'.repeat(24); const secondId = 'b'.repeat(24);
 const seller = {_id: 'c'.repeat(24), shippingMode: 'self'};
 t.mock.method(Product, 'find', () => ({populate: async () => [
  {_id:id, seller, codAvailable:true, codChargePaidBy:'customer', codCharge:15},
  {_id:secondId, seller, codAvailable:true, codChargePaidBy:'seller', codCharge:50}
 ]}));
 t.mock.method(ShipRocketSetting, 'findOne', () => ({select: async () => null}));
 const fetchMock = t.mock.method(globalThis, 'fetch', async () => {throw new Error('Unexpected Shiprocket call');});
 for (const cod of [true, false]) {
  const result = await new Promise((resolve,reject) => getShippingQuote({body:{pincode:'110001',cod,items:[{productId:id,quantity:2},{productId:secondId,quantity:1}]}},{status(){return this;},json:resolve},reject));
  assert.equal(result.codChargedToCustomer, cod ? 30 : 0);
  assert.equal(result.shippingAmount, 0);
 }
 assert.equal(fetchMock.mock.callCount(), 0);
});

test('self-shipping quote leaves fixed product shipping to configured checkout total', async t => {
 const id = 'a'.repeat(24);
 t.mock.method(Product, 'find', () => ({populate: async () => [
  {_id:id, seller:{shippingMode:'self'}, shippingMode:'fixed_customer', shippingIncludedInPrice:false, shippingPaidBy:'customer', shippingCharge:45, codAvailable:false}
 ]}));
 t.mock.method(ShipRocketSetting, 'findOne', () => ({select: async () => null}));
 const fetchMock = t.mock.method(globalThis, 'fetch', async () => {throw new Error('Unexpected Shiprocket call');});
 const result = await new Promise((resolve,reject) => getShippingQuote({body:{pincode:'110001',cod:false,items:[{productId:id,quantity:2}]}},{status(){return this;},json:resolve},reject));
 assert.equal(result.shippingAmount, 0);
 assert.equal(result.codChargedToCustomer, 0);
 assert.equal(fetchMock.mock.callCount(), 0);
});

for (const shippingMode of ['free_included', 'fixed_customer']) for (const cod of [false, true]) test(`non-GST ${shippingMode} quotes seller freight for ${cod ? 'COD' : 'prepaid'}`, async t => {
 const id='a'.repeat(24); const sellerId='b'.repeat(24);
 const product={_id:id,name:'Product',actualWeight:1,weightUnit:'kg',shippingMode,shippingCharge:50,shippingPaidBy:shippingMode === 'fixed_customer' ? 'customer' : 'seller',codAvailable:true,codChargePaidBy:'customer',seller:{_id:sellerId,shippingMode:'shiprocket',isGstRegistered:false,pinCode:'110001'}};
 assert.equal(isRealtimeShipping(product),true);
 t.mock.method(Product,'find',()=>({populate:async()=>[product]}));
 t.mock.method(ShipRocketSetting,'findOne',()=>({select:async()=>({email:'api@example.com',password:'test'})}));
 const calls=[];
 t.mock.method(globalThis,'fetch',async url=>{
  calls.push(String(url));
  return {ok:true,json:async()=>String(url).includes('/auth/login') ? {token:'token'} : {data:{available_courier_companies:[{rate:String(url).includes('cod=1')?111.8:80,cod_charges:31.8,courier_company_id:1}]}}};
 });
 const result=await new Promise((resolve,reject)=>getShippingQuote({body:{pincode:'400001',cod,items:[{productId:id,quantity:1}]}},{status(){return this;},json:resolve},reject));
 assert.equal(result.shippingAmount,0);
 assert.equal(result.shipments[0].shippingAmount,80);
 assert.equal(result.codChargedToCustomer,cod?31.8:0);
 assert.equal(calls.length,cod?3:2);
});
