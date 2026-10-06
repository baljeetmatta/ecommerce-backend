import{f as i,j as e,C as l}from"./index-Djlcqvud.js";import{o as t}from"./orderPayment-CNKKkTug.js";/**
 * @license lucide-react v0.468.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const y=i("Banknote",[["rect",{width:"20",height:"12",x:"2",y:"6",rx:"2",key:"9lu3g6"}],["circle",{cx:"12",cy:"12",r:"2",key:"1c9p78"}],["path",{d:"M6 12h.01M18 12h.01",key:"113zkx"}]]);/**
 * @license lucide-react v0.468.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const s=i("SlidersHorizontal",[["line",{x1:"21",x2:"14",y1:"4",y2:"4",key:"obuewd"}],["line",{x1:"10",x2:"3",y1:"4",y2:"4",key:"1q6298"}],["line",{x1:"21",x2:"12",y1:"12",y2:"12",key:"1iu8h1"}],["line",{x1:"8",x2:"3",y1:"12",y2:"12",key:"ntss68"}],["line",{x1:"21",x2:"16",y1:"20",y2:"20",key:"14d8ph"}],["line",{x1:"12",x2:"3",y1:"20",y2:"20",key:"m0wm8r"}],["line",{x1:"14",x2:"14",y1:"2",y2:"6",key:"14e1ph"}],["line",{x1:"8",x2:"8",y1:"10",y2:"14",key:"1i6ji0"}],["line",{x1:"16",x2:"16",y1:"18",y2:"22",key:"1lctlv"}]]);/**
 * @license lucide-react v0.468.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const x=i("Tag",[["path",{d:"M12.586 2.586A2 2 0 0 0 11.172 2H4a2 2 0 0 0-2 2v7.172a2 2 0 0 0 .586 1.414l8.704 8.704a2.426 2.426 0 0 0 3.42 0l6.58-6.58a2.426 2.426 0 0 0 0-3.42z",key:"vktsd0"}],["circle",{cx:"7.5",cy:"7.5",r:".5",fill:"currentColor",key:"kqv944"}]]);function c({order:r}){const n=t(r),a=n==="COD"?y:l;return e.jsxs("span",{className:`orderPaymentBadge ${n==="COD"?"orderPaymentCod":"orderPaymentOnline"}`,title:n==="COD"?"Cash on delivery":"Online payment",children:[e.jsx(a,{size:15,"aria-hidden":"true"}),e.jsx("span",{children:n})]})}function h({value:r,onChange:n}){return e.jsxs("label",{className:"orderPaymentFilter",children:[e.jsxs("span",{children:[e.jsx(s,{size:14,"aria-hidden":"true"}),"Payment mode"]}),e.jsxs("select",{value:r,onChange:a=>n(a.target.value),children:[e.jsx("option",{value:"all",children:"All payment modes"}),e.jsx("option",{value:"COD",children:"Cash on delivery (COD)"}),e.jsx("option",{value:"Online",children:"Online payment"})]})]})}export{h as O,x as T,c as a};
