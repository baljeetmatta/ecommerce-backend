import { ArrowLeft, ShoppingBag, UserPlus, Smartphone, MapPin, CreditCard, ShieldCheck, FileText, Building2, WalletCards, IndianRupee, Store, MailCheck } from "lucide-react";
import { customerAuthStore } from "../../services/api.js";
import OtpInput from "../../components/OtpInput.jsx";
export default function ResellerRegistration({ onBack, status, register, form, setForm, requestOtp, setAccount, setPortalRoute }) {
  return (<main className="resellerRegistrationPage">
    <section className="resellerRegistrationHero">
      <button className="resellerBackButton" type="button" onClick={onBack} aria-label="Back to store"><ArrowLeft size={19} /></button>
      <strong className="resellerBrandText"><ShoppingBag /><span>HRS<em>Basket</em><small>Resell More, Earn More</small></span></strong>
      <div className="resellerHeroCopy"><span className="resellerHeroIcon"><UserPlus /></span><div><h1><em>Reseller</em> Registration</h1><p>Join HRSBasket and start earning by sharing products with your network.</p></div></div>
      <div className="resellerHeroArt" aria-hidden="true"><span>₹</span><UserPlus /><i>↗</i></div>
    </section>
    <section className="resellerRegistrationCard">
      <div className="resellerFormHeading"><span>Quick onboarding</span><h2>Reseller registration</h2><p>Complete your details below to activate your reseller workspace.</p></div>
      {status && <p className="resellerNotice" role="status">{status}</p>}
      <form className="resellerForm" onSubmit={register}>
        <label className="resellerField"><span>Full name <b>*</b></span><div><UserPlus /><input required placeholder="Enter your full name" value={form.fullName} onChange={(e) => setForm({ ...form, fullName: e.target.value })} /></div></label>
        <label className="resellerField"><span>Mobile number <b>*</b></span><div><Smartphone /><span className="resellerDialCode">+91</span><input required inputMode="tel" placeholder="Enter mobile number" value={form.mobile} onChange={(e) => setForm({ ...form, mobile: e.target.value })} /></div></label>
        <label className="resellerField resellerFullField"><span>Address <b>*</b></span><div><MapPin /><textarea required rows="2" placeholder="Enter your complete address" value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} /></div></label>
        <label className="resellerField"><span>PAN number <b>*</b></span><div><CreditCard /><input required placeholder="Enter PAN number" value={form.pan} onChange={(e) => setForm({ ...form, pan: e.target.value.toUpperCase() })} /></div></label>
        <fieldset className="resellerGstField"><legend>GST status <b>*</b></legend><div className="resellerGstChoices">
          <label className={form.gstStatus === "gst" ? "selected" : ""}><input type="radio" name="gstStatus" value="gst" checked={form.gstStatus === "gst"} onChange={(e) => setForm({ ...form, gstStatus: e.target.value })} /><ShieldCheck /><span><strong>GST Registered</strong><small>I have a GSTIN</small></span></label>
          <label className={form.gstStatus === "non-gst" ? "selected" : ""}><input type="radio" name="gstStatus" value="non-gst" checked={form.gstStatus === "non-gst"} onChange={(e) => setForm({ ...form, gstStatus: e.target.value, gstin: "" })} /><FileText /><span><strong>Non-GST</strong><small>I don’t have GSTIN</small></span></label>
        </div></fieldset>
        {form.gstStatus === "gst" && <label className="resellerField resellerFullField"><span>GSTIN <b>*</b></span><div><Building2 /><input required placeholder="Enter your GSTIN" value={form.gstin} onChange={(e) => setForm({ ...form, gstin: e.target.value.toUpperCase() })} /></div></label>}
        <label className="resellerField"><span>Payment method <b>*</b></span><div><WalletCards /><select value={form.paymentDetails.method} onChange={(e) => setForm({ ...form, paymentDetails: { method: e.target.value } })}><option value="upi">UPI</option><option value="bank">Bank account</option></select></div></label>
        {form.paymentDetails.method === "upi" ? <label className="resellerField"><span>UPI ID <b>*</b></span><div><IndianRupee /><input required placeholder="name@bank" value={form.paymentDetails.upiId || ""} onChange={(e) => setForm({ ...form, paymentDetails: { ...form.paymentDetails, upiId: e.target.value } })} /></div></label> : <>
          <label className="resellerField"><span>Account holder <b>*</b></span><div><UserPlus /><input required placeholder="Account holder name" value={form.paymentDetails.accountHolder || ""} onChange={(e) => setForm({ ...form, paymentDetails: { ...form.paymentDetails, accountHolder: e.target.value } })} /></div></label>
          <label className="resellerField"><span>Account number <b>*</b></span><div><CreditCard /><input required placeholder="Enter account number" value={form.paymentDetails.accountNumber || ""} onChange={(e) => setForm({ ...form, paymentDetails: { ...form.paymentDetails, accountNumber: e.target.value } })} /></div></label>
          <label className="resellerField resellerFullField"><span>IFSC code <b>*</b></span><div><Store /><input required placeholder="Enter IFSC code" value={form.paymentDetails.ifsc || ""} onChange={(e) => setForm({ ...form, paymentDetails: { ...form.paymentDetails, ifsc: e.target.value.toUpperCase() } })} /></div></label>
        </>}
        {!form.challengeId ? <button className="resellerOtpButton resellerFullField" type="button" onClick={requestOtp}><MailCheck /> Verify email with OTP</button> : <label className="resellerField resellerFullField"><span>Email OTP <b>*</b></span><div><MailCheck /><OtpInput required inputMode="numeric" placeholder="Enter the OTP sent to your email" value={form.otp} onChange={(e) => setForm({ ...form, otp: e.target.value })} /></div></label>}
        <label className="resellerTerms resellerFullField"><input type="checkbox" checked={form.termsAccepted} onChange={(e) => setForm({ ...form, termsAccepted: e.target.checked })} /><span>I accept the <a href="#/terms">Terms &amp; Conditions</a> and <a href="#/privacy">Privacy Policy</a> <b>*</b></span></label>
        <aside className="resellerInfoNote resellerFullField"><strong>Next step:</strong> After registration, open KYC Verification to upload your PAN, Aadhaar, address proof, cancelled cheque and GST certificate (if registered). Save verified bank details there before admin approval.</aside>
        <button className="resellerSubmit resellerFullField" type="submit" disabled={!form.challengeId}><UserPlus /> Register as Reseller</button>
        <p className="resellerLoginPrompt resellerFullField">Already have a reseller account? <button type="button" onClick={() => { customerAuthStore.clear(); setAccount(null); window.location.hash = "#/reseller"; setPortalRoute("#/reseller") }}>Login here</button></p>
      </form>
    </section>
  </main>);
}
