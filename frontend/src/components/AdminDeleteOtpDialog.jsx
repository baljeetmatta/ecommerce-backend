import { useState } from "react";
import { AlertTriangle, Mail, Trash2 } from "lucide-react";
import OtpInput from "./OtpInput.jsx";

export default function AdminDeleteOtpDialog({ recordType, recordName, onCancel, onRequestOtp, onConfirm }) {
  const [challenge, setChallenge] = useState(null);
  const [otp, setOtp] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const requestOtp = async () => {
    setBusy(true);
    setError("");
    try {
      setChallenge(await onRequestOtp());
      setOtp("");
    } catch (requestError) {
      setError(requestError.message || "Unable to send the confirmation code.");
    } finally {
      setBusy(false);
    }
  };

  const confirm = async (event) => {
    event.preventDefault();
    if (!challenge || otp.length !== 6) return;
    setBusy(true);
    setError("");
    try {
      await onConfirm({ challengeId: challenge.challengeId, otp });
    } catch (confirmError) {
      setError(confirmError.message || "Unable to confirm deletion.");
      setBusy(false);
    }
  };

  return <div className="modalOverlay" role="presentation">
    <form className="sellerStatusModal adminDeleteOtpDialog" role="dialog" aria-modal="true" aria-labelledby="admin-delete-otp-title" onSubmit={confirm}>
      <div className="panelHeader"><h2 id="admin-delete-otp-title"><AlertTriangle size={18} /> Delete {recordType}?</h2></div>
      <p>This permanently deletes <strong>{recordName}</strong>. Enter the code emailed to your admin account to continue.</p>
      {!challenge ? <button className="secondaryButton" type="button" disabled={busy} onClick={requestOtp}><Mail size={16} /> {busy ? "Sending code…" : "Email me a code"}</button> : <>
        <p className="mutedText">Code sent to {challenge.email}. It expires in 10 minutes.</p>
        <label htmlFor="admin-delete-otp">Email confirmation code</label>
        <OtpInput id="admin-delete-otp" required autoFocus value={otp} onChange={(event) => setOtp(event.target.value)} aria-label="6-digit email confirmation code" />
        <button className="inlineButton" type="button" disabled={busy} onClick={requestOtp}>Send a new code</button>
      </>}
      {error && <p className="errorText" role="alert">{error}</p>}
      <div className="kycActions"><button className="secondaryButton" type="button" disabled={busy} onClick={onCancel}>Cancel</button><button className="dangerButton" type="submit" disabled={busy || !challenge || otp.length !== 6}><Trash2 size={16} /> {busy ? "Deleting…" : "Confirm deletion"}</button></div>
    </form>
  </div>;
}