import { useState } from "react";
import { api } from "../../services/api.js";
export default function ResellerAddress({ account, onSaved }) {
  const [form, setForm] = useState({ address: account.address || "", city: account.city || "" });
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const save = async event => {
    event.preventDefault(); setBusy(true); setMessage("");
    try { const updated = await api.updateResellerAddress(form); await onSaved(updated); setMessage("Address updated."); }
    catch (error) { setMessage(error.message); }
    finally { setBusy(false); }
  };
  return <form className="resellerPanel resellerBankForm" onSubmit={save}><h3>Business address</h3><label>Complete address<textarea required maxLength={1000} value={form.address} onChange={event => setForm({ ...form, address: event.target.value })} /></label><label>City<input required maxLength={100} value={form.city} onChange={event => setForm({ ...form, city: event.target.value })} /></label><button className="resellerPrimary" disabled={busy}>{busy ? "Saving…" : "Save address"}</button><p role="status">{message}</p></form>;
}
