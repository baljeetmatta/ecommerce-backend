import test from 'node:test';
import assert from 'node:assert/strict';
import { changeAdminPassword, changeCustomerPassword } from '../src/controllers/authController.js';
import User from '../src/models/User.js';
import Customer from '../src/models/Customer.js';
const invoke=(handler,body,key)=>new Promise(resolve=>{
 const response={statusCode:200,status(code){this.statusCode=code;return this;},json(value){resolve({status:this.statusCode,value});}};
 handler({body,[key]:{_id:'a'.repeat(24)}},response,error=>resolve({status:response.statusCode,error}));
});
for (const [name,Model,key,handler] of [['admin',User,'user',changeAdminPassword],['reseller',Customer,'customer',changeCustomerPassword]]) {
 test(`${name} verifies current password and clears reset credentials on success`,async(t)=>{
  let saved=0;
  const account={passwordResetToken:'old-token',passwordResetExpires:new Date(),passwordVault:'old-vault',matchPassword:async value=>value==='correct',save:async()=>{saved++;}};
  t.mock.method(Model,'findById',()=>({select:async()=>account}));
  assert.equal((await invoke(handler,{currentPassword:'wrong',newPassword:'NewPassword1!'},key)).status,401);
  assert.equal((await invoke(handler,{currentPassword:'correct',newPassword:'short'},key)).status,400);
  assert.equal(saved,0);
  assert.equal((await invoke(handler,{currentPassword:'correct',newPassword:'NewPassword1!'},key)).status,200);
  assert.equal(saved,1);
  assert.equal(account.password,'NewPassword1!');
  assert.equal(account.passwordResetToken,undefined);
  assert.equal(account.passwordResetExpires,undefined);
  if(Model===Customer) assert.equal(account.passwordVault,undefined);
 });
}
