import { Plus, Link2, Copy } from "lucide-react";
import { money } from "./portalUtils.js";
import WhatsAppIcon from "../../components/WhatsAppIcon.jsx";
export default function ResellerLinks({ openAddFlow, links, copy, encodeURIComponent }) {
  return (<><div className="resellerPageLead"><div><h2>Share &amp; Earn</h2><p>Copy and share your active product selling links.</p></div><button onClick={openAddFlow}><Plus /> Create Link</button></div><section className="resellerLinkList">{links.map(link => { const url = link.url || `${window.location.origin}/#/resell/${link.code}`; return <article className="resellerPanel" key={link._id}><Link2 /><span><strong>{link.product?.name}</strong><small>{url}</small></span><b>{money(link.customerPrice)}</b><button onClick={() => copy(url)}><Copy /> Copy</button><a href={`https://wa.me/?text=${encodeURIComponent(url)}`} target="_blank" rel="noreferrer" aria-label="Share on WhatsApp"><WhatsAppIcon /></a></article> })}{!links.length && <p className="rsEmpty">No sharing links yet. Create a link to start earning.</p>}</section></>);
}
