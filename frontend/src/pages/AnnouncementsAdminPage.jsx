import { useEffect, useState } from "react";
import { api } from "../services/api.js";
import DashboardAnnouncements from "../components/DashboardAnnouncements.jsx";

const kindOf = item => item.imageUrl ? "image" : "text";
const audienceOptions = <><option value="all">Seller, reseller and partner</option><option value="seller">Seller only</option><option value="reseller">Reseller only</option><option value="partner">Partner only</option></>;

export default function AnnouncementsAdminPage({ settings, onSave }) {
  const [items, setItems] = useState(settings.announcements || []);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  useEffect(() => { setItems(settings.announcements || []); }, [settings.announcements]);
  const update = (index, patch) => setItems(current => current.map((item, i) => i === index ? { ...item, ...patch } : item));
  const add = type => setItems(current => [...current, { type, title: "", details: "", imageUrl: "", audience: "all", isActive: true }]);
  const upload = async (index, file) => {
    if (!file) return;
    setBusy(true); setMessage("");
    try { const result = await api.uploadImage(file, "announcements"); update(index, { type: "image", imageUrl: result.url }); }
    catch (error) { setMessage(error.message); }
    finally { setBusy(false); }
  };
  const save = async () => {
    setBusy(true); setMessage("");
    try {
      await onSave({ announcements: items.map(item => kindOf(item) === "image" ? { ...item, type: "image", title: "", details: "" } : { ...item, type: "text", imageUrl: "" }) });
      setMessage("Announcements saved.");
    } catch (error) { setMessage(error.message); }
    finally { setBusy(false); }
  };
  return <section className="panel contentStack">
    <h2>Announcements</h2>
    <p>Create text announcements for the dashboard or image announcements that open together in one popup.</p>
    <div className="announcementAdminActions"><button className="secondaryButton" type="button" disabled={busy} onClick={() => add("text")}>New announcement</button><button className="secondaryButton" type="button" disabled={busy} onClick={() => add("image")}>New image announcement</button></div>
    {items.map((item, index) => <div className="announcementEditor" key={item._id || index}>
      <h3>{kindOf(item) === "image" || item.type === "image" ? "Image announcement" : "Announcement"}</h3>
      {kindOf(item) === "image" || item.type === "image" ? <>
        {item.imageUrl && <img src={item.imageUrl} alt="Image announcement preview" />}
        <label>Image<input type="file" accept="image/*" disabled={busy} onChange={event => { const file = event.target.files?.[0]; event.target.value = ""; upload(index, file); }} /></label>
        {item.imageUrl && <button type="button" disabled={busy} onClick={() => update(index, { imageUrl: "" })}>Remove image</button>}
      </> : <>
        <label>Title<input value={item.title || ""} disabled={busy} onChange={event => update(index, { title: event.target.value })} /></label>
        <label className="announcementDetailsInput">Details<textarea rows="4" value={item.details || ""} disabled={busy} onChange={event => update(index, { details: event.target.value })} /></label>
      </>}
      <label>Audience<select value={item.audience || "all"} disabled={busy} onChange={event => update(index, { audience: event.target.value })}>{audienceOptions}</select></label>
      <label><input type="checkbox" checked={item.isActive !== false} disabled={busy} onChange={event => update(index, { isActive: event.target.checked })} /> Active</label>
      <button type="button" disabled={busy} onClick={() => setItems(current => current.filter((_, i) => i !== index))}>Delete announcement</button>
    </div>)}
    <button className="primaryButton" disabled={busy || items.some(item => (item.type === "image" || item.imageUrl) ? !item.imageUrl : !item.title?.trim())} onClick={save}>{busy ? "Please wait…" : "Save announcements"}</button>
    {message && <p role="status">{message}</p>}
    <DashboardAnnouncements announcements={items} autoOpenImages={false} />
  </section>;
}
