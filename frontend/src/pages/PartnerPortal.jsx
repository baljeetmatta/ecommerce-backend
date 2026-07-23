import { useEffect, useState } from "react";
import { ArrowRight, Award, BadgeIndianRupee, Bell, Building2, CalendarDays, ChartNoAxesColumnIncreasing, Check, ChevronDown, Clock3, Copy, FileCheck2, Gift, HandCoins, KeyRound, LayoutGrid, LockKeyhole, LogOut, Mail, Menu, Minus, ReceiptText, ShieldAlert, ShieldCheck, ShoppingCart, Sparkles, TrendingUp, UserPlus, UserRound, Users, WalletCards, X } from "lucide-react";
import { api, partnerAuthStore } from "../services/api.js";
import ForgotPasswordForm from "../components/ForgotPasswordForm.jsx";
import PortalAuthCard from "../components/PortalAuthCard.jsx";
import DocumentPreviewModal from "../components/DocumentPreviewModal.jsx";
import { clearPayuReturn, openPayuModal, readPayuReturn } from "../utils/payuCheckout.js";

const money = (value) => new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR" }).format(value || 0);
const referralFromHash = () => new URLSearchParams(window.location.hash.split("?")[1] || "").get("ref")?.trim() || "";
const blankRegistration = { name: "", fatherName: "", gender: "Male", email: "", mobile: "", package: "", referralId: "", address: { line: "", state: "", city: "", postalCode: "" } };
const pendingPartnerRegistration = () => {
  try {
    const pending = JSON.parse(sessionStorage.getItem("hrbasket_payu_pending") || "null");
    return pending?.kind === "partner-registration" ? pending.registration : null;
  } catch (_error) {
    return null;
  }
};
const fileData = (file) => new Promise((resolve, reject) => { const reader = new FileReader(); reader.onload = () => resolve(reader.result); reader.onerror = reject; reader.readAsDataURL(file); });
const loadRazorpay = () => new Promise((resolve, reject) => { if (window.Razorpay) return resolve(); const script = document.createElement("script"); script.src = "https://checkout.razorpay.com/v1/checkout.js"; script.onload = resolve; script.onerror = () => reject(new Error("Unable to load Razorpay checkout")); document.head.appendChild(script); });
const runPartnerCheckout = async (order, prefill = {}, pendingContext = null) => {
  if (order.gateway === "payu") {
    return openPayuModal(order, pendingContext);
  }
  await loadRazorpay();
  const payment = await new Promise((resolve, reject) => { const checkout = new window.Razorpay({ key: order.keyId, amount: order.amount, currency: order.currency, name: order.merchantName || "Partner Program", description: `${order.package.title} partner registration`, order_id: order.orderId, prefill, handler: resolve, modal: { ondismiss: () => reject(new Error("Payment was cancelled.")) }, theme: { color: "#6d3dea" } }); checkout.on("payment.failed", (response) => reject(new Error(response.error?.description || "Payment failed"))); checkout.open(); });
  return { razorpayOrderId: payment.razorpay_order_id, razorpayPaymentId: payment.razorpay_payment_id, razorpaySignature: payment.razorpay_signature };
};
const partnerKycTitles = { aadhar: "Aadhar Card", pan: "PAN Card", cancelledCheque: "Cancelled Cheque" };

function PartnerRegistrationSuccess({ result, onContinue }) {
  const partner = result.partner;
  const packageTitle = partner.package?.title || "Partner";
  const paymentReference = partner.registrationPayment?.provider === "test"
    ? "Skipped for testing"
    : partner.registrationPayment?.paymentId || partner.registrationPayment?.orderId || "Payment confirmed";
  const joinedAt = partner.registrationPayment?.paidAt ? new Date(partner.registrationPayment.paidAt) : new Date();
  const details = [
    { label: "Partner ID", value: result.registrationNumber, icon: UserRound, tone: "purple" },
    { label: "Password", value: result.temporaryPassword, icon: LockKeyhole, tone: "green" },
    { label: "Registered Email", value: partner.email, icon: Mail, tone: "blue" },
    { label: "UTR Number", value: paymentReference, icon: ReceiptText, tone: "pink" },
    { label: "Membership", value: packageTitle, icon: Award, tone: "gold" },
    { label: "Joining Date", value: joinedAt.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" }), icon: CalendarDays, tone: "dark" }
  ];
  const benefits = [
    { title: "Earn More", text: "Higher Cashback & Profit Sharing", icon: BadgeIndianRupee, tone: "purple" },
    { title: "Refer & Grow", text: "Invite Partners & Grow Your Network", icon: Users, tone: "blue" },
    { title: "Withdraw Easily", text: "Easy Payouts & Secure Transactions", icon: WalletCards, tone: "green" },
    { title: "Track & Earn", text: "Track Performance & Maximize Earnings", icon: TrendingUp, tone: "orange" }
  ];

  return <main className="partnerSuccessPage">
    <header className="partnerSuccessHeader">
      <div className="partnerSuccessBrand"><span className="brandCart"><ShoppingCart size={27} /><Check size={14} /></span><div><strong><i>HRS</i> BASKET</strong><small>Partner Membership Program</small></div></div>
      <div className="partnerSuccessStatus"><ShieldCheck size={20} /><span>Secure Payment</span><strong>Success</strong></div>
    </header>
    <div className="partnerSuccessStripe" />
    <section className="partnerSuccessCanvas">
      <div className="successConfetti" aria-hidden="true">{Array.from({ length: 24 }, (_, index) => <i key={index} />)}</div>
      <div className="successCheck"><Check size={55} strokeWidth={4} /></div>
      <h1>Congratulations!</h1>
      <h2>Welcome to <span>HRS</span> Partner Membership Program</h2>
      <p className="successLead">Your payment has been successful and your partner account has been created.</p>
      <div className="membershipBadge"><Award size={29} /><span><strong>{packageTitle}</strong><small>★★★★★</small></span></div>

      <section className="partnerAccountCard">
        <h3><UserRound size={22} /> Your Partner Account Details</h3>
        <div>{details.map(({ label, value, icon: Icon, tone }) => <dl key={label}><dt><Icon size={18} />{label}</dt><dd className={tone}>{value}</dd></dl>)}</div>
      </section>

      <section className="partnerWelcomeBanner">
        <div className="welcomeShield"><ShieldCheck size={56} /></div>
        <div><h3>You are now a part of the HRS <span>Family!</span></h3><p>Start sharing, start earning and grow together.</p><button onClick={onContinue}>Go to Dashboard <ArrowRight size={17} /></button></div>
        <div className="welcomeGift"><Gift size={61} /><span>● ● ●</span></div>
      </section>

      <section className="partnerBenefits">{benefits.map(({ title, text, icon: Icon, tone }) => <article key={title} className={tone}><span><Icon size={29} /></span><h3>{title}</h3><p>{text}</p></article>)}</section>
    </section>
    <footer className="partnerSuccessFooter"><ShieldCheck size={38} /><div><strong>Thank you for joining HRS Partner Membership Program.</strong><span>We look forward to a long and successful partnership with you.</span></div><div className="footerBrand"><strong><i>HRS</i> BASKET</strong><small>Partner Membership Program</small></div></footer>
  </main>;
}

export default function PartnerPortal({ onBack }) {
  const [partner, setPartner] = useState(partnerAuthStore.partner);
  const initialReferralId = referralFromHash();
  const returningRegistration = pendingPartnerRegistration();
  const [screen, setScreen] = useState(partner ? "dashboard" : returningRegistration || initialReferralId ? "register" : "login");
  const [packages, setPackages] = useState([]);
  const [paymentBypassEnabled, setPaymentBypassEnabled] = useState(false);
  const [registration, setRegistration] = useState(returningRegistration || { ...blankRegistration, referralId: initialReferralId, address: { ...blankRegistration.address } });
  const [login, setLogin] = useState({ registrationNumber: "", password: "" });
  const [registrationResult, setRegistrationResult] = useState(null);
  const [registrationOtp, setRegistrationOtp] = useState({ challengeId: "", code: "" });
  const [referralLookup, setReferralLookup] = useState(initialReferralId ? { status: "loading", name: "" } : { status: "admin", name: "" });
  const [data, setData] = useState({ dashboard: {}, payouts: [], withdrawals: [] });
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const [portalReady, setPortalReady] = useState(!partner);
  const [loadError, setLoadError] = useState("");
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const registrationCompleteRoute = "#/partner/registration-complete";

  const showRegistrationComplete = (result) => {
    setRegistrationResult(result);
    setScreen("registered");
    if (window.location.hash.split("?")[0] !== registrationCompleteRoute) {
      window.history.pushState({ partnerRegistrationComplete: true }, "", registrationCompleteRoute);
    }
  };

  const refresh = async () => {
    if (!partnerAuthStore.token) return;
    setLoadError("");
    const [me, dashboard, payouts, withdrawals] = await Promise.all([api.partnerMe(), api.partnerDashboard(), api.partnerPayouts(), api.partnerWithdrawals()]);
    partnerAuthStore.partner = me.partner; setPartner(me.partner); setData({ dashboard, payouts, withdrawals }); setPortalReady(true);
  };
  useEffect(() => { api.partnerPackages().then(setPackages).catch((e) => setMessage(e.message)); api.partnerRegistrationSettings().then((settings) => setPaymentBypassEnabled(Boolean(settings.partnerPaymentBypassEnabled))).catch(() => setPaymentBypassEnabled(false)); refresh().catch((error) => { setLoadError(error.message); setPortalReady(false); }); }, []);
  useEffect(() => {
    const syncRegistrationRoute = () => {
      const onCompleteRoute = window.location.hash.split("?")[0] === registrationCompleteRoute;
      if (onCompleteRoute && registrationResult) setScreen("registered");
      else if (onCompleteRoute) {
        window.history.replaceState(null, "", "#/partner");
        setScreen("register");
      } else if (screen === "registered") setScreen("register");
    };
    window.addEventListener("hashchange", syncRegistrationRoute);
    window.addEventListener("popstate", syncRegistrationRoute);
    syncRegistrationRoute();
    return () => {
      window.removeEventListener("hashchange", syncRegistrationRoute);
      window.removeEventListener("popstate", syncRegistrationRoute);
    };
  }, [registrationResult, screen]);
  useEffect(() => {
    const referralId = registration.referralId;
    if (!referralId) { setReferralLookup({ status: "admin", name: "" }); return undefined; }
    if (referralId.length !== 6) { setReferralLookup({ status: "incomplete", name: "" }); return undefined; }
    let active = true;
    setReferralLookup({ status: "loading", name: "" });
    const timer = window.setTimeout(() => {
      api.partnerReferral(referralId)
        .then((result) => { if (active) setReferralLookup({ status: "found", name: result.name }); })
        .catch(() => { if (active) setReferralLookup({ status: "missing", name: "" }); });
    }, 250);
    return () => { active = false; window.clearTimeout(timer); };
  }, [registration.referralId]);
  useEffect(() => {
    const returned = readPayuReturn();
    if (!returned) return;
    if (returned.kind === "partner-registration") {
      setScreen("register");
      if (returned.registration) setRegistration(returned.registration);
    }
    setBusy(true);
    setMessage("Confirming your PayU payment…");
    const finishPayment = async () => {
      if (returned.status !== "success") throw new Error("PayU payment was not completed. Please try again.");
      if (returned.kind === "partner-registration" && returned.registration) {
        const result = await api.partnerRegister({ ...returned.registration, payment: { payuTxnId: returned.txnid } });
        showRegistrationComplete(result);
        setMessage(result.message || "Registration payment completed successfully.");
        return;
      }
      if (returned.kind === "partner-payment") {
        const result = await api.verifyMyPartnerPayment({ payuTxnId: returned.txnid });
        partnerAuthStore.partner = result.partner;
        setPartner(result.partner);
        await refresh();
        setMessage(result.message || "Registration payment completed successfully.");
        setScreen("dashboard");
        return;
      }
      throw new Error("Unable to restore the PayU payment session. Please contact support with the transaction ID.");
    };
    finishPayment()
      .catch((error) => setMessage(error.message))
      .finally(() => { clearPayuReturn(); setBusy(false); });
  }, []);
  const submit = async (action) => { setBusy(true); setMessage(""); try { await action(); } catch (error) { setMessage(error.message); } finally { setBusy(false); } };
  const register = (event) => { event.preventDefault(); submit(async () => { const order = await api.createPartnerRegistrationOrder({ package: registration.package, referralId: registration.referralId, name: registration.name, email: registration.email, mobile: registration.mobile, returnUrl: window.location.href }); const payment = await runPartnerCheckout(order, { name: registration.name, email: registration.email, contact: registration.mobile }, { kind: "partner-registration", registration }); const result = await api.partnerRegister({ ...registration, payment }); showRegistrationComplete(result); setMessage(result.message); }); };
  const registerWithoutPayment = (form) => { if (!form.reportValidity()) return; submit(async () => { const result = await api.requestPartnerRegistrationOtp({ ...registration, deferPayment: true }); setRegistrationOtp({ challengeId: result.challengeId, code: "" }); setMessage(result.message); setScreen("verify-otp"); }); };
  const verifyRegistrationOtp = (event) => { event.preventDefault(); submit(async () => { const result = await api.verifyPartnerRegistrationOtp(registrationOtp); showRegistrationComplete(result); setMessage(result.message); }); };
  const payRegistration = () => submit(async () => { const order = await api.createMyPartnerPaymentOrder({ returnUrl: window.location.href }); const payment = await runPartnerCheckout(order, { name: partner.name, email: partner.email, contact: partner.mobile }, { kind: "partner-payment" }); const result = await api.verifyMyPartnerPayment(payment); partnerAuthStore.partner = result.partner; setPartner(result.partner); await refresh(); setMessage(result.message); });
  const changePackage = async (packageId) => { const result = await api.partnerChangePackage(packageId); partnerAuthStore.partner = result.partner; setPartner(result.partner); await refresh(); setMessage(result.message); };
  const signIn = (event) => { event.preventDefault(); submit(async () => { const result = await api.partnerLogin(login); partnerAuthStore.token = result.token; partnerAuthStore.partner = result.partner; setPartner(result.partner); setPortalReady(false); setScreen("dashboard"); await refresh(); }); };
  const logout = () => { partnerAuthStore.clear(); setPartner(null); setPortalReady(true); setLoadError(""); setScreen("login"); };

  if (!partner && screen === "registered" && registrationResult) return <PartnerRegistrationSuccess result={registrationResult} onContinue={() => { setLogin({ registrationNumber: registrationResult.registrationNumber, password: "" }); setMessage(""); window.history.pushState(null, "", "#/partner"); setScreen("login"); }} />;
  if (!partner && screen === "verify-otp") return <PortalAuthCard portal="Partner" heading="Verify your email" subtitle="Enter the 6-digit code sent to your email to complete registration." dividerText="Email verification"><form className="authForm" onSubmit={verifyRegistrationOtp}>{message && <div className="notice">{message}</div>}<label><span>Email verification code</span><input inputMode="numeric" pattern="\d{6}" maxLength="6" autoComplete="one-time-code" required value={registrationOtp.code} onChange={(event) => setRegistrationOtp({ ...registrationOtp, code: event.target.value.replace(/\D/g, "").slice(0, 6) })} /></label><button className="primaryButton authButton" disabled={busy || registrationOtp.code.length !== 6}>{busy ? "Verifying…" : "Verify and create account"}</button><button className="linkButton" type="button" onClick={() => { setMessage(""); setScreen("register"); }}>Back to registration</button></form></PortalAuthCard>;

  if (!partner && screen === "login") return <PortalAuthCard portal="Partner" subtitle="Enter your credentials to continue" onBack={onBack}>{message && <div className="notice">{message}</div>}<form className="authForm" onSubmit={signIn}><label><span>6-digit registration ID</span><input inputMode="numeric" pattern="\d{6}" maxLength="6" required value={login.registrationNumber} onChange={(e) => setLogin({ ...login, registrationNumber: e.target.value.replace(/\D/g, "").slice(0, 6) })} /></label><label><span>Password</span><input type="password" required value={login.password} onChange={(e) => setLogin({ ...login, password: e.target.value })} /></label><div className="authOptions"><label className="rememberMe"><input type="checkbox" /> <span>Remember me?</span></label><button className="linkButton" type="button" onClick={() => setScreen("forgot")}>Forgot password?</button></div><button className="primaryButton authButton" disabled={busy}>{busy ? "Signing in…" : "Sign In"}</button><button className="portalRegisterLink linkButton" type="button" onClick={() => { setMessage(""); setScreen("register"); }}>Don't Have an account?</button></form></PortalAuthCard>;
  if (!partner && screen === "forgot") return <div className="partnerPublic"><div className="partnerAuthCard"><button className="linkButton" onClick={onBack}>← Back to store</button><h1>Reset partner password</h1><ForgotPasswordForm identifierLabel="Registration ID or email" initialIdentifier={login.registrationNumber} passwordDigits onRequest={(identifier) => api.partnerForgotPassword({ identifier })} onReset={api.partnerResetPassword} onBack={() => setScreen("login")} /></div></div>;

  if (!partner && screen === "register") { const selectedPackage = packages.find((item) => item._id === registration.package); const registrationDisabled = busy || referralLookup.status === "missing" || referralLookup.status === "loading" || referralLookup.status === "incomplete"; return <PortalAuthCard portal="Partner" heading="Register as a partner" subtitle="Create your partner account to get started." dividerText="Partner registration" pageClassName="partnerRegistrationPage" panelClassName="partnerRegistrationPanel" onBack={onBack}>{message && <div className="notice">{message}</div>}<form className="authForm formGrid twoColumn partnerRegistrationForm" onSubmit={register}><label>Name<input required value={registration.name} onChange={(e) => setRegistration({ ...registration, name: e.target.value })} /></label><label>Father name<input required value={registration.fatherName} onChange={(e) => setRegistration({ ...registration, fatherName: e.target.value })} /></label><label>Gender<select value={registration.gender} onChange={(e) => setRegistration({ ...registration, gender: e.target.value })}><option>Male</option><option>Female</option><option>Other</option><option>Prefer not to say</option></select></label><label>Mobile<input required value={registration.mobile} onChange={(e) => setRegistration({ ...registration, mobile: e.target.value })} /></label><label>Email<input type="email" required value={registration.email} onChange={(e) => setRegistration({ ...registration, email: e.target.value })} /></label><label>Package<select required value={registration.package} onChange={(e) => setRegistration({ ...registration, package: e.target.value })}><option value="">Select package</option>{packages.map((item) => <option key={item._id} value={item._id}>{item.title} · {money(item.price)} · {item.sharePercentage}% share</option>)}</select></label><label className="full">Referral ID (optional)<input inputMode="numeric" pattern="\d{6}" maxLength="6" value={registration.referralId} onChange={(e) => setRegistration({ ...registration, referralId: e.target.value.replace(/\D/g, "").slice(0, 6) })} /><span className={`referralLookup ${referralLookup.status}`}>{referralLookup.status === "found" ? `Partner: ${referralLookup.name}` : referralLookup.status === "missing" ? "No such partner" : referralLookup.status === "loading" ? "Checking partner…" : referralLookup.status === "incomplete" ? "Enter the complete 6-digit referral ID" : "No referral — registration will be attributed to admin"}</span></label>{selectedPackage && <div className="selectedPackage full"><strong>{selectedPackage.title} — {money(selectedPackage.price)}</strong><span>{selectedPackage.sharePercentage}% payout share weight</span><p>{selectedPackage.features?.join(" · ")}</p><p>{selectedPackage.benefits?.join(" · ")}</p></div>}<label className="full">Address<input required value={registration.address.line} onChange={(e) => setRegistration({ ...registration, address: { ...registration.address, line: e.target.value } })} /></label>{["city", "state", "postalCode"].map((field) => <label key={field}>{field === "postalCode" ? "Postal code" : field}<input required={field !== "postalCode"} value={registration.address[field]} onChange={(e) => setRegistration({ ...registration, address: { ...registration.address, [field]: e.target.value } })} /></label>)}<div className="registrationActions full"><button className="primaryButton authButton" disabled={registrationDisabled}>{busy ? "Processing registration…" : "Continue with payment"}</button>{paymentBypassEnabled && <button className="secondaryButton" type="button" disabled={registrationDisabled} onClick={(event) => registerWithoutPayment(event.currentTarget.form)}>Pay Later</button>}</div></form></PortalAuthCard>; }

  if (!partner) return <div className="partnerPublic"><div className="partnerAuthCard"><button className="linkButton" onClick={onBack}>← Back to store</button><h1>Partner Program</h1><p>Join our community and share in eligible sales profit.</p><div className="tabRow"><button className={screen === "login" ? "active" : ""} onClick={() => setScreen("login")}>Partner login</button><button className={screen === "register" ? "active" : ""} onClick={() => setScreen("register")}>Register</button></div>{message && <div className="notice">{message}</div>}{screen === "login" ? <form className="formGrid" onSubmit={signIn}><label>Email<input type="email" required value={login.email} onChange={(e) => setLogin({ ...login, email: e.target.value })} /></label><label>Password<input type="password" required value={login.password} onChange={(e) => setLogin({ ...login, password: e.target.value })} /></label><button className="primaryButton" disabled={busy}>Sign in</button></form> : <form className="formGrid twoColumn" onSubmit={register}><label>Name<input required value={registration.name} onChange={(e) => setRegistration({ ...registration, name: e.target.value })} /></label><label>Father name<input required value={registration.fatherName} onChange={(e) => setRegistration({ ...registration, fatherName: e.target.value })} /></label><label>Gender<select value={registration.gender} onChange={(e) => setRegistration({ ...registration, gender: e.target.value })}><option>Male</option><option>Female</option><option>Other</option><option>Prefer not to say</option></select></label><label>Mobile<input required value={registration.mobile} onChange={(e) => setRegistration({ ...registration, mobile: e.target.value })} /></label><label>Email<input type="email" required value={registration.email} onChange={(e) => setRegistration({ ...registration, email: e.target.value })} /></label><label>Package<select required value={registration.package} onChange={(e) => setRegistration({ ...registration, package: e.target.value })}><option value="">Select package</option>{packages.map((p) => <option key={p._id} value={p._id}>{p.title} · {money(p.price)}</option>)}</select></label><label className="full">Address<input required value={registration.address.line} onChange={(e) => setRegistration({ ...registration, address: { ...registration.address, line: e.target.value } })} /></label>{["city", "state", "postalCode"].map((field) => <label key={field}>{field === "postalCode" ? "Postal code" : field[0].toUpperCase() + field.slice(1)}<input required={field !== "postalCode"} value={registration.address[field]} onChange={(e) => setRegistration({ ...registration, address: { ...registration.address, [field]: e.target.value } })} /></label>)}<button className="primaryButton full" disabled={busy}>Register as partner</button></form>}</div></div>;

  if (!portalReady) return <main className="storefrontLoadingScreen" role="status" aria-live="polite"><div className="storefrontLoadingBrand"><span>PA</span><strong>Partner Portal</strong></div>{!loadError && <div className="storefrontLoadingSpinner" aria-hidden="true" />}<h1>{loadError ? "Unable to load partner data" : "Loading partner workspace"}</h1><p>{loadError || "Connecting to the database and loading your dashboard, payouts, and referrals…"}</p>{loadError && <button className="heroPrimary" type="button" onClick={() => refresh().catch((error) => setLoadError(error.message))}>Try Again</button>}</main>;

  const navigation = [["dashboard", "Dashboard", LayoutGrid], ["referrals", "Referrals", UserPlus], ["profile", "Profile Update", UserRound], ["password", "Change Password", KeyRound], ["kyc", "KYC", FileCheck2], ["bank", "Bank Details", Building2], ["payouts", "Payouts", BadgeIndianRupee], ["withdrawal", "Withdrawal", Mail]];
  const pageTitle = screen === "withdrawal-new" ? "New Withdrawal Request" : navigation.find(([id]) => id === screen)?.[1];
  const greeting = new Date().getHours() < 12 ? "Good morning" : new Date().getHours() < 17 ? "Good afternoon" : "Good evening";
  const dashboardTitle = `Welcome, ${partner.name} (ID: ${partner.registrationNumber})`;
  return <div className={`partnerShell premiumPartnerWorkspace ${mobileNavOpen ? "navOpen" : ""}`}><button className="partnerNavBackdrop" aria-label="Close navigation" onClick={() => setMobileNavOpen(false)} /><aside className="partnerNav"><div className="brand"><div className="partnerBrandIcon"><ShoppingCart size={25} /></div><div><strong>HR BASKET</strong><span>Partner Portal</span></div><button className="partnerNavClose" onClick={() => setMobileNavOpen(false)} aria-label="Close menu"><X /></button></div><nav>{navigation.map(([id, label, Icon]) => <button key={id} className={screen === id || (id === "withdrawal" && screen === "withdrawal-new") ? "active" : ""} onClick={() => { setScreen(id); setMessage(""); setMobileNavOpen(false); }}><span><Icon size={19} /></span>{label}</button>)}<button onClick={logout}><span><LogOut size={19} /></span>Logout</button></nav><div className="partnerSidebarPromo"><Gift /><Sparkles className="promoSparkle" /><strong>Earn More<br />Grow Together</strong><button onClick={() => { setScreen("referrals"); setMobileNavOpen(false); }}>Refer &amp; Earn More <span>→</span></button></div></aside><main className="partnerContent"><header><button className="partnerMenuButton" onClick={() => setMobileNavOpen(true)} aria-label="Open menu"><Menu /></button><div className="partnerPageHeading"><h1>{screen === "dashboard" ? <>{greeting === "Good morning" ? "👋" : "✨"} {greeting}, <span>{partner.name}!</span></> : pageTitle}</h1><p>{screen === "dashboard" ? "Here’s an overview of your partner account." : `Partner ID: ${partner.registrationNumber}`}</p></div><div className="partnerHeaderActions"><div className="partnerHeaderAvatar" aria-label={`${partner.name} profile`}>{partner.profileImage ? <img src={partner.profileImage} alt="" /> : <span>{partner.name?.trim()?.[0]?.toUpperCase() || "P"}</span>}</div><div className="partnerHeaderIdentity"><strong>{partner.name}</strong><span>ID: {partner.registrationNumber}</span></div></div></header>{message && <div className="notice">{message}</div>}{screen === "dashboard" && <Dashboard data={data.dashboard} partner={partner} packages={packages} onChangePackage={changePackage} />}{screen === "referrals" && <Referrals partner={partner} data={data.dashboard} setMessage={setMessage} />}{screen === "profile" && <Profile partner={partner} save={(payload) => submit(async () => { await api.partnerUpdateProfile(payload); await refresh(); setMessage("Profile updated."); })} />}{screen === "password" && <ChangePassword save={(payload) => submit(async () => { const result = await api.partnerChangePassword(payload); setMessage(result.message); })} />}{screen === "kyc" && <Kyc partner={partner} save={async (type, payload) => { const updated = await api.partnerUploadKyc(type, payload); partnerAuthStore.partner = updated; setPartner(updated); return updated; }} fileData={fileData} />}{screen === "bank" && <Bank partner={partner} save={(payload) => submit(async () => { await api.partnerUpdateBank(payload); await refresh(); setMessage("Bank details updated."); })} />}{screen === "payouts" && <Ledger rows={data.payouts} />}{screen === "withdrawal" && <Withdrawals rows={data.withdrawals} balance={data.dashboard.walletBalance} minimumAmount={data.dashboard.minimumWithdrawalAmount} onNew={() => { setMessage(""); setScreen("withdrawal-new"); }} />}{screen === "withdrawal-new" && <WithdrawalRequest balance={data.dashboard.walletBalance} minimumAmount={data.dashboard.minimumWithdrawalAmount} email={partner.email} onBack={() => setScreen("withdrawal")} onComplete={async () => { await refresh(); setMessage("Withdrawal request submitted successfully for admin review."); setScreen("withdrawal"); }} />}</main></div>;
}

const Dashboard = ({ data, partner, packages, onChangePackage }) => {
  const [selectedPackage, setSelectedPackage] = useState(partner.package?._id || "");
  const [changingPackage, setChangingPackage] = useState(false);
  const [paymentOpen, setPaymentOpen] = useState(false);
  const [setupCollapsed, setSetupCollapsed] = useState(false);
  const dashboardGreeting = new Date().getHours() < 12 ? "Good morning" : new Date().getHours() < 17 ? "Good afternoon" : "Good evening";
  const onboarding = data.onboarding || [];
  const pendingIndex = onboarding.findIndex((step) => step.status !== "completed");
  const setupApproved = onboarding.length > 0 && pendingIndex === -1;

  const pay = async () => {
    setChangingPackage(true);
    try {
      if (selectedPackage && selectedPackage !== partner.package?._id) await onChangePackage(selectedPackage);
      const order = await api.createMyPartnerPaymentOrder({ returnUrl: window.location.href });
      const payment = await runPartnerCheckout(order, { name: partner.name, email: partner.email, contact: partner.mobile }, { kind: "partner-payment" });
      const result = await api.verifyMyPartnerPayment(payment);
      partnerAuthStore.partner = result.partner;
      window.location.reload();
    } catch (error) {
      window.alert(error.message);
    } finally {
      setChangingPackage(false);
    }
  };

  const stats = [
    ["purple", "/images/partner/partners.svg", "Total registered partners", data.partnersCount || 0],
    ["orange", "/images/partner/sales.svg", "Total e-commerce sales", money(data.ecommerceSales)],
    ["blue", "/images/partner/profit.svg", "Total product profit", money(data.ecommerceProfit)],
    ["pink", WalletCards, "Wallet balance", money(data.walletBalance)],
    ["green", "/images/partner/payout.svg", "Total payouts", money(data.totalPayout)],
    ["yellow", "/images/partner/entries.svg", "Payout entries", data.payoutCount || 0],
    ["red", "/images/partner/pending.svg", "Pending withdrawal", money(data.pendingWithdrawal)]
  ];

  return <div className="premiumPartnerDashboard">
    <section className="partnerDashboardIntro"><h1>👋 {dashboardGreeting}, <span>{partner.name}!</span></h1><p>Here’s an overview of your partner account.</p></section>
    <section className="partnerWalletCard">
      <div><span><BadgeIndianRupee size={18} /> Wallet Balance</span><strong>{money(data.walletBalance)}</strong></div>
      <img className="walletImage" src="/images/partner/wallet.svg" alt="" /><i className="coin coinOne">₹</i><i className="coin coinTwo">₹</i>
    </section>

    <section className="partnerDashboardWelcome">
      <div className="partnerDashboardAvatar">{partner.profileImage ? <img src={partner.profileImage} alt={`${partner.name} profile`} /> : <span>{partner.name?.trim()?.[0]?.toUpperCase() || "P"}</span>}</div>
      <div><span className="eyebrow">Partner profile</span><h2>{partner.name}</h2><p>ID {partner.registrationNumber} <b>•</b> {partner.package?.title || "Membership Program"}</p></div>
      <div className="goldPartnerBadge"><Award /><span><strong>Gold Partner</strong><small>★★★★★</small></span></div>
    </section>

    <section className={`partnerOnboarding ${setupApproved ? "approved" : "hasPending"} ${setupCollapsed ? "collapsed" : ""}`}>
      <div className="setupMain">
        <div className="setupHeading">
          <div><h3>{setupCollapsed ? (setupApproved ? "Account approved" : `Account setup pending at step ${pendingIndex + 1}`) : "Account Setup"}</h3>{!setupCollapsed && <p>Complete each step to activate all partner benefits.</p>}</div>
          <button type="button" className="setupMinimize" onClick={() => setSetupCollapsed((value) => !value)} aria-label={setupCollapsed ? "Expand account setup" : "Minimize account setup"}>{setupCollapsed ? <ChevronDown /> : <Minus />}</button>
        </div>
        {!setupCollapsed && <div className="onboardingSteps">{onboarding.map((step, index) => <div key={step.key} className={`onboardingStep ${step.status}`}>
          <span>{index + 1}</span>
          <div><strong>{step.label}</strong><small>{step.status === "completed" ? "Completed" : "Pending"}</small></div>
        </div>)}</div>}
      </div>
      {!setupCollapsed && <div className="setupShield">{setupApproved ? <ShieldCheck /> : <><ShieldAlert /><b>{pendingIndex + 1}</b></>}</div>}
    </section>

    <div className="partnerDashboardColumns">
      {data.registrationPayment && <section className={`partnerPaymentReceipt ${data.registrationPayment.status}`}>
        <div className="paymentTitle">
          <div><h3>Registration Payment</h3><p>{data.registrationPayment.status === "pending" ? "Payment is pending. Complete it to activate your account." : "Registration payment completed."}</p></div>
          <span><Check /></span>
        </div>
        {data.registrationPayment.status === "pending" ? <button className="primaryButton paymentAction" type="button" onClick={() => setPaymentOpen(true)}>Select Package &amp; Pay</button> : <><div className="paymentComplete"><ShieldCheck /><strong>Payment approved</strong></div><dl className="approvedPaymentDetails"><dt>Amount</dt><dd>{money(data.registrationPayment.amount)}</dd><dt>Method</dt><dd>{data.registrationPayment.provider || "—"}</dd><dt>Receipt / Reference</dt><dd>{data.registrationPayment.adminReference || data.registrationPayment.paymentId || "—"}</dd><dt>Admin Note</dt><dd>{data.registrationPayment.adminNote || "Done"}</dd></dl></>}
      </section>}
      <div className="summaryGrid">{stats.map(([tone, icon, label, value]) => <article className={tone} key={label}><div className="statIcon"><img src={icon} alt="" /></div><div><span>{label}</span><strong>{value}</strong></div><img className="statWatermark" src={icon} alt="" /></article>)}</div>
    </div>

    <section className="partnerAchievementBanner"><div><span>YOU’RE DOING GREAT!</span><h3>Keep Sharing. Keep Earning. 🚀</h3><p>You’re building something amazing—one referral at a time.</p><button type="button" onClick={() => window.location.hash = "#/partner"}>View Referrals <b>→</b></button></div><div className="achievementTrophy"><Award /><Sparkles /></div></section>
    <footer className="partnerDashboardFooter"><span>© 2026 HR Basket. All rights reserved.</span><span>Together We Grow More 🌱</span></footer>

    {paymentOpen && <div className="partnerPaymentModal" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) setPaymentOpen(false); }}>
      <section role="dialog" aria-modal="true" aria-labelledby="payment-package-title">
        <button className="paymentModalClose" type="button" onClick={() => setPaymentOpen(false)} aria-label="Close payment dialog"><X /></button>
        <span className="paymentModalIcon"><WalletCards /></span>
        <h2 id="payment-package-title">Select your package</h2>
        <p>Your registration package is selected by default. Choose another package if needed, then continue to secure payment.</p>
        <label><span>Partner package</span><select value={selectedPackage} onChange={(event) => setSelectedPackage(event.target.value)}>{packages.map((item) => <option key={item._id} value={item._id}>{item.title} · {money(item.price)}</option>)}</select></label>
        {packages.find((item) => item._id === selectedPackage) && <div className="paymentPackageSummary"><span>Amount payable</span><strong>{money(packages.find((item) => item._id === selectedPackage)?.price)}</strong></div>}
        <button className="primaryButton" type="button" disabled={changingPackage || !selectedPackage} onClick={pay}>{changingPackage ? "Preparing payment…" : "Continue to payment"}</button>
      </section>
    </div>}
  </div>;
};
function Referrals({ partner, data, setMessage }) { const referralUrl = `${window.location.origin}${window.location.pathname}#/partner/register?ref=${partner.registrationNumber}`; const copy = async () => { try { await navigator.clipboard.writeText(referralUrl); setMessage("Referral URL copied."); } catch (_error) { setMessage("Copy failed. Select and copy the URL manually."); } }; return <><div className="panel referralPanel"><h3>Your referral URL</h3><p>Share this URL. New partners who use it will be linked to your partner ID <strong>{partner.registrationNumber}</strong>.</p><div className="referralUrl"><input readOnly value={referralUrl} onFocus={(event) => event.target.select()} /><button className="primaryButton" type="button" onClick={copy}><Copy size={17} />Copy</button></div></div><div className="summaryGrid referralSummary"><article><span>Direct referrals</span><strong>{data.referralCount || 0}</strong></article></div><div className="panel tableWrap"><table><thead><tr><th>Joined</th><th>Partner ID</th><th>Name</th><th>Email</th><th>Status</th></tr></thead><tbody>{(data.recentReferrals || []).map((item) => <tr key={item._id}><td>{new Date(item.createdAt).toLocaleDateString("en-IN")}</td><td>{item.registrationNumber}</td><td>{item.name}</td><td>{item.email}</td><td>{item.status}</td></tr>)}{!data.recentReferrals?.length && <tr><td colSpan="5">No referrals yet.</td></tr>}</tbody></table></div></>; }
function ChangePassword({ save }) { const [form, setForm] = useState({ currentPassword: "", newPassword: "", confirmPassword: "" }); const submitForm = (event) => { event.preventDefault(); if (form.newPassword !== form.confirmPassword) return; save({ currentPassword: form.currentPassword, newPassword: form.newPassword }); setForm({ currentPassword: "", newPassword: "", confirmPassword: "" }); }; return <form className="panel partnerPasswordForm" onSubmit={submitForm}><div><span className="eyebrow">Account security</span><h2>Change Password</h2><p>Choose a secure four-digit password for your partner account.</p></div><label><span>Current password</span><input type="password" inputMode="numeric" required value={form.currentPassword} onChange={(event) => setForm({ ...form, currentPassword: event.target.value.replace(/\D/g, "").slice(0, 4) })} /></label><div className="partnerPasswordGrid"><label><span>New 4-digit password</span><input type="password" inputMode="numeric" pattern="\d{4}" minLength="4" maxLength="4" required value={form.newPassword} onChange={(event) => setForm({ ...form, newPassword: event.target.value.replace(/\D/g, "").slice(0, 4) })} /></label><label><span>Confirm new password</span><input type="password" inputMode="numeric" pattern="\d{4}" minLength="4" maxLength="4" required value={form.confirmPassword} onChange={(event) => setForm({ ...form, confirmPassword: event.target.value.replace(/\D/g, "").slice(0, 4) })} /></label></div>{form.confirmPassword && form.newPassword !== form.confirmPassword && <span className="errorText">Passwords do not match.</span>}<button className="primaryButton" disabled={form.newPassword.length !== 4 || form.newPassword !== form.confirmPassword}>Change Password</button></form>; }
function Profile({ partner, save }) { const [form, setForm] = useState({ address: partner.address, profileImage: partner.profileImage || "" }); return <form className="panel partnerProfileCard" onSubmit={(e) => { e.preventDefault(); save(form); }}><aside className="partnerProfilePreview">{form.profileImage ? <img src={form.profileImage} alt="Profile preview" /> : <div className="partnerProfileFallback">{partner.name?.[0]}</div>}<strong>{partner.name}</strong><span>{partner.registrationNumber}</span><label className="secondaryButton">Change photo<input hidden type="file" accept="image/*" onChange={async (e) => setForm({ ...form, profileImage: await fileData(e.target.files[0]) })} /></label></aside><div className="formGrid twoColumn"><label>Name (non-editable)<input disabled value={partner.name} /></label><label>Email (non-editable)<input disabled value={partner.email} /></label><label className="full">Address<input value={form.address.line} onChange={(e) => setForm({ ...form, address: { ...form.address, line: e.target.value } })} /></label><label>City<input value={form.address.city} onChange={(e) => setForm({ ...form, address: { ...form.address, city: e.target.value } })} /></label><label>State<input value={form.address.state} onChange={(e) => setForm({ ...form, address: { ...form.address, state: e.target.value } })} /></label><label>Postal code<input value={form.address.postalCode || ""} onChange={(e) => setForm({ ...form, address: { ...form.address, postalCode: e.target.value } })} /></label><button className="primaryButton">Save profile</button></div></form>; }
function Kyc({ partner, save, fileData }) {
  const [preview, setPreview] = useState(null); const [feedback, setFeedback] = useState({}); const [uploading, setUploading] = useState(""); const [selectedPreviews, setSelectedPreviews] = useState({});
  const docs = [["aadhar", "Aadhar Card", ["front", "back"]], ["pan", "PAN Card", ["file"]], ["cancelledCheque", "Cancelled Cheque", ["file"]]];
  return <><div className="cardGrid">{docs.map(([type, title, fields]) => { const doc = partner.kyc?.[type] || {}; const locked = ["pending", "approved"].includes(doc.status); return <form className="panel partnerKycCard" key={type} onSubmit={async (e) => { e.preventDefault(); const form = e.currentTarget; setUploading(type); setFeedback((current) => ({ ...current, [type]: "" })); try { const payload = {}; for (const field of fields) payload[field] = await fileData(form.elements[field].files[0]); await save(type, payload); setFeedback((current) => ({ ...current, [type]: `${title} uploaded successfully and submitted for verification.` })); setSelectedPreviews((current) => { const next = { ...current }; fields.forEach((field) => delete next[`${type}-${field}`]); return next; }); form.reset(); } catch (error) { setFeedback((current) => ({ ...current, [type]: error.message || `Unable to upload ${title}.` })); } finally { setUploading(""); } }}><h3>{title}</h3><span className={`status ${doc.status}`}>{(doc.status || "not_submitted").replaceAll("_", " ")}</span>{feedback[type] && <p className={feedback[type].includes("successfully") ? "accountNotice" : "errorText"} role="status">{feedback[type]}</p>}{doc.status === "pending" && <p className="mutedText">Uploaded successfully. This document is awaiting admin verification.</p>}{doc.status === "approved" && <p className="mutedText">Verified and approved by the administrator.</p>}{doc.rejectionReason && <p className="errorText">Rejected: {doc.rejectionReason}</p>}{doc.reviewHistory?.length > 0 && <div className="kycReviewHistory"><strong>Review history</strong>{[...doc.reviewHistory].reverse().map((entry, index) => <p key={`${entry.reviewedAt}-${index}`}><span className={`status ${entry.status}`}>{entry.status}</span> {entry.reason || "Document approved"}<small>{entry.reviewedAt ? new Date(entry.reviewedAt).toLocaleString("en-IN") : ""}</small></p>)}</div>}{fields.some((field) => doc[field]) && <div className="partnerKycPreviews">{fields.filter((field) => doc[field]).map((field) => { const url = doc[field]; const titleText = `${title} — ${field === "file" ? "Document" : field}`; const isPdf = String(url).startsWith("data:application/pdf") || /\.pdf(?:$|\?)/i.test(String(url)); return <button type="button" key={field} onClick={() => setPreview({ url, title: titleText })}>{!isPdf && <img src={url} alt={titleText} />}<span>{isPdf ? "PDF" : "View"} {field === "file" ? "document" : field}</span></button>; })}</div>}{!locked && <>{fields.map((field) => { const selected = selectedPreviews[`${type}-${field}`]; const isPdf = String(selected || "").startsWith("data:application/pdf"); return <label key={field}>{field === "file" ? "Document" : field}<input name={field} type="file" accept="image/*,.pdf" required disabled={uploading === type} onChange={async (event) => { const file = event.target.files?.[0]; const dataUrl = file ? await fileData(file) : ""; setSelectedPreviews((current) => ({ ...current, [`${type}-${field}`]: dataUrl })); }} />{selected && <button className="selectedKycPreview" type="button" onClick={() => setPreview({ url: selected, title: `${title} — selected ${field}` })}>{isPdf ? <span>PDF selected</span> : <img src={selected} alt={`Selected ${title} ${field} preview`} />}<small>Preview before upload</small></button>}</label>; })}<button className="primaryButton" disabled={uploading === type}>{uploading === type ? "Uploading…" : doc.status === "rejected" ? "Upload corrected document" : "Submit for verification"}</button></>}</form>; })}</div>{preview && <DocumentPreviewModal document={preview} onClose={() => setPreview(null)} />}</>;
}
function Bank({ partner, save }) {
  const existing = partner.bankDetails || {};
  const locked = ["accountHolderName", "accountNumber", "ifsc", "bankName"].every((field) => Boolean(existing[field]));
  const [form, setForm] = useState(existing);
  const [challengeId, setChallengeId] = useState("");
  const [otp, setOtp] = useState("");
  const [status, setStatus] = useState("");
  const [busy, setBusy] = useState(false);
  const lookup = async (value) => { const ifsc = value.toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 11); setForm((current) => ({ ...current, ifsc, bankName: "", branch: "" })); setStatus(""); if (ifsc.length !== 11) return; setBusy(true); try { const bank = await api.partnerLookupIfsc(ifsc); setForm((current) => ({ ...current, ifsc: bank.ifsc, bankName: bank.bankName, branch: bank.branch })); setStatus("Bank and branch found successfully."); } catch (error) { setStatus(error.message); } finally { setBusy(false); } };
  if (locked) return <section className="panel partnerBankLocked"><span className="status approved">Email verified</span><h2>Bank details</h2><p>Bank details can only be submitted once and are now locked.</p><dl className="partnerDetailsGrid"><dt>Account holder</dt><dd>{existing.accountHolderName}</dd><dt>Account number</dt><dd>{existing.accountNumber}</dd><dt>IFSC</dt><dd>{existing.ifsc}</dd><dt>Bank</dt><dd>{existing.bankName}</dd><dt>Branch</dt><dd>{existing.branch || "—"}</dd><dt>Verified</dt><dd>{existing.verifiedAt ? new Date(existing.verifiedAt).toLocaleString("en-IN") : "Verified"}</dd></dl></section>;
  return <form className="panel formGrid twoColumn" onSubmit={async (event) => { event.preventDefault(); setBusy(true); setStatus(""); try { if (!challengeId) { const result = await api.partnerBankOtp(form); setChallengeId(result.challengeId); setStatus(`${result.message}. Enter the OTP below to save these details permanently.`); } else { await save({ challengeId, otp }); } } catch (error) { setStatus(error.message); } finally { setBusy(false); } }}><div className="full"><span className="eyebrow">One-time bank setup</span><h2>Bank details</h2><p>After email verification these details are locked and cannot be changed by the partner.</p></div><label>Account holder name<input required disabled={Boolean(challengeId)} value={form.accountHolderName || ""} onChange={(event) => setForm({ ...form, accountHolderName: event.target.value })} /></label><label>Account number<input required disabled={Boolean(challengeId)} value={form.accountNumber || ""} onChange={(event) => setForm({ ...form, accountNumber: event.target.value.replace(/\D/g, "") })} /></label><label>IFSC<input required disabled={Boolean(challengeId)} minLength="11" maxLength="11" value={form.ifsc || ""} onChange={(event) => lookup(event.target.value)} placeholder="Example: HDFC0001234" /></label><label>Bank name<input readOnly required value={form.bankName || ""} placeholder={busy ? "Finding bank…" : "Filled from IFSC"} /></label><label className="full">Branch<input readOnly required value={form.branch || ""} placeholder="Filled from IFSC" /></label>{challengeId && <label className="full">6-digit OTP sent to {partner.email}<input autoFocus required inputMode="numeric" pattern="\d{6}" maxLength="6" value={otp} onChange={(event) => setOtp(event.target.value.replace(/\D/g, "").slice(0, 6))} /></label>}{status && <p className="accountNotice full" role="status">{status}</p>}<div className="registrationActions full"><button className="primaryButton" disabled={busy || !form.bankName || !form.branch || (challengeId && otp.length !== 6)}>{busy ? "Please wait…" : challengeId ? "Verify OTP & Save Bank Details" : "Send Email OTP"}</button>{challengeId && <button className="secondaryButton" type="button" onClick={() => { setChallengeId(""); setOtp(""); setStatus(""); }}>Edit bank details</button>}</div></form>;
}
const Ledger = ({ rows }) => <div className="panel tableWrap"><table><thead><tr><th>Date</th><th>Order</th><th>Type</th><th>Amount</th></tr></thead><tbody>{rows.map((r) => <tr key={r._id}><td>{new Date(r.date).toLocaleDateString("en-IN")}</td><td>{r.order?.orderNumber || "—"}</td><td>{r.payoutType.replace("_", " ")}</td><td>{money(r.amount)}</td></tr>)}</tbody></table></div>;
function Withdrawals({ rows, balance, minimumAmount = 0, onNew }) { return <section className="partnerWithdrawalPage"><div className="partnerWithdrawalHero"><div><h3>Withdraw your earnings</h3><p>Requests are paid to your saved bank account after review. Minimum withdrawal: <strong>{money(minimumAmount)}</strong>.</p></div><strong>{money(balance)}</strong><button className="primaryButton" type="button" disabled={balance < minimumAmount || balance <= 0} onClick={onNew}>New Withdrawal Request</button></div><div className="panel tableWrap"><h3>Withdrawal history</h3><table><thead><tr><th>Date</th><th>Amount</th><th>Status</th><th>Note</th></tr></thead><tbody>{rows.map((r) => <tr key={r._id}><td>{new Date(r.createdAt).toLocaleDateString("en-IN")}</td><td>{money(r.amount)}</td><td>{r.status}</td><td>{r.adminNote || "—"}</td></tr>)}{!rows.length && <tr><td colSpan="4">No withdrawal requests yet.</td></tr>}</tbody></table></div></section>; }
function WithdrawalRequest({ balance, minimumAmount = 0, email, onBack, onComplete }) { const [amount, setAmount] = useState(""); const [challengeId, setChallengeId] = useState(""); const [otp, setOtp] = useState(""); const [status, setStatus] = useState(""); const [busy, setBusy] = useState(false); const submit = async (event) => { event.preventDefault(); setBusy(true); setStatus(""); try { if (Number(amount) < minimumAmount) throw new Error(`Minimum withdrawal amount is ${money(minimumAmount)}`); if (!challengeId) { const result = await api.partnerWithdrawalOtp({ amount: Number(amount) }); setChallengeId(result.challengeId); setStatus(`${result.message}. Enter the code below to confirm.`); } else { await api.partnerWithdrawalOtp({ amount: Number(amount), challengeId, otp }); setStatus("OTP verified. Submitting withdrawal request…"); await api.partnerRequestWithdrawal({ amount: Number(amount), otpChallengeId: challengeId }); await onComplete(); } } catch (error) { setStatus(error.message); } finally { setBusy(false); } }; return <section className="partnerWithdrawalRequest"><button className="inlineButton" type="button" onClick={onBack}>← Back to withdrawals</button><form className="panel" onSubmit={submit}><span className="eyebrow">Email confirmation</span><h2>New Withdrawal Request</h2><p>Available balance: <strong>{money(balance)}</strong> · Minimum: <strong>{money(minimumAmount)}</strong></p><label><span>Withdrawal amount</span><input type="number" min={minimumAmount || 0.01} step="0.01" max={balance} required disabled={Boolean(challengeId)} value={amount} onChange={(event) => setAmount(event.target.value)} placeholder="Enter amount" /></label>{challengeId && <label><span>6-digit OTP sent to {email}</span><input autoFocus inputMode="numeric" autoComplete="one-time-code" pattern="\d{6}" maxLength="6" required value={otp} onChange={(event) => setOtp(event.target.value.replace(/\D/g, "").slice(0, 6))} placeholder="Enter email OTP" /></label>}{status && <p className="accountNotice" role="status">{status}</p>}<button className="primaryButton" disabled={busy || Number(amount) < minimumAmount || (challengeId && otp.length !== 6)}>{busy ? "Please wait…" : challengeId ? "Verify OTP & Submit Request" : "Send Email OTP"}</button>{challengeId && <button className="inlineButton" type="button" onClick={() => { setChallengeId(""); setOtp(""); setStatus(""); }}>Change amount</button>}</form></section>; }
