import { useEffect, useState } from "react";
import { api } from "../services/api.js";
import DashboardAnnouncements from "../components/DashboardAnnouncements.jsx";

export default function AnnouncementsAdminPage({ settings, onSave }) {
  const [items, setItems] = useState(settings.announcements || []);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  useEffect(() => { setItems(settings.announcements || []); }, [settings.announcements]);
  const update = (index, patch) => setItems(current => current.map((item, i) => i === index ? { ...item, ...patch } : item));
  const add = () => setItems(current => [...current, { title: "", details: "", imageUrl: "", audience: "all", isActive: true }]);
  return <section className="panel contentStack">
    <h2>Announcements</h2>
    <p>Create an announcement for everyone or a selected portal. People can open it on their dashboard to read the details.</p>
    <button className="secondaryButton" type="button" disabled={busy} onClick={add}>New announcement</button>
    {items.map((item, index) => <div className="announcementEditor" key={item._id || index}>
      {item.imageUrl && <img src={item.imageUrl} alt={item.title || "Announcement preview"} />}
      <label>Title<input value={item.title || ""} disabled={busy} onChange={event => update(index, { title: event.target.value })} /></label>
      <label>Audience<select value={item.audience || "all"} disabled={busy} onChange={event => update(index, { audience: event.target.value })}><option value="all">Seller, reseller and partner</option><option value="seller">Seller only</option><option value="reseller">Reseller only</option><option value="partner">Partner only</option></select></label>
      <label className="announcementDetailsInput">Details<textarea rows="4" value={item.details || ""} disabled={busy} onChange={event => update(index, { details: event.target.value })} /></label>
      <label>Image (optional)<input type="file" accept="image/*" disabled={busy} onChange={async event => { const file = event.target.files?.[0]; event.target.value = ""; if (!file) return; setBusy(true); setMessage(""); try { const result = await api.uploadImage(file, "announcements"); update(index, { imageUrl: result.url }); } catch (error) { setMessage(error.message); } finally { setBusy(false); } }} /></label>
      {item.imageUrl && <button type="button" disabled={busy} onClick={() => update(index, { imageUrl: "" })}>Remove image</button>}
      <label><input type="checkbox" checked={item.isActive !== false} disabled={busy} onChange={event => update(index, { isActive: event.target.checked })} /> Active</label>
      <button type="button" disabled={busy} onClick={() => setItems(current => current.filter((_, i) => i !== index))}>Delete announcement</button>
    </div>)}
    <button className="primaryButton" disabled={busy || items.some(item => !item.title?.trim() && !item.imageUrl)} onClick={async () => { setBusy(true); setMessage(""); try { await onSave({ announcements: items }); setMessage("Announcements saved."); } catch (error) { setMessage(error.message); } finally { setBusy(false); } }}>{busy ? "Please wait…" : "Save announcements"}</button>
    {message && <p role="status">{message}</p>}
    <DashboardAnnouncements announcements={items} />
  </section>;
}
