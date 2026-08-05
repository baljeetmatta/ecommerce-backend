import{c as t,j as e,X as o}from"./index-4Q18GAky.js";import{C as h,B as i,M as p}from"./megaphone-nADurB2u.js";import{F as k,S as y,b as m}from"./App-CWBvxXeV.js";import{P as b,S as x}from"./store-D-zeeoJX.js";/**
 * @license lucide-react v0.468.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const u=t("BookOpenText",[["path",{d:"M12 7v14",key:"1akyts"}],["path",{d:"M16 12h2",key:"7q9ll5"}],["path",{d:"M16 8h2",key:"msurwy"}],["path",{d:"M3 18a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1h5a4 4 0 0 1 4 4 4 4 0 0 1 4-4h5a1 1 0 0 1 1 1v13a1 1 0 0 1-1 1h-6a3 3 0 0 0-3 3 3 3 0 0 0-3-3z",key:"ruj8y"}],["path",{d:"M6 12h2",key:"32wvfc"}],["path",{d:"M6 8h2",key:"30oboj"}]]);/**
 * @license lucide-react v0.468.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const g=t("Handshake",[["path",{d:"m11 17 2 2a1 1 0 1 0 3-3",key:"efffak"}],["path",{d:"m14 14 2.5 2.5a1 1 0 1 0 3-3l-3.88-3.88a3 3 0 0 0-4.24 0l-.88.88a1 1 0 1 1-3-3l2.81-2.81a5.79 5.79 0 0 1 7.06-.87l.47.28a2 2 0 0 0 1.42.25L21 4",key:"9pr0kb"}],["path",{d:"m21 3 1 11h-2",key:"1tisrp"}],["path",{d:"M3 3 2 14l6.5 6.5a1 1 0 1 0 3-3",key:"1uvwmv"}],["path",{d:"M3 4h8",key:"1ep09j"}]]);/**
 * @license lucide-react v0.468.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const M=t("Image",[["rect",{width:"18",height:"18",x:"3",y:"3",rx:"2",ry:"2",key:"1m3agn"}],["circle",{cx:"9",cy:"9",r:"2",key:"af1f0g"}],["path",{d:"m21 15-3.086-3.086a2 2 0 0 0-2.828 0L6 21",key:"1xmnt7"}]]);/**
 * @license lucide-react v0.468.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const f=t("PanelBottom",[["rect",{width:"18",height:"18",x:"3",y:"3",rx:"2",key:"afitv7"}],["path",{d:"M3 15h18",key:"5xshup"}]]);/**
 * @license lucide-react v0.468.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const j=t("SquarePlus",[["rect",{width:"18",height:"18",x:"3",y:"3",rx:"2",key:"afitv7"}],["path",{d:"M8 12h8",key:"1wcyev"}],["path",{d:"M12 8v8",key:"napkw2"}]]);/**
 * @license lucide-react v0.468.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const v=t("UsersRound",[["path",{d:"M18 21a8 8 0 0 0-16 0",key:"3ypg7q"}],["circle",{cx:"10",cy:"8",r:"5",key:"o932ke"}],["path",{d:"M22 20c0-3.37-2-6.5-4-8a5 5 0 0 0-.45-8.3",key:"10s06x"}]]),S=[{id:"analytics",label:"Analytics",icon:h},{id:"catalog",label:"Catalog",icon:i},{id:"add-product",label:"Add Product",icon:j},{id:"orders",label:"Orders",icon:b},{id:"customers",label:"Customers",icon:v},{id:"partners",label:"Partners",icon:g},{id:"sellers",label:"Sellers",icon:x},{id:"seller-products",label:"Seller Products",icon:i},{id:"banners",label:"Banners",icon:M},{id:"blog",label:"Blog",icon:u},{id:"pages",label:"Pages",icon:k},{id:"footer",label:"Footer",icon:f},{id:"marketing",label:"Marketing",icon:p},{id:"team",label:"Access",icon:y},{id:"settings-payments",label:"Settings",icon:m}];function C({active:n,onChange:l,open:r=!1,onClose:s,settings:d={}}){return e.jsxs("aside",{className:`sidebar ${r?"mobileOpen":""}`,children:[e.jsx("button",{className:"sidebarClose",type:"button",onClick:s,"aria-label":"Close admin menu",children:e.jsx(o,{size:22})}),e.jsxs("div",{className:"brand sidebarTextBrand",children:[e.jsx("strong",{children:d.shopName||"HRS Basket"}),e.jsx("span",{children:"ADMIN CONSOLE"})]}),e.jsx("p",{className:"navCaption",children:"MANAGEMENT"}),e.jsx("nav",{children:S.map(a=>{const c=a.icon;return e.jsxs("button",{type:"button",className:n===a.id||a.id==="settings-payments"&&n.startsWith("settings-")||a.id==="partners"&&n.startsWith("partner-")?"navItem active":"navItem",onClick:()=>{l(a.id),s==null||s()},title:a.label,children:[e.jsx(c,{size:18}),e.jsx("span",{children:a.label})]},a.id)})})]})}export{C as default};
