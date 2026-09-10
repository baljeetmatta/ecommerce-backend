import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, writeFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import Order from '../src/models/Order.js';
import { requestItemReturn } from '../src/controllers/customerAccountController.js';

test('return API rejects multiple reasons and saves one reason with photo/video evidence', async t => {
 const root = await mkdtemp(path.join(tmpdir(), 'return-reason-'));
 const oldRoot = process.env.UPLOAD_DIR; const oldOrigin = process.env.PUBLIC_API_URL;
 process.env.UPLOAD_DIR = root; process.env.PUBLIC_API_URL = 'https://store.example';
 try {
  await writeFile(path.join(root,'photo.webp'), 'fixture');
  await writeFile(path.join(root,'video.mp4'), 'fixture');
  const evidence = [{category:'Unboxing Photo',url:'https://store.example/uploads/photo.webp'},{category:'Unboxing Video',url:'https://store.example/uploads/video.mp4'}];
  let saved = 0;
  const item = {product:'product-1',returnApplicable:true,returnDays:7,sellerStatus:'Delivered',deliveredAt:new Date()};
  const order = {items:[item],timeline:[],save:async()=>{saved++;}};
  t.mock.method(Order,'findOne',async()=>order);
  const request = reason => new Promise((resolve,reject)=>requestItemReturn({params:{orderId:'order-1',productId:'product-1'},customer:{_id:'customer-1'},body:{reason,evidence,comments:'Customer comment'}},{status(){return this;},json:resolve},reject));
  for (const reason of [['Damaged product','Quality issue'], 'Damaged product,Quality issue', '', {reason:'Other'}]) {
   await assert.rejects(request(reason), /exactly one valid return reason/);
  }
  assert.equal(saved,0);
  const result = await request('Damaged product');
  assert.equal(result.items[0].returnRequest.reason,'Damaged product');
  assert.deepEqual(result.items[0].returnRequest.evidence,evidence);
  assert.equal(saved,1);
 } finally {
  if (oldRoot === undefined) delete process.env.UPLOAD_DIR; else process.env.UPLOAD_DIR = oldRoot;
  if (oldOrigin === undefined) delete process.env.PUBLIC_API_URL; else process.env.PUBLIC_API_URL = oldOrigin;
  await rm(root,{recursive:true,force:true});
 }
});
