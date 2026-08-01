import{c as o}from"./index-D1kbrHmj.js";/**
 * @license lucide-react v0.468.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const u=o("Minus",[["path",{d:"M5 12h14",key:"1ays0h"}]]),d=(e,a=null)=>{a&&sessionStorage.setItem("hrbasket_payu_pending",JSON.stringify({...a,txnid:e.fields.txnid}));const t=document.createElement("form");return t.method="POST",t.action=e.action,t.target="_self",Object.entries(e.fields||{}).forEach(([n,r])=>{const s=document.createElement("input");s.type="hidden",s.name=n,s.value=r??"",t.appendChild(s)}),document.body.appendChild(t),t.submit(),new Promise(()=>{})},c=()=>{const e=new URL(window.location.href),a=e.searchParams.get("payu_txnid"),t=e.searchParams.get("payu_status");if(!a)return null;const n=JSON.parse(sessionStorage.getItem("hrbasket_payu_pending")||"null");return e.searchParams.delete("payu_txnid"),e.searchParams.delete("payu_status"),window.history.replaceState({},"",e.toString()),(n==null?void 0:n.txnid)===a?{...n,txnid:a,status:t}:{txnid:a,status:t}},p=()=>sessionStorage.removeItem("hrbasket_payu_pending");export{u as M,p as c,d as o,c as r};
