import test from 'node:test';
import assert from 'node:assert/strict';
import { getMyOrder } from '../src/controllers/customerAccountController.js';
import Order from '../src/models/Order.js';
const invoke=(id)=>new Promise(resolve=>{const res={statusCode:200,status(code){this.statusCode=code;return this},set(){return this},json(value){resolve({status:this.statusCode,value})}};getMyOrder({params:{orderId:id},customer:{_id:'b'.repeat(24)}},res,error=>resolve({status:res.statusCode,error}));});
test('native detail queries only the signed-in customer and excludes seller internals',async t=>{let filter,selection;const saved={_id:'a'.repeat(24),orderNumber:'ORD-1'};t.mock.method(Order,'findOne',value=>{filter=value;return{populate(){return this},select(value){selection=value;return Promise.resolve(saved)}}});const result=await invoke(saved._id);assert.deepEqual(filter,{_id:saved._id,customer:'b'.repeat(24)});assert.equal(selection,'-items.seller');assert.deepEqual(result.value,{order:saved})});
test('native detail returns 404 for an order outside the account',async t=>{t.mock.method(Order,'findOne',()=>({populate(){return this},select:async()=>null}));assert.equal((await invoke('a'.repeat(24))).status,404)});
test('native detail rejects invalid IDs before querying MongoDB',async()=>{assert.equal((await invoke('invalid')).status,400)});
