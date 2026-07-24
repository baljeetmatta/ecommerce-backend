import{c as r}from"./index-BXN7sgQA.js";/**
 * @license lucide-react v0.468.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const c=r("Mail",[["rect",{width:"20",height:"16",x:"2",y:"4",rx:"2",key:"18n3k1"}],["path",{d:"m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7",key:"1ocrg3"}]]);/**
 * @license lucide-react v0.468.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const d=r("Minus",[["path",{d:"M5 12h14",key:"1ays0h"}]]),u=(e,a=null)=>{a&&sessionStorage.setItem("hrbasket_payu_pending",JSON.stringify({...a,txnid:e.fields.txnid}));const t=document.createElement("form");return t.method="POST",t.action=e.action,t.target="_self",Object.entries(e.fields||{}).forEach(([n,i])=>{const s=document.createElement("input");s.type="hidden",s.name=n,s.value=i??"",t.appendChild(s)}),document.body.appendChild(t),t.submit(),new Promise(()=>{})},l=()=>{const e=new URL(window.location.href),a=e.searchParams.get("payu_txnid"),t=e.searchParams.get("payu_status");if(!a)return null;const n=JSON.parse(sessionStorage.getItem("hrbasket_payu_pending")||"null");return e.searchParams.delete("payu_txnid"),e.searchParams.delete("payu_status"),window.history.replaceState({},"",e.toString()),(n==null?void 0:n.txnid)===a?{...n,txnid:a,status:t}:{txnid:a,status:t}},p=()=>sessionStorage.removeItem("hrbasket_payu_pending");export{d as M,c as a,p as c,u as o,l as r};
