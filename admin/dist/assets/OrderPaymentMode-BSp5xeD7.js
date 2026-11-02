import{c as t,j as e}from"./index-DEI1-MUx.js";import{k as o}from"./App-B8CHy3-9.js";import{o as s,S as i}from"./orderPayment-CfSuaims.js";/**
 * @license lucide-react v0.468.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const l=t("Banknote",[["rect",{width:"20",height:"12",x:"2",y:"6",rx:"2",key:"9lu3g6"}],["circle",{cx:"12",cy:"12",r:"2",key:"1c9p78"}],["path",{d:"M6 12h.01M18 12h.01",key:"113zkx"}]]);/**
 * @license lucide-react v0.468.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const y=t("Tag",[["path",{d:"M12.586 2.586A2 2 0 0 0 11.172 2H4a2 2 0 0 0-2 2v7.172a2 2 0 0 0 .586 1.414l8.704 8.704a2.426 2.426 0 0 0 3.42 0l6.58-6.58a2.426 2.426 0 0 0 0-3.42z",key:"vktsd0"}],["circle",{cx:"7.5",cy:"7.5",r:".5",fill:"currentColor",key:"kqv944"}]]);function h({order:r}){const n=s(r),a=n==="COD"?l:o;return e.jsxs("span",{className:`orderPaymentBadge ${n==="COD"?"orderPaymentCod":"orderPaymentOnline"}`,title:n==="COD"?"Cash on delivery":"Online payment",children:[e.jsx(a,{size:15,"aria-hidden":"true"}),e.jsx("span",{children:n})]})}function x({value:r,onChange:n}){return e.jsxs("label",{className:"orderPaymentFilter",children:[e.jsxs("span",{children:[e.jsx(i,{size:14,"aria-hidden":"true"}),"Payment mode"]}),e.jsxs("select",{value:r,onChange:a=>n(a.target.value),children:[e.jsx("option",{value:"all",children:"All payment modes"}),e.jsx("option",{value:"COD",children:"Cash on delivery (COD)"}),e.jsx("option",{value:"Online",children:"Online payment"})]})]})}export{x as O,y as T,h as a};
