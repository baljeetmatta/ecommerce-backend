import { useState } from "react";
import { ArrowLeft, ArrowRight, Building2, Check, FileText, Mail, MapPin, ShieldCheck, ShoppingBag, Smartphone, Store, Truck, UserRound, Users, X } from "lucide-react";
import BrandLogo from "../BrandLogo.jsx";
import OtpInput from "../OtpInput.jsx";
import { api } from "../../services/api.js";

const steps = ["Seller details", "Business address", "GST details"];
const indianStates = ["Andaman and Nicobar Islands", "Andhra Pradesh", "Arunachal Pradesh", "Assam", "Bihar", "Chandigarh", "Chhattisgarh", "Dadra and Nagar Haveli and Daman and Diu", "Delhi", "Goa", "Gujarat", "Haryana", "Himachal Pradesh", "Jammu and Kashmir", "Jharkhand", "Karnataka", "Kerala", "Ladakh", "Lakshadweep", "Madhya Pradesh", "Maharashtra", "Manipur", "Meghalaya", "Mizoram", "Nagaland", "Odisha", "Puducherry", "Punjab", "Rajasthan", "Sikkim", "Tamil Nadu", "Telangana", "Tripura", "Uttar Pradesh", "Uttarakhand", "West Bengal"];

export default function SellerRegistrationWizard({
  settings,
  onBack,
  onLogin,
  registration,
  setRegistration,
  registrationOtp,
  setRegistrationOtp,
  message,
  setMessage,
  busy,
  onSubmit,
  onVerify,
}) {
  const [screen, setScreen] = useState("welcome");
  const [step, setStep] = useState(1);
  const [taxVerification, setTaxVerification] = useState({ status: "", message: "", busy: false });
  const [certificateUpload, setCertificateUpload] = useState({ busy: false, error: "", name: "" });
  const update = (field, value) => setRegistration((current) => {
    const next = { ...current, [field]: value };
    if (field === "houseNumber" || field === "roadArea") {
      next.address = [field === "houseNumber" ? value : current.houseNumber, field === "roadArea" ? value : current.roadArea].filter(Boolean).join(", ");
    }
    if (field === "gstNumber") next.taxVerificationToken = "";
    return next;
  });
  const back = () => {
    if (step > 1) setStep((current) => current - 1);
    else setScreen("welcome");
  };
  const continueStep = (event) => {
    event.preventDefault();
    if (event.currentTarget.reportValidity()) setStep((current) => Math.min(steps.length, current + 1));
  };
  const verifyTax = async () => {
    setTaxVerification({ status: "", message: "Verifying with GST service…", busy: true });
    try {
      const result = await api.verifySellerTaxIdentifier({ kind: "gstin", value: registration.gstNumber });
      const details = result?.data || result?.result || result || {};
      const taxpayer = details?.taxpayerInfo || details?.taxpayer_info || details?.gstinDetails || details;
      const legalName = result?.legalName || taxpayer?.legalName || taxpayer?.legal_name || taxpayer?.legal_name_of_business || taxpayer?.lgnm || "";
      const tradeName = result?.tradeName || taxpayer?.tradeName || taxpayer?.trade_name || taxpayer?.tradeNam || taxpayer?.trade_name_of_business || "";
      const registeredState = result?.state || result?.gstState || taxpayer?.state || taxpayer?.stateName || taxpayer?.state_name || taxpayer?.gstState || taxpayer?.pradr?.addr?.stcd || taxpayer?.address?.state || "";
      const verifiedBusinessName = tradeName || legalName;
      setRegistration((current) => ({
        ...current,
        taxVerificationToken: result.verificationToken,
        businessName: verifiedBusinessName || current.businessName,
        companyName: tradeName || legalName || current.companyName,
        gstState: registeredState || current.gstState,
        state: registeredState || current.state,
        ...(!current.pickupSameAsBusiness && registeredState ? { pickupState: registeredState } : {})
      }));
      setTaxVerification({
        status: verifiedBusinessName && registeredState ? "success" : "error",
        message: result.verificationMode === "manual"
          ? "GSTIN format verified, but business details require administrator review."
          : verifiedBusinessName && registeredState
            ? "GSTIN verified successfully. Business name and state have been filled automatically."
            : "GSTIN verified, but the verification service did not return the business name and state.",
        busy: false
      });
    } catch (error) {
      setTaxVerification({ status: "error", message: error.message, busy: false });
    }
  };
  const uploadCertificate = async (event) => {
    const file = event.target.files?.[0];
    if (!file) return;
    update("gstCertificate", "");
    setCertificateUpload({ busy: true, error: "", name: file.name });
    try {
      const uploaded = await api.uploadSellerRegistrationDocument(file);
      if (!uploaded?.url) throw new Error("The upload completed without a document URL. Please try again.");
      update("gstCertificate", uploaded.url);
      setCertificateUpload({ busy: false, error: "", name: file.name });
    } catch (error) {
      event.target.value = "";
      setCertificateUpload({ busy: false, error: error.message, name: "" });
    }
  };
  const registrationBlocked = step === steps.length && (
    !registration.gstRegistrationStatus
    || (registration.isGstRegistered && (!registration.taxVerificationToken || !registration.gstCertificate))
    || (!registration.isGstRegistered && (!registration.businessState || !registration.declarationAccepted))
  );

  if (screen === "welcome") return <main className="resellerWizardPage sellerWizardPage">
    <section className="resellerWelcomeCard">
      <button className="resellerWizardBack" type="button" onClick={onBack} aria-label="Back to store"><ArrowLeft /></button>
      <BrandLogo settings={settings} className="resellerWizardLogo" showText={false} />
      <div className="resellerWelcomeTitle"><span>Become a</span><h1>Seller</h1><strong>Register Now</strong></div>
      <p>Grow Your Business<br />With Us</p>
      <div className="resellerWelcomeBenefits">
        <span><Store />Manage Your Store</span><span><ShoppingBag />List Products</span><span><Truck />Fulfil Orders</span><span><Users />Reach More Customers</span>
      </div>
      <h2>Simple Steps,<br />Big Opportunities!</h2>
      <button className="resellerWizardPrimary" type="button" onClick={() => setScreen("form")}>Start Registration <ArrowRight /></button>
      <p className="resellerRegistrationLogin">Already have an account? <a href="/seller/login" onClick={(event) => { event.preventDefault(); onLogin(); }}>Log in</a></p>
    </section>
  </main>;

  return <main className="resellerWizardPage sellerWizardPage">
    <section className="resellerWizardCard">
      <button className="resellerWizardBack" type="button" onClick={back} aria-label={step > 1 ? "Previous step" : "Back to welcome"}><ArrowLeft /></button>
      <BrandLogo settings={settings} className="resellerAdminLogo" showText={false} />
      <ol className="resellerWizardProgress" aria-label="Registration progress">{steps.map((label, index) => <li className={step === index + 1 ? "active" : step > index + 1 ? "complete" : ""} key={label} aria-label={label}><span>{step > index + 1 ? <Check /> : index + 1}</span></li>)}</ol>
      <span className="resellerStepPill">Step {step} of {steps.length}</span>
      <h1>{steps[step - 1]}</h1>
      <p className="resellerWizardLead">{step === 1 ? "Tell us how to reach you and identify your business." : step === 2 ? "Enter your business and pickup location." : "Provide your GST registration details."}</p>
      {message && !registrationOtp.challengeId && <p className="resellerNotice" role="alert">{message}</p>}
      <form className="resellerWizardForm sellerWizardForm" onSubmit={step === steps.length ? (event) => {
        event.preventDefault();
        if (certificateUpload.busy) {
          setCertificateUpload((current) => ({ ...current, error: "Please wait for the GST certificate upload to finish." }));
          return;
        }
        onSubmit(event);
      } : continueStep}>
        {step === 1 && <>
          <label><span><UserRound />Seller name *</span><input required autoComplete="name" value={registration.name} onChange={(event) => update("name", event.target.value)} /></label>
          <label><span><Building2 />Company name *</span><input required value={registration.companyName} onChange={(event) => update("companyName", event.target.value)} /></label>
          <label><span><Smartphone />Mobile number *</span><input required type="tel" inputMode="tel" autoComplete="tel" value={registration.mobile} onChange={(event) => update("mobile", event.target.value)} /></label>
          <label><span><Mail />Email *</span><input required type="email" autoComplete="email" value={registration.email} onChange={(event) => update("email", event.target.value)} /></label>
          <label className="sellerWizardFull"><span><Users />Referral Seller ID <small>(optional)</small></span><input pattern="(?:\d{6}|HRS\d{6})" maxLength="9" placeholder="123456 or HRS123456" value={registration.referralSellerId} onChange={(event) => update("referralSellerId", event.target.value.toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 9))} /><small>Enter the 6-digit Seller ID, with or without the HRS prefix.</small></label>
        </>}
        {step === 2 && <>
          <label><span><Building2 />House no. / building *</span><input required maxLength="100" autoComplete="address-line1" value={registration.houseNumber} onChange={(event) => update("houseNumber", event.target.value)} /></label>
          <label><span><MapPin />Road / area / colony *</span><input required maxLength="500" autoComplete="address-line2" value={registration.roadArea} onChange={(event) => update("roadArea", event.target.value)} /></label>
          <label><span><MapPin />City *</span><input required autoComplete="address-level2" value={registration.city} onChange={(event) => update("city", event.target.value)} /></label>
          <label><span><MapPin />State *</span><input required autoComplete="address-level1" value={registration.state} onChange={(event) => update("state", event.target.value)} /></label>
          <label><span><MapPin />PIN code *</span><input required inputMode="numeric" autoComplete="postal-code" value={registration.pinCode} onChange={(event) => update("pinCode", event.target.value.replace(/\D/g, "").slice(0, 6))} /></label>
          <label className="sellerWizardCheck sellerWizardFull"><input type="checkbox" checked={registration.pickupSameAsBusiness} onChange={(event) => update("pickupSameAsBusiness", event.target.checked)} /><span>Pickup address is the same as business address</span></label>
          {!registration.pickupSameAsBusiness && <>
            <label className="sellerWizardFull"><span><Truck />Pickup address *</span><textarea required autoComplete="shipping street-address" value={registration.pickupAddress} onChange={(event) => update("pickupAddress", event.target.value)} /></label>
            <label><span><MapPin />Pickup city *</span><input required value={registration.pickupCity} onChange={(event) => update("pickupCity", event.target.value)} /></label>
            <label><span><MapPin />Pickup state *</span><input required value={registration.pickupState} onChange={(event) => update("pickupState", event.target.value)} /></label>
            <label><span><MapPin />Pickup PIN code *</span><input required inputMode="numeric" value={registration.pickupPinCode} onChange={(event) => update("pickupPinCode", event.target.value.replace(/\D/g, "").slice(0, 6))} /></label>
          </>}
        </>}
        {step === 3 && <>
          <fieldset className="sellerWizardFull">
            <legend>Is your business GST registered? *</legend>
            <label className="resellerWizardChoice"><input type="radio" name="gstRegistrationStatus" required checked={registration.gstRegistrationStatus === "yes"} onChange={() => { setTaxVerification({ status: "", message: "", busy: false }); setRegistration((current) => ({ ...current, gstRegistrationStatus: "yes", isGstRegistered: true, gstNumber: "", taxVerificationToken: "", gstCertificate: "", declarationAccepted: false })); }} /> GST registered</label>
            <label className="resellerWizardChoice"><input type="radio" name="gstRegistrationStatus" required checked={registration.gstRegistrationStatus === "no"} onChange={() => { setTaxVerification({ status: "", message: "", busy: false }); setRegistration((current) => ({ ...current, gstRegistrationStatus: "no", isGstRegistered: false, gstNumber: "", taxVerificationToken: "", gstCertificate: "", declarationAccepted: false })); }} /> Not GST registered</label>
          </fieldset>
          {registration.gstRegistrationStatus === "yes" && <>
            <label><span><Building2 />Business name *</span><input required value={registration.businessName} onChange={(event) => update("businessName", event.target.value)} /></label>
            <label><span><MapPin />GST state *</span><input required value={registration.gstState} onChange={(event) => update("gstState", event.target.value)} /></label>
            <label className="sellerWizardFull"><span><ShieldCheck />GSTIN / GST number *</span><input required maxLength="15" value={registration.gstNumber} onChange={(event) => { update("gstNumber", event.target.value.toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 15)); setTaxVerification({ status: "", message: "", busy: false }); }} /><button className="resellerInlineVerify" type="button" disabled={taxVerification.busy || registration.gstNumber.length !== 15} onClick={verifyTax}>{taxVerification.busy ? "Verifying…" : "Verify GSTIN"}</button></label>
            <label className="sellerWizardFull sellerWizardFile"><span><FileText />GST certificate *</span><input type="file" accept="image/*,.pdf" required={!registration.gstCertificate} disabled={!registration.taxVerificationToken || certificateUpload.busy} onChange={uploadCertificate} />{certificateUpload.busy && <small role="status">Uploading {certificateUpload.name}…</small>}{certificateUpload.error && <small className="errorText" role="alert">{certificateUpload.error}</small>}{registration.gstCertificate && <small>Certificate uploaded successfully{certificateUpload.name ? `: ${certificateUpload.name}` : ""}.</small>}</label>
          </>}
          {registration.gstRegistrationStatus === "no" && <>
            <label className="sellerWizardFull"><span><MapPin />Business state *</span><select required value={registration.businessState} onChange={(event) => setRegistration((current) => ({ ...current, businessState: event.target.value, state: event.target.value }))}><option value="">Select state</option>{indianStates.map((state) => <option key={state}>{state}</option>)}</select></label>
            <label className="sellerWizardCheck sellerWizardFull"><input type="checkbox" required checked={registration.declarationAccepted} onChange={(event) => update("declarationAccepted", event.target.checked)} /><span>I declare that the business is not GST registered and accept same-state selling restrictions.</span></label>
          </>}
          {taxVerification.message && <p className={`taxVerificationMessage sellerWizardFull ${taxVerification.status}`} role="status">{taxVerification.message}</p>}
        </>}
        <div className="sellerWizardActions sellerWizardFull">
          {step > 1 && <button className="secondaryButton" type="button" disabled={busy || certificateUpload.busy} onClick={() => setStep((current) => current - 1)}>Back</button>}
          <button className="resellerWizardPrimary" disabled={busy || certificateUpload.busy || registrationBlocked}>
            {certificateUpload.busy ? "Uploading GST certificate…" : busy ? "Checking details…" : step === steps.length ? "Verify email & register" : "Continue"} <ArrowRight />
          </button>
        </div>
      </form>
      <p className="resellerRegistrationLogin">Already have a seller account? <button type="button" onClick={onLogin}>Log in</button></p>
    </section>
    {registrationOtp.challengeId && <div className="partnerPaymentOverlay" role="dialog" aria-modal="true" aria-labelledby="seller-otp-title">
      <form className="partnerPaymentDialog sellerOtpDialog" onSubmit={onVerify}>
        <button className="partnerPaymentClose" type="button" disabled={busy} aria-label="Close email verification" onClick={() => { setRegistrationOtp({ challengeId: "", code: "" }); setMessage(""); }}><X size={20} /></button>
        <span className="eyebrow">Email verification</span><h2 id="seller-otp-title">Verify your email</h2>
        <p>Enter the 6-digit OTP sent to <strong>{registration.email}</strong>.</p>
        <label className="partnerPaymentOtp"><span>Email OTP</span><OtpInput autoFocus inputMode="numeric" autoComplete="one-time-code" pattern="\d{6}" maxLength="6" required value={registrationOtp.code} onChange={(event) => setRegistrationOtp({ ...registrationOtp, code: event.target.value.replace(/\D/g, "").slice(0, 6) })} placeholder="Enter 6-digit OTP" /></label>
        {message && <p className="partnerPaymentStatus" role="status">{message}</p>}
        <div className="partnerPaymentActions"><button className="secondaryButton" type="button" disabled={busy} onClick={() => { setRegistrationOtp({ challengeId: "", code: "" }); setMessage(""); }}>Cancel</button><button className="primaryButton" disabled={busy || registrationOtp.code.length !== 6}>{busy ? "Verifying…" : "Verify OTP & create account"}</button></div>
      </form>
    </div>}
  </main>;
}
