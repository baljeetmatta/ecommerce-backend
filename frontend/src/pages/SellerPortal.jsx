import { useEffect, useState } from "react";
import { ArrowRight, Award, BadgeIndianRupee, BarChart3, Bell, Building2, Boxes, CalendarDays, Check, CircleDollarSign, Eye, EyeOff, FileCheck2, Gift, Headphones, ImagePlus, KeyRound, LayoutDashboard, LockKeyhole, LogOut, Mail, Menu, Megaphone, MoreVertical, PackageCheck, Printer, Search, ShieldCheck, ShoppingCart, Star, Store, TrendingUp, Truck, UserRound, Users, WalletCards, X } from "lucide-react";
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

function SellerRegistrationSuccess({ result, onContinue }) {
  const seller = result.seller;
  const details = [
    { label: "Seller ID", value: seller.sellerNumber, icon: Store, tone: "purple" },
    { label: "Temporary Password", value: result.temporaryPassword, icon: LockKeyhole, tone: "green" },
    { label: "Registered Email", value: seller.email, icon: Mail, tone: "blue" },
    { label: "Company", value: seller.companyName, icon: Building2, tone: "pink" },
    { label: "GST Status", value: seller.isGstRegistered ? "GST Registered" : "Not GST Registered", icon: ShieldCheck, tone: "gold" },
    { label: "Joining Date", value: new Date(seller.createdAt || Date.now()).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" }), icon: CalendarDays, tone: "dark" }
  ];
  const benefits = [
    { title: "List Products", text: "Add products and grow your catalogue", icon: Boxes, tone: "purple" },
    { title: "Manage Orders", text: "Track and fulfil customer orders", icon: PackageCheck, tone: "blue" },
    { title: "Secure Payouts", text: "Manage earnings and withdrawals", icon: WalletCards, tone: "green" },
    { title: "Grow Sales", text: "Track performance from your dashboard", icon: TrendingUp, tone: "orange" }
  ];
  return <main className="partnerSuccessPage sellerSuccessPage"><header className="partnerSuccessHeader"><div className="partnerSuccessBrand"><span className="brandCart"><ShoppingCart size={27} /><Check size={14} /></span><div><strong><i>HRS</i> BASKET</strong><small>Seller Program</small></div></div><div className="partnerSuccessStatus"><ShieldCheck size={20} /><span>Account Created</span><strong>Success</strong></div></header><div className="partnerSuccessStripe" /><section className="partnerSuccessCanvas"><div className="successConfetti" aria-hidden="true">{Array.from({ length: 24 }, (_, index) => <i key={index} />)}</div><div className="successCheck"><Check size={55} strokeWidth={4} /></div><h1>Congratulations!</h1><h2>Welcome to the <span>HRS</span> Seller Program</h2><p className="successLead">Your email has been verified and your seller account has been created successfully.</p><div className="membershipBadge"><Store size={29} /><span><strong>Registered Seller</strong><small>★★★★★</small></span></div><section className="partnerAccountCard"><h3><Store size={22} /> Your Seller Account Details</h3><div>{details.map(({ label, value, icon: Icon, tone }) => <dl key={label}><dt><Icon size={18} />{label}</dt><dd className={tone}>{value}</dd></dl>)}</div></section><section className="partnerWelcomeBanner"><div className="welcomeShield"><ShieldCheck size={56} /></div><div><h3>You are now part of the HRS <span>Seller Family!</span></h3><p>Save your temporary password, then sign in to start setting up your store.</p><button onClick={onContinue}>Continue to Login <ArrowRight size={17} /></button></div><div className="welcomeGift"><Gift size={61} /><span>● ● ●</span></div></section><section className="partnerBenefits">{benefits.map(({ title, text, icon: Icon, tone }) => <article key={title} className={tone}><span><Icon size={29} /></span><h3>{title}</h3><p>{text}</p></article>)}</section></section><footer className="partnerSuccessFooter"><ShieldCheck size={38} /><div><strong>Thank you for joining the HRS Seller Program.</strong><span>We look forward to helping your business grow.</span></div><div className="footerBrand"><strong><i>HRS</i> BASKET</strong><small>Seller Program</small></div></footer></main>;
}
const printSellerDocument = (order, type) => {
  const packing = type === "packing";
  const popup = window.open("", "_blank", "width=900,height=700");
  if (!popup) throw new Error("Allow pop-ups to print this document");
  const itemTotal = (item) => Number(item.price || 0) * Number(item.quantity || 0);
  const totalGst = (order.items || []).reduce((sum, item) => sum + Number(item.gstAmount || 0) * Number(item.quantity || 0), 0);
  const subtotal = (order.items || []).reduce((sum, item) => sum + itemTotal(item), 0);
  const grandTotal = subtotal + (packing ? 0 : Number(order.shippingTotal || 0));
  const rows = (order.items || []).map((item) => `<tr><td>${item.name}<br><small>SKU: ${item.sku}</small></td><td>${item.quantity}</td>${packing ? "" : `<td>${money(item.price)}</td><td>${Number(item.gstRate || 0)}%</td><td>${money(Number(item.gstAmount || 0) * item.quantity)}</td><td>${money(itemTotal(item))}</td>`}</tr>`).join("");
  const qrData = encodeURIComponent(JSON.stringify({ order: order.orderNumber, invoice: order.invoiceNumber, total: grandTotal, status: order.status }));
  popup.document.write(`<!doctype html><html><head><title>${packing ? "Packing Slip" : "Invoice"} ${order.orderNumber}</title><style>body{font:13px Arial;padding:30px;color:#222}header,.addresses,.invoiceFooter{display:flex;justify-content:space-between;gap:24px}header{border-bottom:2px solid;margin-bottom:20px}.addresses>div{width:33%;padding:12px;border:1px solid #ddd}table{width:100%;border-collapse:collapse;margin-top:22px}th,td{padding:9px;border:1px solid #ccc;text-align:left}.totals{width:330px;margin:18px 0 0 auto}.totals p{display:flex;justify-content:space-between;margin:0;padding:7px;border-bottom:1px solid #ddd}.totals .grand{font-size:17px;font-weight:bold}.invoiceQr{width:115px;height:115px}.invoiceFooter{align-items:end;margin-top:20px}</style></head><body><header><div><h1>${packing ? "PACKING SLIP" : "TAX INVOICE"}</h1><h3>${order.invoiceStore?.shopName || "HRS Basket"}</h3></div><div><b>Order:</b> ${order.orderNumber}<br>${packing ? "" : `<b>Invoice:</b> ${order.invoiceNumber || ""}<br>`}<b>Date:</b> ${new Date(order.createdAt).toLocaleDateString("en-IN")}</div></header><section class="addresses"><div><b>Store address</b><p>${order.invoiceStore?.address || "—"}<br>${order.invoiceStore?.email || ""}<br>${order.invoiceStore?.phone || ""}</p></div><div><b>Seller address</b><p>${order.invoiceStore?.sellerName || "Seller"}<br>${order.invoiceStore?.sellerAddress || "—"}<br>${order.invoiceStore?.sellerGstNumber ? `GSTIN: ${order.invoiceStore.sellerGstNumber}` : ""}</p></div><div><b>Ship to</b><p>${order.address?.name || ""}<br>${order.address?.shippingAddress || order.address?.billingAddress || ""}<br>${[order.address?.city, order.address?.state, order.address?.postalCode].filter(Boolean).join(", ")}<br>${order.address?.phone || ""}</p></div></section><table><thead><tr><th>Product</th><th>Qty</th>${packing ? "" : "<th>Price</th><th>GST %</th><th>GST amount</th><th>Total</th>"}</tr></thead><tbody>${rows}</tbody></table>${packing ? "" : `<div class="totals"><p><span>Items total</span><b>${money(subtotal)}</b></p><p><span>Total GST collected</span><b>${money(totalGst)}</b></p><p><span>Shipping</span><b>${money(order.shippingTotal)}</b></p><p class="grand"><span>Invoice total</span><b>${money(grandTotal)}</b></p></div>`}<div class="invoiceFooter"><small>Scan the QR code to read the order summary.</small><img class="invoiceQr" alt="Order QR code" src="https://api.qrserver.com/v1/create-qr-code/?size=180x180&data=${qrData}" /></div></body></html>`);
  popup.document.close(); popup.focus(); window.setTimeout(() => popup.print(), 600);
};
const fileData = async (file) => (await api.uploadDocument(file, "seller-kyc")).url;
const reelData = async (file) => {
  if (file.size > 50 * 1024 * 1024) throw new Error("Reel must be 50 MB or smaller");
  return (await api.uploadVideo(file)).url;
};
const referralFromHash = () => new URLSearchParams(window.location.hash.split("?")[1] || "").get("ref")?.trim().toUpperCase() || "";
const blankRegistration = { name: "", companyName: "", businessName: "", address: "", city: "", state: "", gstState: "", businessState: "", pinCode: "", mobile: "", email: "", isGstRegistered: false, gstNumber: "", gstCertificate: "", declarationAccepted: false, referralSellerId: referralFromHash() };
const blankProduct = { name: "", sku: "", price: "", offerPrice: "", category: "", taxCategory: "", priceIncludesTax: true, displayType: "Product", stock: "", lowStockThreshold: 10, shortDescription: "", detailedDescription: "", mainImage: "", videoUrl: "", tags: "", isStockManageable: true };
const sellerMenuRoutes = new Set(["dashboard", "profile", "products", "orders", "returns", "wallet", "payouts", "reviews", "kyc", "bank", "password"]);
const sellerScreenFromHash = () => {
  const route = window.location.hash.match(/^#\/seller\/([^/?]+)/)?.[1];
  return sellerMenuRoutes.has(route) ? route : "dashboard";
};

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
        <label>Seller name<input required value={registration.name} onChange={(event) => update("name", event.target.value)} /></label>
        <label>Company name<input required value={registration.companyName} onChange={(event) => update("companyName", event.target.value)} /></label>
        <label>Mobile<input required value={registration.mobile} onChange={(event) => update("mobile", event.target.value)} /></label>
        <label>Email<input type="email" required value={registration.email} onChange={(event) => update("email", event.target.value)} /></label>
        <label>Pin code<input required inputMode="numeric" value={registration.pinCode} onChange={(event) => update("pinCode", event.target.value.replace(/\D/g, ""))} /></label>
        <label className="full">Business address<input required value={registration.address} onChange={(event) => update("address", event.target.value)} /></label>
        <label>City<input required value={registration.city} onChange={(event) => update("city", event.target.value)} /></label>
        <label>State<input required value={registration.state} onChange={(event) => update("state", event.target.value)} /></label>
        <label className="full">Referral Seller ID (optional)<input pattern="(?:\d{6}|HRS\d{6})" maxLength="9" placeholder="123456 or HRS123456" value={registration.referralSellerId} onChange={(event) => update("referralSellerId", event.target.value.toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 9))} /><small>Enter the 6-digit Seller ID, with or without the HRS prefix.</small></label>
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
  const [search, setSearch] = useState("");
  const [approvalFilter, setApprovalFilter] = useState("all");
  const backToList = () => { setPage("list"); setEditing(null); setViewing(null); };
  const saveProduct = async (payload) => { await save(editing, payload); backToList(); };
  if (page === "form") return <ProductCreatePage categories={options.categories || []} taxCategories={options.taxCategories || []} products={products} initialProduct={editing} onSave={saveProduct} onBack={backToList} hideCostPrice hideStatus={!editing} />;
  if (page === "view" && viewing) return <SellerProductDetails product={viewing} onBack={backToList} onEdit={() => { setEditing(viewing); setPage("form"); }} />;
  const filteredProducts = products.filter((product) => `${product.name} ${product.sku}`.toLowerCase().includes(search.toLowerCase()) && (approvalFilter === "all" || (approvalFilter === "active" ? product.status === "active" : product.approvalStatus === "approved")));
  return <section className="contentStack sellerProductWorkspace"><div className="panel sellerProductToolbar"><div><h2>Your products</h2><p className="mutedText">Search inventory and manage approved or active listings.</p></div><label className="searchBox"><Search size={16} /><input placeholder="Search product name or SKU" value={search} onChange={(event) => setSearch(event.target.value)} /></label><select value={approvalFilter} onChange={(event) => setApprovalFilter(event.target.value)}><option value="all">All products</option><option value="approved">Approved</option><option value="active">Active</option></select><button className="primaryButton sellerAddProductButton" type="button" onClick={() => { setEditing(null); setPage("form"); }}>+ Add product</button></div><div className="panel tableWrap"><table><thead><tr><th>Image</th><th>Product / SKU</th><th>Category / Subcategory</th><th>Stock</th><th>Price</th><th>Approval</th><th>Visibility</th><th>Action</th></tr></thead><tbody>{filteredProducts.map((product) => <tr key={product._id}><td>{product.mainImage ? <img className="sellerProductThumb" src={product.mainImage} alt={product.name} /> : <span className="sellerProductThumb empty">No image</span>}</td><td><strong>{product.name}</strong><br /><small>SKU: {product.sku}</small></td><td>{product.category?.parent?.name || product.category?.parent?.title ? `${product.category.parent.name || product.category.parent.title} / ` : ""}{product.category?.name || "—"}</td><td><strong>{product.isStockManageable ? product.stock : "Not managed"}</strong></td><td>{money(product.offerPrice || product.price)}</td><td><span className={`status ${product.approvalStatus === "approved" ? "approved" : "pending"}`}>{product.approvalStatus.replaceAll("_", " ")}</span>{product.approvalNote && <small className="errorText">{product.approvalNote}</small>}</td><td><button type="button" onClick={() => toggle(product)}>{product.sellerEnabled ? "Active" : "Inactive"}</button></td><td><div className="sellerProductActions"><button type="button" onClick={() => { setViewing(product); setPage("view"); }}>View</button><button type="button" disabled={busy} onClick={() => { setEditing(product); setPage("form"); }}>Edit</button></div></td></tr>)}{!filteredProducts.length && <tr><td colSpan="8">No products match this search.</td></tr>}</tbody></table></div></section>;
}

function SellerProductDetails({ product, onBack, onEdit }) {
  const images = (product.media || []).filter((item) => item.type === "image");
  const detailRows = [["SKU", product.sku], ["Category", product.category?.name], ["HSN Code", product.hsnCode], ["Brand / Manufacturer", product.manufacturerBrand], ["Price", money(product.price)], ["Offer price", money(product.offerPrice || product.price)], ["Tax", product.taxCategory ? `${product.taxCategory.name} (${product.taxCategory.rate}%)` : "None"], ["Stock", product.isStockManageable ? product.stock : "Not managed"], ["Volumetric weight", product.volumetricWeight], ["Length", product.length], ["Height", product.height], ["Warranty", product.warranty], ["Approval", product.approvalStatus?.replaceAll("_", " ")], ["Store visibility", product.sellerEnabled ? "Enabled" : "Disabled"]];
  return <section className="contentStack sellerProductDetailPage"><div className="panelHeader"><button className="inlineButton" type="button" onClick={onBack}>← Back to products</button><button className="primaryButton" type="button" onClick={onEdit}>Edit product</button></div><article className="panel sellerProductDetail"><header><div><span className="eyebrow">Product details</span><h2>{product.name}</h2><p>{product.shortDescription}</p></div>{product.mainImage && <img src={product.mainImage} alt={product.name} />}</header><dl>{detailRows.filter(([, value]) => value !== undefined && value !== "").map(([label, value]) => <div key={label}><dt>{label}</dt><dd>{value || "—"}</dd></div>)}</dl><section><h3>Detailed description</h3><p className="sellerProductDescription">{product.detailedDescription || "No detailed description added."}</p></section>{product.variationOptions?.length > 0 && <section><h3>Variations</h3><div className="sellerVariationSummary">{product.variationOptions.map((option) => <div key={option.name}><strong>{option.name}</strong><span>{option.values?.join(", ")}</span></div>)}</div></section>}{images.length > 0 && <section><h3>Product images</h3><div className="sellerProductGallery">{images.map((item, index) => <img key={`${item.url.slice(0, 20)}-${index}`} src={item.url} alt={item.alt || product.name} />)}</div></section>}{product.videoUrl && <section><h3>Product reel</h3><video className="sellerProductVideo" src={product.videoUrl} controls /></section>}{product.approvalNote && <div className="notice">Admin note: {product.approvalNote}</div>}</article></section>;
}

export default function SellerPortal({ onBack, settings = {} }) {
  const [seller, setSeller] = useState(sellerAuthStore.seller);
  const [screen, setScreen] = useState(seller ? sellerScreenFromHash() : window.location.hash.startsWith("#/seller/register") ? "register" : "login");
  const [registration, setRegistration] = useState(blankRegistration);
  const [credentials, setCredentials] = useState(null);
  const [login, setLogin] = useState({ identifier: "", password: "" });
  const [showLoginPassword, setShowLoginPassword] = useState(false);
  const [registrationOtp, setRegistrationOtp] = useState({ challengeId: "", code: "" });
  const [data, setData] = useState({ dashboard: {}, products: [], orders: [], wallet: { payouts: [] }, withdrawals: [], options: { categories: [], taxCategories: [] } });
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const [portalReady, setPortalReady] = useState(!seller);
  const [loadError, setLoadError] = useState("");
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const registrationCompleteRoute = "#/seller/registration-complete";
  const showRegistrationComplete = (result) => {
    setCredentials(result);
    setRegistrationOtp({ challengeId: "", code: "" });
    setScreen("registered");
    setMessage(result.message || "Seller registration completed successfully.");
    if (window.location.hash.split("?")[0] !== registrationCompleteRoute) window.history.pushState({ sellerRegistrationComplete: true }, "", registrationCompleteRoute);
  };
  useEffect(() => {
    if (!mobileNavOpen) return undefined;
    const closeOnEscape = (event) => { if (event.key === "Escape") setMobileNavOpen(false); };
    document.body.classList.add("sellerMenuOpen");
    window.addEventListener("keydown", closeOnEscape);
    return () => { document.body.classList.remove("sellerMenuOpen"); window.removeEventListener("keydown", closeOnEscape); };
  }, [mobileNavOpen]);
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
    const sidebarWallet = document.createElement("button");
    sidebarWallet.type = "button";
    sidebarWallet.className = "sellerSidebarWallet";
    sidebarWallet.innerHTML = `<span>Wallet Balance</span><strong>${money(seller.walletBalance)}</strong>`;
    sidebarWallet.onclick = () => window.dispatchEvent(new CustomEvent("seller-dashboard-navigate", { detail: "wallet" }));
    nav.append(sidebarWallet);
    const header = workspace.querySelector(".partnerContent > header");
    const identity = document.createElement("div");
    identity.className = "sellerHeaderIdentity";
    const avatar = document.createElement(seller.profileImage ? "img" : "span");
    avatar.className = "sellerHeaderAvatar";
    if (seller.profileImage) { avatar.src = seller.profileImage; avatar.alt = seller.companyName; } else avatar.textContent = seller.companyName?.[0] || "S";
    const text = document.createElement("span");
    const sellerName = document.createElement("strong");
    const sellerMeta = document.createElement("small");
    sellerName.textContent = seller.companyName;
    sellerMeta.textContent = `Seller · ${seller.sellerNumber}`;
    text.append(sellerName, sellerMeta);
    identity.append(avatar, text);
    const walletPill = header?.querySelector(".walletPill");
    if (walletPill) header.insertBefore(identity, walletPill);
    else header?.append(identity);
    return () => { button.remove(); sidebarWallet.remove(); identity.remove(); };
  }, [seller]);
  useEffect(() => {
    if (isSaveMessage(message)) showToast(message);
  }, [message]);
  useEffect(() => {
    const syncSellerScreen = () => {
      const route = window.location.hash.split("?")[0];
      if (sellerAuthStore.token) setScreen(sellerScreenFromHash());
      else if (route === registrationCompleteRoute && credentials) setScreen("registered");
      else if (route === registrationCompleteRoute) { window.history.replaceState(null, "", "#/seller/login"); setScreen("login"); }
      else if (route === "#/seller/register") {
        const referralSellerId = referralFromHash();
        setRegistration((current) => ({ ...current, referralSellerId: referralSellerId || current.referralSellerId }));
        setScreen("register");
      }
      else if (["#/seller", "#/seller/login"].includes(route)) setScreen("login");
    };
    window.addEventListener("hashchange", syncSellerScreen);
    window.addEventListener("popstate", syncSellerScreen);
    return () => {
      window.removeEventListener("hashchange", syncSellerScreen);
      window.removeEventListener("popstate", syncSellerScreen);
    };
  }, [credentials]);
  useEffect(() => {
    if (!seller || !sellerMenuRoutes.has(screen)) return;
    const nextHash = `#/seller/${screen}`;
    if (window.location.hash !== nextHash) window.location.hash = nextHash;
  }, [seller, screen]);
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
      api.sellerWithdrawals().then((withdrawals) => setData((current) => ({ ...current, withdrawals }))),
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
  const verifyRegistrationOtp = (event) => { event.preventDefault(); submit(async () => { const result = await api.verifySellerRegistrationOtp(registrationOtp); showRegistrationComplete(result); }); };
  const signIn = (event) => { event.preventDefault(); submit(async () => { const result = await api.sellerLogin(login); sellerAuthStore.token = result.token; sellerAuthStore.seller = result.seller; setSeller(result.seller); setPortalReady(true); setScreen("dashboard"); refresh().catch((error) => { setLoadError(error.message); setMessage(error.message); }); }); };
  const logout = () => { sellerAuthStore.clear(); setSeller(null); setPortalReady(true); setLoadError(""); setScreen("login"); };

  if (!seller && screen === "registered" && credentials) return <SellerRegistrationSuccess result={credentials} onContinue={() => { setLogin({ identifier: credentials.seller.sellerNumber, password: "" }); setMessage(""); window.history.pushState(null, "", "#/seller/login"); setScreen("login"); }} />;
  if (!seller && screen === "login") return <SellerLoginScreen settings={settings} onBack={onBack} message={message} login={login} setLogin={setLogin} busy={busy} onSubmit={signIn} onForgot={() => setScreen("forgot")} onSignup={() => { setScreen("register"); setMessage(""); }} />;
  if (!seller && screen === "login") return <PortalAuthCard portal="Seller" subtitle="Enter your credentials to continue" onBack={onBack}>{message && <div className="notice">{message}</div>}<form className="authForm" onSubmit={signIn}><label><span>Seller ID or email</span><input type="text" autoComplete="username" required value={login.identifier} onChange={(event) => setLogin({ ...login, identifier: event.target.value })} /></label><label><span>Password</span><span className="sellerPasswordField"><input type={showLoginPassword ? "text" : "password"} autoComplete="current-password" required value={login.password} onChange={(event) => setLogin({ ...login, password: event.target.value })} /><button type="button" onClick={() => setShowLoginPassword((visible) => !visible)} aria-label={showLoginPassword ? "Hide password" : "Show password"}>{showLoginPassword ? <EyeOff size={18} /> : <Eye size={18} />}</button></span></label><div className="authOptions"><label className="rememberMe"><input type="checkbox" /> <span>Remember me?</span></label><button className="linkButton" type="button" onClick={() => setScreen("forgot")}>Forgot password?</button></div><button className="primaryButton authButton" disabled={busy}>{busy ? "Signing in…" : "Sign In"}</button><button className="portalRegisterLink linkButton" type="button" onClick={() => { setScreen("register"); setMessage(""); }}>Don't Have an account?</button></form></PortalAuthCard>;
  if (!seller && screen === "forgot") return <div className="partnerPublic"><div className="partnerAuthCard"><button className="linkButton" onClick={onBack}>← Back to store</button><h1>Reset seller password</h1><ForgotPasswordForm identifierLabel="Seller ID or email" initialIdentifier={login.identifier} passwordDigits onRequest={(identifier) => api.sellerForgotPassword({ identifier })} onReset={api.sellerResetPassword} onBack={() => setScreen("login")} /></div></div>;
  if (!seller && screen === "register") return <SellerRegistrationScreen settings={settings} onBack={onBack} onLogin={() => { setScreen("login"); setMessage(""); }} registration={registration} setRegistration={setRegistration} registrationOtp={registrationOtp} setRegistrationOtp={setRegistrationOtp} message={message} setMessage={setMessage} busy={busy} onSubmit={register} onVerify={verifyRegistrationOtp} />;
  if (!seller && screen === "register") return <><div className="partnerPublic"><div className="partnerAuthCard"><button className="linkButton" onClick={onBack}>← Back to store</button><h1>Register your shop</h1><p>Complete all business details to create a seller account.</p><div className="tabRow"><button onClick={() => { setScreen("login"); setMessage(""); }}>Login</button><button className="active">Register shop</button></div>{message && !registrationOtp.challengeId && <div className="notice">{message}</div>}<form className="formGrid twoColumn" onSubmit={register}>{[["companyName", "Company name"], ["mobile", "Mobile"], ["email", "Email"], ["address", "Address"], ["city", "City"], ["state", "State"], ["pinCode", "Pin code"]].map(([field, label]) => <label className={field === "address" ? "full" : ""} key={field}>{label}<input type={field === "email" ? "email" : "text"} required value={registration[field]} onChange={(event) => setRegistration({ ...registration, [field]: event.target.value })} /></label>)}<label className="full">Is your business GST registered?<select value={registration.isGstRegistered ? "yes" : "no"} onChange={(event) => setRegistration({ ...registration, isGstRegistered: event.target.value === "yes", gstNumber: event.target.value === "yes" ? registration.gstNumber : "" })}><option value="no">No</option><option value="yes">Yes</option></select></label>{registration.isGstRegistered && <label className="full">GST number<input required value={registration.gstNumber} onChange={(event) => setRegistration({ ...registration, gstNumber: event.target.value.toUpperCase() })} /></label>}<button className="primaryButton full" disabled={busy}>{busy ? "Checking details…" : "Verify email & register"}</button></form></div></div>{registrationOtp.challengeId && <div className="partnerPaymentOverlay" role="dialog" aria-modal="true" aria-labelledby="seller-otp-title"><form className="partnerPaymentDialog sellerOtpDialog" onSubmit={verifyRegistrationOtp}><button className="partnerPaymentClose" type="button" disabled={busy} aria-label="Close email verification" onClick={() => { setRegistrationOtp({ challengeId: "", code: "" }); setMessage(""); }}><X size={20} /></button><span className="eyebrow">Email verification</span><h2 id="seller-otp-title">Verify your email</h2><p>Enter the 6-digit OTP sent to <strong>{registration.email}</strong>. Your seller account will be created only after verification.</p><label className="partnerPaymentOtp"><span>Email OTP</span><input autoFocus inputMode="numeric" autoComplete="one-time-code" pattern="\d{6}" maxLength="6" required value={registrationOtp.code} onChange={(event) => setRegistrationOtp({ ...registrationOtp, code: event.target.value.replace(/\D/g, "").slice(0, 6) })} placeholder="Enter 6-digit OTP" /></label>{message && <p className="partnerPaymentStatus" role="status">{message}</p>}<div className="partnerPaymentActions"><button className="secondaryButton" type="button" disabled={busy} onClick={() => { setRegistrationOtp({ challengeId: "", code: "" }); setMessage(""); }}>Cancel</button><button className="primaryButton" disabled={busy || registrationOtp.code.length !== 6}>{busy ? "Verifying…" : "Verify OTP & create account"}</button></div></form></div>}</>;
  if (!seller) return null;
  if (!portalReady) return <main className="storefrontLoadingScreen" role="status" aria-live="polite"><BrandLogo settings={settings} loading className="storefrontLoadingBrand" showText={false} />{!loadError && <div className="storefrontLoadingSpinner" aria-hidden="true" />}{loadError && <><h1>Unable to load seller data</h1><p>{loadError}</p><button className="heroPrimary" type="button" onClick={() => refresh().catch((error) => setLoadError(error.message))}>Try Again</button></>}</main>;

  const navigation = [["dashboard", "Dashboard", LayoutDashboard], ["profile", "Profile", UserRound], ["products", "Products", Boxes], ["orders", "Orders", PackageCheck, data.dashboard.ordersCount || 0], ["returns", "Returns & Refunds", Truck, data.dashboard.orderStatus?.Returned || 0], ["wallet", "Wallet", BadgeIndianRupee], ["payouts", "Payouts", CircleDollarSign, data.dashboard.pendingWithdrawalCount || data.dashboard.payoutsCount || 0], ["reviews", "Reviews & Ratings", Star, 0], ["kyc", "KYC Verification", FileCheck2], ["bank", "Bank Details", Building2], ["password", "Settings", KeyRound]];
  return <div className={`partnerShell berrySellerWorkspace ${mobileNavOpen ? "sellerMobileNavOpen" : ""}`}><button className="sellerMobileBackdrop" type="button" aria-label="Close seller menu" onClick={() => setMobileNavOpen(false)} /><aside className="partnerNav sellerNav"><div className="brand"><div className="brandMark">V</div><strong>Seller Dashboard</strong><button className="sellerMobileClose" type="button" aria-label="Close seller menu" onClick={() => setMobileNavOpen(false)}><X size={20} /></button></div><nav>{navigation.map(([id, label, Icon, count]) => <button key={id} className={screen === id ? "active" : ""} onClick={() => { setScreen(id); setMessage(""); setMobileNavOpen(false); }}><Icon size={18} />{label}{count > 0 && <span className="sellerNavCount">{count > 99 ? "99+" : count}</span>}</button>)}<button onClick={() => { setMobileNavOpen(false); logout(); }}><LogOut size={18} />Logout</button></nav><section className="sellerSidebarGrowth"><strong>Grow Your Business</strong><span>List more products and increase your sales</span><BarChart3 /><button type="button" onClick={() => setScreen("products")}>＋ Add Product</button></section><section className="sellerSidebarHelp"><Headphones /><span><strong>Need Help?</strong><small>We're here to help you</small><button type="button" onClick={() => setScreen("profile")}>Contact Support</button></span></section></aside><main className="partnerContent"><header><button className="sellerMobileMenu" type="button" aria-label="Open seller menu" aria-expanded={mobileNavOpen} onClick={() => setMobileNavOpen(true)}><Menu size={22} /></button><strong className="walletPill">Wallet: {money(data.wallet.walletBalance)}</strong></header>{message && <div className="notice">{message}</div>}{screen === "dashboard" && <SellerDashboard data={data.dashboard} />}{screen === "profile" && <SellerProfile seller={seller} save={(payload) => submit(async () => { await api.sellerUpdateProfile(payload); await refresh(); setMessage("Profile updated."); })} />}{screen === "products" && <SellerProductsFull products={data.products} options={data.options} busy={busy} save={(product, payload) => submit(async () => { product ? await api.updateSellerProduct(product._id, payload) : await api.createSellerProduct(payload); await refresh(); setMessage("Product sent to admin for approval."); })} toggle={(product) => submit(async () => { await api.toggleSellerProduct(product._id, !product.sellerEnabled); await refresh(); })} />}{["orders", "returns"].includes(screen) && <SellerOrders orders={data.orders} shippingMode={seller.shippingMode} returnUpdate={(orderId, productId, payload) => submit(async () => { await api.updateSellerItemReturn(orderId, productId, payload); await refresh(); setMessage("Return request updated successfully."); })} update={(orderId, productId, status) => submit(async () => { await api.updateSellerOrderItem(orderId, productId, status); await refresh(); setMessage("Order item status updated."); })} action={(action, order) => submit(async () => { const updated = action === "shiprocket" ? await api.syncSellerShipRocket(order._id) : await api.generateSellerInvoice(order._id); await refresh(); if (action === "invoice") printSellerDocument(updated, "invoice"); setMessage(action === "shiprocket" ? "Order sent to ShipRocket." : "Invoice ready to print."); })} />}{["wallet", "payouts"].includes(screen) && <SellerWallet wallet={data.wallet} withdrawals={data.withdrawals} requestWithdrawal={(amount) => submit(async () => { await api.requestSellerWithdrawal(amount); await refresh(); setMessage("Withdrawal request submitted successfully for admin review."); })} />}{screen === "reviews" && <SellerReviewsSummary />}{screen === "kyc" && <SellerKyc seller={seller} save={async (type, payload) => { const updated = await api.sellerUploadKyc(type, payload); sellerAuthStore.seller = updated; setSeller(updated); await refresh(); return updated; }} />}{screen === "bank" && <SellerBank seller={seller} save={(payload) => submit(async () => { await api.sellerUpdateBank(payload); await refresh(); setMessage("Bank details updated."); })} />}{screen === "password" && <SellerPassword save={(payload) => submit(async () => { const result = await api.sellerChangePassword(payload); setMessage(result.message); })} />}</main></div>;
}

function SellerDashboard({ data }) {
  const [referralCopied, setReferralCopied] = useState(false);
  const seller = data.seller || {};
  const products = data.products || [];
  const orders = data.recentOrders || [];
  const onNavigate = (target) => window.dispatchEvent(new CustomEvent("seller-dashboard-navigate", { detail: target }));
  const referralUrl = `${window.location.origin}${window.location.pathname}${data.referralLink || "#/seller/register"}`;
  const copyReferralUrl = async () => {
    try { await navigator.clipboard.writeText(referralUrl); } catch (_error) { window.prompt("Copy your seller referral link:", referralUrl); }
    setReferralCopied(true);
    window.setTimeout(() => setReferralCopied(false), 4000);
  };
  const statuses = ["Delivered", "Shipped", "Processing", "Pending", "Cancelled", "Returned"];
  const statusCounts = Object.fromEntries(statuses.map((status) => [status, Number(data.orderStatus?.[status] || 0)]));
  const totalStatusItems = Math.max(1, Object.values(statusCounts).reduce((sum, value) => sum + value, 0));
  const deliveredPercent = Math.round((statusCounts.Delivered / totalStatusItems) * 100);
  const activeProducts = products.filter((product) => product.status === "active" && product.sellerEnabled !== false).length;
  const lowStockProducts = products.filter((product) => product.isStockManageable && product.stock > 0 && product.stock <= (product.lowStockThreshold || 5)).length;
  const outOfStockProducts = products.filter((product) => product.isStockManageable && product.stock <= 0).length;
  const pendingOrders = statusCounts.Pending + statusCounts.Processing;
  const completedOrders = statusCounts.Delivered;
  const healthChecks = [seller.approvalStatus === "approved", seller.kyc?.pan?.status === "approved", seller.kyc?.cancelledCheque?.status === "approved", activeProducts > 0];
  const health = Math.round((healthChecks.filter(Boolean).length / healthChecks.length) * 100);
  const cards = [
    [PackageCheck, "Total Orders", data.ordersCount || 0, "blue", "18% vs last 7 days", "orders"],
    [BadgeIndianRupee, "Total Sales", money(data.sales), "green", "Live gross sales", "orders"],
    [CircleDollarSign, "Total Earnings", money(data.totalEarnings), "orange", "Net seller earnings", "wallet"],
    [WalletCards, "Wallet Balance", money(data.walletBalance), "purple", "View details", "wallet"],
    [BadgeIndianRupee, "Pending Payout", money(data.pendingWithdrawal), "royal", "View payouts", "wallet"],
    [Star, "Available Credit", money(0), "pink", "Not currently enabled", "wallet"]
  ];
  const quickActions = [
    [ShoppingCart, "Add Product", "products"], [PackageCheck, "View Orders", "orders"], [Truck, "Manage Returns", "orders"], [BadgeIndianRupee, "Withdraw", "wallet"],
    [WalletCards, "Payouts", "wallet"], [BarChart3, "Reports", "dashboard"], [Megaphone, "Marketing", "products"], [Headphones, "Support", "profile"]
  ];
  const kycRows = [
    [Building2, "Bank Details", seller.kyc?.cancelledCheque?.status === "approved"], [FileCheck2, "KYC Verification", seller.kyc?.pan?.status === "approved"],
    [Store, "Seller Approval", seller.approvalStatus === "approved"], [Star, "Store Rating", null]
  ];
  const setupSteps = [["Registration", Boolean(seller.name && seller.companyName)], ["Shipping preference", Boolean(seller.shippingMode)], ["Bank details", Boolean(seller.bankDetails?.accountNumber)], ["KYC verification", seller.kyc?.pan?.status === "approved"], ["First product", products.length > 0]];
  const setupPercent = Math.round((setupSteps.filter(([, complete]) => complete).length / setupSteps.length) * 100);
  return <div className="sellerDashboardV3">
    <section className="sellerReferenceWelcome"><div><span>Welcome back,</span><h2>{seller.companyName || "Seller"} 👋</h2><p>Here&apos;s what&apos;s happening with your store today.</p></div><div className="sellerWelcomeVisual"><span>🌿</span><div><BarChart3 /><TrendingUp /></div></div></section>
    <section className="sellerAccountSetup dashboardCard"><header><div><h3>Account Setup</h3><p>Complete these steps to start selling without limits.</p></div><strong>{setupPercent}%</strong></header><progress max="100" value={setupPercent} /><div>{setupSteps.map(([label, complete]) => <button type="button" className={complete ? "complete" : ""} key={label} onClick={() => onNavigate(label === "First product" ? "products" : label === "Bank details" ? "bank" : label === "KYC verification" ? "kyc" : "profile")}><span>{complete ? "✓" : "○"}</span>{label}</button>)}</div></section>
    <section className="sellerMetricGrid">{cards.map(([Icon, label, value, tone, note, target]) => <button type="button" className={tone} key={label} onClick={() => onNavigate(target)}><span><small>{label}</small><strong>{value}</strong><em>{note}</em></span><i><Icon /></i></button>)}</section>
    <section className="sellerReferenceChart dashboardCard"><header><h3>Sales Overview</h3><select aria-label="Sales period"><option>This Week</option><option>This Month</option></select></header><div className="chartPlot"><span className="chartValue">₹{Math.round(Number(data.sales || 0) / Math.max(1, data.ordersCount || 1)).toLocaleString("en-IN")}<small>Average order</small></span><svg viewBox="0 0 720 250" preserveAspectRatio="none"><defs><linearGradient id="sellerReferenceFill" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#6727e8" stopOpacity=".28"/><stop offset="1" stopColor="#6727e8" stopOpacity=".02"/></linearGradient></defs><path className="gridLines" d="M0 45H720M0 95H720M0 145H720M0 195H720"/><path className="fill" d="M0 205 C70 190 80 160 145 165 S215 120 275 128 S340 58 405 98 S485 78 545 145 S650 185 720 115 L720 250 L0 250Z"/><path className="trend" d="M0 205 C70 190 80 160 145 165 S215 120 275 128 S340 58 405 98 S485 78 545 145 S650 185 720 115"/></svg><div className="chartDates"><span>19 May</span><span>20 May</span><span>21 May</span><span>22 May</span><span>23 May</span><span>24 May</span><span>25 May</span></div></div></section>
    <section className="sellerOrderDonut dashboardCard"><header><h3>Order Status</h3><select><option>This Week</option></select></header><div className="orderDonutBody"><div className="orderDonut" style={{ "--delivered": `${deliveredPercent * 3.6}deg` }}><span><strong>{data.ordersCount || 0}</strong><small>Total</small></span></div><div className="orderLegend">{statuses.slice(0, 5).map((status) => <p key={status} className={status.toLowerCase()}><i />{status}<strong>{statusCounts[status]}</strong></p>)}</div></div></section>
    <section className="sellerReferenceQuick dashboardCard"><h3>Quick Actions</h3><nav>{quickActions.map(([Icon, label, target]) => <button type="button" key={label} onClick={() => onNavigate(target)}><i><Icon /></i><span>{label}</span>{label === "View Orders" && pendingOrders > 0 && <b>{pendingOrders}</b>}</button>)}</nav></section>
    <section className="sellerDashboardLowerGrid"><section className="sellerStoreSummary dashboardCard"><header><h3>Store Summary</h3></header>{[["Active Products", activeProducts, "blue"], ["Low Stock Products", lowStockProducts, "orange"], ["Out of Stock Products", outOfStockProducts, "red"], ["Pending Orders", pendingOrders, "orange"], ["Completed Orders", completedOrders, "green"], ["Cancelled Orders", statusCounts.Cancelled, "red"], ["Return Requests", statusCounts.Returned, "pink"]].map(([label, value, tone]) => <p key={label}><span>▣ {label}</span><strong className={tone}>{value}</strong></p>)}<button type="button" onClick={() => onNavigate("products")}>View All</button></section>
    <section className="sellerTopProducts dashboardCard"><header><h3>Top Selling Products</h3><select><option>This Week</option></select></header>{(data.topProducts || []).map((product) => <article key={product._id}>{product.mainImage ? <img src={product.mainImage} alt="" /> : <span className="productFallback"><Boxes /></span>}<div><strong>{product.name}</strong><small>{product.units || 0} units · {product.orders || 0} orders</small></div><b>{money(product.sales)}</b></article>)}{!data.topProducts?.length && <p className="emptyDashboardData">Top products will appear after your first orders.</p>}<button type="button" onClick={() => onNavigate("products")}>View All Products</button></section>
    <section className="sellerKycSummary dashboardCard"><header><h3>KYC Status</h3><span className={seller.approvalStatus === "approved" ? "verified" : "pending"}>{seller.approvalStatus === "approved" ? "Verified" : "Pending"}</span></header>{kycRows.map(([Icon, label, approved]) => <p key={label}><Icon /><span>{label}</span>{approved === null ? <strong>★ 4.8 / 5</strong> : <b className={approved ? "verified" : "pending"}>{approved ? "Verified" : "Pending"}</b>}</p>)}<div className="sellerKycNotice"><ShieldCheck /><span><strong>{health === 100 ? "Great! Your store is fully verified." : `Store setup is ${health}% complete.`}</strong><small>Complete verification to receive payments without limits.</small></span></div><button type="button" onClick={() => onNavigate("profile")}>View My Store</button></section></section>
    <section className="sellerReferenceOrders dashboardCard"><header><h3>Recent Orders</h3><button type="button" onClick={() => onNavigate("orders")}>View All Orders</button></header><div className="tableWrap"><table><thead><tr><th>Order ID</th><th>Customer</th><th>Product</th><th>Amount</th><th>Status</th><th>Date</th></tr></thead><tbody>{orders.slice(0, 5).map((order) => { const sellerItems = order.items || []; return <tr key={order._id}><td>{order.orderNumber}</td><td>{order.customer?.name || order.address?.name || "Customer"}</td><td>{sellerItems[0]?.name || "Seller order"}</td><td>{money(sellerItems.reduce((sum, item) => sum + item.price * item.quantity, 0))}</td><td><span className={`orderBadge ${String(order.status).toLowerCase()}`}>{order.status}</span></td><td>{new Date(order.createdAt).toLocaleDateString("en-IN")}</td></tr>; })}{!orders.length && <tr><td colSpan="6">Your latest orders will appear here.</td></tr>}</tbody></table></div></section>
    <section className="sellerBottomPromo sales"><div><h3>Boost Your Sales</h3><p>Run ads and reach more customers</p><button type="button" onClick={() => onNavigate("products")}>Start Campaign</button></div><Megaphone /></section>
    <section className="sellerBottomPromo referral"><div><h3>Refer &amp; Earn</h3><p>Refer other sellers and grow your network. Your Seller ID will be filled automatically.</p><button type="button" onClick={copyReferralUrl}>{referralCopied ? "Link Copied!" : "Generate Referral Link"}</button>{referralCopied && <small className="sellerReferralLink" title={referralUrl}>{referralUrl}</small>}</div><Users /></section>
  </div>;
}
function SellerProfile({ seller, save }) {
  const locked = seller.approvalStatus === "approved";
  const [form, setForm] = useState({ companyName: seller.companyName, address: seller.address, city: seller.city, state: seller.state, pinCode: seller.pinCode, mobile: seller.mobile, profileImage: seller.profileImage || "", shippingMode: seller.shippingMode || "shiprocket" });
  const update = (field, value) => setForm((current) => ({ ...current, [field]: value }));
  const uploadPhoto = async (file) => {
    if (!file) return;
    const profileImage = (await api.uploadImage(file, "seller-profile")).url;
    update("profileImage", profileImage);
    if (locked) save({ profileImage });
  };
  return <section className="sellerProfilePage">
    <div className="sellerProfileHeading"><div><span>Dashboard　›　Profile</span><h2>Seller Profile</h2><p>Manage your personal information and business preferences.</p></div><span className={`sellerApprovalBadge ${seller.approvalStatus}`}>{seller.approvalStatus || "pending"} seller</span></div>
    {locked && <div className="notice">Approved business information is protected. Your profile picture and shipping preference remain editable.</div>}
    <form onSubmit={(event) => { event.preventDefault(); save(locked ? { profileImage: form.profileImage, shippingMode: form.shippingMode } : form); }}>
      <aside className="panel sellerProfileIdentity">
        <div className="sellerProfilePhoto">{form.profileImage ? <img src={form.profileImage} alt={seller.companyName} /> : <span>{seller.companyName?.[0]}</span>}<label title="Change profile picture">✎<input hidden type="file" accept="image/*" onChange={(event) => uploadPhoto(event.target.files?.[0])} /></label></div>
        <h3>{seller.companyName}</h3><p>{seller.email}</p><strong>{seller.sellerNumber}</strong>
        <dl><div><dt>Account status</dt><dd>{seller.status}</dd></div><div><dt>Approval</dt><dd>{seller.approvalStatus}</dd></div><div><dt>Commission</dt><dd>{seller.commissionRate}%</dd></div></dl>
      </aside>
      <div className="sellerProfileForms">
        <section className="panel"><div className="sellerProfileSectionTitle"><div><h3>Business Information</h3><p>Your registered seller and tax details.</p></div><Building2 /></div><div className="formGrid twoColumn"><label>Company name<input required disabled={locked} value={form.companyName} onChange={(event) => update("companyName", event.target.value)} /></label><label>Business name<input disabled value={seller.businessName || seller.companyName} /></label><label>Email address<input disabled value={seller.email} /></label><label>Mobile number<input required disabled={locked} value={form.mobile} onChange={(event) => update("mobile", event.target.value)} /></label><label>GST registration<input disabled value={seller.isGstRegistered ? "GST Registered" : "Not GST Registered"} /></label><label>GST number<input disabled value={seller.gstNumber || "Not applicable"} /></label></div></section>
        <section className="panel"><div className="sellerProfileSectionTitle"><div><h3>Business Address</h3><p>Address used for seller verification and fulfillment.</p></div><Store /></div><div className="formGrid twoColumn"><label className="full">Street address<input required disabled={locked} value={form.address} onChange={(event) => update("address", event.target.value)} /></label><label>City<input required disabled={locked} value={form.city} onChange={(event) => update("city", event.target.value)} /></label><label>State<input required disabled={locked} value={form.state} onChange={(event) => update("state", event.target.value)} /></label><label>PIN code<input required disabled={locked} value={form.pinCode} onChange={(event) => update("pinCode", event.target.value.replace(/\D/g, ""))} /></label></div></section>
        <section className="panel"><div className="sellerProfileSectionTitle"><div><h3>Shipping Preference</h3><p>Choose how orders will be fulfilled.</p></div><Truck /></div><div className="sellerShippingChoices"><label className={form.shippingMode === "shiprocket" ? "selected" : ""}><input type="radio" name="shippingMode" value="shiprocket" checked={form.shippingMode === "shiprocket"} onChange={(event) => update("shippingMode", event.target.value)} /><Truck /><span><strong>ShipRocket</strong><small>Use the configured shipping integration</small></span></label><label className={form.shippingMode === "self" ? "selected" : ""}><input type="radio" name="shippingMode" value="self" checked={form.shippingMode === "self"} onChange={(event) => update("shippingMode", event.target.value)} /><PackageCheck /><span><strong>Self shipping</strong><small>Manage fulfillment and delivery manually</small></span></label></div></section>
        <button className="primaryButton sellerProfileSave">Save profile changes</button>
      </div>
    </form>
  </section>;
}
function SellerProducts({ products, options, save, toggle, busy }) { const [editing, setEditing] = useState(null); const [form, setForm] = useState(blankProduct); const edit = (product) => { setEditing(product); setForm({ ...blankProduct, ...product, category: product.category?._id || product.category || "", taxCategory: product.taxCategory?._id || product.taxCategory || "", tags: product.tags?.join(", ") || "" }); }; const submitForm = (event) => { event.preventDefault(); save(editing, { ...form, price: Number(form.price), offerPrice: form.offerPrice === "" ? Number(form.price) : Number(form.offerPrice), stock: form.isStockManageable ? Number(form.stock || 0) : 0, lowStockThreshold: Number(form.lowStockThreshold || 0), tags: String(form.tags).split(",").map((tag) => tag.trim()).filter(Boolean), taxCategory: form.taxCategory || undefined, videoUrl: form.displayType === "Reel" ? form.videoUrl : undefined, media: form.mainImage ? [{ url: form.mainImage, type: "image", isMain: true, alt: form.name }] : [] }); setEditing(null); setForm(blankProduct); }; return <><form className="panel formGrid twoColumn" onSubmit={submitForm}><h3 className="full">{editing ? `Edit ${editing.name}` : "Add product"}</h3>{[["name", "Product name"], ["sku", "SKU"], ["price", "Sale price"], ["offerPrice", "Offer price"], ["stock", "Stock"], ["lowStockThreshold", "Low stock alert"]].map(([field, label]) => <label key={field}>{label}<input type={["price", "offerPrice", "stock", "lowStockThreshold"].includes(field) ? "number" : "text"} min="0" step="0.01" required={!(["offerPrice"].includes(field))} disabled={field === "stock" && !form.isStockManageable} value={form[field]} onChange={(event) => setForm({ ...form, [field]: event.target.value })} /></label>)}<label>Category<CategoryTreeSelect categories={options.categories} value={form.category} onChange={(category) => setForm({ ...form, category })} required /></label><label>Tax category<select value={form.taxCategory} onChange={(event) => setForm({ ...form, taxCategory: event.target.value })}><option value="">None</option>{options.taxCategories.map((item) => <option key={item._id} value={item._id}>{item.name} ({item.rate}%)</option>)}</select></label><label>Entered price includes GST?<select value={form.priceIncludesTax ? "yes" : "no"} onChange={(event) => setForm({ ...form, priceIncludesTax: event.target.value === "yes" })}><option value="yes">Yes — GST included</option><option value="no">No — add GST</option></select></label><GstPricePreview price={form.price} offerPrice={form.offerPrice} taxCategory={options.taxCategories.find((tax) => tax._id === form.taxCategory)} priceIncludesTax={form.priceIncludesTax} /><label>Display type<select value={form.displayType} onChange={(event) => setForm({ ...form, displayType: event.target.value, videoUrl: event.target.value === "Reel" ? form.videoUrl : "" })}><option>Product</option><option>Reel</option></select></label><label className="toggleRow"><input type="checkbox" checked={form.isStockManageable} onChange={(event) => setForm({ ...form, isStockManageable: event.target.checked })} /><span>Manage stock</span></label><label className="full">Short description<input required value={form.shortDescription} onChange={(event) => setForm({ ...form, shortDescription: event.target.value })} /></label><label className="full">Detailed description<textarea required value={form.detailedDescription} onChange={(event) => setForm({ ...form, detailedDescription: event.target.value })} /></label><label>Tags<input value={form.tags} onChange={(event) => setForm({ ...form, tags: event.target.value })} /></label>{form.displayType === "Reel" && <label>Upload reel<input type="file" accept="video/*" required={!form.videoUrl} onChange={async (event) => { try { setForm({ ...form, videoUrl: await reelData(event.target.files[0]) }); } catch (error) { window.alert(error.message); event.target.value = ""; } }} /></label>}<label className="full">Product image<input type="file" accept="image/*" onChange={async (event) => setForm({ ...form, mainImage: await fileData(event.target.files[0]) })} /></label><button className="primaryButton" disabled={busy}>{editing ? "Submit changes" : "Submit product"}</button>{editing && <button className="secondaryButton" type="button" onClick={() => { setEditing(null); setForm(blankProduct); }}>Cancel</button>}</form><div className="panel tableWrap"><table><thead><tr><th>Product</th><th>Price</th><th>Approval</th><th>Admin note</th><th>Store visibility</th><th>Action</th></tr></thead><tbody>{products.map((product) => <tr key={product._id}><td><strong>{product.name}</strong><br />{product.sku}</td><td>{money(product.offerPrice || product.price)}</td><td>{product.approvalStatus.replaceAll("_", " ")}</td><td>{product.approvalNote || "—"}</td><td><button type="button" onClick={() => toggle(product)}>{product.sellerEnabled ? "Enabled" : "Disabled"}</button></td><td><button type="button" onClick={() => edit(product)}>Edit</button></td></tr>)}</tbody></table></div></>; }
function SellerOrders({ orders, update, returnUpdate, action, shippingMode }) {
  const statuses = shippingMode === "shiprocket" ? ["Accepted", "Processing", "Packed", "Ready to Dispatch", "Cancelled"] : ["Accepted", "Processing", "Packed", "Ready to Dispatch", "Shipped", "Delivered", "Cancelled"];
  const [filters, setFilters] = useState({ search: "", from: "", to: "", status: "all" });
  const [statusDialog, setStatusDialog] = useState(null);
  const [menu, setMenu] = useState("");
  const [returnDialog, setReturnDialog] = useState(null);
  const filtered = orders.filter((order) => {
    const created = new Date(order.createdAt);
    const text = [order.orderNumber, order.customer?.name, order.customer?.email, order.address?.name, order.address?.email, ...order.items.flatMap((item) => [item.name, item.sku])].filter(Boolean).join(" ").toLowerCase();
    return text.includes(filters.search.toLowerCase()) && (!filters.from || created >= new Date(filters.from)) && (!filters.to || created <= new Date(`${filters.to}T23:59:59`)) && (filters.status === "all" || order.items.some((item) => item.sellerStatus === filters.status));
  });
  return <section className="sellerOrdersPage">
    <div className="panel sellerOrderFilters"><label className="searchBox"><Search size={16} /><input placeholder="Order number, product or customer" value={filters.search} onChange={(event) => setFilters({ ...filters, search: event.target.value })} /></label><label>From<input type="date" value={filters.from} onChange={(event) => setFilters({ ...filters, from: event.target.value })} /></label><label>To<input type="date" value={filters.to} onChange={(event) => setFilters({ ...filters, to: event.target.value })} /></label><label>Item status<select value={filters.status} onChange={(event) => setFilters({ ...filters, status: event.target.value })}><option value="all">All statuses</option><option>Pending</option>{statuses.map((status) => <option key={status}>{status}</option>)}</select></label></div>
    <div className="panel tableWrap"><table><thead><tr><th>Order</th><th>Customer</th><th>Product</th><th>Qty</th><th>Amount</th><th>Item status</th><th>Actions</th></tr></thead><tbody>{filtered.flatMap((order) => order.items.map((item, index) => <tr key={`${order._id}-${item.product}`}><td><strong>{order.orderNumber}</strong><br />{new Date(order.createdAt).toLocaleDateString("en-IN")}</td><td>{order.customer?.name || order.address?.name}<br /><small>{order.customer?.email || order.address?.email}</small></td><td>{item.name}<br /><small>SKU: {item.sku}</small>{item.returnRequest?.status && <><br /><small className="errorText">Return: {item.returnRequest.status} · {item.returnRequest.reason}</small></>}</td><td>{item.quantity}</td><td>{money(item.price * item.quantity)}</td><td><button className={`sellerStatusButton ${String(item.sellerStatus).toLowerCase()}`} type="button" onClick={() => setStatusDialog({ order, item, status: item.sellerStatus || "Pending", note: "", statusDate: new Date().toISOString().slice(0, 10) })}>{item.sellerStatus || "Pending"} ▾</button></td><td>{index === 0 && <div className="sellerOrderMenu"><button type="button" aria-label="Order actions" onClick={() => setMenu(menu === order._id ? "" : order._id)}><MoreVertical size={18} /></button>{menu === order._id && <div><button type="button" onClick={() => { setMenu(""); order.invoiceNumber ? printSellerDocument(order, "invoice") : action("invoice", order); }}>Print invoice</button><button type="button" onClick={() => { setMenu(""); printSellerDocument(order, "packing"); }}>Print packing slip</button>{shippingMode === "shiprocket" && <button type="button" disabled={order.items.some((entry) => entry.sellerStatus !== "Ready to Dispatch")} onClick={() => { setMenu(""); action("shiprocket", order); }}>Send packet to ShipRocket</button>}</div>}</div>}{item.returnRequest?.status && <button className="inlineButton" type="button" onClick={() => setReturnDialog({ order, item, status: item.returnRequest.status === "Requested" ? "Approved" : item.returnRequest.status, note: "", statusDate: new Date().toISOString().slice(0, 10) })}>Manage return</button>}</td></tr>))}{!filtered.length && <tr><td colSpan="7">No orders match these filters.</td></tr>}</tbody></table></div>
    {statusDialog && <div className="modalOverlay" role="dialog" aria-modal="true"><form className="sellerStatusModal" onSubmit={(event) => { event.preventDefault(); update(statusDialog.order._id, statusDialog.item.product, { status: statusDialog.status, note: statusDialog.note, statusDate: statusDialog.statusDate }); setStatusDialog(null); }}><div className="panelHeader"><div><span className="eyebrow">Verify status change</span><h2>{statusDialog.order.orderNumber}</h2></div><button className="inlineButton" type="button" onClick={() => setStatusDialog(null)}>Close</button></div><label>New item status<select value={statusDialog.status} onChange={(event) => setStatusDialog({ ...statusDialog, status: event.target.value })}>{statuses.map((status) => <option key={status}>{status}</option>)}</select></label>{shippingMode === "self" ? <label>Status date<input type="date" required value={statusDialog.statusDate} onChange={(event) => setStatusDialog({ ...statusDialog, statusDate: event.target.value })} /></label> : <p className="mutedText">ShipRocket orders can be sent after every item is marked Ready to Dispatch.</p>}<label>Verification notes<textarea required value={statusDialog.note} onChange={(event) => setStatusDialog({ ...statusDialog, note: event.target.value })} placeholder="Add notes about this fulfillment step..." /></label><button className="primaryButton">Verify and update status</button></form></div>}
    {returnDialog && <div className="modalOverlay" role="dialog" aria-modal="true"><form className="sellerStatusModal" onSubmit={(event) => { event.preventDefault(); returnUpdate(returnDialog.order._id, returnDialog.item.product, { status: returnDialog.status, note: returnDialog.note, statusDate: returnDialog.statusDate }); setReturnDialog(null); }}><div className="panelHeader"><div><span className="eyebrow">Customer return</span><h2>{returnDialog.item.name}</h2></div><button className="inlineButton" type="button" onClick={() => setReturnDialog(null)}>Close</button></div><p>Reason: <strong>{returnDialog.item.returnRequest?.reason}</strong></p><label>Return status<select value={returnDialog.status} onChange={(event) => setReturnDialog({ ...returnDialog, status: event.target.value })}>{["Approved", "Rejected", "Pickup Arranged", "Received", "Closed"].map((status) => <option key={status}>{status}</option>)}</select></label><label>Status date<input type="date" required value={returnDialog.statusDate} onChange={(event) => setReturnDialog({ ...returnDialog, statusDate: event.target.value })} /></label><label>Processing notes<textarea required value={returnDialog.note} onChange={(event) => setReturnDialog({ ...returnDialog, note: event.target.value })} placeholder="Pickup, inspection, rejection, or receipt notes" /></label><button className="primaryButton">Update return status</button></form></div>}
  </section>;
}
function SellerWallet({ wallet, withdrawals, requestWithdrawal }) {
  const [amount, setAmount] = useState("");
  const [withdrawOpen, setWithdrawOpen] = useState(false);
  const payouts = wallet.payouts || [];
  const requests = withdrawals || [];
  const pendingBalance = requests.filter((item) => ["pending", "approved"].includes(item.status)).reduce((sum, item) => sum + Number(item.amount || 0), 0);
  const totalCommission = payouts.reduce((sum, item) => sum + Number(item.commissionAmount || 0), 0);
  const totalEarnings = payouts.reduce((sum, item) => sum + Number(item.netAmount || 0), 0);
  const transactions = [
    ...payouts.map((item) => ({ id: `p-${item._id}`, date: item.createdAt, description: `${item.order?.orderNumber || "Order"} · ${item.product?.name || "Product"} earnings`, type: "Credit", amount: item.netAmount, status: "Completed" })),
    ...requests.map((item) => ({ id: `w-${item._id}`, date: item.createdAt, description: "Withdrawal to bank account", type: "Debit", amount: item.amount, status: item.status }))
  ].sort((a, b) => new Date(b.date) - new Date(a.date));
  const submitWithdrawal = (event) => {
    event.preventDefault();
    requestWithdrawal(Number(amount));
    setAmount("");
    setWithdrawOpen(false);
  };
  const openWithdraw = () => setWithdrawOpen(true);
  const downloadStatement = () => {
    const rows = [["Date", "Description", "Type", "Amount", "Status"], ...transactions.map((item) => [new Date(item.date).toLocaleString("en-IN"), item.description, item.type, item.amount, item.status])];
    const csv = rows.map((row) => row.map((value) => `"${String(value ?? "").replaceAll('"', '""')}"`).join(",")).join("\n");
    const link = document.createElement("a");
    link.href = URL.createObjectURL(new Blob([csv], { type: "text/csv" }));
    link.download = "seller-wallet-statement.csv";
    link.click();
    URL.revokeObjectURL(link.href);
  };
  return <section className="sellerWalletPage">
    <div className="sellerWalletHeading"><div><span>Dashboard　›　Wallet</span><h2>Seller Wallet</h2><p>Manage your earnings, withdrawals and transactions</p></div><button className="sellerWithdrawButton" type="button" onClick={openWithdraw}><BadgeIndianRupee size={18} /> Withdraw Now</button></div>
    <div className="sellerWalletStats">
      <article className="purple"><WalletCards /><span>Total Balance</span><strong>{money(wallet.walletBalance)}</strong><small>Available in your wallet</small></article>
      <article className="green"><BadgeIndianRupee /><span>Withdrawable Balance</span><strong>{money(wallet.walletBalance)}</strong><small>Available for withdrawal</small></article>
      <article className="orange"><CircleDollarSign /><span>Total Commission</span><strong>{money(totalCommission)}</strong><small>All-time admin commission</small></article>
      <article className="blue"><Bell /><span>Pending Balance</span><strong>{money(pendingBalance)}</strong><small>Processing withdrawal amount</small></article>
    </div>
    <section className="sellerWalletOverview panel">
      <div className="sellerWalletSectionTitle"><h3>Wallet Overview</h3><button type="button" onClick={downloadStatement}>View Statement</button></div>
      <div className="sellerEarningsChart">
        <span>This Month Earnings</span><strong>{money(totalEarnings)}</strong><small>Completed product deliveries</small>
        <div className="sellerWalletChartScale"><i>800</i><i>600</i><i>400</i><i>200</i><i>0</i></div>
        <svg viewBox="0 0 520 220" preserveAspectRatio="none" aria-label="Wallet earnings trend"><defs><linearGradient id="walletChartFill" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#7c2ee8" stopOpacity=".3"/><stop offset="1" stopColor="#7c2ee8" stopOpacity=".02"/></linearGradient></defs><path className="fill" d="M15 190 C75 150 85 115 145 125 S225 80 285 92 S390 110 505 36 L505 215 L15 215Z"/><path className="line" d="M15 190 C75 150 85 115 145 125 S225 80 285 92 S390 110 505 36"/></svg>
        <div className="sellerWalletChartLabels"><span>01 May</span><span>08 May</span><span>15 May</span><span>22 May</span><span>31 May</span></div>
      </div>
      <div className="sellerWalletRight">
        <div className="sellerWithdrawPromo"><div><h3>Withdraw Money</h3><p>Transfer your earnings to your bank account securely.</p><button type="button" onClick={openWithdraw}>Withdraw Now →</button></div><WalletCards /></div>
        <div className="sellerAccountTitle"><h3>Account Details</h3><button type="button" onClick={() => window.dispatchEvent(new CustomEvent("seller-dashboard-navigate", { detail: "bank" }))}>Change Account</button></div>
        <div className="sellerBankSummary"><Building2 /><div><strong>{wallet.bankDetails?.bankName || "Bank details not added"}</strong><span>{wallet.bankDetails?.accountNumber ? `A/C No. · ${wallet.bankDetails.accountType || ""} ·•••• ${wallet.bankDetails.accountNumber.slice(-4)}` : "Add an account to withdraw funds"}</span><small>{wallet.bankDetails?.ifsc ? `IFSC · ${wallet.bankDetails.ifsc}` : ""}</small></div>{wallet.bankDetails?.accountNumber && <em>✓ Verified</em>}</div>
      </div>
    </section>
    <section className="sellerTransactions panel"><div className="sellerWalletSectionTitle"><h3>Recent Transactions</h3><button type="button" onClick={downloadStatement}>View All</button></div><div className="tableWrap"><table><thead><tr><th>Date</th><th>Description</th><th>Type</th><th>Amount</th><th>Status</th></tr></thead><tbody>{transactions.slice(0, 8).map((item) => <tr key={item.id}><td>{new Date(item.date).toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short" })}</td><td>{item.description}</td><td><span className={`walletTransactionType ${item.type.toLowerCase()}`}>{item.type}</span></td><td className={item.type.toLowerCase()}>{item.type === "Credit" ? "+" : "−"} {money(item.amount)}</td><td><span className={`walletTransactionStatus ${String(item.status).toLowerCase()}`}>{item.status}</span></td></tr>)}{!transactions.length && <tr><td colSpan="5">Your wallet transactions will appear here.</td></tr>}</tbody></table></div></section>
    <div className="sellerWalletBottom">
      <section className="panel"><h3>Quick Actions</h3><button type="button" onClick={openWithdraw}><BadgeIndianRupee /><span><strong>Withdraw Money</strong><small>Transfer your balance to bank account</small></span>→</button><button type="button"><WalletCards /><span><strong>Transaction History</strong><small>View all your wallet transactions</small></span>→</button><button type="button" onClick={downloadStatement}><FileCheck2 /><span><strong>Download Statement</strong><small>Download your wallet statement</small></span>→</button></section>
      <section className="panel sellerWalletInfo"><ShieldCheck /><h3>Important Information</h3><p>◉ Complete your bank details before requesting a withdrawal.</p><p>◉ Withdrawals are processed by the admin after approval.</p><p>◉ Rejected requests are automatically returned to your wallet.</p><p>◉ Contact support for any wallet-related issues.</p></section>
    </div>
    {withdrawOpen && <div className="modalOverlay" role="dialog" aria-modal="true" aria-label="Request wallet withdrawal"><form className="sellerWithdrawModal" onSubmit={submitWithdrawal}><div className="panelHeader"><div><span className="eyebrow">Seller wallet</span><h2>Withdraw Money</h2></div><button type="button" className="inlineButton" onClick={() => setWithdrawOpen(false)}>Close</button></div><p>Available balance: <strong>{money(wallet.walletBalance)}</strong></p><label>Withdrawal amount<input autoFocus type="number" min="0.01" max={wallet.walletBalance || 0} step="0.01" required value={amount} onChange={(event) => setAmount(event.target.value)} placeholder="Enter amount" /></label><button className="sellerWithdrawButton" disabled={!amount || Number(amount) > Number(wallet.walletBalance || 0)}>Send request to admin</button></form></div>}
  </section>;
}
function SellerReviewsSummary() { return <section className="sellerReviewsPage"><div className="sellerKycHeading"><div><span className="eyebrow">Store reputation</span><h2>Reviews &amp; Ratings</h2><p>Customer reviews for your products will appear here.</p></div><span className="status pending">No reviews yet</span></div><div className="panel sellerReviewsEmpty"><Star size={42} /><h3>Build your store rating</h3><p>Ratings and customer feedback will be shown after customers review delivered products.</p></div></section>; }

function SellerKyc({ seller, save }) {
  const [files, setFiles] = useState({});
  const [previews, setPreviews] = useState({});
  const [progress, setProgress] = useState({});
  const [feedback, setFeedback] = useState({});
  const [previewDocument, setPreviewDocument] = useState(null);
  const docs = [["pan", "PAN Card"], ["addressProof", "Address Proof"], ["aadharFront", "Owner / Company Aadhar Card (Front)"], ["aadharBack", "Owner / Company Aadhar Card (Back)"], ["cancelledCheque", "Cancelled Cheque"], ...(seller.isGstRegistered ? [["gstCertificate", "GST Certificate"]] : [])];
  const sellerLocked = seller.approvalStatus === "approved";
  const choose = (type, file) => {
    if (!file) return;
    if (!file.type.startsWith("image/") && file.type !== "application/pdf") { setFeedback((current) => ({ ...current, [type]: "Only image or PDF files are supported." })); return; }
    if (previews[type]?.startsWith("blob:")) URL.revokeObjectURL(previews[type]);
    setFiles((current) => ({ ...current, [type]: file }));
    setPreviews((current) => ({ ...current, [type]: file.type === "application/pdf" ? "pdf" : URL.createObjectURL(file) }));
    setFeedback((current) => ({ ...current, [type]: "" }));
  };
  return <section className="sellerKycPage"><div className="sellerKycHeading"><div><span className="eyebrow">Account verification</span><h2>KYC Verification</h2><p>Upload and manage the documents required to verify your seller account.</p></div><span className={`status ${sellerLocked ? "approved" : "pending"}`}>{sellerLocked ? "Seller verified" : "Verification pending"}</span></div>{sellerLocked && <div className="accountNotice"><ShieldCheck size={18} /> All required documents are approved and your seller KYC is locked.</div>}<div className="cardGrid partnerKycGrid sellerPartnerKycGrid">{docs.map(([type, title]) => {
    const doc = seller.kyc?.[type] || {};
    const locked = sellerLocked || ["pending", "approved"].includes(doc.status);
    const selected = previews[type];
    return <form className="panel partnerKycCard" key={type} onSubmit={async (event) => {
      event.preventDefault();
      setProgress((current) => ({ ...current, [type]: 10 }));
      setFeedback((current) => ({ ...current, [type]: "" }));
      try {
        const file = files[type];
        if (!file) throw new Error(`Choose the ${title} document.`);
        setProgress((current) => ({ ...current, [type]: 35 }));
        const uploaded = await fileData(file);
        setProgress((current) => ({ ...current, [type]: 80 }));
        await save(type, { file: uploaded });
        setProgress((current) => ({ ...current, [type]: 100 }));
        setFeedback((current) => ({ ...current, [type]: `${title} uploaded successfully and submitted for verification.` }));
        setFiles((current) => { const next = { ...current }; delete next[type]; return next; });
        setPreviews((current) => { const next = { ...current }; if (next[type]?.startsWith("blob:")) URL.revokeObjectURL(next[type]); delete next[type]; return next; });
      } catch (error) {
        setProgress((current) => ({ ...current, [type]: 0 }));
        setFeedback((current) => ({ ...current, [type]: error.message || `Unable to upload ${title}.` }));
      }
    }}><div className="panelHeader"><h3>{title}</h3><span className={`status ${doc.status || "not_submitted"}`}>{(doc.status || "not_submitted").replaceAll("_", " ")}</span></div>{doc.rejectionReason && <p className="errorText">Rejected: {doc.rejectionReason}</p>}{feedback[type] && <p className={progress[type] === 100 ? "accountNotice" : "errorText"} role="status">{feedback[type]}</p>}{doc.file && <button className="partnerKycExistingDocument" type="button" onClick={() => setPreviewDocument({ url: doc.file, title })}>{String(doc.file).toLowerCase().includes(".pdf") ? <span>PDF</span> : <img src={doc.file} alt={title} />}<small>View submitted document</small></button>}{doc.reviewedAt && <div className="kycReviewHistory"><strong>Review history</strong><p><span className={`status ${doc.status}`}>{doc.status}</span>{doc.rejectionReason || (doc.status === "approved" ? "Document approved" : "Document reviewed")}<small>{new Date(doc.reviewedAt).toLocaleString("en-IN")}</small></p></div>}{!locked && <label className="partnerKycUploadBox"><ImagePlus size={28} /><strong>{doc.status === "rejected" ? `Upload corrected ${title}` : `Upload ${title}`}</strong><span>Image or PDF · secure document upload</span><input name="file" type="file" accept="image/*,.pdf" required onChange={(event) => choose(type, event.target.files?.[0])} />{selected === "pdf" ? <span className="sellerSelectedPdf">PDF selected</span> : selected && <img src={selected} alt={`Selected ${title}`} />}</label>}{locked && <p className="mutedText">{doc.status === "approved" ? "Verified and approved by the administrator." : "Uploaded successfully and awaiting admin verification."}</p>}{!locked && <><button className="primaryButton" disabled={progress[type] > 0 && progress[type] < 100}>{progress[type] > 0 && progress[type] < 100 ? "Uploading document…" : doc.status === "rejected" ? "Submit corrected document" : "Submit for verification"}</button>{progress[type] > 0 && <div className="partnerKycProgress"><div><span>{progress[type] < 90 ? "Uploading document…" : "Submitting for verification…"}</span><strong>{progress[type]}%</strong></div><progress max="100" value={progress[type]} /></div>}</>}</form>;
  })}</div>{previewDocument && <DocumentPreviewModal document={previewDocument} onClose={() => setPreviewDocument(null)} />}</section>;
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
    <label>Account type<select required disabled={locked} value={form.accountType || ""} onChange={(event) => setForm({ ...form, accountType: event.target.value })}><option value="">Select account type</option><option value="current">Current account</option><option value="savings">Savings account</option></select></label>
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
