import test from 'node:test';
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import { createPayuRequest, validatePayuResponseHash, verifyPayuPayment } from '../src/utils/payu.js';
const hash = value => crypto.createHash('sha512').update(value).digest('hex');

test('PayU request hashes the exact posted strings when optional fields are undefined', () => {
 const checkout = createPayuRequest({config:{merchantKey:' key ',salt:' salt '},txnid:'txn',amount:100,productinfo:'Wallet',email:'a@example.com',callbackUrl:'https://example.com/callback'});
 assert.equal(checkout.fields.firstname, '');
 assert.equal(checkout.fields.phone, '');
 assert.equal(checkout.fields.amount, '100.00');
 assert.equal(checkout.fields.hash, hash('key|txn|100.00|Wallet||a@example.com|||||||||||salt'));
 assert.equal('salt' in checkout.fields, false);
});

for (const extra of [{}, {additional_charges:'2.00'}, {splitInfo:'{"amount":100}'}, {additional_charges:'2.00',splitInfo:'{"amount":100}'}]) {
 test(`PayU reverse hash matches documented separators ${JSON.stringify(extra)}`, () => {
  const body = {status:'success',udf1:'one',udf5:'five',email:'a@example.com',firstname:'Seller',productinfo:'Wallet',amount:'100.00',txnid:'txn',key:'key',...extra};
  const prefix = extra.additional_charges ? `${extra.additional_charges}|` : '';
  const middle = extra.splitInfo ? `|${extra.splitInfo}` : '';
  body.hash = hash(`${prefix}salt|success${middle}||||||five||||one|a@example.com|Seller|Wallet|100.00|txn|key`);
  assert.equal(validatePayuResponseHash(body,'salt'),true);
  assert.equal(validatePayuResponseHash({...body,amount:'200.00'},'salt'),false);
 });
}

test('PayU verification rejects a missing or invalid payment amount', async (t) => {
 t.mock.method(globalThis,'fetch',async () => ({ok:true,json:async () => ({transaction_details:{txn:{status:'success',unmappedstatus:'captured',amt:'invalid'}}})}));
 await assert.rejects(verifyPayuPayment({config:{merchantKey:'key',salt:'salt'},txnid:'txn',expectedAmount:100}), /could not be verified/);
});
