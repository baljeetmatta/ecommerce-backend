import Sequence from "../src/models/Sequence.js";
import test from 'node:test';
import assert from 'node:assert/strict';
import Order from '../src/models/Order.js';
import StorefrontSetting from '../src/models/StorefrontSetting.js';
import { updateOrderStatus } from '../src/controllers/orderController.js';
import { ensureOrderInvoice } from '../src/services/invoiceService.js';
import { customerOrderSnapshot } from '../src/utils/customerOrderSnapshot.js';
import { invoiceHtml } from '../../frontend/src/utils/invoiceDocument.js';

for (const status of ['Accepted','Processing','Packed','Ready to Dispatch','Ready to Ship','Shipped','Out for Delivery','Cancelled','Delivered']) test(`admin ${status} status reaches customer item`,async t=>{
 const order={status:'Pending',paymentStatus:'Pending',items:[{sellerStatus:'Placed',returnApplicable:true,returnDays:7}],timeline:[],fulfillment:{invoiceUrl:'/invoice'},save:async()=>{},populate:async()=>{}};
 t.mock.method(Order,'findById',async()=>order);
 const result=await new Promise((resolve,reject)=>updateOrderStatus({params:{id:'order'},body:{status,fulfillment:{trackingNumber:'TRACK'}},user:{_id:'admin'}},{json:resolve,status(){return this;}},reject));
 assert.equal(result.items[0].sellerStatus,status === "Ready to Ship" ? "Ready to Dispatch" : status);
 assert.ok(result.items[0].sellerStatusUpdatedAt instanceof Date);
 assert.equal(result.fulfillment.invoiceUrl,'/invoice');
 if(status==='Delivered'){assert.ok(result.items[0].deliveredAt instanceof Date);assert.ok(result.items[0].returnWindowClosesAt>result.items[0].deliveredAt);}
});

test('ordinary admin updates preserve seller fulfillment, cancelled items and active returns',async t=>{
 const items=[{seller:'seller',sellerStatus:'Packed'},{sellerStatus:'Cancelled'},{sellerStatus:'Return Requested',returnRequest:{status:'Requested'}}];
 const order={status:'Pending',paymentStatus:'Pending',items,timeline:[],save:async()=>{},populate:async()=>{}};
 t.mock.method(Order,'findById',async()=>order);
 await new Promise((resolve,reject)=>updateOrderStatus({params:{id:'order'},body:{status:'Shipped'},user:{_id:'admin'}},{json:resolve},reject));
 assert.deepEqual(items.map(item=>item.sellerStatus),['Packed','Cancelled','Return Requested']);
});

test('customer snapshot repairs legacy admin status without exposing seller IDs or modifying saved order',()=>{
 const order={status:'Shipped',items:[{sellerStatus:'Placed'},{seller:'seller',sellerStatus:'Packed'},{sellerStatus:'Cancelled'}]};
 const snapshot=customerOrderSnapshot(order);
 assert.deepEqual(snapshot.items.map(item=>item.sellerStatus),['Shipped','Packed','Cancelled']);
 assert.ok(snapshot.items.every(item=>!('seller' in item)));
 assert.equal(order.items[0].sellerStatus,'Placed');
});

test('admin invoice uses store GST registration and business state',async t=>{
 t.mock.method(Sequence,'findOneAndUpdate',async()=>({value:1}));
 t.mock.method(StorefrontSetting,'findOne',async()=>({shopName:'HRSBasket',gstNumber:'06TESTGSTNUMBER1',contactDetails:{state:'Haryana',address:'Gohana'}}));
 const order={_id:'order',orderNumber:'ORD-1',items:[{}],fulfillment:{},timeline:[]};
 await ensureOrderInvoice(order);
 assert.equal(order.invoiceNumber,'HRS-000001');
 assert.equal(order.invoiceStore.sellerState,'Haryana');
 assert.equal(order.invoiceStore.sellerGstNumber,'06TESTGSTNUMBER1');
});

for(const state of ['Haryana','Delhi']) test(`admin customer invoice shows saved GST for ${state} without requiring seller GSTIN`,()=>{
 const html=invoiceHtml({orderNumber:'ORD-1',createdAt:'2026-10-08',items:[{name:'Admin product',price:118,quantity:1,gstRate:18,gstAmount:18,taxableValue:100}],taxTotal:18,subtotal:100,grandTotal:118,invoiceStore:{shopName:'HRSBasket',sellerState:'Haryana'},address:{state}});
 assert.ok(html.includes('<th>Tax</th>'));
 assert.ok(html.includes('Total GST'));
 assert.ok(html.includes(state==='Delhi'?'IGST @ 18%':'CGST @ 9%'));
 assert.ok(html.includes('₹118.00'));
});

test('legacy admin invoice recovers GST without changing its paid total',async()=>{
 const {adminInvoiceSnapshot}=await import('../src/utils/adminInvoiceSnapshot.js');
 const original={grandTotal:236,subtotal:236,taxTotal:0,items:[{price:118,quantity:2,gstRate:0,product:{taxCategory:{rate:18}}}]};
 const invoice=adminInvoiceSnapshot(original);
 assert.equal(invoice.grandTotal,236);
 assert.equal(invoice.taxTotal,36);
 assert.equal(invoice.subtotal,200);
 assert.equal(original.items[0].gstRate,0);
});
