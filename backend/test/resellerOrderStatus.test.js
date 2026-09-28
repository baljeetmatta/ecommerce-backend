import test from 'node:test';
import assert from 'node:assert/strict';
import { resellerOrderStatus, resellerOrderView } from '../src/utils/resellerOrderStatus.js';
for (const status of ['Processing', 'Packed', 'Ready to Dispatch', 'Shipped', 'Out for Delivery', 'Delivered']) {
 test(`reseller sees seller ${status} despite stale order status`, () => {
  assert.equal(resellerOrderStatus({status:'Placed',items:[{sellerStatus:status}]}),status);
 });
}
test('completed settlement displays delivery without mutating stored order', () => {
 const order = {status:'Placed',items:[{sellerStatus:'Completed'}]};
 assert.equal(resellerOrderView(order).status,'Delivered');
 assert.equal(order.status,'Placed');
 assert.equal(order.items[0].sellerStatus,'Completed');
});
test('partial fulfilment does not claim every item was delivered', () => {
 assert.equal(resellerOrderStatus({status:'Placed',items:[{sellerStatus:'Delivered'},{sellerStatus:'Shipped'}]}),'Shipped');
 assert.equal(resellerOrderStatus({status:'Placed',items:[{sellerStatus:'Cancelled'},{sellerStatus:'Completed'}]}),'Delivered');
});
test('returns, cancellation, rejected returns and admin order delivery remain visible', () => {
 assert.equal(resellerOrderStatus({status:'Cancelled',items:[{sellerStatus:'Pending'}]}),'Cancelled');
 assert.equal(resellerOrderStatus({status:'Delivered',items:[{sellerStatus:'Delivered',returnRequest:{status:'Requested'}}]}),'Return Requested');
 assert.equal(resellerOrderStatus({status:'Delivered',items:[{sellerStatus:'Delivered',returnRequest:{status:'Rejected'}}]}),'Delivered');
 assert.equal(resellerOrderStatus({status:'Placed',items:[{sellerStatus:'RTO'}]}),'RTO');
 assert.equal(resellerOrderStatus({status:'Delivered',items:[{sellerStatus:'Pending'}]}),'Delivered');
 assert.equal(resellerOrderStatus({status:'Packed',items:[]}),'Packed');
});
