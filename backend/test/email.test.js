import test from 'node:test';
import assert from 'node:assert/strict';
import nodemailer from 'nodemailer';
import EmailSetting from '../src/models/EmailSetting.js';
import { sendEmail } from '../src/utils/email.js';
import { requestOrderOtp } from '../src/controllers/storefrontController.js';
import OrderOtp from '../src/models/OrderOtp.js';

const setting = {host:'smtp.example.com',port:587,secure:false,username:'sender',password:'secret',fromEmail:'sender@example.com',fromName:'Store'};
for (const secure of [false,true]) test(`SMTP transport supports ${secure ? 'implicit TLS' : 'STARTTLS'}`, async t => {
 t.mock.method(EmailSetting,'findOne',()=>({select:async()=>({...setting,secure,port:secure?465:587})}));
 let options; let message; let closed=false;
 t.mock.method(nodemailer,'createTransport',config=>{options=config;return {sendMail:async data=>{message=data;return {accepted:[data.to],rejected:[]};},close:()=>{closed=true;}};});
 await sendEmail({to:'buyer@example.com',subject:'OTP',text:'123456'});
 assert.equal(options.secure,secure);
 assert.equal(options.ignoreTLS,undefined);
 assert.deepEqual(options.auth,{user:'sender',pass:'secret'});
 assert.equal(message.to,'buyer@example.com');
 assert.equal(message.text,'123456');
 assert.equal(closed,true);
});

test('failed OTP delivery deletes the challenge so retry is possible',async t=>{
 t.mock.method(EmailSetting,'findOne',()=>({select:async()=>setting}));
 t.mock.method(nodemailer,'createTransport',()=>({sendMail:async()=>{throw new Error('SMTP unavailable');},close(){}}));
 t.mock.method(OrderOtp,'findOne',()=>({sort:async()=>null}));
 let deleted=false;
 t.mock.method(OrderOtp,'create',async()=>({_id:'challenge',deleteOne:async()=>{deleted=true;}}));
 let status;
 await assert.rejects(new Promise((resolve,reject)=>requestOrderOtp({body:{},customer:{_id:'buyer',email:'buyer@example.com'}},{status(code){status=code;return this;},json:resolve},reject)),/Unable to send/);
 assert.equal(status,502);
 assert.equal(deleted,true);
});

test('SMTP recipient rejection is not reported as successful delivery',async t=>{
 t.mock.method(EmailSetting,'findOne',()=>({select:async()=>setting}));
 t.mock.method(nodemailer,'createTransport',()=>({sendMail:async()=>({accepted:[],rejected:['buyer@example.com']}),close(){}}));
 await assert.rejects(sendEmail({to:'buyer@example.com',subject:'OTP',text:'123456'}),/did not accept/);
});
