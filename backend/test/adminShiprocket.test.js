import Seller from "../src/models/Seller.js";
import test from 'node:test';
import assert from 'node:assert/strict';
import { syncShipRocketOrder } from '../src/controllers/orderController.js';
import Product from '../src/models/Product.js';
import Order from '../src/models/Order.js';
import ShipRocketSetting from '../src/models/ShipRocketSetting.js';

function setup(t, savedPayload) {
  const order = { orderNumber: 'ORD1', grandTotal: 200, items: [{ product: 'p1', name: 'Parcel', sku: 'SKU', quantity: 2, price: 100 }], shipping: { syncPayload: savedPayload }, address: { name: 'Customer', email: 'customer@example.com', phone: '+91 9876543210', shippingAddress: 'Delivery street', city: 'Mumbai', state: 'Maharashtra', postalCode: '400001' }, payment: { provider: 'cod' }, timeline: [], save: async () => {}, populate: async () => {} };
  const product = { _id: 'p1', length: 10, breadth: 5, height: 2, dimensionUnit: 'in', actualWeight: 500, weightUnit: 'g' };
  const calls = [];
  let failAwb = false;
  t.mock.method(Order, 'findById', async () => order);
  t.mock.method(Product, 'find', () => ({ select: async () => [product] }));
  t.mock.method(ShipRocketSetting, 'findOne', async () => ({ email: 'api@example.com', password: 'test', pickupLocation: 'ADMIN_VERIFIED' }));
  t.mock.method(globalThis, 'fetch', async (url, options) => {
    calls.push({ url, body: options?.body ? JSON.parse(options.body) : null });
    const data = url.includes('/auth/login') ? { token: 'token' }
      : url.includes('/settings/company/pickup') ? { data: {shipping_address:[{pickup_location:'ADMIN_VERIFIED',phone_verified:1,is_active:1,address:'Admin warehouse',city:'Gohana',state:'Haryana',pin_code:'131301'}]} }
      : url.includes('/create/adhoc') ? { order_id: 123, shipment_id: 456 }
      : url.includes('/assign/awb') ? (failAwb ? { message: 'Wallet balance' } : { response: { data: { awb_code: 'AWB' } } })
      : { label_url: 'https://example.com/label', manifest_url: 'https://example.com/manifest' };
    return { ok: !(failAwb && url.includes('/assign/awb')), json: async () => data };
  });
  const run = () => new Promise((resolve, reject) => syncShipRocketOrder({ params: { id: 'order' }, user: { _id: 'admin' } }, { status() { return this; }, json: resolve }, reject));
  return { run, calls, order, product, rejectAwb: () => { failAwb = true; } };
}

for (const saved of [undefined, { billing_customer_name: 'Customer', sub_total: 200 }]) {
  test(`admin dispatch repairs ${saved ? 'incomplete' : 'missing'} saved payload`, async t => {
    const { run, calls } = setup(t, saved);
    await run();
    const payload = calls.find(call => call.url.includes('/create/adhoc')).body;
    assert.equal(payload.pickup_location, 'ADMIN_VERIFIED');
    assert.equal(payload.shipping_is_billing, false);
    assert.equal(payload.billing_last_name, '');
    assert.equal(payload.billing_country, 'India');
    assert.equal(payload.shipping_address, 'Delivery street');
    assert.equal(payload.billing_phone, '9876543210');
    assert.equal(payload.length, 25.4);
    assert.equal(payload.breadth, 12.7);
    assert.equal(payload.height, 5.08);
    assert.equal(payload.weight, 1);
    assert.equal(payload.payment_method, 'COD');
    assert.equal(payload.sub_total, 200);
    assert.equal('channel_id' in payload, false);
  });
}

test('admin dispatch names missing product data before external requests', async t => {
  const { run, calls, product } = setup(t);
  product.actualWeight = 0;
  await assert.rejects(run(), /Parcel: actualWeight/);
  assert.equal(calls.length, 0);
});

test('admin retry reuses a shipment after AWB assignment fails', async t => {
  const { run, calls, order, rejectAwb } = setup(t);
  rejectAwb();
  await assert.rejects(run(), /Wallet balance/);
  assert.equal(order.shipping.shipmentId, 456);
  await assert.rejects(run(), /Wallet balance/);
  assert.equal(calls.filter(call => call.url.includes('/create/adhoc')).length, 1);
});

 test('admin dispatch of seller order uses seller warehouse and order destination', async t => {
  const { run, calls, order, product } = setup(t);
  order._id = 'order'; order.items[0].seller = 'seller'; order.items[0].sellerStatus = 'Ready to Dispatch';
  product.seller = 'seller';
  t.mock.method(Product, 'find', () => ({ select: async () => [product], distinct: async () => ['p1'] }));
  t.mock.method(Order, 'findOne', () => ({ populate: async () => order }));
  t.mock.method(Seller, 'findById', async () => ({ _id: 'seller', sellerNumber: 'S1', shippingMode: 'shiprocket', pickupSameAsBusiness: false, pickupAddress: 'Seller warehouse', pickupCity: 'Delhi', pickupState: 'Delhi', pickupPinCode: '110001', mobile: '9876543210', email: 'seller@example.com' }));
  t.mock.method(globalThis, 'fetch', async (url, options) => {
    const body = options?.body ? JSON.parse(options.body) : null;
    calls.push({ url, body });
    const data = url.includes('/auth/login') ? { token: 'token' }
      : url.includes('/serviceability/') ? { data: { available_courier_companies: [{ courier_company_id: 7, rate: 80 }] } }
      : url.includes('/create/adhoc') ? { order_id: 123, shipment_id: 456 }
      : url.includes('/assign/awb') ? { response: { data: { awb_code: 'AWB' } } }
      : { label_url: 'https://shiprocket.co/label.pdf' };
    return { ok: true, status: 200, json: async () => data };
  });
  await run();
  const pickup = calls.find(call => call.url.includes('/addpickup')).body;
  const shipment = calls.find(call => call.url.includes('/create/adhoc')).body;
  assert.equal(pickup.address, 'Seller warehouse');
  assert.equal(pickup.pin_code, '110001');
  assert.equal(shipment.pickup_location, pickup.pickup_location);
  assert.equal(shipment.shipping_address, 'Delivery street');
  assert.equal(shipment.shipping_pincode, '400001');
  assert.equal(order.shipping.pickupAddress.address, 'Seller warehouse');
 });

test('admin dispatch rejects unverified pickup before shipment creation',async t=>{
 const {run,calls}=setup(t);
 const original=globalThis.fetch;
 t.mock.method(globalThis,'fetch',async(url,options)=>String(url).includes('/settings/company/pickup') ? {ok:true,json:async()=>({data:{shipping_address:[{pickup_location:'ADMIN_VERIFIED',phone_verified:0,is_active:1}]}})} : original(url,options));
 await assert.rejects(run(),/not verified/);
 assert.equal(calls.filter(call=>call.url.includes('/create/adhoc')).length,0);
});

test('admin dispatch saves pickup and packing slip without pretending the parcel is shipped',async t=>{
 const {run,order}=setup(t);
 await run();
 assert.equal(order.shipping.pickupLocation,'ADMIN_VERIFIED');
 assert.equal(order.shipping.pickupAddress.pinCode,'131301');
 assert.equal(order.fulfillment.packingSlipUrl,'https://example.com/label');
 assert.equal(order.fulfillment.shippedAt,undefined);
});

test('customer tracking persists admin parcel delivery to the shared order',async t=>{
 const { trackMyOrder } = await import('../src/controllers/customerAccountController.js');
 const order={_id:'order',orderNumber:'ORD1',status:'Packed',items:[{sellerStatus:'Packed',returnApplicable:true,returnDays:7}],shipping:{shipmentId:'456',awbCode:'AWB'},timeline:[],save:async()=>{}};
 let filter;
 t.mock.method(Order,'findOne',async value=>{filter=value;return order;});
 t.mock.method(ShipRocketSetting,'findOne',async()=>({email:'api@example.com',password:'test'}));
 t.mock.method(globalThis,'fetch',async url=>({ok:true,json:async()=>String(url).includes('/auth/login') ? {token:'token'} : {tracking_data:{track_status:1,shipment_track:[{current_status:'DELIVERED',delivered_date:'2026-10-10 10:00:00'}],shipment_track_activities:[{activity:'Delivered',date:'2026-10-10 10:00:00'}]}}}));
 const result=await new Promise((resolve,reject)=>trackMyOrder({params:{orderId:'order'},customer:{_id:'buyer'}},{set(){},json:resolve},reject));
 assert.deepEqual(filter,{_id:'order',customer:'buyer'});
 assert.equal(order.status,'Delivered');
 assert.equal(order.items[0].sellerStatus,'Delivered');
 assert.equal(result.order.status,'Delivered');
 assert.equal(result.order.items[0].sellerStatus,'Delivered');
 assert.ok(order.items[0].returnWindowClosesAt>order.items[0].deliveredAt);
});

test('packing slip regeneration updates the order document links',async t=>{
 const {generateShiprocketDocument}=await import('../src/services/shiprocketTrackingService.js');
 const order={shipping:{shipmentId:456},save:async()=>{}};
 t.mock.method(globalThis,'fetch',async()=>({ok:true,json:async()=>({label_url:'https://shiprocket.co/packing.pdf'})}));
 await generateShiprocketDocument(order,'token','label');
 assert.equal(order.fulfillment.packingSlipUrl,'https://shiprocket.co/packing.pdf');
 assert.equal(order.shipping.labelUrl,order.fulfillment.shippingLabelUrl);
});
