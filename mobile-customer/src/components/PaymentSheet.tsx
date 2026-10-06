import { Modal, Platform, View, Text, StyleSheet } from 'react-native';
import { WebView } from 'react-native-webview';
import { Button } from './Ui';
import { API_URL } from '@/lib/api';
const escape=(value:unknown)=>String(value??'').replace(/&/g,'&amp;').replace(/"/g,'&quot;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
export type PaymentSession={type:'razorpay'|'payu';data:any;name:string;email:string;phone:string};
export function PaymentSheet({session,onComplete,onCancel}:{session:PaymentSession|null;onComplete:(result:any)=>void;onCancel:()=>void}) {
 if(!session)return null;
 const {data}=session;
 const scriptJSON=(value:unknown)=>JSON.stringify(value).replace(/</g,'\\u003c');
 const html=session.type==='razorpay'?`<!doctype html><html><head><meta name="viewport" content="width=device-width,initial-scale=1"><script src="https://checkout.razorpay.com/v1/checkout.js"></script></head><body><p>Opening secure payment…</p><script>
 const send=(data)=>window.ReactNativeWebView.postMessage(JSON.stringify(data));
 const options=${scriptJSON({key:data.keyId,amount:data.amount,currency:data.currency,order_id:data.orderId,name:data.merchantName,prefill:{name:session.name,email:session.email,contact:session.phone}})};
 options.handler=(r)=>send({ok:true,razorpayOrderId:r.razorpay_order_id,razorpayPaymentId:r.razorpay_payment_id,razorpaySignature:r.razorpay_signature});options.modal={ondismiss:()=>send({cancelled:true})};
 const checkout=new Razorpay(options);checkout.on('payment.failed',r=>send({ok:false,error:r.error.description}));checkout.open();</script></body></html>`:`<!doctype html><html><head><meta name="viewport" content="width=device-width,initial-scale=1"></head><body><form id="pay" method="POST" action="${escape(data.action)}">${Object.entries(data.fields||{}).map(([k,v])=>`<input type="hidden" name="${escape(k)}" value="${escape(v)}">`).join('')}</form><script>document.getElementById('pay').submit()</script></body></html>`;
 return <Modal visible animationType="slide" onRequestClose={onCancel}><View style={s.wrap}><View style={s.header}><Text style={s.title}>Secure payment</Text><Button title="Close" variant="outline" onPress={onCancel}/></View>{Platform.OS==='web'?<Text>Open the iOS or Android app to pay online.</Text>:<WebView source={{html,baseUrl:API_URL.replace(/\/api$/,'')}} originWhitelist={['https://*','http://*','about:*']} javaScriptEnabled domStorageEnabled injectedJavaScript={`if(window.p && window.p.source==='hrbasket-payu')window.ReactNativeWebView.postMessage(JSON.stringify(window.p));true;`} onMessage={event=>{try{const r=JSON.parse(event.nativeEvent.data);if(session.type==='payu'&&(r.source!=='hrbasket-payu'||r.txnid!==data.fields.txnid))return;if(r.cancelled)onCancel();else onComplete(r)}catch{}}} onError={()=>onComplete({ok:false,error:'Unable to load payment provider. Please retry.'})}/>}</View></Modal>;
}
const s=StyleSheet.create({wrap:{flex:1,paddingTop:50,backgroundColor:'white'},header:{padding:14,flexDirection:'row',alignItems:'center',justifyContent:'space-between'},title:{fontSize:20,fontWeight:'800'}});
