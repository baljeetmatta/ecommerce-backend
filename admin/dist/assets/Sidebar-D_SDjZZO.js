import{c as l,r as c,j as s,X as g}from"./index-CxXPPrge.js";import{L as M,B as h,M as S,C as j}from"./megaphone-CBT3qAl1.js";import{C as w}from"./chevron-down-ByxtFWjF.js";import{H as v,F as C,b as N,S as P}from"./App-gOtOtdEr.js";import{S as p,P as B}from"./store-Ds8m1yPN.js";/**
 * @license lucide-react v0.468.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const R=l("BookOpenText",[["path",{d:"M12 7v14",key:"1akyts"}],["path",{d:"M16 12h2",key:"7q9ll5"}],["path",{d:"M16 8h2",key:"msurwy"}],["path",{d:"M3 18a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1h5a4 4 0 0 1 4 4 4 4 0 0 1 4-4h5a1 1 0 0 1 1 1v13a1 1 0 0 1-1 1h-6a3 3 0 0 0-3 3 3 3 0 0 0-3-3z",key:"ruj8y"}],["path",{d:"M6 12h2",key:"32wvfc"}],["path",{d:"M6 8h2",key:"30oboj"}]]);/**
 * @license lucide-react v0.468.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const I=l("Handshake",[["path",{d:"m11 17 2 2a1 1 0 1 0 3-3",key:"efffak"}],["path",{d:"m14 14 2.5 2.5a1 1 0 1 0 3-3l-3.88-3.88a3 3 0 0 0-4.24 0l-.88.88a1 1 0 1 1-3-3l2.81-2.81a5.79 5.79 0 0 1 7.06-.87l.47.28a2 2 0 0 0 1.42.25L21 4",key:"9pr0kb"}],["path",{d:"m21 3 1 11h-2",key:"1tisrp"}],["path",{d:"M3 3 2 14l6.5 6.5a1 1 0 1 0 3-3",key:"1uvwmv"}],["path",{d:"M3 4h8",key:"1ep09j"}]]);/**
 * @license lucide-react v0.468.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const O=l("Image",[["rect",{width:"18",height:"18",x:"3",y:"3",rx:"2",ry:"2",key:"1m3agn"}],["circle",{cx:"9",cy:"9",r:"2",key:"af1f0g"}],["path",{d:"m21 15-3.086-3.086a2 2 0 0 0-2.828 0L6 21",key:"1xmnt7"}]]);/**
 * @license lucide-react v0.468.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const L=l("PanelBottom",[["rect",{width:"18",height:"18",x:"3",y:"3",rx:"2",key:"afitv7"}],["path",{d:"M3 15h18",key:"5xshup"}]]);/**
 * @license lucide-react v0.468.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const E=l("RotateCcw",[["path",{d:"M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8",key:"1357e3"}],["path",{d:"M3 3v5h5",key:"1xhq8a"}]]);/**
 * @license lucide-react v0.468.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const T=l("SquarePlus",[["rect",{width:"18",height:"18",x:"3",y:"3",rx:"2",key:"afitv7"}],["path",{d:"M8 12h8",key:"1wcyev"}],["path",{d:"M12 8v8",key:"napkw2"}]]);/**
 * @license lucide-react v0.468.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const b=l("UsersRound",[["path",{d:"M18 21a8 8 0 0 0-16 0",key:"3ypg7q"}],["circle",{cx:"10",cy:"8",r:"5",key:"o932ke"}],["path",{d:"M22 20c0-3.37-2-6.5-4-8a5 5 0 0 0-.45-8.3",key:"10s06x"}]]),m=[{label:"Overview",items:[{id:"dashboard",label:"Dashboard",icon:M}]},{label:"Master",items:[{id:"customers",label:"Customers",icon:b},{id:"partners",label:"Partners",icon:I},{id:"sellers",label:"Sellers",icon:p},{id:"staff",label:"Staff",icon:b}]},{label:"Catalog",items:[{id:"catalog",label:"Products",icon:h},{id:"add-product",label:"Add Product",icon:T},{id:"seller-products",label:"Seller Products",icon:h}]},{label:"Operations",items:[{id:"orders",label:"Orders",icon:B},{id:"returns-refunds",label:"Returns & Refunds",icon:E},{id:"seller-withdrawals",label:"Seller Withdrawals",icon:p},{id:"support-tickets",label:"Support Tickets",icon:v}]},{label:"Site",items:[{id:"blog",label:"Blog",icon:R},{id:"banners",label:"Banners",icon:O},{id:"pages",label:"Pages",icon:C},{id:"footer",label:"Footer",icon:L},{id:"marketing",label:"Marketing",icon:S},{id:"settings-payments",label:"Settings",icon:N},{id:"team",label:"Access",icon:P}]},{label:"Reporting",items:[{id:"analytics",label:"Analytics",icon:j}]}];function A({active:n,onChange:k,open:u=!1,onClose:i,settings:y={}}){const d=e=>{var t;return(t=m.find(a=>a.items.some(r=>r.id===e||r.id==="staff"&&e==="create-staff"||r.id==="settings-payments"&&e.startsWith("settings-")||r.id==="partners"&&e.startsWith("partner-"))))==null?void 0:t.label},[x,o]=c.useState(()=>new Set([d(n)||"Master"]));c.useEffect(()=>{const e=d(n);e&&o(t=>new Set([...t,e]))},[n]);const f=e=>o(t=>{const a=new Set(t);return a.has(e)?a.delete(e):a.add(e),a});return s.jsxs("aside",{className:`sidebar ${u?"mobileOpen":""}`,children:[s.jsx("button",{className:"sidebarClose",type:"button",onClick:i,"aria-label":"Close admin menu",children:s.jsx(g,{size:22})}),s.jsxs("div",{className:"brand sidebarTextBrand",children:[s.jsx("strong",{children:y.shopName||"HRS Basket"}),s.jsx("span",{children:"ADMIN CONSOLE"})]}),s.jsx("nav",{children:m.map(e=>{const t=x.has(e.label);return s.jsxs("section",{className:"navGroup",children:[s.jsxs("button",{className:"navGroupToggle",type:"button",onClick:()=>f(e.label),"aria-expanded":t,children:[s.jsx("span",{children:e.label}),s.jsx(w,{size:17,className:t?"expanded":""})]}),t&&s.jsx("div",{className:"navGroupItems",children:e.items.map(a=>{const r=a.icon;return s.jsxs("button",{type:"button",className:n===a.id||a.id==="staff"&&n==="create-staff"||a.id==="settings-payments"&&n.startsWith("settings-")||a.id==="partners"&&n.startsWith("partner-")?"navItem active":"navItem",onClick:()=>{k(a.id),i==null||i()},title:a.label,children:[s.jsx(r,{size:18}),s.jsx("span",{children:a.label})]},a.id)})})]},e.label)})})]})}export{A as default};
