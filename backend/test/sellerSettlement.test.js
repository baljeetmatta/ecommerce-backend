import test from 'node:test';
import assert from 'node:assert/strict';
import { sellerSettlementBreakdown } from '../src/controllers/sellerController.js';
import SellerPayout from '../src/models/SellerPayout.js';
import Order from '../src/models/Order.js';

for (const gst of [true, false]) for (const [collected, actual, deduction] of [[50,70,20],[50,40,-10],[50,80,30],[80,50,-30],[50,50,0]]) {
  test(`${gst ? 'GST' : 'non-GST'} seller: collected ${collected}, freight ${actual}`, () => {
    const item = { price:1000, quantity:1, shippingMode:'fixed_customer', shippingPaidBy:'customer', shippingCharge:collected };
    const order = { items:[item], shipping:{actualCost:actual}, payment:{provider:'cod'}, codCharge:25, codChargePaidBy:'customer', updatedAt:new Date() };
    const seller = { shippingMode:'shiprocket', isGstRegistered:gst, commissionRate:20 };
    const result = sellerSettlementBreakdown(order,item,seller);
    assert.equal(result.shippingDeduction,deduction);
    assert.equal(result.codCharge,0);
    assert.equal(result.netAmount,764-deduction);
    const self = sellerSettlementBreakdown(order,{...item,returnRtoCharge:40},{...seller,shippingMode:'self'});
    for (const field of ['shippingDeduction','shippingCharge','codCharge','returnRtoCharge']) assert.equal(self[field],0);
    assert.equal(self.customerPaidShipping,collected);
    assert.equal(self.selfShipping,true);
  });
}
test('fulfilment snapshot overrides changed seller settings',()=>{
 const item={price:1000,quantity:1,sellerShippingMode:'self',shippingCost:80};
 const result=sellerSettlementBreakdown({items:[item],shipping:{actualCost:80,shipmentId:'old'},updatedAt:new Date()},item,{shippingMode:'shiprocket'});
 assert.equal(result.shippingDeduction,0);
});
test('shipping credits persist in payout and order schemas',()=>{
 const payout = new SellerPayout({seller:'a'.repeat(24),order:'b'.repeat(24),product:'c'.repeat(24),grossAmount:1000,commissionRate:20,commissionAmount:200,netAmount:770.4,shippingDeduction:-30,selfShipping:false});
 assert.equal(payout.validateSync(),undefined);
 assert.equal(payout.toObject().shippingDeduction,-30);
 const order = new Order({items:[{settlement:{shippingDeduction:-30,selfShipping:false}}]});
 assert.equal(order.items[0].settlement.shippingDeduction,-30);
});

test('zero actual freight credits the full fixed charge instead of estimated cost', () => {
 const item={price:1000,quantity:1,shippingMode:'fixed_customer',shippingPaidBy:'customer',shippingCharge:99,shippingCost:80,sellerShippingMode:'shiprocket'};
 const result=sellerSettlementBreakdown({items:[item],shipping:{actualCost:0},updatedAt:new Date()},item,{shippingMode:'self',isGstRegistered:false});
 assert.equal(result.shippingCharge,0);
 assert.equal(result.shippingDeduction,-99);
 assert.equal(result.netAmount,839.4);
});

test('self-delivery COD fees never change the settlement for either payer', () => {
 const item = {price:1000, quantity:2, sellerShippingMode:'self'};
 const seller = {shippingMode:'self', commissionRate:20};
 const base = {items:[item], payment:{provider:'cod'}, updatedAt:new Date()};
 const baseline = sellerSettlementBreakdown(base,item,seller).netAmount;
 for (const codChargePaidBy of ['seller','customer']) {
  const result = sellerSettlementBreakdown({...base,codCharge:150,codChargePaidBy},item,seller);
  assert.equal(result.codCharge,0);
  assert.equal(result.netAmount,baseline);
 }
});

test('self-delivery fixed customer shipping is paid to seller without logistics deduction', () => {
 const item = {price:1000, quantity:2, shippingMode:'fixed_customer', shippingPaidBy:'customer', shippingCharge:60, sellerShippingMode:'self'};
 const order = {items:[item], payment:{provider:'prepaid'}, updatedAt:new Date()};
 const result = sellerSettlementBreakdown(order,item,{shippingMode:'self', commissionRate:10}, {paymentGatewayFeeRate:2});
 assert.equal(result.customerPaidShipping,120);
 assert.equal(result.shippingDeduction,0);
 assert.equal(result.shippingCharge,0);
 assert.equal(result.returnRtoCharge,0);
 assert.equal(result.netAmount,1836.8);
});

test('self-delivery seller-paid shipping has no logistics deduction', () => {
 const item = {price:1000, quantity:1, shippingMode:'estimated_seller', shippingPaidBy:'seller', shippingCost:75, sellerShippingMode:'self'};
 const order = {items:[item], shipping:{actualCost:75}, payment:{provider:'prepaid'}, updatedAt:new Date()};
 const result = sellerSettlementBreakdown(order,item,{shippingMode:'self', commissionRate:10}, {paymentGatewayFeeRate:2});
 assert.equal(result.customerPaidShipping,0);
 assert.equal(result.shippingDeduction,0);
 assert.equal(result.shippingCharge,0);
 assert.equal(result.netAmount,858.4);
});

for (const shippingMode of ['free_included', 'fixed_customer']) {
 test(`non-GST ${shippingMode}: legacy order uses saved per-unit freight`, () => {
  const order = Order.hydrate({items:[{price:1000,quantity:2,shippingMode,shippingPaidBy:shippingMode === 'fixed_customer' ? 'customer' : 'seller',shippingCharge:50,shippingCost:80,sellerShippingMode:'shiprocket'}],updatedAt:new Date()});
  const item = order.items[0];
  assert.equal(order.$isDefault('shipping.actualCost'),true);
  const result = sellerSettlementBreakdown(order,item,{shippingMode:'shiprocket',isGstRegistered:false,commissionRate:20});
  assert.equal(result.shippingCharge,160);
  assert.equal(result.shippingDeduction,shippingMode === 'fixed_customer' ? 60 : 160);
  assert.equal(result.netAmount,1480.8-result.shippingDeduction);
 });
}

test('explicit zero freight on a hydrated order remains authoritative', () => {
 const order = Order.hydrate({items:[{price:1000,quantity:1,shippingMode:'free_included',shippingPaidBy:'seller',shippingCost:80}],shipping:{actualCost:0},updatedAt:new Date()});
 assert.equal(sellerSettlementBreakdown(order,order.items[0],{shippingMode:'shiprocket',isGstRegistered:false}).shippingDeduction,0);
});

for (const gst of [false,true]) test(`free Shiprocket freight is deducted for ${gst?'GST':'non-GST'} sellers`,()=>{
 const item={price:1300,quantity:1,shippingMode:'free_included',shippingPaidBy:'seller',shippingCharge:0,shippingCost:80,sellerShippingMode:'shiprocket'};
 const order={items:[item],shipping:{actualCost:80},payment:{provider:'cod'},codCharge:31.8,codChargePaidBy:'customer',updatedAt:new Date()};
 const result=sellerSettlementBreakdown(order,item,{shippingMode:'shiprocket',isGstRegistered:gst,commissionRate:5});
 assert.equal(result.shippingDeduction,80);
 assert.equal(result.netAmount,1143.3);
 assert.equal(result.customerPaidShipping,0);
 assert.equal(result.codCharge,0);
});

for (const provider of ['cod', 'prepaid']) test(`${provider} gateway fee and GST`, () => {
 const item = {price:1000, quantity:1};
 const result = sellerSettlementBreakdown({items:[item], payment:{provider}, updatedAt:new Date()}, item, {shippingMode:'shiprocket',commissionRate:20}, {paymentGatewayFeeRate:3});
 assert.equal(result.paymentGatewayFeeRate, provider === 'cod' ? 0 : 3);
 assert.equal(result.paymentGatewayFee, provider === 'cod' ? 0 : 30);
 assert.equal(result.paymentGatewayGst, provider === 'cod' ? 0 : 5.4);
});
