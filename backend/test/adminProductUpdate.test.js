import test from 'node:test';
import assert from 'node:assert/strict';
import Product from '../src/models/Product.js';
import {updateProduct} from '../src/controllers/productController.js';

test('authorized admin edit applies immediately, preserves ownership and SKU, and clears pending proposals',async t=>{
 const product=new Product({_id:'a'.repeat(24),name:'Original',sku:'ORIGINAL-SKU',price:100,costPrice:50,category:'d'.repeat(24),prepaidAvailable:true,approvalStatus:'pending_update',pendingChanges:{name:'Unapproved proposal'}});
 let saved=false;
 t.mock.method(Product,'findById',async()=>product);
 t.mock.method(product,'save',async()=>{await product.validate();saved=true;return product;});
 t.mock.method(product,'populate',async()=>product);
 const response=await new Promise((resolve,reject)=>updateProduct({params:{id:product._id},body:{_id:'b'.repeat(24),seller:'c'.repeat(24),name:'Admin edit',price:120},user:{role:'Super Admin'}},{status(){return this;},json:resolve},reject));
 assert.equal(saved,true);
 assert.equal(response.name,'Admin edit');
 assert.equal(response.price,120);
 assert.equal(response.sku,'ORIGINAL-SKU');
 assert.equal(String(response._id),'a'.repeat(24));
 assert.equal(response.seller,undefined);
 assert.equal(response.approvalStatus,'approved');
 assert.equal(response.pendingChanges,undefined);
});
