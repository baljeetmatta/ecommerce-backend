import { useEffect, useState } from "react";
import { api } from "../services/api.js";
import DashboardAnnouncements from "../components/DashboardAnnouncements.jsx";

const kindOf = item => item.type === "banner" ? "banner" : item.type === "image" || item.imageUrl ? "image" : "text";
const typeLabel = type => type === "banner" ? "Banner announcement" : type === "image" ? "Image announcement" : "Text announcement";
const blankAnnouncement = type => ({ type, title: "", details: "", imageUrl: "", audience: "all", isActive: true });
const audienceOptions = <><option value="all">Seller, reseller and partner</option><option value="seller">Seller only</option><option value="reseller">Reseller only</option><option value="partner">Partner only</option></>;

export default function AnnouncementsAdminPage({ settings, onSave }) {
  const [items, setItems] = useState(settings.announcements || []);
  const [draft, setDraft] = useState(null);
  const [selectedIndex, setSelectedIndex] = useState(null);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  useEffect(() => { setItems(settings.announcements || []); }, [settings.announcements]);

  const selected = selectedIndex === null ? draft : items[selectedIndex];
  const updateSelected = patch => selectedIndex === null
    ? setDraft(current => ({ ...current, ...patch }))
    : setItems(current => current.map((item, index) => index === selectedIndex ? { ...item, ...patch } : item));
  const chooseType = type => { setSelectedIndex(null); setDraft(blankAnnouncement(type)); setMessage(""); };
  const upload = async file => {
    if (!file) return;
    setBusy(true); setMessage("");
    try { const result = await api.uploadImage(file, "announcements"); updateSelected({ imageUrl: result.url }); }
    catch (error) { setMessage(error.message); }
    finally { setBusy(false); }
  };
  const addDraft = () => {
    if (!draft) return;
    if (kindOf(draft) === "text" ? !draft.title.trim() : !draft.imageUrl) { setMessage(kindOf(draft) === "text" ? "Enter an announcement title." : "Upload an image first."); return; }
    setItems(current => [...current, draft]);
    setDraft(null);
    setMessage("Announcement added. Save announcements to publish it.");
  };
  const save = async () => {
    setBusy(true); setMessage("");
    try {
      await onSave({ announcements: items.map(item => kindOf(item) === "text" ? { ...item, type: "text", imageUrl: "" } : { ...item, type: kindOf(item), title: "", details: "" }) });
      setMessage("Announcements saved.");
    } catch (error) { setMessage(error.message); }
    finally { setBusy(false); }
  };

  return <section className="panel contentStack">
    <h2>Announcements</h2>
    <p>Select an announcement type to display its settings.</p>
    <div className="announcementAdminActions">
      <button className={draft?.type === "text" ? "primaryButton" : "secondaryButton"} type="button" disabled={busy} onClick={() => chooseType("text")}>Text announcement</button>
      <button className={draft?.type === "image" ? "primaryButton" : "secondaryButton"} type="button" disabled={busy} onClick={() => chooseType("image")}>Image announcement</button>
      <button className={draft?.type === "banner" ? "primaryButton" : "secondaryButton"} type="button" disabled={busy} onClick={() => chooseType("banner")}>Banner announcement</button>
    </div>

    {selected && <div className="announcementEditor announcementSelectedEditor">
      <h3>{typeLabel(kindOf(selected))}</h3>
      {kindOf(selected) === "text" ? <>
        <label>Title<input value={selected.title || ""} disabled={busy} onChange={event => updateSelected({ title: event.target.value })} /></label>
        <label className="announcementDetailsInput">Description (first 30 words are displayed)<textarea rows="4" value={selected.details || ""} disabled={busy} onChange={event => updateSelected({ details: event.target.value })} /></label>
      </> : <>
        {selected.imageUrl && <img src={selected.imageUrl} alt={`${kindOf(selected) === "banner" ? "Banner" : "Image"} announcement preview`} />}
        <label>{kindOf(selected) === "banner" ? "Banner image" : "Popup image"}<input type="file" accept="image/*" disabled={busy} onChange={event => { const file = event.target.files?.[0]; event.target.value = ""; upload(file); }} /></label>
        {selected.imageUrl && <button type="button" disabled={busy} onClick={() => updateSelected({ imageUrl: "" })}>Remove image</button>}
      </>}
      <label>Audience<select value={selected.audience || "all"} disabled={busy} onChange={event => updateSelected({ audience: event.target.value })}>{audienceOptions}</select></label>
      <label><input type="checkbox" checked={selected.isActive !== false} disabled={busy} onChange={event => updateSelected({ isActive: event.target.checked })} /> Active</label>
      {draft && <button className="primaryButton" type="button" disabled={busy} onClick={addDraft}>Add announcement</button>}
      <button type="button" disabled={busy} onClick={() => { setDraft(null); setSelectedIndex(null); }}>Close</button>
    </div>}

    {items.length > 0 && <details className="existingAnnouncements"><summary>Existing announcements ({items.length})</summary><div className="existingAnnouncementList">{items.map((item, index) => <div key={item._id || index}><button type="button" onClick={() => { setDraft(null); setSelectedIndex(index); }}>{typeLabel(kindOf(item))}{kindOf(item) === "text" && item.title ? `: ${item.title}` : ""}</button><button type="button" disabled={busy} onClick={() => { setItems(current => current.filter((_, itemIndex) => itemIndex !== index)); setSelectedIndex(null); }}>Delete</button></div>)}</div></details>}
    <button className="primaryButton" disabled={busy || !items.length} onClick={save}>{busy ? "Please wait…" : "Save announcements"}</button>
    {message && <p role="status">{message}</p>}
    {items.length > 0 && <DashboardAnnouncements announcements={items} autoOpenMedia={false} />}
  </section>;
}
