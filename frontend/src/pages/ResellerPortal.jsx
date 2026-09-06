import { useEffect, useState } from "react";
import { ArrowLeft, BarChart3, Bell, Building2, Check, ChevronRight, CircleHelp, Copy, CreditCard, Eye, EyeOff, FileText, Gift, Heart, RotateCcw, TrendingUp, Tag, Home, IndianRupee, Link2, LockKeyhole, LogOut, Mail, MailCheck, MapPin, Megaphone, Menu, PackageCheck, Plus, Search, Settings, Share2, ShieldCheck, ShoppingBag, ShoppingCart, Smartphone, Store, User, UserPlus, WalletCards, X } from "lucide-react";
import { api, customerAuthStore } from "../services/api.js";
import { DashboardOverview, ResellerOrders, ResellerInsights, ResellerSupport, ResellerExtras } from "../components/ResellerWorkspace.jsx";
import "../styles/reseller-dashboard.css";
import WhatsAppIcon from "../components/WhatsAppIcon.jsx";

const money = (value) => new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 2 }).format(value || 0);
const normalizeProductSearch = (value) => String(value || "").normalize("NFKD").replace(/[\u0300-\u036f]/g, "").toLocaleLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
const strongPasswordPattern = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z0-9]).{8,}$/;
const initialForm = { fullName: "", mobile: "", address: "", pan: "", gstStatus: "non-gst", gstin: "", paymentDetails: { method: "upi", upiId: "" }, kyc: { panDocument: "", addressDocument: "" }, termsAccepted: false, challengeId: "", otp: "" };
const resellerRoutes = { dashboard: "dashboard", products: "products", add: "margin", links: "links", orders: "orders", earnings: "earnings", payouts: "payouts", marketing: "marketing", reports: "reports", profile: "profile", support: "support", settings: "settings", returns: "returns", referrals: "referrals", performance: "performance", offers: "offers", wishlist: "wishlist", notifications: "notifications" };
const resellerLocationRoute = () => window.location.hash || `${window.location.pathname}${window.location.search}`;
const resellerViewFromHash = (hash = resellerLocationRoute()) => {
  const segment = String(hash).split("?")[0].replace(/^#?\/reseller\/?/, "").split("/")[0];
  return Object.entries(resellerRoutes).find(([, route]) => route === segment)?.[0] || "dashboard";
};

export default function ResellerPortal({ onBack }) {
  const [menuOpen, setMenuOpen] = useState(false);
  useEffect(() => {
    if (!menuOpen) return;
    const drawer = document.getElementById("reseller-navigation");
    drawer?.querySelector("button")?.focus();
    const close = (event) => {
      if (event.key === "Escape") { setMenuOpen(false); document.querySelector(".resellerMenuButton")?.focus(); }
      if (event.key === "Tab") {
        const buttons = drawer?.querySelectorAll("button, a[href], input, select, textarea");
        const first = buttons?.[0]; const last = buttons?.[buttons.length - 1];
        if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last?.focus(); }
        else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first?.focus(); }
      }
    };
    const resize = () => { if (window.innerWidth > 760) setMenuOpen(false); };
    document.addEventListener("keydown", close); window.addEventListener("resize", resize);
    const previous = document.body.style.overflow; document.body.style.overflow = "hidden";
    return () => { document.removeEventListener("keydown", close); window.removeEventListener("resize", resize); document.body.style.overflow = previous; };
  }, [menuOpen]);
  const [account, setAccount] = useState(null);
  const [dashboard, setDashboard] = useState(null);
  const [products, setProducts] = useState([]);
  const [links, setLinks] = useState([]);
  const [orders, setOrders] = useState([]);
  const [wallet, setWallet] = useState({ balance: 0, totalCredited: 0, transactions: [], bankDetails: null });
  const [withdrawals, setWithdrawals] = useState([]);
  const [margins, setMargins] = useState({});
  const [view, setViewState] = useState(() => resellerViewFromHash());
  const [addStep, setAddStep] = useState(1);
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [createdLink, setCreatedLink] = useState(null);
  const [accessMode, setAccessMode] = useState("login");
  const [accessForm, setAccessForm] = useState({ name: "", email: "", password: "", confirmPassword: "" });
  const [accessBusy, setAccessBusy] = useState(false);
  const [showAccessPassword, setShowAccessPassword] = useState(false);
  const [quickForm, setQuickForm] = useState({ fullName: "", mobile: "", email: "", password: "", confirmPassword: "", businessName: "", gstStatus: "gst", gstin: "", gstState: "", gstCertificate: "", taxVerificationToken: "", termsAccepted: false });
  const [quickGstVerification, setQuickGstVerification] = useState({ busy: false, status: "", message: "" });
  const [quickCertificate, setQuickCertificate] = useState({ busy: false, name: "", error: "" });
  const [portalRoute, setPortalRoute] = useState(() => resellerLocationRoute().split("?")[0]);
  const registrationRoute = ["#/reseller/register", "/reseller/register"].includes(portalRoute);
  useEffect(() => { const sync = () => { setMenuOpen(false); setPortalRoute(resellerLocationRoute().split("?")[0]); setViewState(resellerViewFromHash()); }; window.addEventListener("hashchange", sync); window.addEventListener("popstate", sync); return () => { window.removeEventListener("hashchange", sync); window.removeEventListener("popstate", sync); }; }, []);
  useEffect(() => { if (!customerAuthStore.token) setAccessMode(registrationRoute ? "signup" : "login"); }, [registrationRoute]);
  const [form, setForm] = useState(initialForm);
  const [status, setStatus] = useState("");
  const [loading, setLoading] = useState(true);
  const setView = (nextView) => {
    const next = resellerRoutes[nextView] ? nextView : "dashboard";
    setMenuOpen(false);
    setViewState(next);
    const nextHash = `#/reseller/${resellerRoutes[next]}`;
    if (window.location.hash !== nextHash) window.location.hash = nextHash;
  };
  const load = async () => {
    if (!customerAuthStore.token) { setLoading(false); return; }
    try {
      const me = await api.resellerMe(); setAccount(me);
      const [summary, catalog, shared, sales, walletData, withdrawalRows] = await Promise.all([api.resellerDashboard(), api.resellerProducts(), api.resellerLinks(), api.resellerOrders(), api.resellerWallet(), api.resellerWithdrawals()]);
      setDashboard(summary); setProducts(catalog); setLinks(shared); setOrders(sales); setWallet(walletData); setWithdrawals(withdrawalRows);
    } catch (error) { if (!/reseller account/i.test(error.message)) setStatus(error.message); }
    finally { setLoading(false); }
  };
  const logout = () => {
    setMenuOpen(false);
    customerAuthStore.clear();
    setAccount(null);
    setDashboard(null);
    setProducts([]);
    setLinks([]);
    setOrders([]);
    setStatus("");
    window.history.pushState(null, "", "/reseller/register");
    setPortalRoute("/reseller/register");
    setAccessMode("signup");
  };
  useEffect(() => { load(); }, []);
  useEffect(() => { if (account && ["#/reseller", "#/reseller/"].includes(window.location.hash)) setView("dashboard"); }, [account?._id]);
  const requestOtp = async () => { try { const result = await api.resellerRegistrationOtp(); setForm({ ...form, challengeId: result.challengeId }); setStatus(result.message); } catch (error) { setStatus(error.message); } };
  const register = async (event) => { event.preventDefault(); try { await api.resellerRegister(form); setStatus("Reseller dashboard activated."); await load(); } catch (error) { setStatus(error.message); } };
  const generate = async (product) => { try { const result = await api.createResellerLink({ productId: product._id, margin: Number(margins[product._id] || 0) }); setLinks((current) => [result, ...current.filter((item) => item._id !== result._id)]); setCreatedLink(result); setAddStep(3); setStatus("Selling link generated."); } catch (error) { setStatus(error.message); } };
  const copy = async (url) => { try { await navigator.clipboard.writeText(url); setStatus("Link copied."); } catch { setStatus("Unable to copy automatically. Select and copy the displayed link."); } };
  const submitAccess = async (event) => {
    event.preventDefault(); setStatus("");
    if (accessMode === "signup" && accessForm.password !== accessForm.confirmPassword) { setStatus("Passwords do not match."); return; }
    setAccessBusy(true);
    try {
      const result = accessMode === "signup"
        ? await api.customerRegister({ name: accessForm.name, email: accessForm.email, password: accessForm.password, confirmPassword: accessForm.confirmPassword })
        : await api.resellerLogin({ identifier: accessForm.email, password: accessForm.password });
      customerAuthStore.token = result.token; customerAuthStore.customer = result.customer;
      setLoading(true); await load();
    } catch (error) { setStatus(error.message); setLoading(false); }
    finally { setAccessBusy(false); }
  };
  const submitQuickRegistration = async (event) => {
    event.preventDefault(); setStatus("");
    if (!strongPasswordPattern.test(quickForm.password)) { setStatus("Use at least 8 characters with uppercase, lowercase, number, and special character."); return; }
    if (quickForm.password !== quickForm.confirmPassword) { setStatus("Password and confirm password do not match."); return; }
    setAccessBusy(true);
    try {
      const result = await api.resellerQuickRegister(quickForm);
      customerAuthStore.token = result.token; customerAuthStore.customer = result.customer;
      setAccount(result.reseller); window.location.hash = "#/reseller/dashboard"; setPortalRoute("#/reseller/dashboard");
      await load();
    } catch (error) { setStatus(error.message); }
    finally { setAccessBusy(false); }
  };
  const verifyQuickGstin = async () => {
    setQuickGstVerification({ busy: true, status: "", message: "Verifying with GST service…" });
    try {
      const result = await api.verifySellerTaxIdentifier({ kind: "gstin", value: quickForm.gstin });
      const details = result?.data || result?.result || result || {};
      const taxpayer = details?.taxpayerInfo || details?.taxpayer_info || details?.gstinDetails || details;
      const legalName = result?.legalName || taxpayer?.legalName || taxpayer?.legal_name || taxpayer?.legal_name_of_business || taxpayer?.lgnm || "";
      const tradeName = result?.tradeName || taxpayer?.tradeName || taxpayer?.trade_name || taxpayer?.tradeNam || taxpayer?.trade_name_of_business || "";
      const gstState = result?.state || result?.gstState || taxpayer?.state || taxpayer?.stateName || taxpayer?.state_name || taxpayer?.gstState || taxpayer?.pradr?.addr?.stcd || taxpayer?.address?.state || "";
      const businessName = tradeName || legalName;
      setQuickForm(current => ({ ...current, businessName: businessName || current.businessName, gstState, taxVerificationToken: result.verificationToken || "" }));
      setQuickGstVerification({ busy: false, status: businessName && gstState ? "success" : "warning", message: result.verificationMode === "manual" ? "GSTIN format verified. Business details will also be reviewed by the administrator." : businessName && gstState ? "GSTIN verified successfully." : "GSTIN verified, but business details were not returned by the service." });
    } catch (error) { setQuickGstVerification({ busy: false, status: "error", message: error.message }); }
  };
  if (loading) return <main className="resellerAccessPage"><span className="storefrontLoadingSpinner"/><p>Loading reseller workspace…</p></main>;
  if (!customerAuthStore.token && registrationRoute) return <main className="resellerQuickRegistration resellerRegistrationPage">
    <section className="resellerRegistrationHero">
      <button className="resellerBackButton" type="button" onClick={()=>{window.location.hash="#/reseller";setPortalRoute("#/reseller")}} aria-label="Back to reseller login"><ArrowLeft size={19}/></button>
      <strong className="resellerBrandText"><ShoppingBag/> <span>HRS<em>Basket</em><small>Resell More, Earn More</small></span></strong>
      <div className="resellerHeroCopy"><span className="resellerHeroIcon"><UserPlus/></span><div><h1><em>Reseller</em> Registration</h1><p>Join HRSBasket and start earning by sharing products with your network.</p></div></div>
      <div className="resellerHeroArt" aria-hidden="true"><span>₹</span><UserPlus/><i>↗</i></div>
    </section>
    <section className="resellerRegistrationCard resellerQuickCard">
      <div className="resellerFormHeading"><h2>Quick reseller registration</h2></div>
      {status && <p className="resellerNotice" role="alert">{status}</p>}
      <form className="resellerForm" onSubmit={submitQuickRegistration}>
        <label className="resellerField resellerFullField"><span>Full name <b>*</b></span><div><User/><input required placeholder="Enter your full name" value={quickForm.fullName} onChange={e=>setQuickForm({...quickForm,fullName:e.target.value})}/></div></label>
        <label className="resellerField resellerFullField"><span>Mobile number <b>*</b></span><div><Smartphone/><span className="resellerDialCode">+91</span><input required inputMode="numeric" pattern="[0-9]{10}" maxLength="10" placeholder="Enter mobile number" value={quickForm.mobile} onChange={e=>setQuickForm({...quickForm,mobile:e.target.value.replace(/\D/g,"").slice(0,10)})}/></div></label>
        <label className="resellerField resellerFullField"><span>Email address <b>*</b></span><div><Mail/><input required type="email" placeholder="Enter email address" value={quickForm.email} onChange={e=>setQuickForm({...quickForm,email:e.target.value})}/></div></label>
        <label className="resellerField resellerFullField"><span>Create password <b>*</b></span><div><LockKeyhole/><input required minLength="8" type={showAccessPassword?"text":"password"} placeholder="Create a strong password" value={quickForm.password} onChange={e=>setQuickForm({...quickForm,password:e.target.value})}/><button className="resellerQuickEye" type="button" onClick={()=>setShowAccessPassword(!showAccessPassword)} aria-label="Show or hide passwords">{showAccessPassword?<EyeOff/>:<Eye/>}</button></div><small className={quickForm.password && !strongPasswordPattern.test(quickForm.password)?"resellerPasswordHint invalid":"resellerPasswordHint"}>Minimum 8 characters with uppercase, lowercase, number and special character.</small></label>
        <label className="resellerField resellerFullField"><span>Confirm password <b>*</b></span><div><LockKeyhole/><input required minLength="8" type={showAccessPassword?"text":"password"} placeholder="Enter password again" value={quickForm.confirmPassword} onChange={e=>setQuickForm({...quickForm,confirmPassword:e.target.value})}/></div>{quickForm.confirmPassword && <small className={`resellerPasswordHint ${quickForm.password===quickForm.confirmPassword?"matches":"invalid"}`}>{quickForm.password===quickForm.confirmPassword?"Passwords match.":"Passwords do not match."}</small>}</label>
        <label className="resellerField resellerFullField"><span>Business / shop name <b>*</b></span><div><Store/><input required readOnly={quickForm.gstStatus==="gst" && Boolean(quickForm.taxVerificationToken)} placeholder="Enter business or shop name" value={quickForm.businessName} onChange={e=>setQuickForm({...quickForm,businessName:e.target.value})}/></div></label>
        <fieldset className="resellerGstField"><legend>GST status <b>*</b></legend><div className="resellerGstChoices"><label className={quickForm.gstStatus==="gst"?"selected":""}><input type="radio" checked={quickForm.gstStatus==="gst"} onChange={()=>setQuickForm({...quickForm,gstStatus:"gst"})}/><ShieldCheck/><span><strong>GST Registered</strong><small>I have GSTIN</small></span></label><label className={quickForm.gstStatus==="non-gst"?"selected":""}><input type="radio" checked={quickForm.gstStatus==="non-gst"} onChange={()=>setQuickForm({...quickForm,gstStatus:"non-gst"})}/><FileText/><span><strong>Non-GST</strong><small>I don’t have GSTIN</small></span></label></div></fieldset>
        {quickForm.gstStatus==="gst" && <section className="resellerQuickGst resellerFullField">
          <label className="resellerField"><span>GSTIN <b>*</b></span><div><Building2/><input required maxLength="15" placeholder="Enter 15-digit GSTIN" value={quickForm.gstin} onChange={e=>{setQuickForm({...quickForm,gstin:e.target.value.toUpperCase().replace(/[^A-Z0-9]/g,"").slice(0,15),taxVerificationToken:"",gstState:"",gstCertificate:""});setQuickGstVerification({busy:false,status:"",message:""})}}/><button className="resellerInlineVerify" type="button" disabled={quickGstVerification.busy || quickForm.gstin.length!==15} onClick={verifyQuickGstin}>{quickGstVerification.busy?"Verifying…":"Verify"}</button></div></label>
          <label className="resellerField"><span>Registered state</span><div><MapPin/><input readOnly placeholder="Filled after GST verification" value={quickForm.gstState}/></div></label>
          {quickGstVerification.message && <p className={`resellerGstMessage ${quickGstVerification.status}`} role="status">{quickGstVerification.message}</p>}
          <label className="resellerField resellerFullField"><span>GST certificate <b>*</b></span><div className="resellerFileInput"><FileText/><input required={!quickForm.gstCertificate} type="file" accept="image/*,.pdf" disabled={!quickForm.taxVerificationToken || quickCertificate.busy} onChange={async e=>{const file=e.target.files?.[0];if(!file)return;setQuickCertificate({busy:true,name:file.name,error:""});try{const uploaded=await api.uploadSellerRegistrationDocument(file);if(!uploaded?.url)throw new Error("The upload completed without a document URL.");setQuickForm(current=>({...current,gstCertificate:uploaded.url}));setQuickCertificate({busy:false,name:file.name,error:""})}catch(error){e.target.value="";setQuickCertificate({busy:false,name:"",error:error.message})}}}/></div>{quickCertificate.busy && <small>Uploading {quickCertificate.name}…</small>}{quickCertificate.error && <small className="errorText">{quickCertificate.error}</small>}{quickForm.gstCertificate && <small className="resellerUploadSuccess"><Check/> Certificate uploaded: {quickCertificate.name}</small>}</label>
        </section>}
        <label className="resellerTerms resellerFullField"><input required type="checkbox" checked={quickForm.termsAccepted} onChange={e=>setQuickForm({...quickForm,termsAccepted:e.target.checked})}/><span>I accept the <a href="#/terms">Terms &amp; Conditions</a> and <a href="#/privacy">Privacy Policy</a> <b>*</b></span></label>
        <aside className="resellerInfoNote resellerFullField"><strong>★ More information</strong> (additional address, bank details, PAN, etc.) will be required in your profile after registration to activate your account.</aside>
        <button className="resellerSubmit resellerFullField" disabled={accessBusy || quickCertificate.busy || (quickForm.gstStatus==="gst" && (!quickForm.taxVerificationToken || !quickForm.gstCertificate))}><UserPlus/>{accessBusy?"Registering…":"Register as Reseller"}</button>
        <p className="resellerLoginPrompt resellerFullField">Already have an account? <button type="button" onClick={()=>{window.location.hash="#/reseller";setPortalRoute("#/reseller")}}>Login Here</button></p>
      </form>
    </section>
  </main>;
  if (!customerAuthStore.token) return <main className="resellerAccessPage">
    <section className="resellerAccessBrand">
      <button type="button" onClick={onBack}><ArrowLeft/> Back to store</button>
      <strong className="resellerBrandText resellerAccessBrandText"><ShoppingBag/><span>HRS<em>Basket</em><small>Resell More, Earn More</small></span></strong>
      <div><span><IndianRupee/></span><i><Share2/></i><b><ShoppingBag/></b></div>
      <h1>Start earning with<br/>HRSBasket</h1>
      <p>Share products you love, set your margin and grow your reseller business—all from one place.</p>
    </section>
    <section className="resellerAccessCard resellerLoginCard">
      <span className="resellerAccessIcon">{accessMode === "login" ? <ShieldCheck/> : <UserPlus/>}</span>
      <small>HRSBASKET RESELLER</small>
      <h2>{accessMode === "login" ? "Hi, Welcome Back" : "Create Your Account"}</h2>
      <p>{accessMode === "login" ? "Sign in with the account connected to your reseller workspace." : "Start with your secure HRSBasket account, then complete the reseller registration form."}</p>
      {status && <p className="resellerAccessError" role="alert">{status}</p>}
      <form className="resellerAccessForm" onSubmit={submitAccess}>
        {accessMode === "signup" && <label><span>Full name</span><div><User/><input required autoComplete="name" placeholder="Enter your full name" value={accessForm.name} onChange={e=>setAccessForm({...accessForm,name:e.target.value})}/></div></label>}
        <label><span>{accessMode === "login" ? "Email address or HRRCode" : "Email address"}</span><div><Mail/><input required type={accessMode === "login" ? "text" : "email"} autoComplete="username" placeholder={accessMode === "login" ? "Enter email or HRRCode" : "Enter your email"} value={accessForm.email} onChange={e=>setAccessForm({...accessForm,email:e.target.value})}/></div></label>
        <label><span>Password</span><div><LockKeyhole/><input required minLength="6" type={showAccessPassword?"text":"password"} autoComplete={accessMode==="login"?"current-password":"new-password"} placeholder="Enter your password" value={accessForm.password} onChange={e=>setAccessForm({...accessForm,password:e.target.value})}/><button type="button" onClick={()=>setShowAccessPassword(!showAccessPassword)} aria-label="Show or hide password">{showAccessPassword?<EyeOff/>:<Eye/>}</button></div></label>
        {accessMode === "signup" && <label><span>Confirm password</span><div><LockKeyhole/><input required minLength="6" type={showAccessPassword?"text":"password"} autoComplete="new-password" placeholder="Confirm your password" value={accessForm.confirmPassword} onChange={e=>setAccessForm({...accessForm,confirmPassword:e.target.value})}/></div></label>}
        <button className="resellerAccessSubmit" disabled={accessBusy}>{accessBusy?"Please wait…":accessMode==="login"?"Sign In to Reseller":"Create Account & Continue"}<ChevronRight/></button>
      </form>
      <p className="resellerAccessSwitch">{accessMode === "login" ? "Don’t have a reseller account?" : "Already have an account?"} <button type="button" onClick={()=>{const next=accessMode==="login"?"#/reseller/register":"#/reseller";window.location.hash=next;setPortalRoute(next);setStatus("")}}>{accessMode === "login" ? "Join Now" : "Login Here"}</button></p>
      <small className="resellerAccessHint">Secure access powered by your HRSBasket customer account.</small>
    </section>
  </main>;
  if (!account) return <main className="resellerRegistrationPage">
    <section className="resellerRegistrationHero">
      <button className="resellerBackButton" type="button" onClick={onBack} aria-label="Back to store"><ArrowLeft size={19}/></button>
      <strong className="resellerBrandText"><ShoppingBag/><span>HRS<em>Basket</em><small>Resell More, Earn More</small></span></strong>
      <div className="resellerHeroCopy"><span className="resellerHeroIcon"><UserPlus/></span><div><h1><em>Reseller</em> Registration</h1><p>Join HRSBasket and start earning by sharing products with your network.</p></div></div>
      <div className="resellerHeroArt" aria-hidden="true"><span>₹</span><UserPlus/><i>↗</i></div>
    </section>
    <section className="resellerRegistrationCard">
      <div className="resellerFormHeading"><span>Quick onboarding</span><h2>Reseller registration</h2><p>Complete your details below to activate your reseller workspace.</p></div>
      {status && <p className="resellerNotice" role="status">{status}</p>}
      <form className="resellerForm" onSubmit={register}>
        <label className="resellerField"><span>Full name <b>*</b></span><div><UserPlus/><input required placeholder="Enter your full name" value={form.fullName} onChange={(e) => setForm({ ...form, fullName: e.target.value })}/></div></label>
        <label className="resellerField"><span>Mobile number <b>*</b></span><div><Smartphone/><span className="resellerDialCode">+91</span><input required inputMode="tel" placeholder="Enter mobile number" value={form.mobile} onChange={(e) => setForm({ ...form, mobile: e.target.value })}/></div></label>
        <label className="resellerField resellerFullField"><span>Address <b>*</b></span><div><MapPin/><textarea required rows="2" placeholder="Enter your complete address" value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })}/></div></label>
        <label className="resellerField"><span>PAN number <b>*</b></span><div><CreditCard/><input required placeholder="Enter PAN number" value={form.pan} onChange={(e) => setForm({ ...form, pan: e.target.value.toUpperCase() })}/></div></label>
        <fieldset className="resellerGstField"><legend>GST status <b>*</b></legend><div className="resellerGstChoices">
          <label className={form.gstStatus === "gst" ? "selected" : ""}><input type="radio" name="gstStatus" value="gst" checked={form.gstStatus === "gst"} onChange={(e) => setForm({ ...form, gstStatus: e.target.value })}/><ShieldCheck/><span><strong>GST Registered</strong><small>I have a GSTIN</small></span></label>
          <label className={form.gstStatus === "non-gst" ? "selected" : ""}><input type="radio" name="gstStatus" value="non-gst" checked={form.gstStatus === "non-gst"} onChange={(e) => setForm({ ...form, gstStatus: e.target.value, gstin: "" })}/><FileText/><span><strong>Non-GST</strong><small>I don’t have GSTIN</small></span></label>
        </div></fieldset>
        {form.gstStatus === "gst" && <label className="resellerField resellerFullField"><span>GSTIN <b>*</b></span><div><Building2/><input required placeholder="Enter your GSTIN" value={form.gstin} onChange={(e) => setForm({ ...form, gstin: e.target.value.toUpperCase() })}/></div></label>}
        <label className="resellerField"><span>Payment method <b>*</b></span><div><WalletCards/><select value={form.paymentDetails.method} onChange={(e) => setForm({ ...form, paymentDetails: { method: e.target.value } })}><option value="upi">UPI</option><option value="bank">Bank account</option></select></div></label>
        {form.paymentDetails.method === "upi" ? <label className="resellerField"><span>UPI ID <b>*</b></span><div><IndianRupee/><input required placeholder="name@bank" value={form.paymentDetails.upiId || ""} onChange={(e) => setForm({ ...form, paymentDetails: { ...form.paymentDetails, upiId: e.target.value } })}/></div></label> : <>
          <label className="resellerField"><span>Account holder <b>*</b></span><div><UserPlus/><input required placeholder="Account holder name" value={form.paymentDetails.accountHolder || ""} onChange={(e) => setForm({ ...form, paymentDetails: { ...form.paymentDetails, accountHolder: e.target.value } })}/></div></label>
          <label className="resellerField"><span>Account number <b>*</b></span><div><CreditCard/><input required placeholder="Enter account number" value={form.paymentDetails.accountNumber || ""} onChange={(e) => setForm({ ...form, paymentDetails: { ...form.paymentDetails, accountNumber: e.target.value } })}/></div></label>
          <label className="resellerField resellerFullField"><span>IFSC code <b>*</b></span><div><Store/><input required placeholder="Enter IFSC code" value={form.paymentDetails.ifsc || ""} onChange={(e) => setForm({ ...form, paymentDetails: { ...form.paymentDetails, ifsc: e.target.value.toUpperCase() } })}/></div></label>
        </>}
        <label className="resellerField"><span>PAN document URL <b>*</b></span><div><FileText/><input required placeholder="Paste PAN document URL" value={form.kyc.panDocument || ""} onChange={(e) => setForm({ ...form, kyc: { ...form.kyc, panDocument: e.target.value } })}/></div></label>
        <label className="resellerField"><span>Address proof URL <b>*</b></span><div><FileText/><input required placeholder="Paste address proof URL" value={form.kyc.addressDocument || ""} onChange={(e) => setForm({ ...form, kyc: { ...form.kyc, addressDocument: e.target.value } })}/></div></label>
        {!form.challengeId ? <button className="resellerOtpButton resellerFullField" type="button" onClick={requestOtp}><MailCheck/> Verify email with OTP</button> : <label className="resellerField resellerFullField"><span>Email OTP <b>*</b></span><div><MailCheck/><input required inputMode="numeric" placeholder="Enter the OTP sent to your email" value={form.otp} onChange={(e) => setForm({ ...form, otp: e.target.value })}/></div></label>}
        <label className="resellerTerms resellerFullField"><input type="checkbox" checked={form.termsAccepted} onChange={(e) => setForm({ ...form, termsAccepted: e.target.checked })}/><span>I accept the <a href="#/terms">Terms &amp; Conditions</a> and <a href="#/privacy">Privacy Policy</a> <b>*</b></span></label>
        <aside className="resellerInfoNote resellerFullField"><strong>★ More information</strong> (bank verification and supporting KYC details) may be required in your profile after registration to activate your account.</aside>
        <button className="resellerSubmit resellerFullField" type="submit" disabled={!form.challengeId}><UserPlus/> Register as Reseller</button>
        <p className="resellerLoginPrompt resellerFullField">Already have a reseller account? <button type="button" onClick={()=>{customerAuthStore.clear();setAccount(null);window.location.hash="#/reseller";setPortalRoute("#/reseller")}}>Login here</button></p>
      </form>
    </section>
  </main>;
  const navItems = [
    ["dashboard", "Dashboard", Home], ["products", "My Products", ShoppingBag], ["links", "Share & Earn", Share2],
    ["orders", "My Orders", ShoppingCart], ["returns", "Returns / RTO", RotateCcw], ["earnings", "My Earnings", PackageCheck],
    ["payouts", "Wallet / Withdraw", WalletCards], ["referrals", "Referral & Rewards", Gift], ["performance", "My Performance", TrendingUp],
    ["offers", "Offers & Promotions", Tag], ["wishlist", "Wishlist", Heart], ["reports", "Reports", BarChart3],
    ["notifications", "Notifications", Bell], ["support", "Help & Support", CircleHelp], ["profile", "My Profile", User], ["settings", "Settings", Settings],
    ["add", "Set Margin", IndianRupee], ["marketing", "Marketing Tools", Megaphone]
  ];
  const catalogLinks = links.filter((link, index, all) => all.findIndex((item) => String(item.product?._id || item.product) === String(link.product?._id || link.product)) === index);
  const chosenMargin = Number(selectedProduct ? margins[selectedProduct._id] || 0 : 0);
  const chosenBase = Number(selectedProduct?.resellerPricing?.basePrice || 0);
  const sellingUrl = createdLink ? createdLink.url || `${window.location.origin}/#/resell/${createdLink.code}` : "";
  const openAddFlow = () => { setSelectedProduct(null); setCreatedLink(null); setAddStep(1); setView("add"); setStatus(""); };
  const selectMarginProduct = (product) => { setSelectedProduct(product); setMargins((current) => ({ ...current, [product._id]: current[product._id] || Math.min(100, Number(product.resellerPricing?.maximumMargin || 0)) })); setAddStep(2); };
  const title = view === "dashboard" ? "Reseller Dashboard" : view === "add" ? (addStep === 1 ? "Select a Product" : addStep === 2 ? "Set Your Margin" : "Preview & Share") : navItems.find(([key]) => key === view)?.[1] || "Reseller Dashboard";

  return <main className="resellerWorkspace">
    {menuOpen && <button className="resellerMenuBackdrop" aria-label="Close navigation" onClick={()=>setMenuOpen(false)}/>}
    <aside id="reseller-navigation" className={`resellerSidebar ${menuOpen ? "isOpen" : ""}`}><button className="resellerDrawerClose" aria-label="Close navigation" onClick={()=>{setMenuOpen(false);document.querySelector(".resellerMenuButton")?.focus()}}><X/></button>
      <strong className="resellerSidebarBrand"><ShoppingBag/><span>HRS<em>Basket</em><small>Reseller Portal</small></span></strong>
      <nav aria-label="Reseller menu">{navItems.map(([key,label,Icon])=><button key={key} aria-current={view === key ? "page" : undefined} className={view === key ? "active" : ""} onClick={()=>key === "add" ? openAddFlow() : setView(key)}><Icon/><span>{label}</span>{key === "orders" && orders.length > 0 && <b>{orders.length}</b>}</button>)}</nav>
      <div className="resellerUpgrade"><Gift/><strong>Refer &amp; Earn</strong><p>Invite your friends. Grow together.</p><button onClick={()=>setView("referrals")}>Invite Now</button></div>
      <button className="resellerStorefrontLink" onClick={onBack}><LogOut/> Storefront</button>
      <button className="resellerStorefrontLink resellerLogoutLink" onClick={logout}><LogOut/> Logout</button>
    </aside>
    <section className="resellerWorkspaceBody" inert={menuOpen ? true : undefined}>
      <header className="resellerTopbar"><button className="resellerMenuButton" aria-label="Open navigation" aria-expanded={menuOpen} aria-controls="reseller-navigation" onClick={()=>setMenuOpen(!menuOpen)}><Menu/></button><h1>{view === "dashboard" ? `Welcome back, ${account.fullName?.split(" ")[0] || "Reseller"}! 👋` : title}</h1><div className="resellerTopbarAccount"><button className="resellerHeaderIcon" aria-label="Notifications" onClick={()=>setView("notifications")}><Bell/></button><button className="resellerHeaderIcon" aria-label="Help and support" onClick={()=>setView("support")}><CircleHelp/></button><span>{String(account.fullName || "R").charAt(0)}</span><div><strong>{account.fullName}</strong><small>{account.resellerId}</small></div></div><button className="resellerTopbarLogout" type="button" onClick={logout} title="Logout" aria-label="Logout"><LogOut/></button></header>
      <div className="resellerWorkspaceContent">
        {status && <p className="resellerWorkspaceNotice" role="status">{status}</p>}

        {view === "dashboard" && <DashboardOverview account={account} dashboard={dashboard} orders={orders} wallet={wallet} withdrawals={withdrawals} products={products} links={links} navigate={setView}/>}
        {view === "products" && <><div className="resellerPageLead"><div><h2>My Products</h2><p>Products you have added to your reseller catalog.</p></div><button onClick={openAddFlow}><Plus/> Add Product</button></div><section className="resellerCatalogGrid">{catalogLinks.map(link=>{const product=products.find(p=>String(p._id)===String(link.product?._id||link.product))||link.product;return <article key={link._id}>{product?.mainImage&&<img src={product.mainImage} alt=""/>}<div><small>IN YOUR CATALOG</small><h3>{product?.name}</h3><p>Base price {money(product?.resellerPricing?.basePrice)}</p><dl><div><dt>Your margin</dt><dd>{money(link.margin)}</dd></div><div><dt>Customer price</dt><dd>{money(link.customerPrice)}</dd></div></dl><footer><button onClick={()=>{setSelectedProduct(product);setMargins({...margins,[product._id]:link.margin});setAddStep(2);setView("add")}}>Edit Margin</button><button onClick={()=>{setCreatedLink(link);setSelectedProduct(product);setAddStep(3);setView("add")}}><Share2/> Share</button></footer></div></article>})}{!catalogLinks.length&&<div className="resellerCatalogEmpty"><ShoppingBag/><h3>Your catalog is empty</h3><p>Select an HRSBasket product, set your margin, and create its share link.</p><button onClick={openAddFlow}>Add your first product</button></div>}</section></>}

        {view === "add" && <>
          <div className="resellerPageLead"><div><p className="resellerBreadcrumb">Dashboard <ChevronRight/> My Products <ChevronRight/> <b>{title}</b></p><h2>{title}</h2><p>{addStep===1?"Choose an eligible HRSBasket product to add to your catalog.":addStep===2?"Add your margin and create your selling link.":"Your product is ready to share with customers."}</p></div></div>
          <ol className="resellerSteps">{[[1,"Select Product"],[2,"Define Margin"],[3,"Preview & Share"]].map(([step,label])=><li key={step} className={addStep===step?"active":addStep>step?"complete":""}><i>{addStep>step?<Check/>:step}</i><span>{label}</span></li>)}</ol>
          {addStep===1&&<ResellerProductSearchPage products={products} onSelect={selectMarginProduct} />}
          {addStep===2&&selectedProduct&&<section className="resellerMarginLayout"><div><article className="resellerSelectedProduct resellerPanel"><h3>Selected Product</h3><div>{selectedProduct.mainImage&&<img src={selectedProduct.mainImage} alt=""/>}<span><h3>{selectedProduct.name}</h3><p>{selectedProduct.shortDescription}</p><small>In Stock · Available to resell</small></span><aside><small>Base Price</small><strong>{money(chosenBase)}</strong><p>Price before your margin</p></aside></div></article><article className="resellerMarginEditor resellerPanel"><h3>Set Your Margin</h3><label>Your Margin (₹)<div><button onClick={()=>setMargins({...margins,[selectedProduct._id]:Math.max(0,chosenMargin-10)})}>−</button><input type="number" min="0" max={selectedProduct.resellerPricing.maximumMargin} value={margins[selectedProduct._id]||0} onChange={e=>setMargins({...margins,[selectedProduct._id]:Math.min(Number(selectedProduct.resellerPricing.maximumMargin),Math.max(0,Number(e.target.value)))})}/><button onClick={()=>setMargins({...margins,[selectedProduct._id]:Math.min(Number(selectedProduct.resellerPricing.maximumMargin),chosenMargin+10)})}>+</button></div></label><input className="resellerMarginRange" type="range" min="0" max={selectedProduct.resellerPricing.maximumMargin} value={chosenMargin} onChange={e=>setMargins({...margins,[selectedProduct._id]:Number(e.target.value)})}/><div className="resellerMarginLabels"><span>Min: ₹0</span><span>Recommended: competitive</span><span>Max: {money(selectedProduct.resellerPricing.maximumMargin)}</span></div><div className="resellerMarginSummary"><span>You earn per sale<strong>{money(chosenMargin)}</strong></span><span>Maximum margin<strong>{money(selectedProduct.resellerPricing.maximumMargin)}</strong></span><span>Customer price<strong>{money(chosenBase+chosenMargin)}</strong></span></div><p className="resellerMarginTip">Higher margins increase the customer price. Keep your price competitive to improve sales.</p></article><div className="resellerFlowActions"><button onClick={()=>setAddStep(1)}><ArrowLeft/> Back</button><button className="resellerPrimary" disabled={chosenMargin<0} onClick={()=>generate(selectedProduct)}><Link2/> Create &amp; Preview Link</button></div></div><aside className="resellerPricePreview resellerPanel"><h3>Price Preview</h3><dl><div><dt>Base Price</dt><dd>{money(chosenBase)}</dd></div><div><dt>Your Margin</dt><dd className="positive">+ {money(chosenMargin)}</dd></div><div><dt>Customer Price</dt><dd>{money(chosenBase+chosenMargin)}</dd></div></dl><p><Check/> You will earn <strong>{money(chosenMargin)}</strong> on each sale</p></aside></section>}
          {addStep===3&&selectedProduct&&createdLink&&<section className="resellerSharePreview"><article className="resellerShareProduct resellerPanel"><span className="resellerSuccessIcon"><Check/></span><h2>Your selling link is ready!</h2><p>Preview the customer price and share this product with your network.</p>{selectedProduct.mainImage&&<img src={selectedProduct.mainImage} alt=""/>}<h3>{selectedProduct.name}</h3><dl><div><dt>HRSBasket price</dt><dd>{money(chosenBase)}</dd></div><div><dt>Your margin</dt><dd>{money(createdLink.margin)}</dd></div><div><dt>Customer price</dt><dd>{money(createdLink.customerPrice)}</dd></div></dl><div className="resellerGeneratedLink"><input readOnly value={sellingUrl}/><button onClick={()=>copy(sellingUrl)}><Copy/> Copy</button></div><div className="resellerShareButtons"><a href={`https://wa.me/?text=${encodeURIComponent(`${selectedProduct.name} — ${money(createdLink.customerPrice)}\n${sellingUrl}`)}`} target="_blank" rel="noreferrer"><WhatsAppIcon/> WhatsApp</a><button onClick={async()=>{try{if(navigator.share)await navigator.share({title:selectedProduct.name,url:sellingUrl});else await copy(sellingUrl)}catch(error){if(error.name!=="AbortError")setStatus(error.message)}}}><Share2/> Share</button></div><button className="resellerDoneButton" onClick={()=>setView("products")}>Done — View My Products</button></article></section>}
        </>}

        {view === "links"&&<><div className="resellerPageLead"><div><h2>Share &amp; Earn</h2><p>Copy and share your active product selling links.</p></div><button onClick={openAddFlow}><Plus/> Create Link</button></div><section className="resellerLinkList">{links.map(link=>{const url=link.url||`${window.location.origin}/#/resell/${link.code}`;return <article className="resellerPanel" key={link._id}><Link2/><span><strong>{link.product?.name}</strong><small>{url}</small></span><b>{money(link.customerPrice)}</b><button onClick={()=>copy(url)}><Copy/> Copy</button><a href={`https://wa.me/?text=${encodeURIComponent(url)}`} target="_blank" rel="noreferrer" aria-label="Share on WhatsApp"><WhatsAppIcon/></a></article>})}{!links.length && <p className="rsEmpty">No sharing links yet. Create a link to start earning.</p>}</section></>}
        {["orders", "returns"].includes(view) && <ResellerOrders key={view} orders={orders} returnsOnly={view === "returns"} onSupport={()=>setView("support")}/>}
        {["performance", "reports"].includes(view) && <ResellerInsights orders={orders} links={links} reports={view === "reports"}/>}
        {view === "support" && <ResellerSupport/>}
        {["referrals", "offers", "wishlist", "notifications", "settings", "marketing"].includes(view) && <ResellerExtras key={`${account._id}-${view}`} view={view} account={account} products={products} orders={orders} withdrawals={withdrawals} links={links} navigate={setView} onSelect={product=>{selectMarginProduct(product);setView("add")}} copy={copy}/>}
        {view === "earnings" && <ResellerWalletPage wallet={wallet} />}
        {view === "payouts" && <ResellerPayoutPage wallet={wallet} withdrawals={withdrawals} onChanged={load} setStatus={setStatus} onProfile={() => setView("profile")} />}
        {view === "profile" && <ResellerBankProfile account={account} onSaved={(updated) => { setAccount(updated); load(); }} setStatus={setStatus} />}

      </div>
    </section>
  </main>;
}

function BankSummary({ bank }) {
  if (!bank?.accountNumber) return <p>No bank account has been saved.</p>;
  const masked = `•••• ${String(bank.accountNumber).slice(-4)}`;
  return <div className="resellerBankSummary"><Building2/><span><strong>{bank.bankName}</strong><small>{bank.branch}</small><small>{bank.accountHolder} · {masked}</small><small>IFSC: {bank.ifsc}</small></span></div>;
}

function ResellerWalletPage({ wallet }) {
  return <section className="resellerWalletPage"><div className="resellerPageLead"><div><h2>My Earnings &amp; Wallet</h2><p>Margins are credited once the order return window closes.</p></div></div><div className="resellerWalletBalance resellerPanel"><WalletCards/><span><small>Available balance</small><strong>{money(wallet.balance)}</strong><em>Lifetime credited: {money(wallet.totalCredited)}</em></span></div><section className="resellerOrderTable resellerPanel"><h3>Wallet transactions</h3><table><thead><tr><th>Date</th><th>Description</th><th>Type</th><th>Amount</th><th>Balance</th></tr></thead><tbody>{wallet.transactions?.map((item)=><tr key={item._id}><td>{new Date(item.createdAt).toLocaleDateString("en-IN")}</td><td>{item.description}{item.order?.orderNumber ? ` · ${item.order.orderNumber}` : ""}</td><td>{item.type.replaceAll("_", " ")}</td><td>{item.type === "withdrawal_debit" ? "−" : "+"}{money(item.amount)}</td><td>{money(item.balanceAfter)}</td></tr>)}{!wallet.transactions?.length&&<tr><td colSpan="5">No wallet transactions yet.</td></tr>}</tbody></table></section></section>;
}

function ResellerPayoutPage({ wallet, withdrawals, onChanged, setStatus, onProfile }) {
  const [amount,setAmount]=useState(""); const [busy,setBusy]=useState(false);
  const submit=async(event)=>{event.preventDefault();setBusy(true);try{await api.requestResellerWithdrawal(Number(amount));setAmount("");setStatus("Withdrawal request sent to the administrator.");await onChanged();}catch(error){setStatus(error.message);}finally{setBusy(false);}};
  return <section><div className="resellerPageLead"><div><h2>Wallet Withdrawals</h2><p>Request a transfer from your available wallet balance.</p></div></div><div className="resellerPayoutGrid"><form className="resellerPanel resellerWithdrawalForm" onSubmit={submit}><h3>Request withdrawal</h3><strong className="resellerAvailableAmount">{money(wallet.balance)} available</strong><label>Amount<input required type="number" min="1" max={wallet.balance} step="0.01" value={amount} onChange={(event)=>setAmount(event.target.value)}/></label><h4>Transfer will be sent to</h4><BankSummary bank={wallet.bankDetails}/>{!wallet.bankDetails?.accountNumber&&<button type="button" onClick={onProfile}>Add bank details</button>}<button className="resellerPrimary" disabled={busy||!wallet.bankDetails?.accountNumber||Number(amount)<=0}>{busy?"Submitting…":"Send withdrawal request"}</button></form><section className="resellerPanel resellerOrderTable"><h3>Withdrawal history</h3><table><thead><tr><th>Date</th><th>Amount</th><th>Bank</th><th>Status</th><th>Transaction details</th></tr></thead><tbody>{withdrawals.map(item=><tr key={item._id}><td>{new Date(item.createdAt).toLocaleDateString("en-IN")}</td><td>{money(item.amount)}</td><td>{item.bankSnapshot?.bankName}<br/><small>•••• {item.bankSnapshot?.accountNumber?.slice(-4)}</small></td><td>{item.status}</td><td>{item.paymentReference||item.note||"—"}</td></tr>)}{!withdrawals.length&&<tr><td colSpan="5">No withdrawal requests yet.</td></tr>}</tbody></table></section></div></section>;
}

function ResellerBankProfile({ account, onSaved, setStatus }) {
  const saved=account.paymentDetails||{}; const [form,setForm]=useState({accountHolder:saved.accountHolder||"",accountNumber:saved.accountNumber||"",ifsc:saved.ifsc||"",bankName:saved.bankName||"",branch:saved.branch||""}); const [busy,setBusy]=useState(false);
  const changeIfsc=async(value)=>{const ifsc=value.toUpperCase().replace(/\s/g,"").slice(0,11);setForm(current=>({...current,ifsc,bankName:"",branch:""}));if(ifsc.length!==11)return;setBusy(true);try{const bank=await api.resellerLookupIfsc(ifsc);setForm(current=>({...current,...bank}));}catch(error){setStatus(error.message);}finally{setBusy(false);}};
  const save=async(event)=>{event.preventDefault();setBusy(true);try{const updated=await api.updateResellerBank(form);onSaved(updated);setStatus("Bank details verified and saved.");}catch(error){setStatus(error.message);}finally{setBusy(false);}};
  return <section><div className="resellerPageLead"><div><h2>Profile &amp; Bank Details</h2><p>This verified account will be used for wallet withdrawals.</p></div></div><form className="resellerPanel resellerBankForm" onSubmit={save}><label>Account holder name<input required value={form.accountHolder} onChange={(e)=>setForm({...form,accountHolder:e.target.value})}/></label><label>Account number<input required inputMode="numeric" pattern="[0-9]{6,20}" value={form.accountNumber} onChange={(e)=>setForm({...form,accountNumber:e.target.value.replace(/\D/g,"")})}/></label><label>IFSC<input required maxLength="11" value={form.ifsc} onChange={(e)=>changeIfsc(e.target.value)}/><small>{busy?"Finding bank and branch…":"Bank details are fetched automatically."}</small></label><label>Bank name<input readOnly required value={form.bankName}/></label><label>Branch<input readOnly required value={form.branch}/></label><button className="resellerPrimary" disabled={busy||!form.bankName||!form.branch}>{busy?"Please wait…":"Save bank details"}</button></form></section>;
}

function ResellerProductSearchPage({ products = [], onSelect }) {
  const [query, setQuery] = useState("");
  const searchTerms = normalizeProductSearch(query).split(" ").filter(Boolean);
  const matches = (Array.isArray(products) ? products : []).filter((product) => {
    if (!searchTerms.length) return true;
    const category = product?.category && typeof product.category === "object" ? product.category.name : product?.category;
    const tags = Array.isArray(product?.tags) ? product.tags : [];
    const searchable = normalizeProductSearch([product?.name, product?.sku, product?.shortDescription, product?.manufacturerBrand, product?.seller?.companyName, product?.seller?.sellerNumber, category, ...tags].join(" "));
    return searchTerms.every((term) => searchable.includes(term));
  });
  return <section className="resellerRoutePage resellerSelectPanel" data-route="margin/products">
    <div className="resellerProductSearch"><Search/><input type="text" autoComplete="off" placeholder="Search by product, SKU, category or tag" value={query} onChange={(event) => setQuery(event.currentTarget.value)} />{query && <button type="button" onClick={() => setQuery("")} aria-label="Clear product search"><X/></button>}</div>
    <div className="resellerSelectGrid">{matches.map((product) => <article key={product._id}>{product.mainImage && <img src={product.mainImage} alt={product.name || "Product"}/>}<div><small>{product.seller ? "APPROVED SELLER PRODUCT" : "HRSBASKET PRODUCT"}</small><h3>{product.name || "Unnamed product"}</h3>{product.sku && <small className="resellerProductSku">SKU: {product.sku}</small>}<dl className="resellerProductFacts">{product.manufacturerBrand && <div><dt>Brand</dt><dd>{product.manufacturerBrand}</dd></div>}<div><dt>Category</dt><dd>{product.category?.name || "—"}</dd></div><div><dt>Sold by</dt><dd>{product.seller?.companyName || "HRSBasket"}</dd></div><div><dt>Stock</dt><dd>{product.isStockManageable ? product.stock : "Available"}</dd></div></dl><p>{product.shortDescription || "Add this product to your reseller catalog."}</p><strong>{money(product.resellerPricing?.basePrice)}</strong><span>Margin up to {money(product.resellerPricing?.maximumMargin)}</span><button type="button" onClick={() => onSelect(product)}>Select &amp; Set Margin <ChevronRight/></button></div></article>)}</div>
    {!matches.length && <div className="resellerCatalogEmpty"><Search/><h3>No matching products</h3><p>Try a product name, SKU, category, or tag.</p><button type="button" onClick={() => setQuery("")}>Clear search</button></div>}
  </section>;
}
