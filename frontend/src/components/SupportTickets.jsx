import TicketConversation, { TicketImagePicker } from "./TicketConversation.jsx";
import { portalLocation, navigatePortalPath } from "../utils/portalRoutes.js";
import { useEffect, useState } from "react";
import { Plus, X } from "lucide-react";
import { api } from "../services/api.js";

const adapters = {
  Customer: [api.customerTickets, api.createCustomerTicket, api.replyCustomerTicket],
  Seller: [api.sellerTickets, api.createSellerTicket, api.replySellerTicket],
  Partner: [api.partnerTickets, api.createPartnerTicket, api.replyPartnerTicket]
};

export default function SupportTickets({ accountType, orders = [], preserveRoute = false }) {
  const [listTickets, createTicket, replyTicket] = adapters[accountType];
  const [tickets, setTickets] = useState([]); const [selected, setSelected] = useState(null); const [open, setOpen] = useState(false);
  const [attachments, setAttachments] = useState([]); const [uploading, setUploading] = useState(false);
  const [busy, setBusy] = useState(false); const [message, setMessage] = useState("");
  const [form, setForm] = useState({ subject: "", category: "general", orderId: "", priority: "normal", message: "" });
  const load = async () => { const rows = await listTickets(); setTickets(rows); setSelected((current) => current ? rows.find((row) => row._id === current._id) || null : null); };
  useEffect(() => { load().catch((error) => setMessage(error.message)); }, [accountType]);
  useEffect(() => {
    if (preserveRoute) return;
    const syncTicket = () => {
      const location = accountType === "Seller" ? portalLocation() : window.location.hash.slice(1);
      const id = location.match(/\/tickets\/([^/?]+)/)?.[1];
      setSelected(id ? tickets.find(ticket => String(ticket._id) === decodeURIComponent(id)) || null : null);
    };
    syncTicket();
    window.addEventListener("popstate", syncTicket);
    window.addEventListener("hashchange", syncTicket);
    return () => { window.removeEventListener("popstate", syncTicket); window.removeEventListener("hashchange", syncTicket); };
  }, [accountType, preserveRoute, tickets]);
  const openTicket = (ticket) => { setSelected(ticket); if (!preserveRoute && accountType === "Seller") navigatePortalPath(`/seller/support/tickets/${encodeURIComponent(ticket._id)}`); else if (!preserveRoute) window.history.pushState({ supportTicket: ticket._id }, "", `${window.location.pathname}${window.location.search}#/support/${accountType.toLowerCase()}/tickets/${ticket._id}`); window.scrollTo(0, 0); };
  const closeTicket = () => { setSelected(null); if (!preserveRoute && accountType === "Seller") navigatePortalPath("/seller/support"); else if (!preserveRoute) { window.history.replaceState(null, "", `${window.location.pathname}${window.location.search}`); window.dispatchEvent(new PopStateEvent("popstate")); } };
  const submit = async (event) => { event.preventDefault(); if (busy || uploading) return; setBusy(true); try { const ticket = await createTicket({ ...form, attachments }); setAttachments([]); setForm({ subject: "", category: "general", orderId: "", priority: "normal", message: "" }); setOpen(false); setMessage(`${ticket.ticketNumber} created successfully.`); await load(); openTicket(ticket); } catch (error) { setMessage(error.message); } finally { setBusy(false); } };
  const sendReply = async ({ message, attachments }) => {
    const ticket = await replyTicket(selected._id, message, attachments);
    setSelected(ticket);
    setTickets(current => current.map(row => row._id === ticket._id ? ticket : row));
  };

  if (selected) return <TicketConversation ticket={selected} accountType={accountType} onBack={closeTicket} onSend={sendReply} notice={message} />;

  return <section className="supportTicketPage"><div className="sellerKycHeading"><div><span className="eyebrow">Help &amp; Support</span><h2>Support Tickets</h2><p>Create a general ticket or link your issue to an order.</p></div><button className="primaryButton" onClick={() => setOpen(true)}><Plus size={17}/> New Ticket</button></div>{message && <div className="notice">{message}</div>}<div className="panel tableWrap"><table><thead><tr><th>Ticket</th><th>Subject</th><th>Category</th><th>Order</th><th>Assigned to</th><th>Status</th><th>Updated</th></tr></thead><tbody>{tickets.map((ticket) => <tr className="clickableTableRow" key={ticket._id} onClick={() => openTicket(ticket)}><td><button type="button" className="ticketNumberButton" onClick={event => { event.stopPropagation(); openTicket(ticket); }}>{ticket.ticketNumber}</button></td><td>{ticket.subject}</td><td>{ticket.category}</td><td>{ticket.order?.orderNumber || "General"}</td><td>{ticket.assignedStaff?.name || "Admin Queue"}</td><td><span className={`ticketStatus ${ticket.status.toLowerCase().replaceAll(" ", "-")}`}>{ticket.status}</span></td><td>{new Date(ticket.lastActivityAt).toLocaleString("en-IN")}</td></tr>)}{!tickets.length && <tr><td className="ticketListEmpty" colSpan="7">No support tickets yet. Create a ticket whenever you need help.</td></tr>}</tbody></table></div>
    {open && <div className="modalOverlay"><form className="ticketCreateForm" onSubmit={submit} role="dialog" aria-modal="true" aria-label="Create support ticket"><div className="panelHeader"><div><span className="eyebrow">New support request</span><h2>Create Ticket</h2><p>Describe your issue and attach images to help our team.</p></div><button type="button" className="inlineButton" disabled={busy || uploading} onClick={() => setOpen(false)}><X size={16}/> Close</button></div>{message && <p className="ticketFormError" role="alert">{message}</p>}<label>Subject<input required value={form.subject} onChange={(event) => setForm({ ...form, subject: event.target.value })}/></label><label>Issue type<select value={form.category} onChange={(event) => setForm({ ...form, category: event.target.value, orderId: event.target.value === "order" ? form.orderId : "" })}>{["general", "order", "payment", "return", "kyc", "product", "payout", "account", "other"].filter((item) => !preserveRoute || item !== "order" || orders.length > 0).map((item) => <option key={item}>{item}</option>)}</select></label>{form.category === "order" && <label>Related order<select required value={form.orderId} onChange={(event) => setForm({ ...form, orderId: event.target.value })}><option value="">Select order</option>{orders.map((order) => <option key={order._id} value={order._id}>{order.orderNumber}</option>)}</select></label>}<label>Priority<select value={form.priority} onChange={(event) => setForm({ ...form, priority: event.target.value })}>{["low", "normal", "high", "urgent"].map((item) => <option key={item}>{item}</option>)}</select></label><label>Issue details<textarea required rows="5" value={form.message} onChange={(event) => setForm({ ...form, message: event.target.value })}/></label><TicketImagePicker accountType={accountType} images={attachments} setImages={setAttachments} uploading={uploading} setUploading={setUploading} disabled={busy} /><button className="primaryButton" disabled={busy || uploading}>{busy ? "Creating…" : "Create Ticket"}</button></form></div>}
  </section>;
}
