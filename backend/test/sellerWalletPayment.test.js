import test from 'node:test';
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import Seller from '../src/models/Seller.js';
import PaymentMethod from '../src/models/PaymentMethod.js';
import { verifyWalletPayment, createWalletPayment } from '../src/controllers/sellerWalletPaymentController.js';
const invoke = (handler, req) => new Promise((resolve, reject) => handler(req, {status() {return this;}, json:resolve}, reject));

test('repayment verifies captured payment ownership and credits once across retries', async (t) => {
 const seller = {_id:'seller1', walletBalance:-600, walletRepayments:[]};
 const method = {type:'razorpay',razorpay:{keyId:'key',keySecret:'secret'}};
 t.mock.method(PaymentMethod,'findOne', async () => method);
 t.mock.method(Seller,'findById',async () => seller);
 t.mock.method(Seller,'updateOne',async (filter, update) => {
  if (seller.walletRepayments.some((p) => p.reference === filter['walletRepayments.reference'].$ne)) return;
  seller.walletBalance += update.$inc.walletBalance;
  seller.walletRepayments.push(update.$push.walletRepayments);
 });
 let owner = 'seller1'; let status = 'captured';
 t.mock.method(globalThis,'fetch',async (url) => ({ok:true,json:async () => url.includes('/orders/') ? {id:'order1',amount:60000,status:'paid',notes:{sellerId:owner,purpose:'seller-wallet'}} : {order_id:'order1',amount:60000,currency:'INR',status}}));
 const body = {paymentMethodCode:'rp',razorpay_order_id:'order1',razorpay_payment_id:'payment1',razorpay_signature:crypto.createHmac('sha256','secret').update('order1|payment1').digest('hex')};
 owner = 'other';
 await assert.rejects(invoke(verifyWalletPayment,{seller,body}), /could not be verified/);
 owner = 'seller1'; status = 'authorized';
 await assert.rejects(invoke(verifyWalletPayment,{seller,body}), /could not be verified/);
 status = 'captured';
 await assert.rejects(invoke(verifyWalletPayment,{seller,body:{...body,razorpay_signature:'bad'}}), /signature/);
 await invoke(verifyWalletPayment,{seller,body});
 await invoke(verifyWalletPayment,{seller,body});
 assert.equal(seller.walletBalance,0);
 assert.equal(seller.walletRepayments.length,1);
});
test('wallet checkout refuses COD and invalid funding amounts', async (t) => {
 t.mock.method(PaymentMethod,'findOne', async (filter) => {
  assert.deepEqual(filter.type.$in,['razorpay','payu']); return null;
 });
 await assert.rejects(invoke(createWalletPayment,{seller:{walletBalance:0},body:{}}), /multiples/);
 await assert.rejects(invoke(createWalletPayment,{seller:{walletBalance:-100},body:{paymentMethodCode:'cod',amount:100}}), /online payment/);
});

test('wallet funding supports partial debt payments and positive balance top-ups', async (t) => {
 t.mock.method(PaymentMethod, 'findOne', async () => ({type:'razorpay',name:'Gateway',razorpay:{keyId:'key',keySecret:'secret'}}));
 const amounts = [];
 t.mock.method(globalThis, 'fetch', async (_url, init) => {
  const order = JSON.parse(init.body); amounts.push(order.amount);
  return {ok:true,json:async () => ({id:'order',amount:order.amount,currency:'INR'})};
 });
 for (const [balance, amount] of [[-600,100],[-600,800],[200,100]]) {
  await invoke(createWalletPayment,{seller:{_id:'seller1',walletBalance:balance},body:{paymentMethodCode:'rp',amount}});
 }
 assert.deepEqual(amounts,[10000,80000,10000]);
 for (const amount of [0,99,150,100.01,-1,'bad',Infinity,1000001]) {
  await assert.rejects(invoke(createWalletPayment,{seller:{walletBalance:-600},body:{amount}}), /multiples/);
 }
});
