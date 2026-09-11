import ProfileSummary from "./ProfileSummary.jsx";
import { useEffect, useId, useState } from "react";
import { profileSettingsRequest, authStore } from "../services/api.js";
import "../styles/profile-settings.css";
const tabs = ["Personal Details", "Security", "Notifications", "Privacy"];
const notifications = [["orderUpdates", "Order Updates", "Shipping, delivery, and order status"], ["offersDeals", "Offers & Deals", "Coupons, flash sales, and promotions"], ["priceDropAlerts", "Price Drop Alerts", "When wishlist items go on sale"], ["storeUpdates", "Store Updates", "New products from followed stores"]];
const privacy = [["personalizedOffers", "Personalized Offers", "Allow offers tailored to your interests"], ["activityPersonalization", "Activity Personalization", "Allow your activity to personalize your experience"]];
export default function ProfileSettings({ role, children }) {
  const [tab, setTab] = useState(0);
  const [settings, setSettings] = useState(null);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [loadError, setLoadError] = useState("");
  const [password, setPassword] = useState({ currentPassword: "", newPassword: "", confirm: "" });
  const id = useId();
  const load = () => { setLoadError(""); profileSettingsRequest(role).then(setSettings).catch(error => setLoadError(error.message)); };
  useEffect(load, [role]);
  const toggle = async (section, key) => {
    setBusy(true); setMessage("");
    try { setSettings(await profileSettingsRequest(role, "", "PATCH", { [section]: { [key]: !settings[section][key] } })); setMessage("Settings saved."); }
    catch (error) { setMessage(error.message); } finally { setBusy(false); }
  };
  return <section className="profileSettings"><p className="profileSettingsBreadcrumb">Home <span>›</span> Profile Settings</p><h2>Profile Settings</h2><div className="profileSettingsTabs" role="tablist" aria-label="Profile settings">{tabs.map((label, index) => <button type="button" key={label} id={`${id}-tab-${index}`} role="tab" aria-selected={tab === index} aria-controls={`${id}-panel`} tabIndex={tab === index ? 0 : -1} onKeyDown={event => { const next = event.key === "ArrowRight" ? (index + 1) % 4 : event.key === "ArrowLeft" ? (index + 3) % 4 : event.key === "Home" ? 0 : event.key === "End" ? 3 : null; if (next !== null) { event.preventDefault(); setTab(next); document.getElementById(`${id}-tab-${next}`)?.focus(); } }} onClick={() => { setTab(index); setMessage(""); }}>{label}</button>)}</div><div id={`${id}-panel`} role="tabpanel" aria-labelledby={`${id}-tab-${tab}`} className="profileSettingsCard">
    {tab === 0 && (children || <AdminPersonal />)}
    {tab === 1 && <form className="profileSettingsForm" onSubmit={async event => { event.preventDefault(); if (password.newPassword !== password.confirm) return setMessage("New passwords do not match."); setBusy(true); setMessage(""); try { const result = await profileSettingsRequest(role, "/password", "POST", password); setPassword({ currentPassword: "", newPassword: "", confirm: "" }); setMessage(result.message); } catch (error) { setMessage(error.message); } finally { setBusy(false); } }}><h3>Change Password</h3>{[["currentPassword", "Current password"], ["newPassword", "New password"], ["confirm", "Confirm new password"]].map(([key, label]) => <label key={key}>{label}<input type="password" required minLength={key === "currentPassword" ? 1 : 8} maxLength={72} autoComplete={key === "currentPassword" ? "current-password" : "new-password"} value={password[key]} onChange={event => setPassword({ ...password, [key]: event.target.value })} /></label>)}<small>Use 8–72 characters.{role === "reseller" && " This also updates your customer login password."}</small><button className="profileSettingsSave" disabled={busy}>{busy ? "Saving…" : "Update password"}</button></form>}
    {tab >= 2 && (!settings ? <p role="status">{loadError || "Loading settings…"}{loadError && <button type="button" onClick={load}>Retry</button>}</p> : <>{(tab === 2 ? notifications : privacy).map(([key, title, description]) => { const section = tab === 2 ? "notifications" : "privacy"; return <div className="profileSettingsRow" key={key}><div><strong id={`${id}-${key}`}>{title}</strong><p>{description}</p></div><button type="button" className="profileSettingsSwitch" role="switch" aria-labelledby={`${id}-${key}`} aria-checked={Boolean(settings[section][key])} disabled={busy} onClick={() => toggle(section, key)}><span /></button></div>; })}{tab === 2 && <div className="profileSettingsChannels"><h3>Notification Channels</h3><div>{[["sms", "SMS"], ["email", "Email"], ["whatsapp", "WhatsApp"]].map(([key, label]) => <button key={key} type="button" aria-pressed={Boolean(settings.notifications[key])} disabled={busy} onClick={() => toggle("notifications", key)}><span aria-hidden="true">{settings.notifications[key] ? "✓" : "+"}</span>{label}</button>)}</div></div>}{tab === 3 && <p className="profileSettingsHint">Preferences are saved for future personalization. Essential account and transaction records are retained.</p>}</>)}
    <p className="profileSettingsStatus" role="status" aria-live="polite">{busy ? "Saving…" : message}</p>
  </div></section>;
}
function AdminPersonal() {
  const [form, setForm] = useState(null); const [message, setMessage] = useState(""); const [busy, setBusy] = useState(false);
  useEffect(() => { profileSettingsRequest("admin", "/personal").then(setForm).catch(error => setMessage(error.message)); }, []);
  if (!form) return <p role="status">{message || "Loading personal details…"}</p>;
  return <><ProfileSummary account={{ ...authStore.user, ...form }} role="Admin" /><form className="profileSettingsForm" onSubmit={async event => { event.preventDefault(); setBusy(true); try { const result = await profileSettingsRequest("admin", "/personal", "PATCH", form); authStore.user = { ...authStore.user, ...result }; setMessage("Personal details saved."); } catch (error) { setMessage(error.message); } finally { setBusy(false); } }}><h3>Personal Details</h3>{[["name", "Full name"], ["email", "Email"], ["phone", "Phone"], ["address", "Address"], ["city", "City"], ["state", "State"], ["pinCode", "Postal code"]].map(([key, label]) => <label key={key}>{label}<input required={key === "name"} disabled={key === "email"} value={form[key] || ""} onChange={event => setForm({ ...form, [key]: event.target.value })} /></label>)}<button className="profileSettingsSave" disabled={busy}>{busy ? "Saving…" : "Save personal details"}</button><p role="status">{message}</p></form></>;
}
