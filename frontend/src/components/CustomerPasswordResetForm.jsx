import { useState } from "react";
import { Mail, CheckCircle2 } from "lucide-react";
import { api } from "../services/api.js";
import "../styles/customer-password-reset.css";

export default function CustomerPasswordResetForm({ token = "", email = "", initialEmail = "", onBack }) {
  const [address, setAddress] = useState(initialEmail.includes("@") ? initialEmail : "");
  const [password, setPassword] = useState("");
  const [confirmation, setConfirmation] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [done, setDone] = useState(false);
  const resetting = Boolean(token);
  const submit = async event => {
    event.preventDefault();
    setMessage("");
    if (resetting && password !== confirmation) { setMessage("Passwords do not match."); return; }
    setBusy(true);
    try {
      const result = resetting
        ? await api.customerResetPassword({ email, token, password })
        : await api.customerForgotPassword({ email: address.trim().toLowerCase() });
      setMessage(result.message);
      setDone(true);
    } catch (error) { setMessage(error.message); }
    finally { setBusy(false); }
  };
  if (done) return <div className="customerPasswordResetForm customerResetSent"><span className="customerResetIcon">{resetting ? <CheckCircle2 size={28} /> : <Mail size={28} />}</span><h3>{resetting ? "Your password is updated" : "Check your inbox"}</h3><p role="status">{message}</p>{!resetting && <small>The link is valid for 30 minutes and can be used once.</small>}<button className="primaryButton" type="button" onClick={onBack}>Back to sign in</button>{!resetting && <button className="linkButton" type="button" onClick={() => { setDone(false); setMessage(""); }}>Try another email address</button>}</div>;
  return <form className="customerPasswordResetForm" onSubmit={submit}>
    <p>{resetting ? "Choose a new password for your customer account." : "Enter the email address linked to your customer account. We’ll send you a secure link to reset your password."}</p>
    {resetting ? <>
      <label>New password<input type="password" autoComplete="new-password" minLength={8} required value={password} onChange={event => setPassword(event.target.value)} placeholder="At least 8 characters" /></label>
      <label>Confirm new password<input type="password" autoComplete="new-password" minLength={8} required value={confirmation} onChange={event => setConfirmation(event.target.value)} placeholder="Enter your new password again" /></label>
    </> : <label>Email address<input autoFocus type="email" autoComplete="email" inputMode="email" required value={address} onChange={event => setAddress(event.target.value)} placeholder="you@example.com" /></label>}
    {message && <div className="customerResetError" role="alert">{message}</div>}
    <button className="primaryButton" disabled={busy}>{busy ? resetting ? "Updating password…" : "Sending reset link…" : resetting ? "Save new password" : "Send password reset link"}</button>
    <button className="linkButton" disabled={busy} type="button" onClick={onBack}>Back to sign in</button>
  </form>;
}
