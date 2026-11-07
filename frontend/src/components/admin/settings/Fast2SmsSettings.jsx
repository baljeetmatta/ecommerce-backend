import { MessageSquareText, Save } from "lucide-react";
import { api } from "../../../services/api.js";

export default function Fast2SmsSettings({
  runSettingAction,
  fast2SmsForm,
  setFast2SmsForm,
  savingSettings,
  testSmsMobile,
  setTestSmsMobile
}) {
  const events = [
    ["registration", "On Registration", "Send SMS after a customer, seller, reseller, or staff account is registered."],
    ["orders", "On Orders", "Notify the customer and the order's seller/reseller when an order is placed."],
    ["orderCompletion", "On Order Completion", "Notify the customer when all items in the order are delivered."],
    ["orderStatusChange", "On Order Status Change", "Notify the customer when the order status changes. Completion uses its dedicated event when enabled."],
    ["sellerResellerWithdrawal", "On Withdrawal by seller/reseller", "Notify a seller or reseller when their withdrawal request is submitted."]
  ];

  return (
    <div className="twoColumn">
      <form className="panel formPanel" onSubmit={(event) => {
        event.preventDefault();
        runSettingAction(() => api.saveFast2SmsSettings(fast2SmsForm), "Fast2SMS settings saved successfully.");
      }}>
        <div className="panelHeader"><h2>Fast2SMS</h2><MessageSquareText size={18} /></div>
        <label className="toggleRow">
          <input type="checkbox" checked={Boolean(fast2SmsForm.isActive)} onChange={(event) => setFast2SmsForm({ ...fast2SmsForm, isActive: event.target.checked })} />
          <span>Enable SMS notifications</span>
        </label>
        <label>
          <span>Fast2SMS API key</span>
          <input
            type="password"
            autoComplete="new-password"
            placeholder={fast2SmsForm.apiKey === "********" ? "Saved API key" : "Fast2SMS API key"}
            value={fast2SmsForm.apiKey === "********" ? "" : fast2SmsForm.apiKey || ""}
            onChange={(event) => setFast2SmsForm({ ...fast2SmsForm, apiKey: event.target.value })}
          />
          <small>Leave blank to keep the saved key. Enter a new key to replace it.</small>
        </label>
        <fieldset className="contentStack">
          <legend>SMS events</legend>
          {events.map(([key, title, description]) => (
            <label className="toggleRow" key={key}>
              <input
                type="checkbox"
                checked={Boolean(fast2SmsForm.events?.[key])}
                onChange={(event) => setFast2SmsForm({
                  ...fast2SmsForm,
                  events: { ...fast2SmsForm.events, [key]: event.target.checked }
                })}
              />
              <span><strong>{title}</strong><small>{description}</small></span>
            </label>
          ))}
        </fieldset>
        <button className="primaryButton" type="submit" disabled={savingSettings}>
          <Save size={18} /> {savingSettings ? "Saving..." : "Save Fast2SMS Settings"}
        </button>
        <div className="smtpTestBox">
          <strong>Test SMS</strong>
          <p>Send a test message to verify the API key. SMS notifications do not need to be enabled to run this test.</p>
          <label>
            <span>Test mobile number</span>
            <input inputMode="numeric" autoComplete="tel" maxLength="10" value={testSmsMobile} onChange={(event) => setTestSmsMobile(event.target.value.replace(/\D/g, "").slice(0, 10))} placeholder="10-digit mobile number" />
          </label>
          <button className="inlineButton" type="button" disabled={savingSettings || testSmsMobile.length !== 10} onClick={() => runSettingAction(() => api.sendTestSms(testSmsMobile), `Test SMS sent to ${testSmsMobile}.`)}>
            Send test SMS
          </button>
        </div>
      </form>
    </div>
  );
}
