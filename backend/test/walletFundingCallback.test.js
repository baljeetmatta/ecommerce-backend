import test from 'node:test';
import assert from 'node:assert/strict';
import PaymentMethod from '../src/models/PaymentMethod.js';
import PayuTransaction from '../src/models/PayuTransaction.js';
import Seller from '../src/models/Seller.js';
import Reseller from '../src/models/Reseller.js';
import { payuCallback } from '../src/controllers/storefrontController.js';

for (const [kind, Model] of [['seller-wallet', Seller], ['reseller-wallet', Reseller]]) {
 test(`PayU callback credits ${kind} without browser verification and is safe on retries`, async (t) => {
  const owner = {_id:'owner',walletBalance:0,walletRepayments:[]};
  const transaction = {txnid:'txn',kind,ownerId:'owner',amount:100,paymentMethodCode:'payu'};
  t.mock.method(PaymentMethod,'findOne',async () => ({code:'payu',payu:{merchantKey:'key',salt:'salt'}}));
  t.mock.method(PayuTransaction,'findOne',async () => transaction);
  t.mock.method(PayuTransaction,'findOneAndUpdate',async () => transaction);
  t.mock.method(Model,'findById',async () => owner);
  t.mock.method(Model,'updateOne',async (filter, update) => {
   if (owner.walletRepayments.some(row => row.reference === filter['walletRepayments.reference'].$ne)) return;
   owner.walletBalance += update.$inc.walletBalance;
   owner.walletRepayments.push(update.$push.walletRepayments);
  });
  let status = 'auth';
  t.mock.method(globalThis,'fetch',async () => ({ok:true,json:async () => ({transaction_details:{txn:{status:'success',unmappedstatus:status,amt:'100.00'}}})}));
  const invoke = () => new Promise((resolve,reject) => payuCallback({body:{txnid:'txn',key:'key'},query:{returnUrl:'https://shop.example/reseller#earnings'}},{redirect(code,url){assert.equal(code,303);assert.match(url,/payu_txnid=txn/);resolve();}},reject));
  await invoke();assert.equal(owner.walletBalance,0);
  status = 'captured';
  await invoke();await invoke();
  assert.equal(owner.walletBalance,100);assert.equal(owner.walletRepayments.length,1);
 });
}
