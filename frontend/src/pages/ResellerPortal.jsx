import { useEffect, useState } from "react";
import { ArrowLeft, BarChart3, Bell, Building2, Check, ChevronRight, CircleHelp, Copy, CreditCard, Eye, EyeOff, FileText, Gift, Home, IndianRupee, Link2, LockKeyhole, LogOut, Mail, MailCheck, MapPin, Megaphone, Menu, MessageCircle, PackageCheck, Plus, Search, Settings, Share2, ShieldCheck, ShoppingBag, ShoppingCart, Smartphone, Store, User, UserPlus, WalletCards } from "lucide-react";
import { api, customerAuthStore } from "../services/api.js";

const money = (value) => new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 2 }).format(value || 0);
const strongPasswordPattern = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z0-9]).{8,}$/;
const initialForm = { fullName: "", mobile: "", address: "", pan: "", gstStatus: "non-gst", gstin: "", paymentDetails: { method: "upi", upiId: "" }, kyc: { panDocument: "", addressDocument: "" }, termsAccepted: false, challengeId: "", otp: "" };

export default function ResellerPortal({ onBack }) {
  const [account, setAccount] = useState(null);
  const [dashboard, setDashboard] = useState(null);
  const [products, setProducts] = useState([]);
  const [links, setLinks] = useState([]);
  const [orders, setOrders] = useState([]);
  const [margins, setMargins] = useState({});
  const [view, setView] = useState("dashboard");
  const [addStep, setAddStep] = useState(1);
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [createdLink, setCreatedLink] = useState(null);
  const [catalogSearch, setCatalogSearch] = useState("");
  const [accessMode, setAccessMode] = useState("login");
  const [accessForm, setAccessForm] = useState({ name: "", email: "", password: "", confirmPassword: "" });
  const [accessBusy, setAccessBusy] = useState(false);
  const [showAccessPassword, setShowAccessPassword] = useState(false);
  const [quickForm, setQuickForm] = useState({ fullName: "", mobile: "", email: "", password: "", confirmPassword: "", businessName: "", gstStatus: "gst", gstin: "", gstState: "", gstCertificate: "", taxVerificationToken: "", termsAccepted: false });
  const [quickGstVerification, setQuickGstVerification] = useState({ busy: false, status: "", message: "" });
  const [quickCertificate, setQuickCertificate] = useState({ busy: false, name: "", error: "" });
  const [portalRoute, setPortalRoute] = useState(() => window.location.hash.split("?")[0]);
  const registrationRoute = portalRoute === "#/reseller/register";
  useEffect(() => { const sync = () => setPortalRoute(window.location.hash.split("?")[0]); window.addEventListener("hashchange", sync); return () => window.removeEventListener("hashchange", sync); }, []);
  useEffect(() => { if (!customerAuthStore.token) setAccessMode(registrationRoute ? "signup" : "login"); }, [registrationRoute]);
  const [form, setForm] = useState(initialForm);
  const [status, setStatus] = useState("");
  const [loading, setLoading] = useState(true);
  const load = async () => {
    if (!customerAuthStore.token) { setLoading(false); return; }
    try {
      const me = await api.resellerMe(); setAccount(me);
      const [summary, catalog, shared, sales] = await Promise.all([api.resellerDashboard(), api.resellerProducts(), api.resellerLinks(), api.resellerOrders()]);
      setDashboard(summary); setProducts(catalog); setLinks(shared); setOrders(sales);
    } catch (error) { if (!/reseller account/i.test(error.message)) setStatus(error.message); }
    finally { setLoading(false); }
  };
  useEffect(() => { load(); }, []);
  const requestOtp = async () => { try { const result = await api.resellerRegistrationOtp(); setForm({ ...form, challengeId: result.challengeId }); setStatus(result.message); } catch (error) { setStatus(error.message); } };
  const register = async (event) => { event.preventDefault(); try { await api.resellerRegister(form); setStatus("Reseller dashboard activated."); await load(); } catch (error) { setStatus(error.message); } };
  const generate = async (product) => { try { const result = await api.createResellerLink({ productId: product._id, margin: Number(margins[product._id] || 0) }); setLinks((current) => [result, ...current.filter((item) => item._id !== result._id)]); setCreatedLink(result); setAddStep(3); setStatus("Selling link generated."); } catch (error) { setStatus(error.message); } };
  const copy = async (url) => { await navigator.clipboard.writeText(url); setStatus("Link copied."); };
  const submitAccess = async (event) => {
    event.preventDefault(); setStatus("");
    if (accessMode === "signup" && accessForm.password !== accessForm.confirmPassword) { setStatus("Passwords do not match."); return; }
    setAccessBusy(true);
    try {
      const result = accessMode === "signup"
        ? await api.customerRegister({ name: accessForm.name, email: accessForm.email, password: accessForm.password, confirmPassword: accessForm.confirmPassword })
        : await api.customerLogin({ email: accessForm.email, password: accessForm.password });
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
      setAccount(result.reseller); window.location.hash = "#/reseller"; setPortalRoute("#/reseller");
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
        <label><span>Email address</span><div><Mail/><input required type="email" autoComplete="email" placeholder="Enter your email" value={accessForm.email} onChange={e=>setAccessForm({...accessForm,email:e.target.value})}/></div></label>
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
    ["dashboard", "Dashboard", Home], ["products", "My Products", ShoppingBag], ["add", "Set Margin", IndianRupee],
    ["links", "My Links", Link2], ["orders", "Orders", ShoppingCart], ["earnings", "My Earnings", WalletCards],
    ["payouts", "Payouts", CreditCard], ["marketing", "Marketing Tools", Megaphone], ["reports", "Reports", BarChart3],
    ["profile", "Profile", User], ["support", "Support", CircleHelp], ["settings", "Settings", Settings]
  ];
  const catalogLinks = links.filter((link, index, all) => all.findIndex((item) => String(item.product?._id || item.product) === String(link.product?._id || link.product)) === index);
  const chosenMargin = Number(selectedProduct ? margins[selectedProduct._id] || 0 : 0);
  const chosenBase = Number(selectedProduct?.resellerPricing?.basePrice || 0);
  const sellingUrl = createdLink ? createdLink.url || `${window.location.origin}/#/resell/${createdLink.code}` : "";
  const openAddFlow = () => { setSelectedProduct(null); setCreatedLink(null); setAddStep(1); setView("add"); setStatus(""); };
  const title = view === "dashboard" ? "Reseller Dashboard" : view === "add" ? (addStep === 1 ? "Select a Product" : addStep === 2 ? "Set Your Margin" : "Preview & Share") : navItems.find(([key]) => key === view)?.[1] || "Reseller Dashboard";

  return <main className="resellerWorkspace">
    <aside className="resellerSidebar">
      <strong className="resellerSidebarBrand"><ShoppingBag/><span>HRS<em>Basket</em><small>Reseller Portal</small></span></strong>
      <nav>{navItems.map(([key,label,Icon])=><button key={key} className={view === key ? "active" : ""} onClick={()=>key === "add" ? openAddFlow() : setView(key)}><Icon/><span>{label}</span>{key === "orders" && orders.length > 0 && <b>{orders.length}</b>}</button>)}</nav>
      <div className="resellerUpgrade"><Gift/><small>Upgrade to</small><strong>Premium Reseller</strong><p>Get higher margins &amp; exclusive benefits</p><button>Upgrade Now</button></div>
      <button className="resellerStorefrontLink" onClick={onBack}><LogOut/> Storefront</button>
    </aside>
    <section className="resellerWorkspaceBody">
      <header className="resellerTopbar"><button className="resellerMenuButton"><Menu/></button><h1>{title}</h1><div className="resellerTopbarAccount"><Bell/><span>{String(account.fullName || "R").charAt(0)}</span><div><strong>{account.fullName}</strong><small>{account.resellerId}</small></div></div></header>
      <div className="resellerWorkspaceContent">
        {status && <p className="resellerWorkspaceNotice">{status}</p>}

        {view === "dashboard" && <>
          <div className="resellerWelcome"><div><h2>Welcome back, {account.fullName?.split(" ")[0]}! 👋</h2><p>Here’s what’s happening with your reseller business today.</p></div><button onClick={openAddFlow}><Plus/> Add Product</button></div>
          <section className="resellerDashboardStats">
            <article className="blue"><i><ShoppingCart/></i><span>Total Orders</span><strong>{dashboard?.totalOrders || orders.length}</strong><small>Track all customer orders</small></article>
            <article className="green"><i><IndianRupee/></i><span>Total Sales</span><strong>{money(orders.reduce((sum,item)=>sum+Number(item.grandTotal||0),0))}</strong><small>Across your shared products</small></article>
            <article className="orange"><i><PackageCheck/></i><span>My Earnings</span><strong>{money(dashboard?.totalEarnings)}</strong><small>Lifetime reseller earnings</small></article>
            <article className="purple"><i><WalletCards/></i><span>Pending Earnings</span><strong>{money(dashboard?.pendingEarnings)}</strong><small>Will be cleared soon</small></article>
          </section>
          <section className="resellerDashboardGrid">
            <article className="resellerPanel resellerTopProducts"><header><h3>My Products</h3><button onClick={()=>setView("products")}>View All</button></header>{catalogLinks.slice(0,4).map((link,index)=>{const product=products.find(p=>String(p._id)===String(link.product?._id||link.product))||link.product;return <div key={link._id}><b>{index+1}</b>{product?.mainImage&&<img src={product.mainImage} alt=""/>}<span><strong>{product?.name}</strong><small>Base: {money(product?.resellerPricing?.basePrice)} · Margin: {money(link.margin)}</small></span><em>{money(link.customerPrice)}</em></div>})}{!catalogLinks.length&&<p className="resellerEmpty">No products yet. Add your first product to start sharing.</p>}</article>
            <article className="resellerPanel resellerRecentOrders"><header><h3>Recent Orders</h3><button onClick={()=>setView("orders")}>View All</button></header>{orders.slice(0,5).map(order=><div key={order._id}><span><strong>{order.orderNumber}</strong><small>{order.items?.[0]?.name || "Customer order"}</small></span><b className={`resellerStatus ${String(order.status).toLowerCase()}`}>{order.status}</b><em>{money(order.grandTotal)}</em></div>)}{!orders.length&&<p className="resellerEmpty">Orders from shared links will appear here.</p>}</article>
            <article className="resellerPanel resellerQuickShare"><h3>Your Latest Link</h3>{catalogLinks[0] ? <><div><input readOnly value={catalogLinks[0].url||`${window.location.origin}/#/resell/${catalogLinks[0].code}`}/><button onClick={()=>copy(catalogLinks[0].url||`${window.location.origin}/#/resell/${catalogLinks[0].code}`)}><Copy/></button></div><a href={`https://wa.me/?text=${encodeURIComponent(catalogLinks[0].url||`${window.location.origin}/#/resell/${catalogLinks[0].code}`)}`} target="_blank" rel="noreferrer"><MessageCircle/> Share on WhatsApp</a></> : <button className="resellerPrimary" onClick={openAddFlow}><Plus/> Add a product</button>}</article>
          </section>
          <div className="resellerReferralBanner"><Gift/><div><h3>Refer More, Earn More!</h3><p>Share more links, complete more orders and earn higher commissions.</p></div><button onClick={()=>setView("links")}>Explore Links</button></div>
        </>}

        {view === "products" && <><div className="resellerPageLead"><div><h2>My Products</h2><p>Products you have added to your reseller catalog.</p></div><button onClick={openAddFlow}><Plus/> Add Product</button></div><section className="resellerCatalogGrid">{catalogLinks.map(link=>{const product=products.find(p=>String(p._id)===String(link.product?._id||link.product))||link.product;return <article key={link._id}>{product?.mainImage&&<img src={product.mainImage} alt=""/>}<div><small>IN YOUR CATALOG</small><h3>{product?.name}</h3><p>Base price {money(product?.resellerPricing?.basePrice)}</p><dl><div><dt>Your margin</dt><dd>{money(link.margin)}</dd></div><div><dt>Customer price</dt><dd>{money(link.customerPrice)}</dd></div></dl><footer><button onClick={()=>{setSelectedProduct(product);setMargins({...margins,[product._id]:link.margin});setAddStep(2);setView("add")}}>Edit Margin</button><button onClick={()=>{setCreatedLink(link);setSelectedProduct(product);setAddStep(3);setView("add")}}><Share2/> Share</button></footer></div></article>})}{!catalogLinks.length&&<div className="resellerCatalogEmpty"><ShoppingBag/><h3>Your catalog is empty</h3><p>Select an HRSBasket product, set your margin, and create its share link.</p><button onClick={openAddFlow}>Add your first product</button></div>}</section></>}

        {view === "add" && <>
          <div className="resellerPageLead"><div><p className="resellerBreadcrumb">Dashboard <ChevronRight/> My Products <ChevronRight/> <b>{title}</b></p><h2>{title}</h2><p>{addStep===1?"Choose an eligible HRSBasket product to add to your catalog.":addStep===2?"Add your margin and create your selling link.":"Your product is ready to share with customers."}</p></div></div>
          <ol className="resellerSteps">{[[1,"Select Product"],[2,"Define Margin"],[3,"Preview & Share"]].map(([step,label])=><li key={step} className={addStep===step?"active":addStep>step?"complete":""}><i>{addStep>step?<Check/>:step}</i><span>{label}</span></li>)}</ol>
          {addStep===1&&<section className="resellerSelectPanel"><div className="resellerProductSearch"><Search/><input placeholder="Search eligible products" value={catalogSearch} onChange={e=>setCatalogSearch(e.target.value)}/></div><div className="resellerSelectGrid">{products.filter(product=>product.name.toLowerCase().includes(catalogSearch.toLowerCase())).map(product=><article key={product._id}>{product.mainImage&&<img src={product.mainImage} alt=""/>}<div><small>AVAILABLE TO RESELL</small><h3>{product.name}</h3><p>{product.shortDescription || "Add this product to your reseller catalog."}</p><strong>{money(product.resellerPricing.basePrice)}</strong><span>Margin up to {money(product.resellerPricing.maximumMargin)}</span><button onClick={()=>{setSelectedProduct(product);setMargins(current=>({...current,[product._id]:current[product._id]||Math.min(100,Number(product.resellerPricing.maximumMargin))}));setAddStep(2)}}>Select Product <ChevronRight/></button></div></article>)}</div></section>}
          {addStep===2&&selectedProduct&&<section className="resellerMarginLayout"><div><article className="resellerSelectedProduct resellerPanel"><h3>Selected Product</h3><div>{selectedProduct.mainImage&&<img src={selectedProduct.mainImage} alt=""/>}<span><h3>{selectedProduct.name}</h3><p>{selectedProduct.shortDescription}</p><small>In Stock · Available to resell</small></span><aside><small>Base Price</small><strong>{money(chosenBase)}</strong><p>Price before your margin</p></aside></div></article><article className="resellerMarginEditor resellerPanel"><h3>Set Your Margin</h3><label>Your Margin (₹)<div><button onClick={()=>setMargins({...margins,[selectedProduct._id]:Math.max(0,chosenMargin-10)})}>−</button><input type="number" min="0" max={selectedProduct.resellerPricing.maximumMargin} value={margins[selectedProduct._id]||0} onChange={e=>setMargins({...margins,[selectedProduct._id]:Math.min(Number(selectedProduct.resellerPricing.maximumMargin),Math.max(0,Number(e.target.value)))})}/><button onClick={()=>setMargins({...margins,[selectedProduct._id]:Math.min(Number(selectedProduct.resellerPricing.maximumMargin),chosenMargin+10)})}>+</button></div></label><input className="resellerMarginRange" type="range" min="0" max={selectedProduct.resellerPricing.maximumMargin} value={chosenMargin} onChange={e=>setMargins({...margins,[selectedProduct._id]:Number(e.target.value)})}/><div className="resellerMarginLabels"><span>Min: ₹0</span><span>Recommended: competitive</span><span>Max: {money(selectedProduct.resellerPricing.maximumMargin)}</span></div><div className="resellerMarginSummary"><span>You earn per sale<strong>{money(chosenMargin)}</strong></span><span>Maximum margin<strong>{money(selectedProduct.resellerPricing.maximumMargin)}</strong></span><span>Customer price<strong>{money(chosenBase+chosenMargin)}</strong></span></div><p className="resellerMarginTip">Higher margins increase the customer price. Keep your price competitive to improve sales.</p></article><div className="resellerFlowActions"><button onClick={()=>setAddStep(1)}><ArrowLeft/> Back</button><button className="resellerPrimary" disabled={chosenMargin<0} onClick={()=>generate(selectedProduct)}><Link2/> Create &amp; Preview Link</button></div></div><aside className="resellerPricePreview resellerPanel"><h3>Price Preview</h3><dl><div><dt>Base Price</dt><dd>{money(chosenBase)}</dd></div><div><dt>Your Margin</dt><dd className="positive">+ {money(chosenMargin)}</dd></div><div><dt>Customer Price</dt><dd>{money(chosenBase+chosenMargin)}</dd></div></dl><p><Check/> You will earn <strong>{money(chosenMargin)}</strong> on each sale</p></aside></section>}
          {addStep===3&&selectedProduct&&createdLink&&<section className="resellerSharePreview"><article className="resellerShareProduct resellerPanel"><span className="resellerSuccessIcon"><Check/></span><h2>Your selling link is ready!</h2><p>Preview the customer price and share this product with your network.</p>{selectedProduct.mainImage&&<img src={selectedProduct.mainImage} alt=""/>}<h3>{selectedProduct.name}</h3><dl><div><dt>HRSBasket price</dt><dd>{money(chosenBase)}</dd></div><div><dt>Your margin</dt><dd>{money(createdLink.margin)}</dd></div><div><dt>Customer price</dt><dd>{money(createdLink.customerPrice)}</dd></div></dl><div className="resellerGeneratedLink"><input readOnly value={sellingUrl}/><button onClick={()=>copy(sellingUrl)}><Copy/> Copy</button></div><div className="resellerShareButtons"><a href={`https://wa.me/?text=${encodeURIComponent(`${selectedProduct.name} — ${money(createdLink.customerPrice)}\n${sellingUrl}`)}`} target="_blank" rel="noreferrer"><MessageCircle/> WhatsApp</a><button onClick={()=>navigator.share?.({title:selectedProduct.name,url:sellingUrl})}><Share2/> Share</button></div><button className="resellerDoneButton" onClick={()=>setView("products")}>Done — View My Products</button></article></section>}
        </>}

        {view === "links"&&<><div className="resellerPageLead"><div><h2>My Links</h2><p>Copy and share your active product selling links.</p></div><button onClick={openAddFlow}><Plus/> Create Link</button></div><section className="resellerLinkList">{links.map(link=>{const url=link.url||`${window.location.origin}/#/resell/${link.code}`;return <article className="resellerPanel" key={link._id}><Link2/><span><strong>{link.product?.name}</strong><small>{url}</small></span><b>{money(link.customerPrice)}</b><button onClick={()=>copy(url)}><Copy/> Copy</button><a href={`https://wa.me/?text=${encodeURIComponent(url)}`} target="_blank" rel="noreferrer"><MessageCircle/></a></article>})}</section></>}
        {view === "orders"&&<><div className="resellerPageLead"><div><h2>Orders</h2><p>Orders attributed to your selling links.</p></div></div><section className="resellerOrderTable resellerPanel"><table><thead><tr><th>Order</th><th>Status</th><th>Order value</th><th>Margin</th><th>Final earning</th></tr></thead><tbody>{orders.map(order=><tr key={order._id}><td><strong>{order.orderNumber}</strong></td><td><span className={`resellerStatus ${String(order.status).toLowerCase()}`}>{order.status}</span></td><td>{money(order.grandTotal)}</td><td>{money(order.resellerAttribution?.margin)}</td><td>{money(order.resellerAttribution?.finalEarning)}</td></tr>)}</tbody></table></section></>}
        {["earnings","payouts","marketing","reports","profile","support","settings"].includes(view)&&<section className="resellerPlaceholder resellerPanel"><CircleHelp/><h2>{title}</h2><p>This workspace section will use your existing reseller account data as it becomes available.</p><button onClick={()=>setView("dashboard")}>Back to dashboard</button></section>}
      </div>
    </section>
  </main>;
}
