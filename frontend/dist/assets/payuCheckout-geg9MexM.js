import{c as r}from"./index-BbCoX3BX.js";/**
 * @license lucide-react v0.468.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const d=r("Mail",[["rect",{width:"20",height:"16",x:"2",y:"4",rx:"2",key:"18n3k1"}],["path",{d:"m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7",key:"1ocrg3"}]]);/**
 * @license lucide-react v0.468.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const c=r("Minus",[["path",{d:"M5 12h14",key:"1ays0h"}]]);/**
 * @license lucide-react v0.468.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const l=r("WalletCards",[["rect",{width:"18",height:"18",x:"3",y:"3",rx:"2",key:"afitv7"}],["path",{d:"M3 9a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2",key:"4125el"}],["path",{d:"M3 11h3c.8 0 1.6.3 2.1.9l1.1.9c1.6 1.6 4.1 1.6 5.7 0l1.1-.9c.5-.5 1.3-.9 2.1-.9H21",key:"1dpki6"}]]),u=(e,a=null)=>{a&&sessionStorage.setItem("hrbasket_payu_pending",JSON.stringify({...a,txnid:e.fields.txnid}));const t=document.createElement("form");return t.method="POST",t.action=e.action,t.target="_self",Object.entries(e.fields||{}).forEach(([s,i])=>{const n=document.createElement("input");n.type="hidden",n.name=s,n.value=i??"",t.appendChild(n)}),document.body.appendChild(t),t.submit(),new Promise(()=>{})},h=()=>{const e=new URL(window.location.href),a=e.searchParams.get("payu_txnid"),t=e.searchParams.get("payu_status");if(!a)return null;const s=JSON.parse(sessionStorage.getItem("hrbasket_payu_pending")||"null");return e.searchParams.delete("payu_txnid"),e.searchParams.delete("payu_status"),window.history.replaceState({},"",e.toString()),(s==null?void 0:s.txnid)===a?{...s,txnid:a,status:t}:{txnid:a,status:t}},p=()=>sessionStorage.removeItem("hrbasket_payu_pending");export{c as M,l as W,d as a,p as c,u as o,h as r};
