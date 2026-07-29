import { useEffect, useState } from "react";
import { Award, BadgeIndianRupee, BarChart3, Bell, Building2, Boxes, Check, CircleDollarSign, Eye, EyeOff, FileCheck2, Gift, Headphones, KeyRound, LayoutDashboard, LockKeyhole, LogOut, Megaphone, PackageCheck, Search, ShieldCheck, ShoppingCart, Star, Store, TrendingUp, UserRound, Users, WalletCards, X } from "lucide-react";
import { api, sellerAuthStore } from "../services/api.js";
import CategoryTreeSelect from "../components/CategoryTreeSelect.jsx";
import GstPricePreview from "../components/GstPricePreview.jsx";
import ForgotPasswordForm from "../components/ForgotPasswordForm.jsx";
import PortalAuthCard from "../components/PortalAuthCard.jsx";
import BrandLogo from "../components/BrandLogo.jsx";
import DocumentPreviewModal from "../components/DocumentPreviewModal.jsx";
import ProductCreatePage from "./ProductCreatePage.jsx";
import { isSaveMessage, showToast } from "../utils/toast.js";

const money = (value) => new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR" }).format(value || 0);
const fileData = async (file) => (await api.uploadDocument(file, "seller-kyc")).url;
const reelData = async (file) => {
  if (file.size > 50 * 1024 * 1024) throw new Error("Reel must be 50 MB or smaller");
  return (await api.uploadVideo(file)).url;
};
const blankRegistration = { companyName: "", businessName: "", address: "", city: "", state: "", gstState: "", businessState: "", pinCode: "", mobile: "", email: "", isGstRegistered: false, gstNumber: "", gstCertificate: "", declarationAccepted: false };
const blankProduct = { name: "", sku: "", price: "", offerPrice: "", category: "", taxCategory: "", priceIncludesTax: true, displayType: "Product", stock: "", lowStockThreshold: 10, shortDescription: "", detailedDescription: "", mainImage: "", videoUrl: "", tags: "", isStockManageable: true };

function SellerLoginScreen({ settings, onBack, message, login, setLogin, busy, onSubmit, onForgot, onSignup }) {
  const [showPassword, setShowPassword] = useState(false);
  const benefits = ["All India Marketplace Reach", "Seller Product Dashboard", "GST Compliance Support", "ShipRocket Integration", "Sales & Profit Tracking", "Marketing Opportunities", "Priority Seller Support", "Secure Payout Management"];
  const assurances = [[ShieldCheck, "100% Secure", "Your data is safe with us"], [Headphones, "24/7 Support", "We are here to help you"], [Award, "Trusted Platform", "A marketplace built for sellers"], [TrendingUp, "Sell & Grow", "Reach customers and grow your business"]];
  return <main className="hrsPartnerLogin hrsSellerLogin">
    <button className="hrsPartnerBack" type="button" onClick={onBack}>← Back to store</button>
    <section className="hrsPartnerLoginShell">
      <div className="hrsPartnerHero">
        <BrandLogo settings={settings} className="hrsPartnerBrand" showText />
        <div className="hrsPartnerWelcome"><span>Welcome to</span><h1>HRS <em>Seller</em><small>Marketplace Program</small></h1><p>Sell More, Grow Together</p></div>
        <div className="hrsPartnerIllustration"><span className="hrsOrbitIcon growth"><TrendingUp /></span><span className="hrsOrbitIcon users"><Users /></span><span className="hrsOrbitIcon wallet"><WalletCards /></span><div><ShieldCheck /><UserRound /></div></div>
        <div className="hrsPartnerBenefits"><h2>👑 <span>Seller Benefits</span></h2>{benefits.map((benefit) => <p key={benefit}><Check size={16} />{benefit}</p>)}</div>
      </div>
      <div className="hrsPartnerFormColumn">
        <div className="hrsSecureLabel"><ShieldCheck size={18} /> Secure Seller Login</div>
        <section className="hrsPartnerFormCard">
          <div className="hrsLoginShield"><ShieldCheck /></div>
          <h2>Hi, <span>Welcome Back</span></h2>
          <p>Please login to your seller account</p>
          <div className="hrsLoginDivider"><span />Sign in with your credentials<span /></div>
          {message ? <div className="hrsLoginNotice">{message}</div> : <div className="hrsLoginNotice">Enter your valid credentials to access your seller dashboard.</div>}
          <form onSubmit={onSubmit}>
            <label><strong>Seller ID or Email</strong><span className="hrsInput"><UserRound size={18} /><input placeholder="Enter Seller ID or email" required value={login.identifier} onChange={(event) => setLogin({ ...login, identifier: event.target.value })} /></span></label>
            <label><strong>Password</strong><span className="hrsInput"><LockKeyhole size={18} /><input type={showPassword ? "text" : "password"} placeholder="Enter your password" required value={login.password} onChange={(event) => setLogin({ ...login, password: event.target.value })} /><button type="button" onClick={() => setShowPassword((visible) => !visible)} aria-label={showPassword ? "Hide password" : "Show password"}>{showPassword ? <EyeOff size={18} /> : <Eye size={18} />}</button></span></label>
            <div className="hrsLoginOptions"><label><input type="checkbox" /> Remember me</label><button type="button" onClick={onForgot}>Forgot password?</button></div>
            <button className="hrsSignIn" disabled={busy}><LockKeyhole size={18} />{busy ? "Signing in…" : "Sign In"}</button>
            <div className="hrsJoinPrompt">Don&apos;t have an account? <button type="button" onClick={onSignup}>Join Now</button></div>
          </form>
        </section>
      </div>
      <section className="hrsPartnerAssurances">{assurances.map(([Icon, title, text]) => <article key={title}><Icon /><div><h3>{title}</h3><p>{text}</p></div></article>)}</section>
      <footer><span><ShieldCheck size={18} /> © {new Date().getFullYear()} HRS Basket. All rights reserved.</span><strong>Together We Grow More 🚀</strong></footer>
    </section>
  </main>;
}

function SellerRegistrationScreen({ settings, onBack, onLogin, registration, setRegistration, registrationOtp, setRegistrationOtp, message, setMessage, busy, onSubmit, onVerify }) {
  const update = (field, value) => setRegistration((current) => ({ ...current, [field]: value }));
  return <>
    <PortalAuthCard portal="Seller" heading="Register as a seller" subtitle="Create your seller account to start listing products." dividerText="Seller registration" pageClassName="partnerRegistrationPage sellerRegistrationPage" panelClassName="partnerRegistrationPanel" onBack={onBack} settings={settings}>
      {message && !registrationOtp.challengeId && <div className="notice">{message}</div>}
      <form className="authForm formGrid twoColumn partnerRegistrationForm" onSubmit={onSubmit}>
        <label>Company name<input required value={registration.companyName} onChange={(event) => update("companyName", event.target.value)} /></label>
        <label>Mobile<input required value={registration.mobile} onChange={(event) => update("mobile", event.target.value)} /></label>
        <label>Email<input type="email" required value={registration.email} onChange={(event) => update("email", event.target.value)} /></label>
        <label>Pin code<input required inputMode="numeric" value={registration.pinCode} onChange={(event) => update("pinCode", event.target.value.replace(/\D/g, ""))} /></label>
        <label className="full">Business address<input required value={registration.address} onChange={(event) => update("address", event.target.value)} /></label>
        <label>City<input required value={registration.city} onChange={(event) => update("city", event.target.value)} /></label>
        <label>State<input required value={registration.state} onChange={(event) => update("state", event.target.value)} /></label>
        <label className="full">Is your business GST registered?<select value={registration.isGstRegistered ? "yes" : "no"} onChange={(event) => setRegistration((current) => ({ ...current, isGstRegistered: event.target.value === "yes", gstNumber: "", gstCertificate: "", declarationAccepted: false }))}><option value="no">No</option><option value="yes">Yes</option></select></label>
        {registration.isGstRegistered ? <>
          <label>Business name<input required value={registration.businessName} onChange={(event) => update("businessName", event.target.value)} /></label>
          <label>GST state<input required value={registration.gstState} onChange={(event) => update("gstState", event.target.value)} /></label>
          <label>GST number<input required value={registration.gstNumber} onChange={(event) => update("gstNumber", event.target.value.toUpperCase())} /></label>
          <label>GST certificate<input type="file" accept="image/*,.pdf" required={!registration.gstCertificate} onChange={async (event) => { const file = event.target.files?.[0]; if (file) update("gstCertificate", await fileData(file)); }} />{registration.gstCertificate && <small>Certificate uploaded successfully</small>}</label>
        </> : <>
          <label className="full">Business state<input required value={registration.businessState} onChange={(event) => setRegistration((current) => ({ ...current, businessState: event.target.value, state: event.target.value }))} /></label>
          <label className="toggleRow full"><input type="checkbox" required checked={registration.declarationAccepted} onChange={(event) => update("declarationAccepted", event.target.checked)} /><span>I declare that the business is not GST registered and accept same-state selling restrictions.</span></label>
        </>}
        <div className="registrationActions full"><button className="primaryButton authButton" disabled={busy}>{busy ? "Checking details…" : "Verify email & register"}</button></div>
        <p className="sellerExistingAccount full">Already have a seller account? <button type="button" className="linkButton" onClick={onLogin}>Login to seller</button></p>
      </form>
    </PortalAuthCard>
    {registrationOtp.challengeId && <div className="partnerPaymentOverlay" role="dialog" aria-modal="true" aria-labelledby="seller-otp-title"><form className="partnerPaymentDialog sellerOtpDialog" onSubmit={onVerify}><button className="partnerPaymentClose" type="button" disabled={busy} aria-label="Close email verification" onClick={() => { setRegistrationOtp({ challengeId: "", code: "" }); setMessage(""); }}><X size={20} /></button><span className="eyebrow">Email verification</span><h2 id="seller-otp-title">Verify your email</h2><p>Enter the 6-digit OTP sent to <strong>{registration.email}</strong>.</p><label className="partnerPaymentOtp"><span>Email OTP</span><input autoFocus inputMode="numeric" autoComplete="one-time-code" pattern="\d{6}" maxLength="6" required value={registrationOtp.code} onChange={(event) => setRegistrationOtp({ ...registrationOtp, code: event.target.value.replace(/\D/g, "").slice(0, 6) })} placeholder="Enter 6-digit OTP" /></label>{message && <p className="partnerPaymentStatus" role="status">{message}</p>}<div className="partnerPaymentActions"><button className="secondaryButton" type="button" disabled={busy} onClick={() => { setRegistrationOtp({ challengeId: "", code: "" }); setMessage(""); }}>Cancel</button><button className="primaryButton" disabled={busy || registrationOtp.code.length !== 6}>{busy ? "Verifying…" : "Verify OTP & create account"}</button></div></form></div>}
  </>;
}

function SellerProductsFull({ products, options, save, toggle, busy }) {
  const [editing, setEditing] = useState(null);
  const [page, setPage] = useState("list");
  const [viewing, setViewing] = useState(null);
  const backToList = () => { setPage("list"); setEditing(null); setViewing(null); };
  const saveProduct = async (payload) => { await save(editing, payload); backToList(); };
  if (page === "form") return <ProductCreatePage categories={options.categories || []} taxCategories={options.taxCategories || []} products={products} initialProduct={editing} onSave={saveProduct} onBack={backToList} hideCostPrice hideStatus={!editing} />;
  if (page === "view" && viewing) return <SellerProductDetails product={viewing} onBack={backToList} onEdit={() => { setEditing(viewing); setPage("form"); }} />;
  return <section className="contentStack sellerProductWorkspace"><div className="panel tableWrap"><div className="panelHeader"><div><h2>Your products</h2><p className="mutedText">New products and changes are sent to admin for approval.</p></div><button className="primaryButton sellerAddProductButton" type="button" onClick={() => { setEditing(null); setPage("form"); }}>+ Add product</button></div><table><thead><tr><th>Product</th><th>Price</th><th>Approval</th><th>Admin note</th><th>Store visibility</th><th>Action</th></tr></thead><tbody>{products.map((product) => <tr key={product._id}><td><strong>{product.name}</strong><br />{product.sku}</td><td>{money(product.offerPrice || product.price)}</td><td>{product.approvalStatus.replaceAll("_", " ")}</td><td>{product.approvalNote || "—"}</td><td><button type="button" onClick={() => toggle(product)}>{product.sellerEnabled ? "Enabled" : "Disabled"}</button></td><td><div className="sellerProductActions"><button type="button" onClick={() => { setViewing(product); setPage("view"); }}>View</button><button type="button" disabled={busy} onClick={() => { setEditing(product); setPage("form"); }}>Edit</button></div></td></tr>)}{!products.length && <tr><td colSpan="6">No products added yet.</td></tr>}</tbody></table></div></section>;
}

function SellerProductDetails({ product, onBack, onEdit }) {
  const images = (product.media || []).filter((item) => item.type === "image");
  const detailRows = [["SKU", product.sku], ["Category", product.category?.name], ["HSN Code", product.hsnCode], ["Brand / Manufacturer", product.manufacturerBrand], ["Price", money(product.price)], ["Offer price", money(product.offerPrice || product.price)], ["Tax", product.taxCategory ? `${product.taxCategory.name} (${product.taxCategory.rate}%)` : "None"], ["Stock", product.isStockManageable ? product.stock : "Not managed"], ["Volumetric weight", product.volumetricWeight], ["Length", product.length], ["Height", product.height], ["Warranty", product.warranty], ["Approval", product.approvalStatus?.replaceAll("_", " ")], ["Store visibility", product.sellerEnabled ? "Enabled" : "Disabled"]];
  return <section className="contentStack sellerProductDetailPage"><div className="panelHeader"><button className="inlineButton" type="button" onClick={onBack}>← Back to products</button><button className="primaryButton" type="button" onClick={onEdit}>Edit product</button></div><article className="panel sellerProductDetail"><header><div><span className="eyebrow">Product details</span><h2>{product.name}</h2><p>{product.shortDescription}</p></div>{product.mainImage && <img src={product.mainImage} alt={product.name} />}</header><dl>{detailRows.filter(([, value]) => value !== undefined && value !== "").map(([label, value]) => <div key={label}><dt>{label}</dt><dd>{value || "—"}</dd></div>)}</dl><section><h3>Detailed description</h3><p className="sellerProductDescription">{product.detailedDescription || "No detailed description added."}</p></section>{product.variationOptions?.length > 0 && <section><h3>Variations</h3><div className="sellerVariationSummary">{product.variationOptions.map((option) => <div key={option.name}><strong>{option.name}</strong><span>{option.values?.join(", ")}</span></div>)}</div></section>}{images.length > 0 && <section><h3>Product images</h3><div className="sellerProductGallery">{images.map((item, index) => <img key={`${item.url.slice(0, 20)}-${index}`} src={item.url} alt={item.alt || product.name} />)}</div></section>}{product.videoUrl && <section><h3>Product reel</h3><video className="sellerProductVideo" src={product.videoUrl} controls /></section>}{product.approvalNote && <div className="notice">Admin note: {product.approvalNote}</div>}</article></section>;
}

export default function SellerPortal({ onBack, settings = {} }) {
  const [seller, setSeller] = useState(sellerAuthStore.seller);
  const [screen, setScreen] = useState(seller ? "dashboard" : "login");
  const [registration, setRegistration] = useState(blankRegistration);
  const [credentials, setCredentials] = useState(null);
  const [login, setLogin] = useState({ identifier: "", password: "" });
  const [showLoginPassword, setShowLoginPassword] = useState(false);
  const [registrationOtp, setRegistrationOtp] = useState({ challengeId: "", code: "" });
  const [data, setData] = useState({ dashboard: {}, products: [], orders: [], wallet: { payouts: [] }, options: { categories: [], taxCategories: [] } });
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const [portalReady, setPortalReady] = useState(!seller);
  const [loadError, setLoadError] = useState("");
  useEffect(() => {
    if (!seller) return undefined;
    const nav = document.querySelector(".berrySellerWorkspace .sellerNav");
    const workspace = nav?.closest(".berrySellerWorkspace");
    if (!nav || !workspace) return undefined;
    const button = document.createElement("button");
    button.type = "button";
    button.className = "sellerNavToggle";
    button.title = "Collapse seller menu";
    button.setAttribute("aria-label", "Collapse seller menu");
    button.innerHTML = "‹";
    button.onclick = () => {
      const collapsed = workspace.classList.toggle("sellerNavCollapsed");
      button.innerHTML = collapsed ? "›" : "‹";
      button.title = collapsed ? "Expand seller menu" : "Collapse seller menu";
      button.setAttribute("aria-label", button.title);
    };
    nav.prepend(button);
    return () => button.remove();
  }, [seller]);
  useEffect(() => {
    if (isSaveMessage(message)) showToast(message);
  }, [message]);
  useEffect(() => {
    const navigateFromDashboard = (event) => { setScreen(event.detail); setMessage(""); };
    window.addEventListener("seller-dashboard-navigate", navigateFromDashboard);
    return () => window.removeEventListener("seller-dashboard-navigate", navigateFromDashboard);
  }, []);
  const submit = async (action) => { setBusy(true); setMessage(""); try { await action(); } catch (error) { setMessage(error.message); } finally { setBusy(false); } };
  const refresh = async () => {
    if (!sellerAuthStore.token) return;
    setLoadError("");
    setPortalReady(true);
    const results = await Promise.allSettled([
      api.sellerMe().then((me) => { sellerAuthStore.seller = me.seller; setSeller(me.seller); }),
      api.sellerDashboard().then((dashboard) => setData((current) => ({ ...current, dashboard }))),
      api.sellerProducts().then((products) => setData((current) => ({ ...current, products }))),
      api.sellerOrders().then((orders) => setData((current) => ({ ...current, orders }))),
      api.sellerWallet().then((wallet) => setData((current) => ({ ...current, wallet }))),
      api.sellerCatalogOptions().then((options) => setData((current) => ({ ...current, options })))
    ]);
    const failure = results.find((result) => result.status === "rejected");
    if (failure) throw failure.reason;
  };
  useEffect(() => { refresh().catch((error) => { setLoadError(error.message); setMessage(error.message); setPortalReady(true); }); }, []);
  useEffect(() => {
    if (seller || screen !== "register" || !settings.logoUrl) return undefined;
    const card = document.querySelector(".partnerPublic .partnerAuthCard");
    if (!card) return undefined;
    const image = document.createElement("img");
    image.className = "portalSignupLogo";
    image.src = settings.logoUrl;
    image.alt = settings.shopName || "Store logo";
    image.style.width = `${settings.logoWidth || 140}px`;
    image.style.height = `${settings.logoHeight || 56}px`;
    card.prepend(image);
    return () => image.remove();
  }, [seller, screen, settings.logoUrl, settings.logoWidth, settings.logoHeight, settings.shopName]);
  const register = (event) => { event.preventDefault(); submit(async () => { const result = await api.requestSellerRegistrationOtp(registration); setRegistrationOtp({ challengeId: result.challengeId, code: "" }); setMessage(result.message); }); };
  const verifyRegistrationOtp = (event) => { event.preventDefault(); submit(async () => { const result = await api.verifySellerRegistrationOtp(registrationOtp); setCredentials(result); setRegistrationOtp({ challengeId: "", code: "" }); setScreen("registered"); setMessage(result.message); }); };
  const signIn = (event) => { event.preventDefault(); submit(async () => { const result = await api.sellerLogin(login); sellerAuthStore.token = result.token; sellerAuthStore.seller = result.seller; setSeller(result.seller); setPortalReady(true); setScreen("dashboard"); refresh().catch((error) => { setLoadError(error.message); setMessage(error.message); }); }); };
  const logout = () => { sellerAuthStore.clear(); setSeller(null); setPortalReady(true); setLoadError(""); setScreen("login"); };

  if (!seller && screen === "registered" && credentials) return <div className="partnerPublic"><div className="partnerAuthCard"><button className="linkButton" onClick={onBack}>← Back to store</button><h1>Seller registration completed</h1>{message && <div className="notice">{message}</div>}<div className="credentialBox"><span>Seller ID</span><strong>{credentials.seller.sellerNumber}</strong><span>Temporary 4-digit password</span><strong>{credentials.temporaryPassword}</strong></div><p>Login email: <strong>{credentials.seller.email}</strong></p><button className="primaryButton" onClick={() => { setLogin({ identifier: credentials.seller.sellerNumber, password: "" }); setScreen("login"); setMessage(""); }}>Continue to login</button></div></div>;
  if (!seller && screen === "login") return <SellerLoginScreen settings={settings} onBack={onBack} message={message} login={login} setLogin={setLogin} busy={busy} onSubmit={signIn} onForgot={() => setScreen("forgot")} onSignup={() => { setScreen("register"); setMessage(""); }} />;
  if (!seller && screen === "login") return <PortalAuthCard portal="Seller" subtitle="Enter your credentials to continue" onBack={onBack}>{message && <div className="notice">{message}</div>}<form className="authForm" onSubmit={signIn}><label><span>Seller ID or email</span><input type="text" autoComplete="username" required value={login.identifier} onChange={(event) => setLogin({ ...login, identifier: event.target.value })} /></label><label><span>Password</span><span className="sellerPasswordField"><input type={showLoginPassword ? "text" : "password"} autoComplete="current-password" required value={login.password} onChange={(event) => setLogin({ ...login, password: event.target.value })} /><button type="button" onClick={() => setShowLoginPassword((visible) => !visible)} aria-label={showLoginPassword ? "Hide password" : "Show password"}>{showLoginPassword ? <EyeOff size={18} /> : <Eye size={18} />}</button></span></label><div className="authOptions"><label className="rememberMe"><input type="checkbox" /> <span>Remember me?</span></label><button className="linkButton" type="button" onClick={() => setScreen("forgot")}>Forgot password?</button></div><button className="primaryButton authButton" disabled={busy}>{busy ? "Signing in…" : "Sign In"}</button><button className="portalRegisterLink linkButton" type="button" onClick={() => { setScreen("register"); setMessage(""); }}>Don't Have an account?</button></form></PortalAuthCard>;
  if (!seller && screen === "forgot") return <div className="partnerPublic"><div className="partnerAuthCard"><button className="linkButton" onClick={onBack}>← Back to store</button><h1>Reset seller password</h1><ForgotPasswordForm identifierLabel="Seller ID or email" initialIdentifier={login.identifier} passwordDigits onRequest={(identifier) => api.sellerForgotPassword({ identifier })} onReset={api.sellerResetPassword} onBack={() => setScreen("login")} /></div></div>;
  if (!seller && screen === "register") return <SellerRegistrationScreen settings={settings} onBack={onBack} onLogin={() => { setScreen("login"); setMessage(""); }} registration={registration} setRegistration={setRegistration} registrationOtp={registrationOtp} setRegistrationOtp={setRegistrationOtp} message={message} setMessage={setMessage} busy={busy} onSubmit={register} onVerify={verifyRegistrationOtp} />;
  if (!seller && screen === "register") return <><div className="partnerPublic"><div className="partnerAuthCard"><button className="linkButton" onClick={onBack}>← Back to store</button><h1>Register your shop</h1><p>Complete all business details to create a seller account.</p><div className="tabRow"><button onClick={() => { setScreen("login"); setMessage(""); }}>Login</button><button className="active">Register shop</button></div>{message && !registrationOtp.challengeId && <div className="notice">{message}</div>}<form className="formGrid twoColumn" onSubmit={register}>{[["companyName", "Company name"], ["mobile", "Mobile"], ["email", "Email"], ["address", "Address"], ["city", "City"], ["state", "State"], ["pinCode", "Pin code"]].map(([field, label]) => <label className={field === "address" ? "full" : ""} key={field}>{label}<input type={field === "email" ? "email" : "text"} required value={registration[field]} onChange={(event) => setRegistration({ ...registration, [field]: event.target.value })} /></label>)}<label className="full">Is your business GST registered?<select value={registration.isGstRegistered ? "yes" : "no"} onChange={(event) => setRegistration({ ...registration, isGstRegistered: event.target.value === "yes", gstNumber: event.target.value === "yes" ? registration.gstNumber : "" })}><option value="no">No</option><option value="yes">Yes</option></select></label>{registration.isGstRegistered && <label className="full">GST number<input required value={registration.gstNumber} onChange={(event) => setRegistration({ ...registration, gstNumber: event.target.value.toUpperCase() })} /></label>}<button className="primaryButton full" disabled={busy}>{busy ? "Checking details…" : "Verify email & register"}</button></form></div></div>{registrationOtp.challengeId && <div className="partnerPaymentOverlay" role="dialog" aria-modal="true" aria-labelledby="seller-otp-title"><form className="partnerPaymentDialog sellerOtpDialog" onSubmit={verifyRegistrationOtp}><button className="partnerPaymentClose" type="button" disabled={busy} aria-label="Close email verification" onClick={() => { setRegistrationOtp({ challengeId: "", code: "" }); setMessage(""); }}><X size={20} /></button><span className="eyebrow">Email verification</span><h2 id="seller-otp-title">Verify your email</h2><p>Enter the 6-digit OTP sent to <strong>{registration.email}</strong>. Your seller account will be created only after verification.</p><label className="partnerPaymentOtp"><span>Email OTP</span><input autoFocus inputMode="numeric" autoComplete="one-time-code" pattern="\d{6}" maxLength="6" required value={registrationOtp.code} onChange={(event) => setRegistrationOtp({ ...registrationOtp, code: event.target.value.replace(/\D/g, "").slice(0, 6) })} placeholder="Enter 6-digit OTP" /></label>{message && <p className="partnerPaymentStatus" role="status">{message}</p>}<div className="partnerPaymentActions"><button className="secondaryButton" type="button" disabled={busy} onClick={() => { setRegistrationOtp({ challengeId: "", code: "" }); setMessage(""); }}>Cancel</button><button className="primaryButton" disabled={busy || registrationOtp.code.length !== 6}>{busy ? "Verifying…" : "Verify OTP & create account"}</button></div></form></div>}</>;
  if (!seller) return null;
  if (!portalReady) return <main className="storefrontLoadingScreen" role="status" aria-live="polite"><BrandLogo settings={settings} loading className="storefrontLoadingBrand" showText={false} />{!loadError && <div className="storefrontLoadingSpinner" aria-hidden="true" />}{loadError && <><h1>Unable to load seller data</h1><p>{loadError}</p><button className="heroPrimary" type="button" onClick={() => refresh().catch((error) => setLoadError(error.message))}>Try Again</button></>}</main>;

  const navigation = [["dashboard", "Dashboard", LayoutDashboard], ["profile", "Profile", UserRound], ["products", "Products", Boxes], ["orders", "Orders", PackageCheck], ["wallet", "Wallet", BadgeIndianRupee], ["kyc", "KYC", FileCheck2], ["bank", "Bank Details", Building2], ["password", "Settings", KeyRound]];
  return <div className="partnerShell berrySellerWorkspace"><aside className="partnerNav sellerNav"><div className="brand"><div className="brandMark">V</div><strong>Seller Dashboard</strong></div><nav>{navigation.map(([id, label, Icon]) => <button key={id} className={screen === id ? "active" : ""} onClick={() => { setScreen(id); setMessage(""); }}><Icon size={18} />{label}</button>)}<button onClick={logout}><LogOut size={18} />Logout</button></nav></aside><main className="partnerContent"><header><div><h1>{navigation.find(([id]) => id === screen)?.[1]}</h1><p>{seller.companyName} · Seller ID {seller.sellerNumber}</p></div><strong className="walletPill">Wallet: {money(data.wallet.walletBalance)}</strong></header>{message && <div className="notice">{message}</div>}{screen === "dashboard" && <SellerDashboard data={data.dashboard} />}{screen === "profile" && <SellerProfile seller={seller} save={(payload) => submit(async () => { await api.sellerUpdateProfile(payload); await refresh(); setMessage("Profile updated."); })} />}{screen === "products" && <SellerProductsFull products={data.products} options={data.options} busy={busy} save={(product, payload) => submit(async () => { product ? await api.updateSellerProduct(product._id, payload) : await api.createSellerProduct(payload); await refresh(); setMessage("Product sent to admin for approval."); })} toggle={(product) => submit(async () => { await api.toggleSellerProduct(product._id, !product.sellerEnabled); await refresh(); })} />}{screen === "orders" && <SellerOrders orders={data.orders} update={(orderId, productId, status) => submit(async () => { await api.updateSellerOrderItem(orderId, productId, status); await refresh(); setMessage("Order item status updated."); })} />}{screen === "wallet" && <SellerWallet wallet={data.wallet} />}{screen === "kyc" && <SellerKyc seller={seller} save={(type, payload) => submit(async () => { await api.sellerUploadKyc(type, payload); await refresh(); setMessage("Document submitted for approval."); })} />}{screen === "bank" && <SellerBank seller={seller} save={(payload) => submit(async () => { await api.sellerUpdateBank(payload); await refresh(); setMessage("Bank details updated."); })} />}{screen === "password" && <SellerPassword save={(payload) => submit(async () => { const result = await api.sellerChangePassword(payload); setMessage(result.message); })} />}</main></div>;
}

function SellerDashboard({ data }) {
  const seller = data.seller || {};
  const products = data.products || [];
  const orders = data.recentOrders || [];
  const onNavigate = (target) => window.dispatchEvent(new CustomEvent("seller-dashboard-navigate", { detail: target }));
  const statuses = ["Pending", "Processing", "Shipped", "Delivered", "Cancelled", "Returned"];
  const statusCounts = Object.fromEntries(statuses.map((status) => [status, orders.filter((order) => order.status === status || order.items?.some((item) => item.sellerStatus === status)).length]));
  const recentOrders = orders.slice(0, 5);
  const commission = Number(data.sales || 0) * Number(data.commissionRate ?? 20) / 100;
  const health = Math.round(([seller?.approvalStatus === "approved", products.length > 0, orders.length > 0, seller?.kyc?.pan?.status === "approved"].filter(Boolean).length / 4) * 100);
  const cards = [[ShoppingCart, "Total Sales", money(data.sales), "purple"], [PackageCheck, "Total Orders", data.ordersCount || 0, "orange"], [Boxes, "Total Products", data.productsCount || 0, "pink"], [WalletCards, "Wallet Balance", money(data.walletBalance), "green"], [CircleDollarSign, "Commission", money(commission), "yellow"]];
  return <div className="sellerDashboardV2">
    <section className="sellerWelcomeBanner"><div><h2>Welcome back, {seller?.companyName || "Seller"}! 👋</h2><p>Let&apos;s grow your business and increase your sales today.</p><button type="button" onClick={() => onNavigate("products")}>Explore Growth Tips →</button></div><div className="sellerGrowthArt"><TrendingUp /><span>₹</span><BarChart3 /></div></section>
    <section className="sellerSaleBanner"><div><h3>Mega Sale is Live!</h3><p>Get more visibility and boost your sales.</p><button type="button" onClick={() => onNavigate("products")}>Join Now</button></div><Gift /></section>
    <section className="sellerKpiGrid">{cards.map(([Icon, label, value, tone]) => <article className={tone} key={label}><span className="sellerKpiIcon"><Icon /></span><small>{label}</small><strong>{value}</strong><em>↑ Live seller data</em><svg viewBox="0 0 120 30" aria-hidden="true"><path d="M2 25 C15 22,18 8,30 17 S48 26,56 12 S72 8,80 19 S99 22,118 5" /></svg></article>)}</section>
    <section className="sellerSalesOverview"><header><div><h3>Sales Overview</h3><strong>{money(data.sales)}</strong><span>↑ Seller lifetime sales</span></div><select aria-label="Sales period"><option>This Month</option><option>Last Month</option></select></header><svg className="sellerSalesChart" viewBox="0 0 700 220" preserveAspectRatio="none" aria-label="Sales trend"><defs><linearGradient id="sellerChartFill" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#7834ed" stopOpacity=".32"/><stop offset="1" stopColor="#7834ed" stopOpacity=".02"/></linearGradient></defs><path className="area" d="M0 185 C55 130,80 175,120 105 S180 160,230 78 S295 165,345 125 S400 155,450 72 S510 150,560 82 S630 135,700 95 L700 220 L0 220Z"/><path className="line" d="M0 185 C55 130,80 175,120 105 S180 160,230 78 S295 165,345 125 S400 155,450 72 S510 150,560 82 S630 135,700 95"/></svg><div className="sellerChartStats"><span>Today&apos;s Sales<strong>{money(data.sales ? data.sales / 30 : 0)}</strong></span><span>Today&apos;s Orders<strong>{Math.ceil((data.ordersCount || 0) / 30)}</strong></span><span>Avg. Order Value<strong>{money(data.ordersCount ? data.sales / data.ordersCount : 0)}</strong></span><span>Approval<strong>{data.approvalStatus || "Pending"}</strong></span></div></section>
    <aside className="sellerDashboardSide"><section><header><h3>Order Status</h3><button type="button" onClick={() => onNavigate("orders")}>View All</button></header>{statuses.map((status) => <p key={status}><span className={status.toLowerCase()}>{status[0]}</span>{status}<strong>{statusCounts[status]}</strong></p>)}</section><section><header><h3>Business Health</h3><button type="button" onClick={() => onNavigate("profile")}>Details</button></header><div className="sellerHealth"><strong>{health}%</strong><span>{health >= 75 ? "Great Performance! 🎉" : "Complete your setup"}</span></div><p>Profile approved <strong>{seller?.approvalStatus === "approved" ? "100%" : "Pending"}</strong></p><p>Products live <strong>{products.length}</strong></p><p>Order fulfilment <strong>{orders.length ? `${Math.round(((statusCounts.Delivered || 0) / orders.length) * 100)}%` : "—"}</strong></p></section></aside>
    <nav className="sellerQuickActions" aria-label="Quick actions">{[[Boxes, "Add Product", "products"], [ShoppingCart, "Manage Orders", "orders"], [Megaphone, "Promotions", "products"], [WalletCards, "Payouts", "wallet"], [BarChart3, "Reports", "dashboard"]].map(([Icon, label, target]) => <button key={label} type="button" onClick={() => onNavigate(target)}><Icon /><span><strong>{label}</strong><small>Open seller tools</small></span></button>)}</nav>
    <section className="sellerRecentOrders"><header><h3>Recent Orders</h3><button type="button" onClick={() => onNavigate("orders")}>View All</button></header><div className="tableWrap"><table><thead><tr><th>Order ID</th><th>Customer</th><th>Date</th><th>Amount</th><th>Status</th></tr></thead><tbody>{recentOrders.map((order) => <tr key={order._id}><td>{order.orderNumber}</td><td>{order.customer?.name || order.address?.name || "Customer"}</td><td>{new Date(order.createdAt).toLocaleDateString("en-IN")}</td><td>{money(order.items?.reduce((sum, item) => sum + item.price * item.quantity, 0))}</td><td><span className={`status ${String(order.status).toLowerCase()}`}>{order.status}</span></td></tr>)}{!recentOrders.length && <tr><td colSpan="5">Your latest orders will appear here.</td></tr>}</tbody></table></div></section>
  </div>;
}
function SellerProfile({ seller, save }) { const locked = seller.approvalStatus === "approved"; const [form, setForm] = useState({ companyName: seller.companyName, address: seller.address, city: seller.city, state: seller.state, pinCode: seller.pinCode, mobile: seller.mobile, profileImage: seller.profileImage || "" }); return <form className="panel formGrid twoColumn" onSubmit={(event) => { event.preventDefault(); save(form); }}>{locked && <div className="notice full">Approved business details are locked. You can still change your profile photo.</div>}<div className="partnerProfilePreview full">{form.profileImage ? <img src={form.profileImage} alt="Seller profile" /> : <div className="partnerProfileFallback">{seller.companyName?.[0]}</div>}<label className="secondaryButton">Change photo<input hidden type="file" accept="image/*" onChange={async (event) => { const file = event.target.files?.[0]; if (file) { const profileImage = (await api.uploadImage(file, "seller-profile")).url; setForm((current) => ({ ...current, profileImage })); if (locked) save({ profileImage }); } }} /></label></div>{Object.entries(form).filter(([field]) => field !== "profileImage").map(([field, value]) => <label className={field === "address" ? "full" : ""} key={field}>{field.replace(/([A-Z])/g, " $1")}<input required disabled={locked} value={value} onChange={(event) => setForm({ ...form, [field]: event.target.value })} /></label>)}<label>Email<input disabled value={seller.email} /></label><label>GST number<input disabled value={seller.gstNumber} /></label>{!locked && <button className="primaryButton">Save profile</button>}</form>; }
function SellerProducts({ products, options, save, toggle, busy }) { const [editing, setEditing] = useState(null); const [form, setForm] = useState(blankProduct); const edit = (product) => { setEditing(product); setForm({ ...blankProduct, ...product, category: product.category?._id || product.category || "", taxCategory: product.taxCategory?._id || product.taxCategory || "", tags: product.tags?.join(", ") || "" }); }; const submitForm = (event) => { event.preventDefault(); save(editing, { ...form, price: Number(form.price), offerPrice: form.offerPrice === "" ? Number(form.price) : Number(form.offerPrice), stock: form.isStockManageable ? Number(form.stock || 0) : 0, lowStockThreshold: Number(form.lowStockThreshold || 0), tags: String(form.tags).split(",").map((tag) => tag.trim()).filter(Boolean), taxCategory: form.taxCategory || undefined, videoUrl: form.displayType === "Reel" ? form.videoUrl : undefined, media: form.mainImage ? [{ url: form.mainImage, type: "image", isMain: true, alt: form.name }] : [] }); setEditing(null); setForm(blankProduct); }; return <><form className="panel formGrid twoColumn" onSubmit={submitForm}><h3 className="full">{editing ? `Edit ${editing.name}` : "Add product"}</h3>{[["name", "Product name"], ["sku", "SKU"], ["price", "Sale price"], ["offerPrice", "Offer price"], ["stock", "Stock"], ["lowStockThreshold", "Low stock alert"]].map(([field, label]) => <label key={field}>{label}<input type={["price", "offerPrice", "stock", "lowStockThreshold"].includes(field) ? "number" : "text"} min="0" step="0.01" required={!(["offerPrice"].includes(field))} disabled={field === "stock" && !form.isStockManageable} value={form[field]} onChange={(event) => setForm({ ...form, [field]: event.target.value })} /></label>)}<label>Category<CategoryTreeSelect categories={options.categories} value={form.category} onChange={(category) => setForm({ ...form, category })} required /></label><label>Tax category<select value={form.taxCategory} onChange={(event) => setForm({ ...form, taxCategory: event.target.value })}><option value="">None</option>{options.taxCategories.map((item) => <option key={item._id} value={item._id}>{item.name} ({item.rate}%)</option>)}</select></label><label>Entered price includes GST?<select value={form.priceIncludesTax ? "yes" : "no"} onChange={(event) => setForm({ ...form, priceIncludesTax: event.target.value === "yes" })}><option value="yes">Yes — GST included</option><option value="no">No — add GST</option></select></label><GstPricePreview price={form.price} offerPrice={form.offerPrice} taxCategory={options.taxCategories.find((tax) => tax._id === form.taxCategory)} priceIncludesTax={form.priceIncludesTax} /><label>Display type<select value={form.displayType} onChange={(event) => setForm({ ...form, displayType: event.target.value, videoUrl: event.target.value === "Reel" ? form.videoUrl : "" })}><option>Product</option><option>Reel</option></select></label><label className="toggleRow"><input type="checkbox" checked={form.isStockManageable} onChange={(event) => setForm({ ...form, isStockManageable: event.target.checked })} /><span>Manage stock</span></label><label className="full">Short description<input required value={form.shortDescription} onChange={(event) => setForm({ ...form, shortDescription: event.target.value })} /></label><label className="full">Detailed description<textarea required value={form.detailedDescription} onChange={(event) => setForm({ ...form, detailedDescription: event.target.value })} /></label><label>Tags<input value={form.tags} onChange={(event) => setForm({ ...form, tags: event.target.value })} /></label>{form.displayType === "Reel" && <label>Upload reel<input type="file" accept="video/*" required={!form.videoUrl} onChange={async (event) => { try { setForm({ ...form, videoUrl: await reelData(event.target.files[0]) }); } catch (error) { window.alert(error.message); event.target.value = ""; } }} /></label>}<label className="full">Product image<input type="file" accept="image/*" onChange={async (event) => setForm({ ...form, mainImage: await fileData(event.target.files[0]) })} /></label><button className="primaryButton" disabled={busy}>{editing ? "Submit changes" : "Submit product"}</button>{editing && <button className="secondaryButton" type="button" onClick={() => { setEditing(null); setForm(blankProduct); }}>Cancel</button>}</form><div className="panel tableWrap"><table><thead><tr><th>Product</th><th>Price</th><th>Approval</th><th>Admin note</th><th>Store visibility</th><th>Action</th></tr></thead><tbody>{products.map((product) => <tr key={product._id}><td><strong>{product.name}</strong><br />{product.sku}</td><td>{money(product.offerPrice || product.price)}</td><td>{product.approvalStatus.replaceAll("_", " ")}</td><td>{product.approvalNote || "—"}</td><td><button type="button" onClick={() => toggle(product)}>{product.sellerEnabled ? "Enabled" : "Disabled"}</button></td><td><button type="button" onClick={() => edit(product)}>Edit</button></td></tr>)}</tbody></table></div></>; }
function SellerOrders({ orders, update }) { const statuses = ["Accepted", "Processing", "Packed", "Shipped", "Delivered", "Cancelled"]; return <div className="panel tableWrap"><table><thead><tr><th>Order</th><th>Customer</th><th>Product</th><th>Quantity</th><th>Amount</th><th>Item status</th></tr></thead><tbody>{orders.flatMap((order) => order.items.map((item) => <tr key={`${order._id}-${item.product}`}><td>{order.orderNumber}<br />{new Date(order.createdAt).toLocaleDateString("en-IN")}</td><td>{order.customer?.name || order.address?.name}<br />{order.customer?.email || order.address?.email}</td><td>{item.name}<br />{item.sku}</td><td>{item.quantity}</td><td>{money(item.price * item.quantity)}</td><td><select value={item.sellerStatus || "Pending"} onChange={(event) => update(order._id, item.product, event.target.value)}><option>Pending</option>{statuses.map((status) => <option key={status}>{status}</option>)}</select></td></tr>))}</tbody></table></div>; }
function SellerWallet({ wallet }) { return <><div className="summaryGrid referralSummary"><article><span>Wallet balance</span><strong>{money(wallet.walletBalance)}</strong></article><article><span>Admin commission</span><strong>{wallet.commissionRate ?? 20}%</strong></article></div><div className="panel tableWrap"><table><thead><tr><th>Date</th><th>Order</th><th>Product</th><th>Gross</th><th>Commission</th><th>Net credited</th></tr></thead><tbody>{(wallet.payouts || []).map((item) => <tr key={item._id}><td>{new Date(item.createdAt).toLocaleDateString("en-IN")}</td><td>{item.order?.orderNumber}</td><td>{item.product?.name}<br />{item.product?.sku}</td><td>{money(item.grossAmount)}</td><td>{item.commissionRate}% · {money(item.commissionAmount)}</td><td>{money(item.netAmount)}</td></tr>)}{!wallet.payouts?.length && <tr><td colSpan="6">No completed-order credits yet.</td></tr>}</tbody></table></div></>; }
function SellerKyc({ seller, save }) {
  const [previewDocument, setPreviewDocument] = useState(null);
  const docs = [["pan", "PAN Card"], ["addressProof", "Address Proof"], ["aadharFront", "Owner / Company Aadhar Card (Front)"], ["aadharBack", "Owner / Company Aadhar Card (Back)"], ["cancelledCheque", "Bank KYC (Cancelled Cheque)"], ...(seller.isGstRegistered ? [["gstCertificate", "GST Certificate"]] : [])];
  const sellerLocked = seller.approvalStatus === "approved";
  return <>{sellerLocked && <div className="notice">KYC approved. Your submitted documents are shown below.</div>}<div className="cardGrid sellerKycGrid">{docs.map(([type, label]) => {
    const doc = seller.kyc?.[type] || {};
    const locked = sellerLocked || ["pending", "approved"].includes(doc.status);
    return <form className="panel sellerKycCard" key={type} onSubmit={async (event) => { event.preventDefault(); save(type, { file: await fileData(event.currentTarget.elements.file.files[0]) }); }}>
      <div><h3>{label}</h3><span className={`status ${doc.status}`}>{(doc.status || "not submitted").replace("_", " ")}</span></div>
      {doc.rejectionReason && <p className="errorText">{doc.rejectionReason}</p>}
      {doc.file && <button className="sellerDocumentPreview" type="button" onClick={() => setPreviewDocument({ url: doc.file, title: label })}>{String(doc.file).toLowerCase().includes(".pdf") ? <span>PDF</span> : <img src={doc.file} alt={`${label} preview`} />}<small>Click to open document</small></button>}
      {!locked && <><label>Document<input name="file" type="file" accept="image/*,.pdf" required /></label><button className="primaryButton">{doc.status === "rejected" ? "Re-upload" : "Submit for approval"}</button></>}
    </form>;
  })}</div>{previewDocument && <DocumentPreviewModal document={previewDocument} onClose={() => setPreviewDocument(null)} />}</>;
}
function SellerBank({ seller, save }) {
  const locked = seller.approvalStatus === "approved";
  const [form, setForm] = useState({ ...(seller.bankDetails || {}), confirmAccountNumber: seller.bankDetails?.accountNumber || "" });
  const [lookupStatus, setLookupStatus] = useState("");
  const lookup = async (value) => {
    const ifsc = value.toUpperCase().replace(/\s/g, "").slice(0, 11);
    setForm((current) => ({ ...current, ifsc, bankName: "", branch: "" }));
    if (ifsc.length !== 11) return;
    setLookupStatus("Finding bank and branch…");
    try {
      const bank = await api.sellerLookupIfsc(ifsc);
      setForm((current) => ({ ...current, ifsc: bank.ifsc, bankName: bank.bankName, branch: bank.branch }));
      setLookupStatus("");
    } catch (error) { setLookupStatus(error.message); }
  };
  const numbersMatch = Boolean(form.accountNumber) && form.accountNumber === form.confirmAccountNumber;
  return <form className="panel formGrid twoColumn sellerBankForm" onSubmit={(event) => { event.preventDefault(); if (numbersMatch) save(form); }}>
    {locked && <div className="notice full">Approved seller bank information is locked.</div>}
    <label>Account holder name<input required disabled={locked} value={form.accountHolderName || ""} onChange={(event) => setForm({ ...form, accountHolderName: event.target.value })} /></label>
    <label>IFSC code<input required disabled={locked} minLength="11" maxLength="11" value={form.ifsc || ""} onChange={(event) => lookup(event.target.value)} placeholder="Example: HDFC0001234" /></label>
    <label>Bank name<input readOnly required value={form.bankName || ""} placeholder="Filled from IFSC" /></label>
    <label>Branch<input readOnly required value={form.branch || ""} placeholder="Filled from IFSC" /></label>
    <label>Account number<input required disabled={locked} inputMode="numeric" value={form.accountNumber || ""} onChange={(event) => setForm({ ...form, accountNumber: event.target.value.replace(/\D/g, "") })} /></label>
    <label>Confirm account number<input required disabled={locked} inputMode="numeric" value={form.confirmAccountNumber || ""} onChange={(event) => setForm({ ...form, confirmAccountNumber: event.target.value.replace(/\D/g, "") })} /></label>
    {lookupStatus && <p className="accountNotice full">{lookupStatus}</p>}
    {form.confirmAccountNumber && !numbersMatch && <p className="errorText full">Account numbers do not match.</p>}
    {!locked && <button className="primaryButton" disabled={!numbersMatch || !form.bankName || !form.branch}>Save bank details</button>}
  </form>;
}
function SellerPassword({ save }) { const [form, setForm] = useState({ currentPassword: "", newPassword: "", confirmPassword: "" }); return <form className="panel formGrid" onSubmit={(event) => { event.preventDefault(); if (form.newPassword === form.confirmPassword) save({ currentPassword: form.currentPassword, newPassword: form.newPassword }); }}><label>Current password<input type="password" required value={form.currentPassword} onChange={(event) => setForm({ ...form, currentPassword: event.target.value })} /></label><label>New 4-digit password<input type="password" inputMode="numeric" pattern="\d{4}" required value={form.newPassword} onChange={(event) => setForm({ ...form, newPassword: event.target.value.replace(/\D/g, "").slice(0, 4) })} /></label><label>Confirm password<input type="password" inputMode="numeric" pattern="\d{4}" required value={form.confirmPassword} onChange={(event) => setForm({ ...form, confirmPassword: event.target.value.replace(/\D/g, "").slice(0, 4) })} /></label>{form.confirmPassword && form.newPassword !== form.confirmPassword && <span className="errorText">Passwords do not match.</span>}<button className="primaryButton" disabled={form.newPassword !== form.confirmPassword}>Change password</button></form>; }
