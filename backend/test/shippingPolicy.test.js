import test from 'node:test';
import assert from 'node:assert/strict';
import { isRealtimeShipping, isRealtimeCustomerShipping, requiresCodQuote, normalizeSelfShipping } from '../src/utils/shippingPolicy.js';
import { getShippingQuote } from '../src/controllers/storefrontController.js';
import Product from '../src/models/Product.js';
import ShipRocketSetting from '../src/models/ShipRocketSetting.js';

for (const shippingMode of ['free_included','fixed_customer','free_realtime','realtime_customer','estimated_seller']) {
 test(`self shipping bypasses stale ${shippingMode} and customer COD settings`,()=>{
  const product={shippingMode,seller:{shippingMode:'self'},codChargePaidBy:'customer',shippingCharge:99,shippingCost:80};
  assert.equal(isRealtimeShipping(product),false);
  assert.equal(isRealtimeCustomerShipping(product),false);
  assert.equal(requiresCodQuote(product),false);
  normalizeSelfShipping(product);
  assert.equal(product.shippingCharge,0);
  assert.equal(product.shippingCost,0);
  assert.equal(product.codChargePaidBy,'seller');
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
