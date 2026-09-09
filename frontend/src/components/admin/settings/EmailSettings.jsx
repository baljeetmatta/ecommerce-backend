import { api } from "../../../services/api.js";
import { Settings } from "lucide-react";
import { Save } from "lucide-react";

export default function EmailSettings({ runSettingAction, emailForm, setEmailForm, savingSettings, testEmailAddress, setTestEmailAddress }) {
  return (
<form className="panel formPanel" onSubmit={(event) => { event.preventDefault(); runSettingAction(() => api.saveEmailSettings(emailForm), "Email settings saved successfully."); }}>
          <div className="panelHeader"><h2>Email / SMTP Settings</h2><Settings size={18} /></div>
          <label><span>SMTP host</span><input required placeholder="smtp.example.com" value={emailForm.host || ""} onChange={(event) => setEmailForm({ ...emailForm, host: event.target.value })} /></label>
          <label><span>Port</span><input required type="number" value={emailForm.port || 587} onChange={(event) => setEmailForm({ ...emailForm, port: Number(event.target.value) })} /></label>
          <label className="toggleRow"><input type="checkbox" checked={Boolean(emailForm.secure)} onChange={(event) => setEmailForm({ ...emailForm, secure: event.target.checked })} /><span>Use SSL/TLS (usually port 465)</span></label>
          <label><span>Username</span><input value={emailForm.username || ""} onChange={(event) => setEmailForm({ ...emailForm, username: event.target.value })} /></label>
          <label><span>Password</span><input type="password" placeholder={emailForm.password === "********" ? "Saved password" : "SMTP password"} value={emailForm.password || ""} onChange={(event) => setEmailForm({ ...emailForm, password: event.target.value })} /></label>
          <label><span>From name</span><input required value={emailForm.fromName || ""} onChange={(event) => setEmailForm({ ...emailForm, fromName: event.target.value })} /></label>
          <label><span>From email</span><input required type="email" value={emailForm.fromEmail || ""} onChange={(event) => setEmailForm({ ...emailForm, fromEmail: event.target.value })} /></label>
          <button className="primaryButton" type="submit" disabled={savingSettings}><Save size={18} /> {savingSettings ? "Saving..." : "Save Email Settings"}</button>
          <div className="smtpTestBox"><strong>Test SMTP email</strong><p>Enter an email address to receive a test message after saving your SMTP settings.</p><label><span>Test recipient email</span><input type="email" placeholder="you@example.com" value={testEmailAddress} onChange={(event) => setTestEmailAddress(event.target.value)} /></label><button className="inlineButton" type="button" disabled={savingSettings || !testEmailAddress} onClick={() => runSettingAction(() => api.sendTestEmail(testEmailAddress), `Test email sent to ${testEmailAddress}.`)}>Send test email</button></div>
        </form>
  );
}
