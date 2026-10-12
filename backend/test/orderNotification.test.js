import test from 'node:test';
import assert from 'node:assert/strict';
import nodemailer from 'nodemailer';
import User from '../src/models/User.js';
import Seller from '../src/models/Seller.js';
import Customer from '../src/models/Customer.js';
import EmailSetting from '../src/models/EmailSetting.js';
import { notifyNewOrder } from '../src/services/orderNotificationService.js';
import { orderEmailContent } from '../src/services/orderEmailContent.js';
import { orderInvoicePdf } from '../src/services/orderInvoicePdf.js';

const order={_id:'order-1',orderNumber:'ORD-123',invoiceNumber:'INV-123',createdAt:'2026-10-08T16:00:00Z',customer:'customer-1',paymentStatus:'Pending',payment:{methodName:'Cash on delivery'},items:[{seller:'seller-1',name:'Travel Converter <Plug>',sku:'PLUG-1',quantity:2,price:160},{seller:'seller-1',name:'Handheld Fan',sku:'FAN-1',quantity:1,price:700}],subtotal:1020,shippingTotal:30,taxTotal:0,discountTotal:20,grandTotal:1030,address:{name:'Manju',shippingAddress:'Sampla',city:'Rohtak',state:'Haryana',postalCode:'124507',email:'buyer@example.com'},invoiceStore:{shopName:'HRS Basket',address:'Gohana, Haryana',email:'support@hrsbasket.com'}};
const query = value => ({select(){return this;},lean:async()=>value});
function setup(t,messages,{failSeller=false}={}){
 t.mock.method(User,'find',()=>query([{email:'admin@example.com'},{email:'SELLER@example.com'}]));
 t.mock.method(Seller,'find',()=>query([{_id:'seller-1',email:'seller@example.com'}]));
 t.mock.method(Customer,'findById',()=>query({_id:'customer-1',name:'Manju',email:'buyer@example.com'}));
 t.mock.method(EmailSetting,'findOne',()=>({select:async()=>({host:'smtp.example.com',fromEmail:'store@example.com',port:587})}));
 t.mock.method(nodemailer,'createTransport',()=>({sendMail:async message=>{messages.push(message);if(failSeller&&message.to==='seller@example.com')throw Error('SMTP rejected seller');return {accepted:[message.to]};},close(){}}));
}

test('order emails reach customer, seller and admin individually with designed content and PDF invoices',async t=>{
 const messages=[];setup(t,messages);await notifyNewOrder(order);
 assert.deepEqual(messages.map(message=>message.to).sort(),['admin@example.com','buyer@example.com','seller@example.com']);
 for(const message of messages){
  assert.ok(message.html.includes('Travel Converter &lt;Plug&gt;'));
  assert.ok(message.html.includes('Qty'));
  assert.ok(message.text.includes('Quantity: 2 | Unit price: ₹160.00 | Amount: ₹320.00'));
  assert.ok(message.text.includes('Grand total: ₹1,030.00'));
  assert.equal(message.attachments[0].contentType,'application/pdf');
  assert.equal(message.attachments[0].filename,'INV-123.pdf');
  assert.equal(message.attachments[0].content.subarray(0,5).toString(),'%PDF-');
 }
 assert.match(messages.find(message=>message.to==='buyer@example.com').subject,/Your HRSBasket order/);
});

test('seller SMTP failure does not reject notification or stop customer delivery',async t=>{
 const messages=[];setup(t,messages,{failSeller:true});t.mock.method(console,'error',()=>{});
 await assert.doesNotReject(notifyNewOrder(order));
 assert.ok(messages.some(message=>message.to==='buyer@example.com'));
});

test('email keeps pending payment distinct from order receipt and escapes untrusted product text',()=>{
 const content=orderEmailContent(order,{customer:true});
 assert.ok(content.html.includes('Pending'));assert.ok(!content.html.includes('Travel Converter <Plug>'));
 assert.ok(content.text.includes('Your invoice is attached'));
});

test('long orders generate multipage PDF invoices',async()=>{
 const single=await orderInvoicePdf(order);
 assert.equal((single.toString('latin1').match(/\/Type \/Page\b/g)||[]).length,1);
 const buffer=await orderInvoicePdf({...order,items:Array.from({length:40},(_,index)=>({...order.items[0],name:`Product ${index}: Travel Converter Universal Power Adapter | White`}))});
 assert.ok((buffer.toString('latin1').match(/\/Type \/Page\b/g)||[]).length>1);
});
