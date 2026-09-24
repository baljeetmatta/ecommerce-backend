import { api } from "../../../services/api.js";
import { Settings } from "lucide-react";

export default function AccountSettings({ setSavingSettings, setSettingsMessage, accountForm, onAccountUpdated, setAccountForm, savingSettings }) {
  return (
<>
<form className="panel formPanel" onSubmit={async (event) => {
          event.preventDefault();
          setSavingSettings(true);
          setSettingsMessage("Updating login email...");
          try {
            const result = await api.updateLoginEmail(accountForm);
            onAccountUpdated(result);
            setAccountForm({ email: result.user.email, currentPassword: "" });
            setSettingsMessage("Login email updated successfully. Use the new email for your next sign-in.");
          } catch (error) {
            setSettingsMessage(`Changes were not saved: ${error.message}`);
          } finally {
            setSavingSettings(false);
          }
        }}>
          <div className="panelHeader"><h2>Admin Login Email</h2><Settings size={18} /></div>
          <p className="fieldHint">Change the email address used to sign in to this administrator account.</p>
          <label><span>Login email</span><input required type="email" autoComplete="email" value={accountForm.email} onChange={(event) => setAccountForm({ ...accountForm, email: event.target.value })} /></label>
          <label><span>Current password</span><input required type="password" autoComplete="current-password" value={accountForm.currentPassword} onChange={(event) => setAccountForm({ ...accountForm, currentPassword: event.target.value })} /></label>
          <button className="primaryButton" disabled={savingSettings || !accountForm.currentPassword}>{savingSettings ? "Updating..." : "Update Login Email"}</button>
        </form>
        </>
  );
}
