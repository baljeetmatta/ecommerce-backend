import { Settings } from "lucide-react";
import { FileText } from "lucide-react";
import { Trash2 } from "lucide-react";
import { Save } from "lucide-react";
import OtpInput from "../../OtpInput.jsx";
import { lazy } from "react";

const DataTable = lazy(() => import("../../DataTable.jsx"));

export default function PaymentSettings({ paymentMethods, setPaymentForm, runSettingAction, onDeletePayment, onSavePayment, paymentForm, updatePayment, updateRazorpay, updatePayu, savingSettings }) {
  return (
<div className="twoColumn">
        <div className="panel widePanel">
          <div className="panelHeader">
            <h2>Payment Methods</h2>
            <Settings size={18} />
          </div>
          <DataTable
            rows={paymentMethods}
            columns={[
              { key: "name", label: "Method" },
              { key: "type", label: "Type" },
              { key: "isActive", label: "Active", render: (row) => (row.isActive ? "Yes" : "No") },
              {
                key: "actions",
                label: "Actions",
                render: (row) => (
                  <div className="tableActions">
                    <button type="button" title="Edit payment method" onClick={() => setPaymentForm(row)}><FileText size={16} /></button>
                    <button type="button" title="Delete payment method" onClick={() => runSettingAction(() => onDeletePayment(row), `${row.name} payment method deleted successfully.`)}><Trash2 size={16} /></button>
                  </div>
                )
              }
            ]}
          />
        </div>
        <form className="panel formPanel" onSubmit={(event) => { event.preventDefault(); runSettingAction(() => onSavePayment(paymentForm), `${paymentForm.name} payment method saved successfully.`); }}>
          <div className="panelHeader"><h2>Payment Setup</h2><Save size={18} /></div>
          <label><span>Code</span><input value={paymentForm.code || ""} onChange={(event) => updatePayment("code", event.target.value)} required /></label>
          <label><span>Name</span><input value={paymentForm.name || ""} onChange={(event) => updatePayment("name", event.target.value)} required /></label>
          <select value={paymentForm.type || "cod"} onChange={(event) => updatePayment("type", event.target.value)}>
            <option value="cod">Cash on Delivery</option>
            <option value="razorpay">Razorpay</option>
            <option value="payu">PayU Hosted Checkout</option>
          </select>
          <label className="toggleRow"><input type="checkbox" checked={Boolean(paymentForm.isActive)} onChange={(event) => updatePayment("isActive", event.target.checked)} /><span>Active</span></label>
          {paymentForm.type === "razorpay" && (
            <>
              <label><span>Key ID</span><input value={paymentForm.razorpay?.keyId || ""} onChange={(event) => updateRazorpay("keyId", event.target.value)} /></label>
              <label><span>Key Secret</span><input value={paymentForm.razorpay?.keySecret || ""} onChange={(event) => updateRazorpay("keySecret", event.target.value)} /></label>
              <label><span>Merchant ID</span><input value={paymentForm.razorpay?.merchantId || ""} onChange={(event) => updateRazorpay("merchantId", event.target.value)} /></label>
              <label><span>Webhook Secret</span><input value={paymentForm.razorpay?.webhookSecret || ""} onChange={(event) => updateRazorpay("webhookSecret", event.target.value)} /></label>
              <label><span>RazorpayX account number</span><input placeholder="Current account linked to RazorpayX" value={paymentForm.razorpay?.payoutAccountNumber || ""} onChange={(event) => updateRazorpay("payoutAccountNumber", event.target.value)} /></label>
              <label><span>Payout OTP email</span><OtpInput type="email" placeholder="finance@example.com" value={paymentForm.razorpay?.payoutOtpEmail || ""} onChange={(event) => updateRazorpay("payoutOtpEmail", event.target.value)} /></label>
              <label><span>Payout environment</span><select value={paymentForm.razorpay?.environment || "test"} onChange={(event) => updateRazorpay("environment", event.target.value)}>
                <option value="test">Demo / Test (no real transfer)</option>
                <option value="live">Live (real bank transfer)</option>
              </select></label>
              <p className="fieldHint">Demo mode simulates RazorpayX payout creation and status updates. Live mode sends real money using the configured RazorpayX credentials.</p>
            </>
          )}
          {paymentForm.type === "payu" && (
            <>
              <label><span>Merchant Key</span><input required value={paymentForm.payu?.merchantKey || ""} onChange={(event) => updatePayu("merchantKey", event.target.value)} /></label>
              <label><span>Merchant Salt</span><input required type="password" value={paymentForm.payu?.salt || ""} onChange={(event) => updatePayu("salt", event.target.value)} /></label>
              <label><span>Merchant ID</span><input value={paymentForm.payu?.merchantId || ""} onChange={(event) => updatePayu("merchantId", event.target.value)} /></label>
              <label><span>Environment</span><select value={paymentForm.payu?.environment || "test"} onChange={(event) => updatePayu("environment", event.target.value)}><option value="test">Test / UAT</option><option value="live">Live / Production</option></select></label>
              <p className="fieldHint">PayU callback URLs are generated automatically. Keep the Salt private and configure this site domain in your PayU dashboard.</p>
            </>
          )}
          <button className="primaryButton" type="submit" disabled={savingSettings}><Save size={18} /> {savingSettings ? "Saving..." : "Save Payment"}</button>
          <button className="inlineButton" type="button" onClick={() => setPaymentForm({ code: "", name: "", type: "cod", isActive: true, sortOrder: paymentMethods.length + 1, razorpay: {}, payu: {} })}>New Payment Method</button>
        </form>
      </div>
  );
}
