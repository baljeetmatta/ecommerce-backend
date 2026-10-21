import { useEffect, useRef, useState } from "react";
import { ArrowLeft, ImagePlus, MessageSquareText, Paperclip, Send, X } from "lucide-react";
import { api } from "../services/api.js";
import "../styles/support-tickets.css";

const dateTime = value => value ? new Date(value).toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short" }) : "—";
const statusClass = status => String(status).toLowerCase().replaceAll(" ", "-");
const imageUrl = value => {
  if (!value || !/^(https?:\/\/|\/uploads\/)/i.test(value)) return "";
  return value;
};

export function TicketImagePicker({ accountType, images, setImages, uploading, setUploading, disabled = false }) {
  const [error, setError] = useState("");
  const input = useRef(null);
  const upload = async event => {
    const files = [...event.target.files];
    event.target.value = "";
    setError("");
    if (files.length + images.length > 6) { setError("You can attach up to 6 images."); return; }
    if (files.some(file => !["image/jpeg", "image/png", "image/webp", "image/gif"].includes(file.type) || file.size > 15 * 1024 * 1024)) {
      setError("Choose JPG, PNG, WebP or GIF images, up to 15 MB each."); return;
    }
    setUploading(true);
    try {
      for (const file of files) {
        const uploaded = await api.uploadSupportImage(accountType, file);
        setImages(current => [...current, uploaded.url]);
      }
    } catch (failure) { setError(failure.message); }
    finally { setUploading(false); }
  };
  return <div className="ticketImagePicker">
    <input ref={input} hidden type="file" multiple accept="image/jpeg,image/png,image/webp,image/gif" onChange={upload} disabled={disabled || uploading || images.length >= 6} />
    <div className="ticketAttachmentTools"><button type="button" className="inlineButton" onClick={() => input.current?.click()} disabled={disabled || uploading || images.length >= 6}><ImagePlus size={17} />{uploading ? "Uploading images…" : "Attach images"}</button><small>Up to 6 images · 15 MB each</small></div>
    {error && <p className="ticketFormError" role="alert">{error}</p>}
    {images.length > 0 && <div className="ticketPendingImages">{images.map((url, index) => <div key={`${url}-${index}`}><img src={url} alt={`Attachment ${index + 1}`} /><button type="button" aria-label={`Remove attachment ${index + 1}`} disabled={disabled || uploading} onClick={() => setImages(current => current.filter((_, i) => i !== index))}><X size={14} /></button></div>)}</div>}
  </div>;
}

export function TicketReplyComposer({ accountType, onSend }) {
  const [message, setMessage] = useState("");
  const [images, setImages] = useState([]);
  const [uploading, setUploading] = useState(false);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState("");
  const submit = async event => {
    event.preventDefault();
    if (sending || uploading || (!message.trim() && !images.length)) return;
    setSending(true); setError("");
    try { await onSend({ message: message.trim(), attachments: images }); setMessage(""); setImages([]); }
    catch (failure) { setError(failure.message); }
    finally { setSending(false); }
  };
  return <form className="ticketComposer" onSubmit={submit}>
    <label htmlFor="ticket-reply"><MessageSquareText size={17} /> Reply to this ticket</label>
    <textarea id="ticket-reply" rows={4} value={message} onChange={event => setMessage(event.target.value)} disabled={sending} placeholder="Share an update or add details to help us resolve your request…" />
    <TicketImagePicker accountType={accountType} images={images} setImages={setImages} uploading={uploading} setUploading={setUploading} disabled={sending} />
    {error && <p className="ticketFormError" role="alert">{error}</p>}
    <div className="ticketComposerFooter"><small>Your message and attachments are visible to the support team and ticket owner.</small><button type="submit" className="primaryButton" disabled={sending || uploading || (!message.trim() && !images.length)}><Send size={16} />{sending ? "Sending…" : "Send reply"}</button></div>
  </form>;
}

export default function TicketConversation({ ticket, accountType, onBack, onSend, notice }) {
  const [preview, setPreview] = useState(null);
  const closePreview = useRef(null);
  const previousFocus = useRef(null);
  const closed = ["Resolved", "Closed"].includes(ticket.status);
  const closeImage = () => { setPreview(null); previousFocus.current?.focus(); };
  useEffect(() => {
    if (!preview) return undefined;
    closePreview.current?.focus();
    const escape = event => { if (event.key === "Escape") closeImage(); if (event.key === "Tab") { event.preventDefault(); closePreview.current?.focus(); } };
    window.addEventListener("keydown", escape);
    return () => window.removeEventListener("keydown", escape);
  }, [preview]);
  return <section className="ticketDetailRoute professionalTicket">
    <button type="button" className="shopLinkButton ticketBackLink" onClick={onBack}><ArrowLeft size={17} /> Back to tickets</button>
    <header className="ticketPageHeading"><div><span className="eyebrow">Help &amp; support · {ticket.ticketNumber}</span><h2>{ticket.subject}</h2><p>Created {dateTime(ticket.createdAt)} · Updated {dateTime(ticket.lastActivityAt)}</p></div><span className={`ticketStatus ${statusClass(ticket.status)}`}>{ticket.status}</span></header>
    {notice && <div className="notice" role="status">{notice}</div>}
    <div className="ticketWorkspace"><section className="ticketConversation" aria-label="Ticket conversation">
      <div className="ticketConversationHeading"><h3><MessageSquareText size={19} /> Conversation</h3><span>{ticket.messages?.length || 0} messages</span></div>
      <div className="ticketMessages">{(ticket.messages || []).map(entry => <article key={entry._id} className={entry.authorType === "User" ? "staff" : "requester"}>
        <header><span className="ticketAuthorAvatar" aria-hidden="true">{(entry.authorName || entry.authorType || "?").slice(0, 1).toUpperCase()}</span><div><strong>{entry.authorName || entry.authorType}</strong><small>{entry.authorType === "User" ? "Support team" : "Ticket owner"}</small></div><time dateTime={entry.createdAt}>{dateTime(entry.createdAt)}</time></header>
        {entry.message && <p>{entry.message}</p>}
        {entry.attachments?.length > 0 && <div className="ticketMessageImages">{entry.attachments.map((url, index) => imageUrl(url) && <button type="button" key={`${url}-${index}`} onClick={event => { previousFocus.current = event.currentTarget; setPreview(url); }} aria-label={`View image attachment ${index + 1}`}><img loading="lazy" src={url} alt={`Image attachment ${index + 1}`} /><span><Paperclip size={12} /> View image {index + 1}</span></button>)}</div>}
      </article>)}</div>
      {closed ? <div className="ticketClosedNotice">This ticket is {ticket.status.toLowerCase()}. Create a new ticket if you need more help.</div> : <TicketReplyComposer key={ticket._id} accountType={accountType} onSend={onSend} />}
    </section><aside className="ticketSummary"><h3>Ticket details</h3><dl>{[["Ticket number", ticket.ticketNumber], ["Issue type", ticket.category], ["Priority", ticket.priority], ["Related order", ticket.order?.orderNumber || "Not linked to an order"], ["Assigned to", ticket.assignedStaff?.name || "Support queue"], ["Requester", ticket.requester?.fullName || ticket.requester?.name || ticket.requester?.companyName || ticket.requesterType]].map(([label, value]) => <div key={label}><dt>{label}</dt><dd>{value}</dd></div>)}</dl><p>Keep all information about this request in one conversation so our team can help you faster.</p></aside></div>
    {preview && <div className="ticketImageOverlay" role="dialog" aria-modal="true" aria-label="Image attachment preview" onClick={event => { if (event.target === event.currentTarget) closeImage(); }}><button ref={closePreview} type="button" onClick={closeImage} aria-label="Close image preview"><X size={24} /></button><img src={preview} alt="Full-size ticket attachment" /></div>}
  </section>;
}
