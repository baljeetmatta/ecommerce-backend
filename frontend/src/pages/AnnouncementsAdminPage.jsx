import { useEffect, useState } from "react";
import { api } from "../services/api.js";
import DashboardAnnouncements from "../components/DashboardAnnouncements.jsx";

export default function AnnouncementsAdminPage({ settings, onSave }) {
  const [items, setItems] = useState(settings.announcements || []);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  useEffect(() => { setItems(settings.announcements || []); }, [settings.announcements]);
  const update = (index, patch) => setItems(current => current.map((item, i) => i === index ? { ...item, ...patch } : item));
  return <section className="panel contentStack"><h2>Add Announcement</h2><p>Upload images for the admin, partner, seller and reseller dashboards. Multiple announcements can be scrolled horizontally.</p><label>Announcement images<input type="file" accept="image/*" multiple disabled={busy} onChange={async event => {
    const files = Array.from(event.target.files || []); event.target.value = "";
    setBusy(true); setMessage("");
    try { for (const file of files) { const result = await api.uploadImage(file, "announcements"); setItems(current => [...current, { title: "", imageUrl: result.url, isActive: true }]); } }
    catch (error) { setMessage(error.message); } finally { setBusy(false); }
  }} /></label>{items.map((item, index) => <div className="announcementEditor" key={item._id || item.imageUrl}><img src={item.imageUrl} alt={item.title || "Announcement preview"} /><label>Title / image description<input value={item.title} disabled={busy} onChange={event => update(index, { title: event.target.value })} /></label><label><input type="checkbox" checked={item.isActive !== false} disabled={busy} onChange={event => update(index, { isActive: event.target.checked })} /> Show on dashboards</label><button type="button" disabled={busy} onClick={() => setItems(current => current.filter((_, i) => i !== index))}>Remove</button></div>)}<button className="primaryButton" disabled={busy} onClick={async () => { setBusy(true); setMessage(""); try { await onSave({ announcements: items }); setMessage("Announcements saved."); } catch (error) { setMessage(error.message); } finally { setBusy(false); } }}>{busy ? "Please wait…" : "Save announcements"}</button>{message && <p role="status">{message}</p>}<DashboardAnnouncements announcements={items} /></section>;
}
