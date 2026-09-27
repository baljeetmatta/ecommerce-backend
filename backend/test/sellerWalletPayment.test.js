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
test('wallet checkout refuses COD and wallets without debt', async (t) => {
 t.mock.method(PaymentMethod,'findOne', async (filter) => {
  assert.deepEqual(filter.type.$in,['razorpay','payu']); return null;
 });
 await assert.rejects(invoke(createWalletPayment,{seller:{walletBalance:0},body:{}}), /no outstanding/);
 await assert.rejects(invoke(createWalletPayment,{seller:{walletBalance:-100},body:{paymentMethodCode:'cod'}}), /online payment/);
});
