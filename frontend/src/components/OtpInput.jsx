import { useState } from "react";
export default function OtpInput({ onChange, showPasteButton = true, ...props }) {
  const [message, setMessage] = useState("");
  const accept = (text) => { const value = text.replace(/\D/g, "").slice(0, 6); onChange?.({ target: { value } }); };
  return <span className="otpInputControl"><input {...props} type="text" inputMode="numeric" autoComplete="one-time-code" maxLength={6} onChange={onChange} onPaste={event => { event.preventDefault(); accept(event.clipboardData.getData("text")); }} />{showPasteButton && <button type="button" disabled={props.disabled || props.readOnly} onClick={async () => { try { accept(await navigator.clipboard.readText()); setMessage(""); } catch { setMessage("Use Paste from the input menu, or Ctrl/Cmd+V."); } }}>Paste OTP</button>}{message && <small role="status">{message}</small>}</span>;
}
