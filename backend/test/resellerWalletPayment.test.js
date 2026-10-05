import test from 'node:test';
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import Reseller from '../src/models/Reseller.js';
import PaymentMethod from '../src/models/PaymentMethod.js';
import PayuTransaction from '../src/models/PayuTransaction.js';
import { createWalletPayment, verifyWalletPayment } from '../src/controllers/sellerWalletPaymentController.js';
const invoke = (handler, req) => new Promise((resolve, reject) => handler(req,{status(){return this;},json:resolve},reject));

test('reseller Razorpay funding checks ownership and credits once on retry', async (t) => {
 const reseller = {_id:'reseller1',walletBalance:50,walletRepayments:[],totalWalletCredited:25};
 t.mock.method(PaymentMethod,'findOne',async () => ({type:'razorpay',razorpay:{keyId:'key',keySecret:'secret'}}));
 t.mock.method(Reseller,'findById',async () => reseller);
 t.mock.method(Reseller,'updateOne',async (filter,update) => {
  if (reseller.walletRepayments.some(p => p.reference === filter['walletRepayments.reference'].$ne)) return;
  reseller.walletBalance += update.$inc.walletBalance;
  reseller.walletRepayments.push(update.$push.walletRepayments);
 });
 let purpose = 'seller-wallet';
 t.mock.method(globalThis,'fetch',async url => ({ok:true,json:async () => url.includes('/orders/') ? {id:'order1',amount:10000,status:'paid',notes:{resellerId:'reseller1',purpose}} : {order_id:'order1',amount:10000,currency:'INR',status:'captured'}}));
 const body = {paymentMethodCode:'rp',razorpay_order_id:'order1',razorpay_payment_id:'payment1',razorpay_signature:crypto.createHmac('sha256','secret').update('order1|payment1').digest('hex')};
 await assert.rejects(invoke(verifyWalletPayment,{reseller,body}), /could not be verified/);
 purpose = 'reseller-wallet';
 await invoke(verifyWalletPayment,{reseller,body});
 await invoke(verifyWalletPayment,{reseller,body});
 assert.equal(reseller.walletBalance,150);
 assert.equal(reseller.walletRepayments.length,1);
 assert.equal(reseller.totalWalletCredited,25);
});

test('PayU seller checkout uses company name when seller name is missing', async (t) => {
 t.mock.method(PaymentMethod,'findOne',async () => ({type:'payu',code:'payu',payu:{merchantKey:'key',salt:'salt'}}));
 t.mock.method(PayuTransaction,'create',async row => {assert.equal(row.kind,'seller-wallet');return row;});
 const result = await invoke(createWalletPayment,{seller:{_id:'seller1',companyName:'Store',email:'a@example.com',mobile:'9876543210'},body:{amount:100,paymentMethodCode:'payu'},protocol:'https',get:()=>'example.com'});
 assert.equal(result.fields.firstname,'Store');
 assert.equal(result.fields.amount,'100.00');
});

test('reseller PayU funding verifies owner, kind, captured status and credits once', async (t) => {
 const reseller = {_id:'reseller1',walletBalance:0,walletRepayments:[]};
 t.mock.method(PaymentMethod,'findOne',async () => ({type:'payu',code:'payu',payu:{merchantKey:'key',salt:'salt'}}));
 t.mock.method(PayuTransaction,'findOne',async filter => {
  assert.equal(filter.ownerId,'reseller1');assert.equal(filter.kind,'reseller-wallet');
  return {txnid:'txn',amount:200,paymentMethodCode:'payu'};
 });
 t.mock.method(Reseller,'findById',async () => reseller);
 t.mock.method(Reseller,'updateOne',async (filter,update) => {
  if (reseller.walletRepayments.some(p => p.reference === filter['walletRepayments.reference'].$ne)) return;
  reseller.walletBalance += update.$inc.walletBalance;reseller.walletRepayments.push(update.$push.walletRepayments);
 });
 let status = 'auth';
 t.mock.method(globalThis,'fetch',async () => ({ok:true,json:async () => ({transaction_details:{txn:{status:'success',unmappedstatus:status,amt:'200.00'}}})}));
 const req = {reseller,body:{payuTxnId:'txn'}};
 await assert.rejects(invoke(verifyWalletPayment,req), /not been captured/);
 status = 'captured';
 await invoke(verifyWalletPayment,req);await invoke(verifyWalletPayment,req);
 assert.equal(reseller.walletBalance,200);assert.equal(reseller.walletRepayments.length,1);
});

test('reseller checkout rejects amounts outside ₹100 increments before contacting gateway', async () => {
 for (const amount of [undefined,0,99,150,100.01,-100,1000001]) {
  await assert.rejects(invoke(createWalletPayment,{reseller:{_id:'reseller1'},body:{amount}}), /multiples/);
 }
});
