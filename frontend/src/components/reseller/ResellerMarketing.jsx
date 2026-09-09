import { readSaved, money } from "./utils.js";
import Lead from "./Lead.jsx";
import Empty from "./Empty.jsx";
export default function ResellerMarketing({ links, navigate, copy }) {
  return <><Lead title="Marketing Tools">Create a message for your existing product links.</Lead><section className="resellerPanel rsSection">{links.map(link=><div className="rsMarketingRow" key={link._id}><h3>{link.product?.name||"Product"}</h3><p>{link.url||`${window.location.origin}/#/resell/${link.code}`}</p><button className="resellerPrimary" onClick={()=>copy(`${link.product?.name||"Discover this product"} — ${money(link.customerPrice)}\n${link.url||`${window.location.origin}/#/resell/${link.code}`}`)}>Copy sharing message</button></div>)}{!links.length&&<><Empty>Create your first product link to generate a sharing message.</Empty><button className="resellerPrimary" onClick={()=>navigate("add")}>Create product link</button></>}</section></>;
}
