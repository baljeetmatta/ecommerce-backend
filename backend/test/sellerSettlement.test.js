import test from 'node:test';
import assert from 'node:assert/strict';
import { sellerSettlementBreakdown } from '../src/controllers/sellerController.js';
import SellerPayout from '../src/models/SellerPayout.js';
import Order from '../src/models/Order.js';

for (const gst of [true, false]) for (const [collected, actual, deduction] of [[50,80,30],[80,50,-30],[50,50,0]]) {
  test(`${gst ? 'GST' : 'non-GST'} seller: collected ${collected}, freight ${actual}`, () => {
    const item = { price:1000, quantity:1, shippingMode:'fixed_customer', shippingPaidBy:'customer', shippingCharge:collected };
    const order = { items:[item], shipping:{actualCost:actual}, payment:{provider:'cod'}, codCharge:25, codChargePaidBy:'customer', updatedAt:new Date() };
    const seller = { shippingMode:'shiprocket', isGstRegistered:gst, commissionRate:20 };
    const result = sellerSettlementBreakdown(order,item,seller);
    assert.equal(result.shippingDeduction,deduction);
    assert.equal(result.codCharge,0);
    assert.equal(result.netAmount,740.4-deduction);
    const self = sellerSettlementBreakdown(order,{...item,returnRtoCharge:40},{...seller,shippingMode:'self'});
    for (const field of ['shippingDeduction','shippingCharge','codCharge','returnRtoCharge','customerPaidShipping']) assert.equal(self[field],0);
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
