import { useState } from "react";

export default function ChangePasswordForm({ onSave }) {
  const [form, setForm] = useState({ currentPassword: "", newPassword: "", confirmPassword: "" });
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const submit = async (event) => {
    event.preventDefault();
    if (form.newPassword !== form.confirmPassword) { setMessage("Passwords do not match."); return; }
    setBusy(true); setMessage("");
    try {
      const result = await onSave({ currentPassword: form.currentPassword, newPassword: form.newPassword });
      setForm({ currentPassword: "", newPassword: "", confirmPassword: "" });
      setMessage(result.message || "Password changed successfully.");
    } catch (error) { setMessage(error.message); }
    finally { setBusy(false); }
  };
  return <form className="panel formPanel" onSubmit={submit}>
    <h2>Change Password</h2>
    <p>Use at least 8 characters for your new password.</p>
    {[["currentPassword", "Current password"], ["newPassword", "New password"], ["confirmPassword", "Confirm new password"]].map(([key, label]) => <label key={key}><span>{label}</span><input type="password" required disabled={busy} minLength={key === "currentPassword" ? undefined : 8} autoComplete={key === "currentPassword" ? "current-password" : "new-password"} value={form[key]} onChange={event => setForm({ ...form, [key]: event.target.value })} /></label>)}
    {message && <p role="status">{message}</p>}
    <button className="primaryButton" disabled={busy}>{busy ? "Changing password…" : "Change Password"}</button>
  </form>;
}
