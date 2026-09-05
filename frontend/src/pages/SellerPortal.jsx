import { useEffect, useState } from "react";
import {
  ArrowDown,
  ArrowRight,
  ArrowUp,
  Award,
  BadgeIndianRupee,
  BarChart3,
  Bell,
  Building2,
  Boxes,
  CalendarDays,
  Check,
  ChevronDown,
  CircleDollarSign,
  Clock3,
  Copy,
  Download,
  Eye,
  EyeOff,
  FileCheck2,
  FileText,
  Gift,
  Headphones,
  ImagePlus,
  KeyRound,
  LayoutDashboard,
  LockKeyhole,
  LogOut,
  Mail,
  Menu,
  Megaphone,
  Minus,
  MoreVertical,
  PackageCheck,
  Printer,
  Search,
  ShieldAlert,
  ShieldCheck,
  ShoppingCart,
  Star,
  Store,
  TrendingUp,
  Truck,
  UserRound,
  Users,
  WalletCards,
  X,
} from "lucide-react";
import { api, sellerAuthStore } from "../services/api.js";
import CategoryTreeSelect from "../components/CategoryTreeSelect.jsx";
import GstPricePreview from "../components/GstPricePreview.jsx";
import ForgotPasswordForm from "../components/ForgotPasswordForm.jsx";
import PortalAuthCard from "../components/PortalAuthCard.jsx";
import BrandLogo from "../components/BrandLogo.jsx";
import DocumentPreviewModal from "../components/DocumentPreviewModal.jsx";
import OrderTrackingPage from "../components/OrderTrackingPage.jsx";
import OperationsOrderDetails from "../components/OperationsOrderDetails.jsx";
import OrderSettlementDetails from "../components/OrderSettlementDetails.jsx";
import TablePagination from "../components/TablePagination.jsx";
import SupportTickets from "../components/SupportTickets.jsx";
import WhatsAppIcon from "../components/WhatsAppIcon.jsx";
import ProductCreatePage from "./ProductCreatePage.jsx";
import { isSaveMessage, showToast } from "../utils/toast.js";
import { openInvoice } from "../utils/invoiceDocument.js";

const money = (value) =>
  new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR" }).format(
    value || 0,
  );
let activeSellerPortalScreen = "dashboard";
const storefrontProductUrl = (productId) => {
  const local = ["localhost", "127.0.0.1"].includes(window.location.hostname);
  const storefrontOrigin = String(
    import.meta.env.VITE_STOREFRONT_URL ||
      (local ? "http://localhost:5173" : "https://hrsbasket.com"),
  ).replace(/\/+$/, "");
  return `${storefrontOrigin}/#/product/${productId}`;
};

function SellerRegistrationSuccess({ result, onContinue }) {
  const seller = result.seller;
  const details = [
    {
      label: "Seller ID",
      value: seller.sellerNumber,
      icon: Store,
      tone: "purple",
    },
    {
      label: "Temporary Password",
      value: result.temporaryPassword,
      icon: LockKeyhole,
      tone: "green",
    },
    {
      label: "Registered Email",
      value: seller.email,
      icon: Mail,
      tone: "blue",
    },
    {
      label: "Company",
      value: seller.companyName,
      icon: Building2,
      tone: "pink",
    },
    {
      label: "GST Status",
      value: seller.isGstRegistered ? "GST Registered" : "Not GST Registered",
      icon: ShieldCheck,
      tone: "gold",
    },
    {
      label: "Joining Date",
      value: new Date(seller.createdAt || Date.now()).toLocaleDateString(
        "en-GB",
        { day: "2-digit", month: "short", year: "numeric" },
      ),
      icon: CalendarDays,
      tone: "dark",
    },
  ];
  const benefits = [
    {
      title: "List Products",
      text: "Add products and grow your catalogue",
      icon: Boxes,
      tone: "purple",
    },
    {
      title: "Manage Orders",
      text: "Track and fulfil customer orders",
      icon: PackageCheck,
      tone: "blue",
    },
    {
      title: "Secure Payouts",
      text: "Manage earnings and withdrawals",
      icon: WalletCards,
      tone: "green",
    },
    {
      title: "Grow Sales",
      text: "Track performance from your dashboard",
      icon: TrendingUp,
      tone: "orange",
    },
  ];
  return (
    <main className="partnerSuccessPage sellerSuccessPage">
      <header className="partnerSuccessHeader">
        <div className="partnerSuccessBrand">
          <span className="brandCart">
            <ShoppingCart size={27} />
            <Check size={14} />
          </span>
          <div>
            <strong>
              <i>HRS</i> BASKET
            </strong>
            <small>Seller Program</small>
          </div>
        </div>
        <div className="partnerSuccessStatus">
          <ShieldCheck size={20} />
          <span>Account Created</span>
          <strong>Success</strong>
        </div>
      </header>
      <div className="partnerSuccessStripe" />
      <section className="partnerSuccessCanvas">
        <div className="successConfetti" aria-hidden="true">
          {Array.from({ length: 24 }, (_, index) => (
            <i key={index} />
          ))}
        </div>
        <div className="successCheck">
          <Check size={55} strokeWidth={4} />
        </div>
        <h1>Congratulations!</h1>
        <h2>
          Welcome to the <span>HRS</span> Seller Program
        </h2>
        <p className="successLead">
          Your email has been verified and your seller account has been created
          successfully.
        </p>
        <div className="membershipBadge">
          <Store size={29} />
          <span>
            <strong>Registered Seller</strong>
            <small>★★★★★</small>
          </span>
        </div>
        <section className="partnerAccountCard">
          <h3>
            <Store size={22} /> Your Seller Account Details
          </h3>
          <div>
            {details.map(({ label, value, icon: Icon, tone }) => (
              <dl key={label}>
                <dt>
                  <Icon size={18} />
                  {label}
                </dt>
                <dd className={tone}>{value}</dd>
              </dl>
            ))}
          </div>
        </section>
        <section className="partnerWelcomeBanner">
          <div className="welcomeShield">
            <ShieldCheck size={56} />
          </div>
          <div>
            <h3>
              You are now part of the HRS <span>Seller Family!</span>
            </h3>
            <p>
              Save your temporary password, then sign in to start setting up
              your store.
            </p>
            <button onClick={onContinue}>
              Continue to Login <ArrowRight size={17} />
            </button>
          </div>
          <div className="welcomeGift">
            <Gift size={61} />
            <span>● ● ●</span>
          </div>
        </section>
        <section className="partnerBenefits">
          {benefits.map(({ title, text, icon: Icon, tone }) => (
            <article key={title} className={tone}>
              <span>
                <Icon size={29} />
              </span>
              <h3>{title}</h3>
              <p>{text}</p>
            </article>
          ))}
        </section>
      </section>
      <footer className="partnerSuccessFooter">
        <ShieldCheck size={38} />
        <div>
          <strong>Thank you for joining the HRS Seller Program.</strong>
          <span>We look forward to helping your business grow.</span>
        </div>
        <div className="footerBrand">
          <strong>
            <i>HRS</i> BASKET
          </strong>
          <small>Seller Program</small>
        </div>
      </footer>
    </main>
  );
}
const printSellerDocument = (order, type) => {
  const packing = type === "packing";
  if (!packing) {
    openInvoice(order, true);
    return;
  }
  const popup = window.open("", "_blank", "width=900,height=700");
  if (!popup) throw new Error("Allow pop-ups to print this document");
  const itemTotal = (item) =>
    Number(item.price || 0) * Number(item.quantity || 0);
  const totalGst = (order.items || []).reduce(
    (sum, item) =>
      sum + Number(item.gstAmount || 0) * Number(item.quantity || 0),
    0,
  );
  const subtotal = (order.items || []).reduce(
    (sum, item) => sum + itemTotal(item),
    0,
  );
  const grandTotal =
    subtotal + (packing ? 0 : Number(order.shippingTotal || 0));
  const rows = (order.items || [])
    .map(
      (item) =>
        `<tr><td>${item.name}<br><small>SKU: ${item.sku}</small></td><td>${item.quantity}</td>${packing ? "" : `<td>${money(item.price)}</td><td>${Number(item.gstRate || 0)}%</td><td>${money(Number(item.gstAmount || 0) * item.quantity)}</td><td>${money(itemTotal(item))}</td>`}</tr>`,
    )
    .join("");
  const qrData = encodeURIComponent(
    JSON.stringify({
      order: order.orderNumber,
      invoice: order.invoiceNumber,
      total: grandTotal,
      status: order.status,
    }),
  );
  popup.document.write(
    `<!doctype html><html><head><title>${packing ? "Packing Slip" : "Invoice"} ${order.orderNumber}</title><style>body{font:13px Arial;padding:30px;color:#222}header,.addresses,.invoiceFooter{display:flex;justify-content:space-between;gap:24px}header{border-bottom:2px solid;margin-bottom:20px}.addresses>div{width:33%;padding:12px;border:1px solid #ddd}table{width:100%;border-collapse:collapse;margin-top:22px}th,td{padding:9px;border:1px solid #ccc;text-align:left}.totals{width:330px;margin:18px 0 0 auto}.totals p{display:flex;justify-content:space-between;margin:0;padding:7px;border-bottom:1px solid #ddd}.totals .grand{font-size:17px;font-weight:bold}.invoiceQr{width:115px;height:115px}.invoiceFooter{align-items:end;margin-top:20px}</style></head><body><header><div><h1>${packing ? "PACKING SLIP" : "TAX INVOICE"}</h1><h3>${order.invoiceStore?.shopName || "HRS Basket"}</h3></div><div><b>Order:</b> ${order.orderNumber}<br>${packing ? "" : `<b>Invoice:</b> ${order.invoiceNumber || ""}<br>`}<b>Date:</b> ${new Date(order.createdAt).toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short" })}</div></header><section class="addresses"><div><b>Store address</b><p>${order.invoiceStore?.address || "—"}<br>${order.invoiceStore?.email || ""}<br>${order.invoiceStore?.phone || ""}</p></div><div><b>Seller address</b><p>${order.invoiceStore?.sellerName || "Seller"}<br>${order.invoiceStore?.sellerAddress || "—"}<br>${order.invoiceStore?.sellerGstNumber ? `GSTIN: ${order.invoiceStore.sellerGstNumber}` : ""}</p></div><div><b>Ship to</b><p>${order.address?.name || ""}<br>${order.address?.shippingAddress || order.address?.billingAddress || ""}<br>${[order.address?.city, order.address?.state, order.address?.postalCode].filter(Boolean).join(", ")}<br>${order.address?.phone || ""}</p></div></section><table><thead><tr><th>Product</th><th>Qty</th>${packing ? "" : "<th>Price</th><th>GST %</th><th>GST amount</th><th>Total</th>"}</tr></thead><tbody>${rows}</tbody></table>${packing ? "" : `<div class="totals"><p><span>Items total</span><b>${money(subtotal)}</b></p><p><span>Total GST collected</span><b>${money(totalGst)}</b></p><p><span>Shipping</span><b>${money(order.shippingTotal)}</b></p><p class="grand"><span>Invoice total</span><b>${money(grandTotal)}</b></p></div>`}<div class="invoiceFooter"><small>Scan the QR code to read the order summary.</small><img class="invoiceQr" alt="Order QR code" src="https://api.qrserver.com/v1/create-qr-code/?size=180x180&data=${qrData}" /></div></body></html>`,
  );
  popup.document.write(
    "<style>.addresses>div:first-child{display:none}.addresses>div{width:50%}</style>",
  );
  popup.document.close();
  popup.focus();
  window.setTimeout(() => popup.print(), 600);
};
const fileData = async (file) =>
  (await api.uploadDocument(file, "seller-kyc")).url;
const reelData = async (file) => {
  if (file.size > 50 * 1024 * 1024)
    throw new Error("Reel must be 50 MB or smaller");
  return (await api.uploadVideo(file)).url;
};
const sellerLocationRoute = () => {
  if (window.location.hash.startsWith("#/seller"))
    return window.location.hash.split("?")[0];
  return window.location.pathname.replace(/\/+$/, "") || "/";
};
const navigateSellerPath = (path) => {
  window.history.pushState(null, "", path);
  window.dispatchEvent(new PopStateEvent("popstate"));
};
const referralFromHash = () =>
  new URLSearchParams(
    window.location.hash.split("?")[1] || window.location.search,
  )
    .get("ref")
    ?.trim()
    .toUpperCase() || "";
const blankRegistration = {
  name: "",
  companyName: "",
  businessName: "",
  address: "",
  city: "",
  state: "",
  gstState: "",
  businessState: "",
  pinCode: "",
  pickupSameAsBusiness: true,
  pickupAddress: "",
  pickupCity: "",
  pickupState: "",
  pickupPinCode: "",
  mobile: "",
  email: "",
  isGstRegistered: false,
  gstRegistrationStatus: "",
  gstNumber: "",
  taxVerificationToken: "",
  gstCertificate: "",
  declarationAccepted: false,
  referralSellerId: referralFromHash(),
};
const indianStates = ["Andaman and Nicobar Islands", "Andhra Pradesh", "Arunachal Pradesh", "Assam", "Bihar", "Chandigarh", "Chhattisgarh", "Dadra and Nagar Haveli and Daman and Diu", "Delhi", "Goa", "Gujarat", "Haryana", "Himachal Pradesh", "Jammu and Kashmir", "Jharkhand", "Karnataka", "Kerala", "Ladakh", "Lakshadweep", "Madhya Pradesh", "Maharashtra", "Manipur", "Meghalaya", "Mizoram", "Nagaland", "Odisha", "Puducherry", "Punjab", "Rajasthan", "Sikkim", "Tamil Nadu", "Telangana", "Tripura", "Uttar Pradesh", "Uttarakhand", "West Bengal"];
const blankProduct = {
  name: "",
  sku: "",
  price: "",
  offerPrice: "",
  category: "",
  taxCategory: "",
  priceIncludesTax: true,
  displayType: "Product",
  stock: "",
  lowStockThreshold: 10,
  shortDescription: "",
  detailedDescription: "",
  mainImage: "",
  videoUrl: "",
  tags: "",
  isStockManageable: true,
};
const sellerMenuRoutes = new Set([
  "dashboard",
  "profile",
  "products",
  "orders",
  "returns",
  "wallet",
  "transactions",
  "payouts",
  "reports",
  "referrals",
  "marketing",
  "reviews",
  "kyc",
  "bank",
  "support",
  "password",
]);
const sellerScreenFromHash = () => {
  const route = window.location.hash.match(/^#\/seller\/([^/?]+)/)?.[1];
  return sellerMenuRoutes.has(route) ? route : "dashboard";
};

function SellerLoginScreen({
  settings,
  onBack,
  message,
  login,
  setLogin,
  busy,
  onSubmit,
  onForgot,
  onSignup,
}) {
  const [showPassword, setShowPassword] = useState(false);
  const benefits = [
    "All India Marketplace Reach",
    "Seller Product Dashboard",
    "GST Compliance Support",
    "ShipRocket Integration",
    "Sales & Profit Tracking",
    "Marketing Opportunities",
    "Priority Seller Support",
    "Secure Payout Management",
  ];
  const assurances = [
    [ShieldCheck, "100% Secure", "Your data is safe with us"],
    [Headphones, "24/7 Support", "We are here to help you"],
    [Award, "Trusted Platform", "A marketplace built for sellers"],
    [TrendingUp, "Sell & Grow", "Reach customers and grow your business"],
  ];
  return (
    <main className="hrsPartnerLogin hrsSellerLogin">
      <button className="hrsPartnerBack" type="button" onClick={onBack}>
        ← Back to store
      </button>
      <section className="hrsPartnerLoginShell">
        <div className="hrsPartnerHero">
          <BrandLogo settings={settings} className="hrsPartnerBrand" showText />
          <div className="hrsPartnerWelcome">
            <span>Welcome to</span>
            <h1>
              HRS <em>Seller</em>
              <small>Marketplace Program</small>
            </h1>
            <p>Sell More, Grow Together</p>
          </div>
          <div className="hrsPartnerIllustration">
            <span className="hrsOrbitIcon growth">
              <TrendingUp />
            </span>
            <span className="hrsOrbitIcon users">
              <Users />
            </span>
            <span className="hrsOrbitIcon wallet">
              <WalletCards />
            </span>
            <div>
              <ShieldCheck />
              <UserRound />
            </div>
          </div>
          <div className="hrsPartnerBenefits">
            <h2>
              👑 <span>Seller Benefits</span>
            </h2>
            {benefits.map((benefit) => (
              <p key={benefit}>
                <Check size={16} />
                {benefit}
              </p>
            ))}
          </div>
        </div>
        <div className="hrsPartnerFormColumn">
          <div className="hrsSecureLabel">
            <ShieldCheck size={18} /> Secure Seller Login
          </div>
          <section className="hrsPartnerFormCard">
            <div className="hrsLoginShield">
              <ShieldCheck />
            </div>
            <h2>
              Hi, <span>Welcome Back</span>
            </h2>
            <p>Please login to your seller account</p>
            <div className="hrsLoginDivider">
              <span />
              Sign in with your credentials
              <span />
            </div>
            {message ? (
              <div className="hrsLoginNotice">{message}</div>
            ) : (
              <div className="hrsLoginNotice">
                Enter your valid credentials to access your seller dashboard.
              </div>
            )}
            <form onSubmit={onSubmit}>
              <label>
                <strong>Seller ID or Email</strong>
                <span className="hrsInput">
                  <UserRound size={18} />
                  <input
                    placeholder="Enter Seller ID or email"
                    required
                    value={login.identifier}
                    onChange={(event) =>
                      setLogin({ ...login, identifier: event.target.value })
                    }
                  />
                </span>
              </label>
              <label>
                <strong>Password</strong>
                <span className="hrsInput">
                  <LockKeyhole size={18} />
                  <input
                    type={showPassword ? "text" : "password"}
                    placeholder="Enter your password"
                    required
                    value={login.password}
                    onChange={(event) =>
                      setLogin({ ...login, password: event.target.value })
                    }
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((visible) => !visible)}
                    aria-label={
                      showPassword ? "Hide password" : "Show password"
                    }
                  >
                    {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </span>
              </label>
              <div className="hrsLoginOptions">
                <label>
                  <input type="checkbox" /> Remember me
                </label>
                <button type="button" onClick={onForgot}>
                  Forgot password?
                </button>
              </div>
              <button className="hrsSignIn" disabled={busy}>
                <LockKeyhole size={18} />
                {busy ? "Signing in…" : "Sign In"}
              </button>
              <div className="hrsJoinPrompt">
                Don&apos;t have an account?{" "}
                <button type="button" onClick={onSignup}>
                  Join Now
                </button>
              </div>
            </form>
          </section>
        </div>
        <section className="hrsPartnerAssurances">
          {assurances.map(([Icon, title, text]) => (
            <article key={title}>
              <Icon />
              <div>
                <h3>{title}</h3>
                <p>{text}</p>
              </div>
            </article>
          ))}
        </section>
        <footer>
          <span>
            <ShieldCheck size={18} /> © {new Date().getFullYear()} HRS Basket.
            All rights reserved.
          </span>
          <strong>Together We Grow More 🚀</strong>
        </footer>
      </section>
    </main>
  );
}

function SellerRegistrationScreen({
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
  const [taxVerification, setTaxVerification] = useState({ status: "", message: "", busy: false });
  const [certificateUpload, setCertificateUpload] = useState({ busy: false, error: "", name: "" });
  const update = (field, value) =>
    setRegistration((current) => ({ ...current, [field]: value, ...(field === "gstNumber" ? { taxVerificationToken: "" } : {}) }));
  const verifyTax = async () => {
    const kind = "gstin";
    const value = registration.gstNumber;
    setTaxVerification({ status: "", message: "Verifying with GST service…", busy: true });
    try {
      const result = await api.verifySellerTaxIdentifier({ kind, value });
      const details = result?.data || result?.result || result || {};
      const taxpayer = details?.taxpayerInfo || details?.taxpayer_info || details?.gstinDetails || details;
      const legalName = result?.legalName || taxpayer?.legalName || taxpayer?.legal_name || taxpayer?.legal_name_of_business || taxpayer?.lgnm || "";
      const tradeName = result?.tradeName || taxpayer?.tradeName || taxpayer?.trade_name || taxpayer?.tradeNam || taxpayer?.trade_name_of_business || "";
      const registeredState = result?.state || result?.gstState || taxpayer?.state || taxpayer?.stateName || taxpayer?.state_name || taxpayer?.gstState || taxpayer?.pradr?.addr?.stcd || taxpayer?.address?.state || "";
      const verifiedBusinessName = tradeName || legalName;
      setRegistration((current) => ({
        ...current,
        taxVerificationToken: result.verificationToken,
        ...(kind === "gstin" ? {
          businessName: verifiedBusinessName || current.businessName,
          companyName: tradeName || legalName || current.companyName,
          gstState: registeredState || current.gstState,
          state: registeredState || current.state,
          ...(!current.pickupSameAsBusiness && registeredState ? { pickupState: registeredState } : {})
        } : {})
      }));
      setTaxVerification({ status: verifiedBusinessName && registeredState ? "success" : "error", message: result.verificationMode === "manual" ? "GSTIN format verified, but business details require administrator review." : verifiedBusinessName && registeredState ? "GSTIN verified successfully. Business name and state have been filled automatically." : "GSTIN verified, but the verification service did not return the business name and state.", busy: false });
    } catch (error) { setTaxVerification({ status: "error", message: error.message, busy: false }); }
  };
  return (
    <>
      <PortalAuthCard
        portal="Seller"
        heading="Register as a seller"
        subtitle="Create your seller account to start listing products."
        dividerText="Seller registration"
        pageClassName="partnerRegistrationPage sellerRegistrationPage"
        panelClassName="partnerRegistrationPanel"
        onBack={onBack}
        settings={settings}
      >
        {message && !registrationOtp.challengeId && (
          <div className="notice">{message}</div>
        )}
        <form
          className="authForm formGrid twoColumn partnerRegistrationForm"
          onSubmit={(event) => {
            if (certificateUpload.busy) {
              event.preventDefault();
              setCertificateUpload((current) => ({ ...current, error: "Please wait for the GST certificate upload to finish." }));
              return;
            }
            onSubmit(event);
          }}
        >
          <label>
            Seller name
            <input
              required
              value={registration.name}
              onChange={(event) => update("name", event.target.value)}
            />
          </label>
          <label>
            Company name
            <input
              required
              value={registration.companyName}
              onChange={(event) => update("companyName", event.target.value)}
            />
          </label>
          <label>
            Mobile
            <input
              required
              value={registration.mobile}
              onChange={(event) => update("mobile", event.target.value)}
            />
          </label>
          <label>
            Email
            <input
              type="email"
              required
              value={registration.email}
              onChange={(event) => update("email", event.target.value)}
            />
          </label>
          <label>
            Pin code
            <input
              required
              inputMode="numeric"
              value={registration.pinCode}
              onChange={(event) =>
                update("pinCode", event.target.value.replace(/\D/g, ""))
              }
            />
          </label>
          <label className="full">
            Business address
            <input
              required
              value={registration.address}
              onChange={(event) => update("address", event.target.value)}
            />
          </label>
          <label>
            City
            <input
              required
              value={registration.city}
              onChange={(event) => update("city", event.target.value)}
            />
          </label>
          <label>
            State
            <input
              required
              value={registration.state}
              onChange={(event) => update("state", event.target.value)}
            />
          </label>
          <label className="toggleRow full">
            <input
              type="checkbox"
              checked={registration.pickupSameAsBusiness}
              onChange={(event) =>
                update("pickupSameAsBusiness", event.target.checked)
              }
            />
            <span>Pickup address is the same as business address</span>
          </label>
          {!registration.pickupSameAsBusiness && (
            <>
              <label className="full">
                Pickup address
                <input
                  required
                  value={registration.pickupAddress}
                  onChange={(event) =>
                    update("pickupAddress", event.target.value)
                  }
                />
              </label>
              <label>
                Pickup city
                <input
                  required
                  value={registration.pickupCity}
                  onChange={(event) => update("pickupCity", event.target.value)}
                />
              </label>
              <label>
                Pickup state
                <input
                  required
                  value={registration.pickupState}
                  onChange={(event) =>
                    update("pickupState", event.target.value)
                  }
                />
              </label>
              <label>
                Pickup PIN code
                <input
                  required
                  inputMode="numeric"
                  value={registration.pickupPinCode}
                  onChange={(event) =>
                    update(
                      "pickupPinCode",
                      event.target.value.replace(/\D/g, ""),
                    )
                  }
                />
              </label>
            </>
          )}
          <label className="full">
            Referral Seller ID (optional)
            <input
              pattern="(?:\d{6}|HRS\d{6})"
              maxLength="9"
              placeholder="123456 or HRS123456"
              value={registration.referralSellerId}
              onChange={(event) =>
                update(
                  "referralSellerId",
                  event.target.value
                    .toUpperCase()
                    .replace(/[^A-Z0-9]/g, "")
                    .slice(0, 9),
                )
              }
            />
            <small>
              Enter the 6-digit Seller ID, with or without the HRS prefix.
            </small>
          </label>
          <label className="full">
            Is your business GST registered?
            <select
              required
              value={registration.gstRegistrationStatus || ""}
              onChange={(event) => {
                setTaxVerification({ status: "", message: "", busy: false });
                setRegistration((current) => ({
                  ...current,
                  gstRegistrationStatus: event.target.value,
                  isGstRegistered: event.target.value === "yes",
                  gstNumber: "",
                  taxVerificationToken: "",
                  gstCertificate: "",
                  declarationAccepted: false,
                }));
              }}
            >
              <option value="">Select GST Status</option>
              <option value="yes">Yes – GST Registered</option>
              <option value="no">No – GST Unregistered</option>
            </select>
          </label>
          {registration.gstRegistrationStatus === "yes" ? (
            <>
              <label>
                Business name
                <input
                  required
                  value={registration.businessName}
                  onChange={(event) =>
                    update("businessName", event.target.value)
                  }
                />
              </label>
              <label>
                GST state
                <input
                  required
                  value={registration.gstState}
                  onChange={(event) => update("gstState", event.target.value)}
                />
              </label>
              <label>
                GSTIN / GST Number
                <input
                  required
                  value={registration.gstNumber}
                  onChange={(event) =>
                    update("gstNumber", event.target.value.toUpperCase())
                  }
                />
                <button className="secondaryButton taxVerifyButton" type="button" disabled={taxVerification.busy || !registration.gstNumber} onClick={verifyTax}>{taxVerification.busy ? "Verifying…" : "Verify GSTIN"}</button>
              </label>
              <label>
                GST certificate
                <input
                  type="file"
                  accept="image/*,.pdf"
                  required={!registration.gstCertificate}
                  onChange={async (event) => {
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
                  }}
                />
                {certificateUpload.busy && <small role="status">Uploading {certificateUpload.name}…</small>}
                {certificateUpload.error && <small className="errorText" role="alert">{certificateUpload.error}</small>}
                {registration.gstCertificate && (
                  <small>Certificate uploaded successfully: {certificateUpload.name}</small>
                )}
              </label>
            </>
          ) : registration.gstRegistrationStatus === "no" ? (
            <>
              <label className="full">
                Business state
                <select required value={registration.businessState} onChange={(event) => setRegistration((current) => ({ ...current, businessState: event.target.value, state: event.target.value }))}><option value="">Select State</option>{indianStates.map((state) => <option key={state}>{state}</option>)}</select>
              </label>
              <label className="toggleRow full">
                <input
                  type="checkbox"
                  required
                  checked={registration.declarationAccepted}
                  onChange={(event) =>
                    update("declarationAccepted", event.target.checked)
                  }
                />
                <span>
                  I declare that the business is not GST registered and accept
                  same-state selling restrictions.
                </span>
              </label>
            </>
          ) : null}
          {taxVerification.message && <p className={`taxVerificationMessage full ${taxVerification.status}`} role="status">{taxVerification.status === "success" ? "● " : taxVerification.status === "error" ? "● " : ""}{taxVerification.message}</p>}
          <div className="registrationActions full">
            <button className="primaryButton authButton" disabled={busy || certificateUpload.busy || !registration.gstRegistrationStatus || (registration.isGstRegistered && (!registration.taxVerificationToken || !registration.gstCertificate)) || (!registration.isGstRegistered && (!registration.businessState || !registration.declarationAccepted))}>
              {certificateUpload.busy ? "Uploading GST certificate…" : busy ? "Checking details…" : "Verify email & register"}
            </button>
          </div>
          <p className="sellerExistingAccount full">
            Already have a seller account?{" "}
            <button type="button" className="linkButton" onClick={onLogin}>
              Login to seller
            </button>
          </p>
        </form>
      </PortalAuthCard>
      {registrationOtp.challengeId && (
        <div
          className="partnerPaymentOverlay"
          role="dialog"
          aria-modal="true"
          aria-labelledby="seller-otp-title"
        >
          <form
            className="partnerPaymentDialog sellerOtpDialog"
            onSubmit={onVerify}
          >
            <button
              className="partnerPaymentClose"
              type="button"
              disabled={busy}
              aria-label="Close email verification"
              onClick={() => {
                setRegistrationOtp({ challengeId: "", code: "" });
                setMessage("");
              }}
            >
              <X size={20} />
            </button>
            <span className="eyebrow">Email verification</span>
            <h2 id="seller-otp-title">Verify your email</h2>
            <p>
              Enter the 6-digit OTP sent to{" "}
              <strong>{registration.email}</strong>.
            </p>
            <label className="partnerPaymentOtp">
              <span>Email OTP</span>
              <input
                autoFocus
                inputMode="numeric"
                autoComplete="one-time-code"
                pattern="\d{6}"
                maxLength="6"
                required
                value={registrationOtp.code}
                onChange={(event) =>
                  setRegistrationOtp({
                    ...registrationOtp,
                    code: event.target.value.replace(/\D/g, "").slice(0, 6),
                  })
                }
                placeholder="Enter 6-digit OTP"
              />
            </label>
            {message && (
              <p className="partnerPaymentStatus" role="status">
                {message}
              </p>
            )}
            <div className="partnerPaymentActions">
              <button
                className="secondaryButton"
                type="button"
                disabled={busy}
                onClick={() => {
                  setRegistrationOtp({ challengeId: "", code: "" });
                  setMessage("");
                }}
              >
                Cancel
              </button>
              <button
                className="primaryButton"
                disabled={busy || registrationOtp.code.length !== 6}
              >
                {busy ? "Verifying…" : "Verify OTP & create account"}
              </button>
            </div>
          </form>
        </div>
      )}
    </>
  );
}

function SellerProductsFull({ products, options, save, toggle, busy }) {
  const [editing, setEditing] = useState(null);
  const [page, setPage] = useState("list");
  const [viewing, setViewing] = useState(null);
  const [search, setSearch] = useState("");
  const [approvalFilter, setApprovalFilter] = useState(() => {
    const filter = new URLSearchParams(window.location.hash.split("?")[1] || "").get("filter");
    return ["active", "low-stock", "out-of-stock"].includes(filter) ? filter : "all";
  });
  const backToList = () => {
    setPage("list");
    setEditing(null);
    setViewing(null);
  };
  const saveProduct = async (payload) => {
    await save(editing, payload);
    backToList();
  };
  if (page === "form")
    return (
      <ProductCreatePage
        categories={options.categories || []}
        taxCategories={options.taxCategories || []}
        sellerSettlement={options.sellerSettlement || {}}
        gstDetails={options.gstDetails || null}
        products={products}
        initialProduct={editing}
        onSave={saveProduct}
        onBack={backToList}
        hideCostPrice
        hideStatus={!editing}
        gstEnabled={options.isGstRegistered !== false}
        sellerShippingMode={options.shippingMode || "shiprocket"}
      />
    );
  if (page === "view" && viewing)
    return (
      <SellerProductDetails
        product={viewing}
        onBack={backToList}
        onEdit={() => {
          setEditing(viewing);
          setPage("form");
        }}
      />
    );
  const filteredProducts = products.filter(
    (product) =>
      `${product.name} ${product.sku}`
        .toLowerCase()
        .includes(search.toLowerCase()) &&
      (approvalFilter === "all" ||
        (approvalFilter === "active"
          ? product.status === "active" && product.sellerEnabled !== false
          : approvalFilter === "low-stock"
            ? product.isStockManageable && product.stock > 0 && product.stock <= Number(product.lowStockThreshold || 5)
            : approvalFilter === "out-of-stock"
              ? product.isStockManageable && product.stock <= 0
              : product.approvalStatus === "approved")),
  );
  return (
    <section className="contentStack sellerProductWorkspace">
      <div className="panel sellerProductToolbar">
        <div>
          <h2>Your products</h2>
          <p className="mutedText">
            Search inventory and manage approved or active listings.
          </p>
        </div>
        <label className="searchBox">
          <Search size={16} />
          <input
            placeholder="Search product name or SKU"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
          />
        </label>
        <select
          value={approvalFilter}
          onChange={(event) => setApprovalFilter(event.target.value)}
        >
          <option value="all">All products</option>
          <option value="approved">Approved</option>
          <option value="active">Active</option>
          <option value="low-stock">Low stock</option>
          <option value="out-of-stock">Out of stock</option>
        </select>
        <button
          className="primaryButton sellerAddProductButton"
          type="button"
          onClick={() => {
            setEditing(null);
            setPage("form");
          }}
        >
          + Add product
        </button>
      </div>
      <div className="panel tableWrap">
        <table>
          <thead>
            <tr>
              <th>Image</th>
              <th>Product / SKU</th>
              <th>Category / Subcategory</th>
              <th>Stock</th>
              <th>Price</th>
              <th>Approval</th>
              <th>Visibility</th>
              <th>Action</th>
            </tr>
          </thead>
          <tbody>
            {filteredProducts.map((product) => (
              <tr key={product._id}>
                <td>
                  {product.mainImage ? (
                    <img
                      className="sellerProductThumb"
                      src={product.mainImage}
                      alt={product.name}
                    />
                  ) : (
                    <span className="sellerProductThumb empty">No image</span>
                  )}
                </td>
                <td>
                  <strong>{product.name}</strong>
                  <br />
                  <small>SKU: {product.sku}</small>
                </td>
                <td>
                  {product.category?.parent?.name ||
                  product.category?.parent?.title
                    ? `${product.category.parent.name || product.category.parent.title} / `
                    : ""}
                  {product.category?.name || "—"}
                </td>
                <td>
                  <strong>
                    {product.isStockManageable ? product.stock : "Not managed"}
                  </strong>
                </td>
                <td>{money(product.offerPrice || product.price)}</td>
                <td>
                  <span
                    className={`status ${product.approvalStatus === "approved" ? "approved" : "pending"}`}
                  >
                    {product.approvalStatus.replaceAll("_", " ")}
                  </span>
                  {product.approvalNote && (
                    <small className="errorText">{product.approvalNote}</small>
                  )}
                </td>
                <td>
                  <button type="button" onClick={() => toggle(product)}>
                    {product.sellerEnabled ? "Active" : "Inactive"}
                  </button>
                </td>
                <td>
                  <div className="sellerProductActions">
                    <button
                      type="button"
                      onClick={() => {
                        setViewing(product);
                        setPage("view");
                      }}
                    >
                      View
                    </button>
                    <button
                      type="button"
                      disabled={busy}
                      onClick={() => {
                        setEditing(product);
                        setPage("form");
                      }}
                    >
                      Edit
                    </button>
                  </div>
                </td>
              </tr>
            ))}
            {!filteredProducts.length && (
              <tr>
                <td colSpan="8">No products match this search.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </section>
  );
}

function SellerProductDetails({ product, onBack, onEdit }) {
  const images = (product.media || []).filter((item) => item.type === "image");
  const detailRows = [
    ["SKU", product.sku],
    ["Category", product.category?.name],
    ["HSN Code", product.hsnCode],
    ["Brand / Manufacturer", product.manufacturerBrand],
    ["Price", money(product.price)],
    ["Offer price", money(product.offerPrice || product.price)],
    [
      "Tax",
      product.taxCategory
        ? `${product.taxCategory.name} (${product.taxCategory.rate}%)`
        : "None",
    ],
    ["Stock", product.isStockManageable ? product.stock : "Not managed"],
    [
      "Actual weight",
      product.actualWeight
        ? `${product.actualWeight} ${product.weightUnit || "kg"}`
        : "",
    ],
    [
      "Volumetric weight",
      product.volumetricWeight ? `${product.volumetricWeight} kg` : "",
    ],
    [
      "Length",
      product.length
        ? `${product.length} ${product.dimensionUnit || "cm"}`
        : "",
    ],
    [
      "Width",
      product.breadth
        ? `${product.breadth} ${product.dimensionUnit || "cm"}`
        : "",
    ],
    [
      "Height",
      product.height
        ? `${product.height} ${product.dimensionUnit || "cm"}`
        : "",
    ],
    ["Warranty", product.warranty],
    ["Approval", product.approvalStatus?.replaceAll("_", " ")],
    ["Store visibility", product.sellerEnabled ? "Enabled" : "Disabled"],
  ];
  return (
    <section className="contentStack sellerProductDetailPage">
      <div className="panelHeader">
        <button className="inlineButton" type="button" onClick={onBack}>
          ← Back to products
        </button>
        <button className="primaryButton" type="button" onClick={onEdit}>
          Edit product
        </button>
      </div>
      <article className="panel sellerProductDetail">
        <header>
          <div>
            <span className="eyebrow">Product details</span>
            <h2>{product.name}</h2>
            <p>{product.shortDescription}</p>
          </div>
          {product.mainImage && (
            <img src={product.mainImage} alt={product.name} />
          )}
        </header>
        <dl>
          {detailRows
            .filter(([, value]) => value !== undefined && value !== "")
            .map(([label, value]) => (
              <div key={label}>
                <dt>{label}</dt>
                <dd>{value || "—"}</dd>
              </div>
            ))}
        </dl>
        <section>
          <h3>Detailed description</h3>
          <p className="sellerProductDescription">
            {product.detailedDescription || "No detailed description added."}
          </p>
        </section>
        {product.variationOptions?.length > 0 && (
          <section>
            <h3>Variations</h3>
            <div className="sellerVariationSummary">
              {product.variationOptions.map((option) => (
                <div key={option.name}>
                  <strong>{option.name}</strong>
                  <span>{option.values?.join(", ")}</span>
                </div>
              ))}
            </div>
          </section>
        )}
        {images.length > 0 && (
          <section>
            <h3>Product images</h3>
            <div className="sellerProductGallery">
              {images.map((item, index) => (
                <img
                  key={`${item.url.slice(0, 20)}-${index}`}
                  src={item.url}
                  alt={item.alt || product.name}
                />
              ))}
            </div>
          </section>
        )}
        {product.videoUrl && (
          <section>
            <h3>Product reel</h3>
            <video
              className="sellerProductVideo"
              src={product.videoUrl}
              controls
            />
          </section>
        )}
        {product.approvalNote && (
          <div className="notice">Admin note: {product.approvalNote}</div>
        )}
      </article>
    </section>
  );
}

export default function SellerPortal({ onBack, settings = {} }) {
  const [seller, setSeller] = useState(sellerAuthStore.seller);
  const [screen, setScreen] = useState(
    seller
      ? sellerScreenFromHash()
      : sellerLocationRoute() === "/seller/register" ||
          sellerLocationRoute() === "#/seller/register"
        ? "register"
        : "login",
  );
  const [registration, setRegistration] = useState(blankRegistration);
  const [credentials, setCredentials] = useState(null);
  const [login, setLogin] = useState({ identifier: "", password: "" });
  const [showLoginPassword, setShowLoginPassword] = useState(false);
  const [registrationOtp, setRegistrationOtp] = useState({
    challengeId: "",
    code: "",
  });
  const [data, setData] = useState({
    dashboard: {},
    products: [],
    orders: [],
    wallet: { payouts: [] },
    referrals: { referrals: [], referralCount: 0, referralLink: "" },
    withdrawals: [],
    options: { categories: [], taxCategories: [] },
  });
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
    if (window.location.hash.split("?")[0] !== registrationCompleteRoute)
      window.history.pushState(
        { sellerRegistrationComplete: true },
        "",
        registrationCompleteRoute,
      );
  };
  useEffect(() => {
    if (!mobileNavOpen) return undefined;
    const closeOnEscape = (event) => {
      if (event.key === "Escape") setMobileNavOpen(false);
    };
    document.body.classList.add("sellerMenuOpen");
    window.addEventListener("keydown", closeOnEscape);
    return () => {
      document.body.classList.remove("sellerMenuOpen");
      window.removeEventListener("keydown", closeOnEscape);
    };
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
    sidebarWallet.onclick = () =>
      window.dispatchEvent(
        new CustomEvent("seller-dashboard-navigate", { detail: "wallet" }),
      );
    nav.append(sidebarWallet);
    return () => {
      button.remove();
      sidebarWallet.remove();
    };
  }, [seller]);
  useEffect(() => {
    if (isSaveMessage(message)) showToast(message);
  }, [message]);
  useEffect(() => {
    const syncSellerScreen = () => {
      const route = sellerLocationRoute();
      if (sellerAuthStore.token) setScreen(sellerScreenFromHash());
      else if (route === registrationCompleteRoute && credentials)
        setScreen("registered");
      else if (route === registrationCompleteRoute) {
        window.history.replaceState(null, "", "#/seller/login");
        setScreen("login");
      } else if (["#/seller/register", "/seller/register"].includes(route)) {
        const referralSellerId = referralFromHash();
        setRegistration((current) => ({
          ...current,
          referralSellerId: referralSellerId || current.referralSellerId,
        }));
        setScreen("register");
      } else if (
        ["#/seller", "#/seller/login", "/seller", "/seller/login"].includes(
          route,
        )
      )
        setScreen("login");
    };
    window.addEventListener("hashchange", syncSellerScreen);
    window.addEventListener("popstate", syncSellerScreen);
    const handleExpiredSession = () => {
      setSeller(null);
      setScreen("login");
      setMessage("");
      setLoadError("");
    };
    window.addEventListener("seller-session-expired", handleExpiredSession);
    return () => {
      window.removeEventListener("hashchange", syncSellerScreen);
      window.removeEventListener("popstate", syncSellerScreen);
      window.removeEventListener("seller-session-expired", handleExpiredSession);
    };
  }, [credentials]);
  useEffect(() => {
    if (!seller || !sellerMenuRoutes.has(screen)) return;
    const nextHash = `#/seller/${screen}`;
    if (window.location.hash.split("?")[0] !== nextHash) window.location.hash = nextHash;
  }, [seller, screen]);
  useEffect(() => {
    const navigateFromDashboard = (event) => {
      const requestedTarget = String(event.detail || "dashboard");
      const [requestedScreen, query] = requestedTarget.split("?");
      const target = sellerMenuRoutes.has(requestedScreen) ? requestedScreen : "dashboard";
      window.history.pushState(null, "", `#/seller/${target}${query ? `?${query}` : ""}`);
      setScreen(target);
      setMessage("");
    };
    window.addEventListener("seller-dashboard-navigate", navigateFromDashboard);
    return () =>
      window.removeEventListener(
        "seller-dashboard-navigate",
        navigateFromDashboard,
      );
  }, []);
  useEffect(() => {
    const openProfile = (event) => {
      if (event.target.closest(".sellerMobileIdentity")) setScreen("profile");
    };
    document.addEventListener("click", openProfile);
    return () => document.removeEventListener("click", openProfile);
  }, []);
  useEffect(() => {
    const root = document.documentElement;
    const profileImage = String(seller?.profileImage || "").trim();
    root.style.setProperty(
      "--seller-header-avatar",
      profileImage
        ? `url(${JSON.stringify(profileImage)})`
        : "url('/images/e-commerce/account/avatar.svg')",
    );
    root.style.setProperty(
      "--seller-header-wallet",
      JSON.stringify(`Wallet Balance  ${money(data.wallet.walletBalance)}`),
    );
    root.style.setProperty(
      "--seller-header-id",
      JSON.stringify(seller?.sellerNumber || "Seller"),
    );
    return () => {
      root.style.removeProperty("--seller-header-avatar");
      root.style.removeProperty("--seller-header-wallet");
      root.style.removeProperty("--seller-header-id");
    };
  }, [seller?.profileImage, seller?.sellerNumber, data.wallet.walletBalance]);
  const submit = async (action) => {
    setBusy(true);
    setMessage("");
    try {
      await action();
    } catch (error) {
      setMessage(error.message);
    } finally {
      setBusy(false);
    }
  };
  const refresh = async () => {
    if (!sellerAuthStore.token) return;
    setLoadError("");
    setPortalReady(true);
    const results = await Promise.allSettled([
      api.sellerMe().then((me) => {
        sellerAuthStore.seller = me.seller;
        setSeller(me.seller);
      }),
      api
        .sellerDashboard()
        .then((dashboard) => setData((current) => ({ ...current, dashboard }))),
      api
        .sellerReferrals()
        .then((referrals) => setData((current) => ({ ...current, referrals }))),
      api
        .sellerProducts()
        .then((products) => setData((current) => ({ ...current, products }))),
      api
        .sellerOrders()
        .then((orders) => setData((current) => ({ ...current, orders }))),
      api
        .sellerWallet()
        .then((wallet) => setData((current) => ({ ...current, wallet }))),
      api
        .sellerWithdrawals()
        .then((withdrawals) =>
          setData((current) => ({ ...current, withdrawals })),
        ),
      api
        .sellerCatalogOptions()
        .then((options) => setData((current) => ({ ...current, options }))),
    ]);
    const failure = results.find((result) => result.status === "rejected");
    if (failure) throw failure.reason;
  };
  useEffect(() => {
    const query = window.location.hash.includes("?") ? window.location.hash.split("?")[1] : "";
    const code = new URLSearchParams(query).get("adminLogin");
    if (!code) return;
    window.history.replaceState(null, "", "#/seller/dashboard");
    setPortalReady(false);
    api.exchangeSellerImpersonation(code).then((result) => {
      sellerAuthStore.setImpersonation(result);
      setSeller(result.seller);
      setScreen("dashboard");
      setPortalReady(true);
      return refresh();
    }).catch((error) => {
      sellerAuthStore.clearImpersonation();
      setSeller(null);
      setScreen("login");
      setPortalReady(true);
      setMessage(error.message);
    });
  }, []);
  useEffect(() => {
    refresh().catch((error) => {
      setLoadError(error.message);
      setMessage(error.message);
      setPortalReady(true);
    });
  }, []);
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
  }, [
    seller,
    screen,
    settings.logoUrl,
    settings.logoWidth,
    settings.logoHeight,
    settings.shopName,
  ]);
  const register = (event) => {
    event.preventDefault();
    submit(async () => {
      const result = await api.requestSellerRegistrationOtp(registration);
      setRegistrationOtp({ challengeId: result.challengeId, code: "" });
      setMessage(result.message);
    });
  };
  const verifyRegistrationOtp = (event) => {
    event.preventDefault();
    submit(async () => {
      const result = await api.verifySellerRegistrationOtp(registrationOtp);
      showRegistrationComplete(result);
    });
  };
  const signIn = (event) => {
    event.preventDefault();
    submit(async () => {
      const result = await api.sellerLogin(login);
      sellerAuthStore.token = result.token;
      sellerAuthStore.seller = result.seller;
      setSeller(result.seller);
      setPortalReady(true);
      setScreen("dashboard");
      refresh().catch((error) => {
        setLoadError(error.message);
        setMessage(error.message);
      });
    });
  };
  const logout = () => {
    sellerAuthStore.clear();
    setSeller(null);
    setPortalReady(true);
    setLoadError("");
    setScreen("login");
  };

  if (!seller && screen === "registered" && credentials)
    return (
      <SellerRegistrationSuccess
        result={credentials}
        onContinue={() => {
          setLogin({
            identifier: credentials.seller.sellerNumber,
            password: "",
          });
          setMessage("");
          window.history.pushState(null, "", "#/seller/login");
          setScreen("login");
        }}
      />
    );
  if (!seller && screen === "login")
    return (
      <SellerLoginScreen
        settings={settings}
        onBack={onBack}
        message={message}
        login={login}
        setLogin={setLogin}
        busy={busy}
        onSubmit={signIn}
        onForgot={() => setScreen("forgot")}
        onSignup={() => {
          navigateSellerPath("/seller/register");
          setMessage("");
        }}
      />
    );
  if (!seller && screen === "login")
    return (
      <PortalAuthCard
        portal="Seller"
        subtitle="Enter your credentials to continue"
        onBack={onBack}
      >
        {message && <div className="notice">{message}</div>}
        <form className="authForm" onSubmit={signIn}>
          <label>
            <span>Seller ID or email</span>
            <input
              type="text"
              autoComplete="username"
              required
              value={login.identifier}
              onChange={(event) =>
                setLogin({ ...login, identifier: event.target.value })
              }
            />
          </label>
          <label>
            <span>Password</span>
            <span className="sellerPasswordField">
              <input
                type={showLoginPassword ? "text" : "password"}
                autoComplete="current-password"
                required
                value={login.password}
                onChange={(event) =>
                  setLogin({ ...login, password: event.target.value })
                }
              />
              <button
                type="button"
                onClick={() => setShowLoginPassword((visible) => !visible)}
                aria-label={
                  showLoginPassword ? "Hide password" : "Show password"
                }
              >
                {showLoginPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </span>
          </label>
          <div className="authOptions">
            <label className="rememberMe">
              <input type="checkbox" /> <span>Remember me?</span>
            </label>
            <button
              className="linkButton"
              type="button"
              onClick={() => setScreen("forgot")}
            >
              Forgot password?
            </button>
          </div>
          <button className="primaryButton authButton" disabled={busy}>
            {busy ? "Signing in…" : "Sign In"}
          </button>
          <button
            className="portalRegisterLink linkButton"
            type="button"
            onClick={() => {
              setScreen("register");
              setMessage("");
            }}
          >
            Don't Have an account?
          </button>
        </form>
      </PortalAuthCard>
    );
  if (!seller && screen === "forgot")
    return (
      <div className="partnerPublic">
        <div className="partnerAuthCard">
          <button className="linkButton" onClick={onBack}>
            ← Back to store
          </button>
          <h1>Reset seller password</h1>
          <ForgotPasswordForm
            identifierLabel="Seller ID or email"
            initialIdentifier={login.identifier}
            passwordDigits
            onRequest={(identifier) => api.sellerForgotPassword({ identifier })}
            onReset={api.sellerResetPassword}
            onBack={() => setScreen("login")}
          />
        </div>
      </div>
    );
  if (!seller && screen === "register")
    return (
      <SellerRegistrationScreen
        settings={settings}
        onBack={onBack}
        onLogin={() => {
          navigateSellerPath("/seller/login");
          setMessage("");
        }}
        registration={registration}
        setRegistration={setRegistration}
        registrationOtp={registrationOtp}
        setRegistrationOtp={setRegistrationOtp}
        message={message}
        setMessage={setMessage}
        busy={busy}
        onSubmit={register}
        onVerify={verifyRegistrationOtp}
      />
    );
  if (!seller && screen === "register")
    return (
      <>
        <div className="partnerPublic">
          <div className="partnerAuthCard">
            <button className="linkButton" onClick={onBack}>
              ← Back to store
            </button>
            <h1>Register your shop</h1>
            <p>Complete all business details to create a seller account.</p>
            <div className="tabRow">
              <button
                onClick={() => {
                  setScreen("login");
                  setMessage("");
                }}
              >
                Login
              </button>
              <button className="active">Register shop</button>
            </div>
            {message && !registrationOtp.challengeId && (
              <div className="notice">{message}</div>
            )}
            <form className="formGrid twoColumn" onSubmit={register}>
              {[
                ["companyName", "Company name"],
                ["mobile", "Mobile"],
                ["email", "Email"],
                ["address", "Address"],
                ["city", "City"],
                ["state", "State"],
                ["pinCode", "Pin code"],
              ].map(([field, label]) => (
                <label
                  className={field === "address" ? "full" : ""}
                  key={field}
                >
                  {label}
                  <input
                    type={field === "email" ? "email" : "text"}
                    required
                    value={registration[field]}
                    onChange={(event) =>
                      setRegistration({
                        ...registration,
                        [field]: event.target.value,
                      })
                    }
                  />
                </label>
              ))}
              <label className="full">
                Is your business GST registered?
                <select
                  value={registration.isGstRegistered ? "yes" : "no"}
                  onChange={(event) =>
                    setRegistration({
                      ...registration,
                      isGstRegistered: event.target.value === "yes",
                      gstNumber:
                        event.target.value === "yes"
                          ? registration.gstNumber
                          : "",
                    })
                  }
                >
                  <option value="no">No</option>
                  <option value="yes">Yes</option>
                </select>
              </label>
              {registration.isGstRegistered && (
                <label className="full">
                  GST number
                  <input
                    required
                    value={registration.gstNumber}
                    onChange={(event) =>
                      setRegistration({
                        ...registration,
                        gstNumber: event.target.value.toUpperCase(),
                      })
                    }
                  />
                </label>
              )}
              <button className="primaryButton full" disabled={busy}>
                {busy ? "Checking details…" : "Verify email & register"}
              </button>
            </form>
          </div>
        </div>
        {registrationOtp.challengeId && (
          <div
            className="partnerPaymentOverlay"
            role="dialog"
            aria-modal="true"
            aria-labelledby="seller-otp-title"
          >
            <form
              className="partnerPaymentDialog sellerOtpDialog"
              onSubmit={verifyRegistrationOtp}
            >
              <button
                className="partnerPaymentClose"
                type="button"
                disabled={busy}
                aria-label="Close email verification"
                onClick={() => {
                  setRegistrationOtp({ challengeId: "", code: "" });
                  setMessage("");
                }}
              >
                <X size={20} />
              </button>
              <span className="eyebrow">Email verification</span>
              <h2 id="seller-otp-title">Verify your email</h2>
              <p>
                Enter the 6-digit OTP sent to{" "}
                <strong>{registration.email}</strong>. Your seller account will
                be created only after verification.
              </p>
              <label className="partnerPaymentOtp">
                <span>Email OTP</span>
                <input
                  autoFocus
                  inputMode="numeric"
                  autoComplete="one-time-code"
                  pattern="\d{6}"
                  maxLength="6"
                  required
                  value={registrationOtp.code}
                  onChange={(event) =>
                    setRegistrationOtp({
                      ...registrationOtp,
                      code: event.target.value.replace(/\D/g, "").slice(0, 6),
                    })
                  }
                  placeholder="Enter 6-digit OTP"
                />
              </label>
              {message && (
                <p className="partnerPaymentStatus" role="status">
                  {message}
                </p>
              )}
              <div className="partnerPaymentActions">
                <button
                  className="secondaryButton"
                  type="button"
                  disabled={busy}
                  onClick={() => {
                    setRegistrationOtp({ challengeId: "", code: "" });
                    setMessage("");
                  }}
                >
                  Cancel
                </button>
                <button
                  className="primaryButton"
                  disabled={busy || registrationOtp.code.length !== 6}
                >
                  {busy ? "Verifying…" : "Verify OTP & create account"}
                </button>
              </div>
            </form>
          </div>
        )}
      </>
    );
  if (!seller) return null;
  if (!portalReady)
    return (
      <main
        className="storefrontLoadingScreen"
        role="status"
        aria-live="polite"
      >
        <BrandLogo
          settings={settings}
          loading
          className="storefrontLoadingBrand"
          showText={false}
        />
        {!loadError && (
          <div className="storefrontLoadingSpinner" aria-hidden="true" />
        )}
        {loadError && (
          <>
            <h1>Unable to load seller data</h1>
            <p>{loadError}</p>
            <button
              className="heroPrimary"
              type="button"
              onClick={() =>
                refresh().catch((error) => setLoadError(error.message))
              }
            >
              Try Again
            </button>
          </>
        )}
      </main>
    );

  activeSellerPortalScreen = screen;
  const navigatePortalScreen = (target) => {
    const requestedTarget = String(target || "dashboard");
    const [requestedScreen, query] = requestedTarget.split("?");
    const nextScreen = sellerMenuRoutes.has(requestedScreen) ? requestedScreen : "dashboard";
    window.history.pushState(null, "", `#/seller/${nextScreen}${query ? `?${query}` : ""}`);
    setScreen(nextScreen);
    setMessage("");
    setMobileNavOpen(false);
  };
  const navigation = [
    ["dashboard", "Dashboard", LayoutDashboard],
    ["profile", "Profile", UserRound],
    ["products", "Products", Boxes],
    [
      "orders",
      "Orders",
      PackageCheck,
      data.dashboard.orderStatus?.Pending || 0,
    ],
    [
      "returns",
      "Returns & Refunds",
      Truck,
      data.dashboard.orderStatus?.Returned || 0,
    ],
    ["wallet", "Wallet", BadgeIndianRupee],
    [
      "payouts",
      "Payouts",
      CircleDollarSign,
      data.dashboard.pendingWithdrawalCount || data.dashboard.payoutsCount || 0,
    ],
    ["reports", "Reports", BarChart3],
    ["referrals", "My Referrals", Users, data.referrals.referralCount || 0],
    ["marketing", "Marketing", Megaphone],
    ["reviews", "Reviews & Ratings", Star, 0],
    ["kyc", "KYC Verification", FileCheck2],
    ["bank", "Bank Details", Building2],
    ["support", "Support Tickets", Headphones],
    ["password", "Settings", KeyRound],
  ];
  return (
    <div
      className={`partnerShell berrySellerWorkspace ${mobileNavOpen ? "sellerMobileNavOpen" : ""}`}
    >
      <button
        className="sellerMobileBackdrop"
        type="button"
        aria-label="Close seller menu"
        onClick={() => setMobileNavOpen(false)}
      />
      <aside className="partnerNav sellerNav">
        <div className="brand">
          <div className="brandMark">V</div>
          <strong>Seller Dashboard</strong>
          <button
            className="sellerMobileClose"
            type="button"
            aria-label="Close seller menu"
            onClick={() => setMobileNavOpen(false)}
          >
            <X size={20} />
          </button>
        </div>
        <nav>
          {navigation.map(([id, label, Icon, count]) => (
            <button
              key={id}
              className={screen === id ? "active" : ""}
              onClick={() => navigatePortalScreen(id)}
            >
              <Icon size={18} />
              {label}
              {count > 0 && (
                <span className="sellerNavCount">
                  {count > 99 ? "99+" : count}
                </span>
              )}
            </button>
          ))}
          <button
            onClick={() => {
              setMobileNavOpen(false);
              logout();
            }}
          >
            <LogOut size={18} />
            Logout
          </button>
        </nav>
        <section className="sellerSidebarGrowth">
          <strong>Grow Your Business</strong>
          <span>List more products and increase your sales</span>
          <BarChart3 />
          <button type="button" onClick={() => navigatePortalScreen("products")}>
            ＋ Add Product
          </button>
        </section>
        <section className="sellerSidebarHelp">
          <Headphones />
          <span>
            <strong>Need Help?</strong>
            <small>We're here to help you</small>
            <button type="button" onClick={() => navigatePortalScreen("support")}>
              Contact Support
            </button>
          </span>
        </section>
      </aside>
      <main className="partnerContent">
        <header>
          <button
            className="sellerMobileMenu"
            type="button"
            aria-label="Open seller menu"
            aria-expanded={mobileNavOpen}
            onClick={() => setMobileNavOpen(true)}
          >
            <Menu size={22} />
          </button>
          <div className="sellerMobileIdentity">
            {settings.logoUrl ? (
              <img
                src={settings.logoUrl}
                alt={settings.shopName || "Store logo"}
              />
            ) : (
              <span className="sellerMobileLogoFallback">
                {(settings.shopName || "S").slice(0, 1)}
              </span>
            )}
            <span>
              <strong>{seller.companyName || seller.name || "Seller"}</strong>
              <small>Seller ID: {seller.sellerNumber}</small>
            </span>
          </div>
          <strong className="walletPill">
            Wallet: {money(data.wallet.walletBalance)}
          </strong>
        </header>
        {message && !isSaveMessage(message) && (
          <div className="notice">{message}</div>
        )}
        {screen === "dashboard" && <SellerDashboard data={data.dashboard} />}
        {screen === "reports" && (
          <SellerReports data={data.dashboard} onNavigate={navigatePortalScreen} />
        )}
        {screen === "referrals" && <SellerReferrals data={data.referrals} />}
        {screen === "marketing" && <SellerMarketingComingSoon />}
        {screen === "profile" && (
          <SellerProfile
            seller={seller}
            save={(payload) =>
              submit(async () => {
                await api.sellerUpdateProfile(payload);
                await refresh();
                setMessage("Profile updated.");
              })
            }
          />
        )}
        {screen === "products" && (
          <SellerProductsFull
            products={data.products}
            options={data.options}
            busy={busy}
            save={(product, payload) =>
              submit(async () => {
                product
                  ? await api.updateSellerProduct(product._id, payload)
                  : await api.createSellerProduct(payload);
                await refresh();
                setMessage("Product sent to admin for approval.");
              })
            }
            toggle={(product) =>
              submit(async () => {
                await api.toggleSellerProduct(
                  product._id,
                  !product.sellerEnabled,
                );
                await refresh();
              })
            }
          />
        )}
        {["orders", "returns"].includes(screen) && (
          <SellerOrders
            orders={data.orders}
            shippingMode={seller.shippingMode}
            returnUpdate={(orderId, productId, payload) =>
              submit(async () => {
                await api.updateSellerItemReturn(orderId, productId, payload);
                await refresh();
                setMessage("Return request updated successfully.");
              })
            }
            update={(orderId, productId, status) =>
              submit(async () => {
                await api.updateSellerOrderItem(orderId, productId, status);
                await refresh();
                setMessage("Order item status updated.");
              })
            }
            action={(action, order) =>
              submit(async () => {
                const updated =
                  action === "shiprocket"
                    ? await api.syncSellerShipRocket(order._id)
                    : await api.generateSellerInvoice(order._id);
                await refresh();
                if (action === "invoice")
                  printSellerDocument(updated, "invoice");
                setMessage(
                  action === "shiprocket"
                    ? `Packet sent to ShipRocket successfully. AWB: ${updated.shipping?.awbCode || "assigned"}${updated.shipping?.courierName ? ` · Courier: ${updated.shipping.courierName}` : ""}${updated.shipping?.syncStatus && updated.shipping.syncStatus !== "Synced with ShipRocket" ? ` · ${updated.shipping.syncStatus}` : ""}`
                    : "Invoice ready to print.",
                );
              })
            }
          />
        )}
        {screen === "support" && (
          <SupportTickets accountType="Seller" orders={data.orders} />
        )}
        {screen === "transactions" && <SellerWalletTransactions />}
        {["wallet", "payouts"].includes(screen) && (
          <SellerWallet
            wallet={data.wallet}
            withdrawals={data.withdrawals}
            requestWithdrawal={(amount) =>
              submit(async () => {
                await api.requestSellerWithdrawal(amount);
                await refresh();
                setMessage(
                  "Withdrawal request submitted successfully for admin review.",
                );
              })
            }
          />
        )}
        {screen === "reviews" && <SellerReviewsSummary />}
        {screen === "kyc" && (
          <SellerKyc
            seller={seller}
            save={async (type, payload) => {
              const updated = await api.sellerUploadKyc(type, payload);
              sellerAuthStore.seller = updated;
              setSeller(updated);
              await refresh();
              return updated;
            }}
          />
        )}
        {screen === "bank" && (
          <SellerBank
            seller={seller}
            save={(payload) =>
              submit(async () => {
                await api.sellerUpdateBank(payload);
                await refresh();
                setMessage("Bank details updated.");
              })
            }
          />
        )}
        {screen === "password" && (
          <SellerPassword
            save={(payload) =>
              submit(async () => {
                const result = await api.sellerChangePassword(payload);
                setMessage(result.message);
              })
            }
          />
        )}
      </main>
    </div>
  );
}

function SellerReferrals({ data = {} }) {
  const [copied, setCopied] = useState(false);
  const referrals = data.referrals || [];
  const referralUrl = new URL(data.referralLink || "#/seller/register", window.location.href).href;
  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(referralUrl);
    } catch (_error) {
      window.prompt("Copy your seller referral link:", referralUrl);
    }
    setCopied(true);
    showToast("Referral link copied to clipboard.");
    window.setTimeout(() => setCopied(false), 3000);
  };
  return <section className="contentStack sellerReferralsPage">
    <div className="panelHeader"><div><span className="eyebrow">Seller network</span><h2>My Referrals</h2><p>All sellers registered using your referral Seller ID.</p></div><span className="status approved">{data.referralCount || referrals.length} referrals</span></div>
    <section className="sellerBottomPromo referral">
      <div><h3>Your Seller Referral Link</h3><p>Share this link. Your Seller ID is filled automatically during registration.</p><small className="sellerReferralLink" title={referralUrl}>{referralUrl}</small><div className="sellerReferralActions"><button type="button" onClick={copyLink}>{copied ? "Copied!" : "Copy Link"}</button><a href={`https://wa.me/?text=${encodeURIComponent(`Join HRS Basket as a seller using my referral link: ${referralUrl}`)}`} target="_blank" rel="noreferrer"><WhatsAppIcon /> Share on WhatsApp</a></div></div><Users />
    </section>
    <div className="panel tableWrap"><table><thead><tr><th>Seller ID</th><th>Seller / Company</th><th>Contact</th><th>Location</th><th>Approval</th><th>Registered</th></tr></thead><tbody>{referrals.map((referral) => <tr key={referral._id || referral.sellerNumber}><td><strong>{referral.sellerNumber}</strong></td><td><strong>{referral.companyName || "—"}</strong><br />{referral.name || "—"}</td><td>{referral.email || "—"}<br />{referral.mobile || "—"}</td><td>{[referral.city, referral.state].filter(Boolean).join(", ") || "—"}</td><td><span className={`status ${referral.approvalStatus || "pending"}`}>{String(referral.approvalStatus || "pending").replaceAll("_", " ")}</span></td><td>{new Date(referral.registeredAt || referral.createdAt).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })}</td></tr>)}{!referrals.length && <tr><td colSpan="6">No sellers have registered with your referral link yet.</td></tr>}</tbody></table></div>
  </section>;
}

function SellerReports({ data = {}, onNavigate }) {
  const [salesPeriod, setSalesPeriod] = useState("week");
  const [productMetric, setProductMetric] = useState("sales");
  const products = data.products || [];
  const lowStock = products.filter((product) => product.isStockManageable && product.stock > 0 && product.stock <= Number(product.lowStockThreshold || 5));
  const statuses = Object.entries(data.orderStatus || {}).sort((a, b) => b[1] - a[1]);
  const summaryCards = [
    [PackageCheck, "Total Orders", data.ordersCount || 0, "blue", "View all orders", "orders"],
    [BadgeIndianRupee, "Total Sales", money(data.sales), "green", "Live gross sales", "orders"],
    [CircleDollarSign, "Total Earnings", money(data.totalEarnings), "orange", "Net seller earnings", "wallet"],
    [WalletCards, "Wallet Balance", money(data.walletBalance), "purple", "View wallet", "wallet"],
    [Boxes, "Low Stock", lowStock.length, "pink", "Products needing stock", "products"],
    [Star, "Store Rating", `${Number(data.averageRating || 0).toFixed(1)} ★`, "gold", `${data.totalRatings || 0} customer ratings`, "reviews"],
  ];
  const salesPoints = (data.salesSeries || []).slice(salesPeriod === "week" ? -7 : -30);
  const maxSale = Math.max(1, ...salesPoints.map((point) => Number(point.sales || 0)));
  const chartPoints = salesPoints.map((point, index) => `${salesPoints.length === 1 ? 360 : (index / Math.max(1, salesPoints.length - 1)) * 720},${220 - (Number(point.sales || 0) / maxSale) * 175}`).join(" ");
  const productPoints = (data.topProducts || []).slice(0, 5);
  const maxProductValue = Math.max(1, ...productPoints.map((product) => Number(product[productMetric] || 0)));
  const orderStatus = (order) => order.items?.[0]?.sellerStatus || order.status || "Pending";
  return <section className="sellerReportsPage contentStack">
    <div className="sellerKycHeading"><div><span className="eyebrow">Seller analytics</span><h2>Sales Summary Report</h2><p>Live sales, order, inventory, product and customer performance.</p></div></div>
    <div className="sellerMetricGrid">{summaryCards.map(([Icon,label,value,tone,note,target]) => <button type="button" className={tone} key={label} onClick={() => onNavigate?.(target)}><span><small>{label}</small><strong>{value}</strong><em>{note}</em></span><i><Icon /></i></button>)}</div>
    <div className="sellerReportCharts">
      <section className="sellerReferenceChart dashboardCard reportChart"><header><div><h3>Sales Overview</h3><strong>{money(salesPoints.reduce((sum, point) => sum + Number(point.sales || 0), 0))}</strong></div><select aria-label="Sales overview period" value={salesPeriod} onChange={(event) => setSalesPeriod(event.target.value)}><option value="week">This Week</option><option value="month">This Month</option></select></header><div className="chartPlot"><svg viewBox="0 0 720 250" preserveAspectRatio="none"><defs><linearGradient id="sellerReportSalesFill" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#6727e8" stopOpacity=".28"/><stop offset="1" stopColor="#6727e8" stopOpacity=".02"/></linearGradient></defs><path className="gridLines" d="M0 45H720M0 95H720M0 145H720M0 195H720"/>{chartPoints && <><polygon className="reportSalesFill" points={`0,220 ${chartPoints} 720,220`}/><polyline className="trend" points={chartPoints}/></>}</svg><div className="chartDates">{salesPoints.filter((_, index) => salesPeriod === "week" || index % 5 === 0 || index === salesPoints.length - 1).map((point) => <span key={point.date}>{new Date(`${point.date}T00:00:00`).toLocaleDateString("en-IN", { day: "numeric", month: "short" })}</span>)}</div></div></section>
      <section className="dashboardCard reportProductChart"><header><div><h3>Product Performance</h3><small>Top 5 products</small></div><select aria-label="Product performance metric" value={productMetric} onChange={(event) => setProductMetric(event.target.value)}><option value="sales">Sales</option><option value="units">Units Sold</option><option value="orders">Orders</option></select></header><div className="productChartBars">{productPoints.map((product) => <article key={product._id}><span title={product.name}>{product.name}</span><i><b style={{ width: `${Math.max(4, Number(product[productMetric] || 0) / maxProductValue * 100)}%` }}/></i><strong>{productMetric === "sales" ? money(product.sales) : Number(product[productMetric] || 0)}</strong></article>)}{!productPoints.length && <p>No product sales yet.</p>}</div></section>
    </div>
    <div className="sellerReportGrid">
      <section className="panel sellerReportAnalytics"><h3>Analytics</h3><div className="reportBars">{statuses.map(([status,count]) => <div key={status}><span>{status}</span><i><b style={{width:`${Math.max(4, Number(count) / Math.max(1, data.ordersCount || 1) * 100)}%`}} /></i><strong>{count}</strong></div>)}</div></section>
      <section className="panel"><h3>Order Summary</h3>{statuses.map(([status,count]) => <p className="reportSummaryRow" key={status}><span>{status}</span><strong>{count}</strong></p>)}{!statuses.length && <p>No orders recorded.</p>}</section>
      <section className="panel reportWide"><h3>5 Highest Sold Products</h3><div className="reportList">{(data.topProducts || []).slice(0,5).map((product,index) => <article key={product._id}><b>#{index+1}</b>{product.mainImage ? <img src={product.mainImage} alt="" /> : <Boxes />}<span><strong>{product.name}</strong><small>{product.units || 0} units · {product.orders || 0} orders</small></span><em>{money(product.sales)}</em></article>)}{!data.topProducts?.length && <p>No product sales yet.</p>}</div></section>
      <section className="panel reportLowStock"><h3>Low Stock</h3><div className="reportList compact">{lowStock.slice(0,5).map((product) => <article key={product._id}><span><strong>{product.name}</strong><small>{product.sku}</small></span><em>{product.stock} left</em></article>)}{!lowStock.length && <p>All products have healthy stock.</p>}</div></section>
      <section className="sellerReferenceOrders dashboardCard reportRecentOrders"><header><h3>Recent Orders</h3><button type="button" onClick={() => onNavigate?.("orders")}>View All →</button></header><div className="sellerRecentOrderList">{(data.recentOrders || []).slice(0,5).map((order,index) => { const customer = order.customer?.name || order.address?.name || "Customer"; const status = orderStatus(order); const paymentKind = order.payment?.provider === "cod" ? "cod" : "prepaid"; return <article key={order._id}><div className="recentOrderId"><strong>{order.orderNumber}</strong><small>{new Date(order.createdAt).toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short" })}</small></div><span className={`recentCustomerAvatar tone${index % 4}`}>{customer.slice(0,1)}</span><div className="recentCustomer"><strong>{customer}</strong><small>{[order.address?.city,order.address?.state].filter(Boolean).join(", ")}</small></div><div className="recentOrderAmount"><strong>{money((order.items || []).reduce((sum,item) => sum + Number(item.price || 0) * Number(item.quantity || 0),0))}</strong><small className={paymentKind}>{paymentKind === "cod" ? "COD" : "Prepaid"}</small></div><span className={`orderBadge ${String(status).toLowerCase().replaceAll(" ", "-")}`}>{status}</span><MoreVertical size={18}/></article>; })}{!data.recentOrders?.length && <p className="emptyDashboardData">Your latest orders will appear here.</p>}</div></section>
      <section className="panel"><h3>Latest 5 New Customers</h3><div className="reportList compact">{(data.recentCustomers || []).map((customer) => <article key={customer._id}><UserRound /><span><strong>{customer.name || "Customer"}</strong><small>{customer.email || "—"}</small></span><em>{new Date(customer.latestOrderAt || customer.joinedAt).toLocaleDateString("en-IN")}</em></article>)}{!data.recentCustomers?.length && <p>No customers yet.</p>}</div></section>
    </div>
  </section>;
}

function SellerMarketingComingSoon() {
  return <section className="sellerMarketingSoon panel"><Megaphone size={52}/><span className="eyebrow">Seller Marketing</span><h2>Marketing tools are coming soon</h2><p>Create campaigns, promote products and reach more customers from one place.</p><span className="status pending">Coming Soon</span></section>;
}

function SellerDashboard({ data }) {
  const [referralCopied, setReferralCopied] = useState(false);
  const [setupCollapsed, setSetupCollapsed] = useState(false);
  const [salesOverviewPeriod, setSalesOverviewPeriod] = useState("week");
  const seller = data.seller || {};
  const products = data.products || [];
  const orders = data.recentOrders || [];
  const salesOverviewPoints = (data.salesSeries || []).slice(salesOverviewPeriod === "week" ? -7 : -30);
  const salesOverviewTotal = salesOverviewPoints.reduce((sum, point) => sum + Number(point.sales || 0), 0);
  const salesOverviewOrders = salesOverviewPoints.reduce((sum, point) => sum + Number(point.orders || 0), 0);
  const salesOverviewMax = Math.max(1, ...salesOverviewPoints.map((point) => Number(point.sales || 0)));
  const salesOverviewChartPoints = salesOverviewPoints.map((point, index) => `${salesOverviewPoints.length === 1 ? 360 : index / Math.max(1, salesOverviewPoints.length - 1) * 720},${220 - Number(point.sales || 0) / salesOverviewMax * 175}`).join(" ");
  const onNavigate = (target) => {
    window.history.pushState(null, "", `#/seller/${target}`);
    window.dispatchEvent(
      new CustomEvent("seller-dashboard-navigate", { detail: target }),
    );
  };
  const referralUrl = new URL(data.referralLink || "#/seller/register", window.location.href).href;
  const copyReferralUrl = async () => {
    try {
      await navigator.clipboard.writeText(referralUrl);
    } catch (_error) {
      window.prompt("Copy your seller referral link:", referralUrl);
    }
    setReferralCopied(true);
    showToast("Referral link copied to clipboard.");
    window.setTimeout(() => setReferralCopied(false), 4000);
  };
  const statuses = [
    "Completed",
    "Delivered",
    "Shipped",
    "Ready to Ship",
    "Processing",
    "Pending",
    "Cancelled",
    "Returned",
  ];
  const statusCounts = Object.fromEntries(
    statuses.map((status) => [
      status,
      Number(
        data.orderStatus?.[status] ||
          (status === "Ready to Ship"
            ? data.orderStatus?.["Ready to Dispatch"]
            : 0) ||
          0,
      ),
    ]),
  );
  const totalStatusItems = Math.max(
    1,
    Object.values(statusCounts).reduce((sum, value) => sum + value, 0),
  );
  const deliveredPercent = Math.round(
    ((statusCounts.Delivered + statusCounts.Completed) / totalStatusItems) *
      100,
  );
  const activeProducts = products.filter(
    (product) => product.status === "active" && product.sellerEnabled !== false,
  ).length;
  const lowStockProducts = products.filter(
    (product) =>
      product.isStockManageable &&
      product.stock > 0 &&
      product.stock <= (product.lowStockThreshold || 5),
  ).length;
  const outOfStockProducts = products.filter(
    (product) => product.isStockManageable && product.stock <= 0,
  ).length;
  const pendingOrders = statusCounts.Pending + statusCounts.Processing;
  const completedOrders = statusCounts.Completed;
  const healthChecks = [
    seller.approvalStatus === "approved",
    seller.kyc?.pan?.status === "approved",
    seller.kyc?.cancelledCheque?.status === "approved",
    activeProducts > 0,
  ];
  const health = Math.round(
    (healthChecks.filter(Boolean).length / healthChecks.length) * 100,
  );
  const cards = [
    [
      PackageCheck,
      "Total Orders",
      data.ordersCount || 0,
      "blue",
      "18% vs last 7 days",
      "orders",
    ],
    [
      BadgeIndianRupee,
      "Total Sales",
      money(data.sales),
      "green",
      "Live gross sales",
      "orders",
    ],
    [
      CircleDollarSign,
      "Total Earnings",
      money(data.totalEarnings),
      "orange",
      "Net seller earnings",
      "wallet",
    ],
    [
      WalletCards,
      "Wallet Balance",
      money(data.walletBalance),
      "purple",
      "View details",
      "wallet",
    ],
    [
      BadgeIndianRupee,
      "Pending Payout",
      money(data.pendingWithdrawal),
      "royal",
      "View payouts",
      "wallet",
    ],
    [Star, "Store Rating", `${Number(data.averageRating || 0).toFixed(1)} ★`, "gold", `${data.totalRatings || 0} customer ratings`, "reviews"],
  ];
  const quickActions = [
    [ShoppingCart, "Add Product", "products"],
    [PackageCheck, "View Orders", "orders"],
    [Truck, "Manage Returns", "returns"],
    [BadgeIndianRupee, "Withdraw", "wallet"],
    [WalletCards, "Payouts", "payouts"],
    [BarChart3, "Reports", "reports"],
    [Megaphone, "Marketing", "marketing"],
    [Headphones, "Support", "support"],
  ];
  const kycRows = [
    [
      Building2,
      "Bank Details",
      seller.kyc?.cancelledCheque?.status === "approved",
    ],
    [FileCheck2, "KYC Verification", seller.kyc?.pan?.status === "approved"],
    [Store, "Seller Approval", seller.approvalStatus === "approved"],
    [Star, "Store Rating", null],
  ];
  const setupSteps = [
    ["Registration", Boolean(seller.companyName && seller.registeredAt)],
    ["Shipping preference", Boolean(seller.shippingMode)],
    ["Bank details", Boolean(seller.bankDetails?.accountNumber)],
    ["KYC verification", seller.kyc?.pan?.status === "approved"],
  ];
  const setupPendingIndex = setupSteps.findIndex(([, complete]) => !complete);
  const setupApproved = setupPendingIndex === -1;
  return (
    <div className="sellerDashboardV3">
      <section className="sellerReferenceWelcome">
        <div>
          <span>Welcome back,</span>
          <h2>{seller.companyName || "Seller"} 👋</h2>
          <p>Here&apos;s what&apos;s happening with your store today.</p>
        </div>
        <div className="sellerWelcomeVisual">
          <span>🌿</span>
          <div>
            <BarChart3 />
            <TrendingUp />
          </div>
        </div>
      </section>
      <section
        className={`partnerOnboarding sellerAccountSetup ${setupApproved ? "approved completedSetup" : "hasPending"} ${setupCollapsed ? "collapsed" : ""}`}
      >
        <div className="setupMain">
          <div className="setupHeading">
            <div>
              <h3>
                {setupApproved
                  ? "Account setup complete"
                  : setupCollapsed
                    ? `Account setup pending at step ${setupPendingIndex + 1}`
                    : "Account Setup"}
              </h3>
              {!setupCollapsed && (
                <p>
                  {setupApproved
                    ? "All account setup steps are complete."
                    : "Complete each step to activate all seller benefits."}
                </p>
              )}
            </div>
          </div>
          {!setupCollapsed && (
            <div className="onboardingSteps">
              {setupSteps.map(([label, complete], index) => (
                <button
                  type="button"
                  key={label}
                  className={`onboardingStep ${complete ? "completed" : "pending"}`}
                  onClick={() =>
                    onNavigate(
                      label === "Bank details"
                        ? "bank"
                        : label === "KYC verification"
                          ? "kyc"
                          : "profile",
                    )
                  }
                >
                  <span>{index + 1}</span>
                  <div>
                    <strong>{label}</strong>
                    <small>{complete ? "Completed" : "Pending"}</small>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
        <div className="setupActions">
          <div className="setupShield">
            {setupApproved ? <ShieldCheck /> : <ShieldAlert />}
            <b>
              {Math.round(
                (setupSteps.filter(([, complete]) => complete).length /
                  setupSteps.length) *
                  100,
              )}
              %
            </b>
          </div>
          {!setupApproved && (
            <button
              type="button"
              className="setupMinimize"
              onClick={() => setSetupCollapsed((value) => !value)}
              aria-label={
                setupCollapsed
                  ? "Expand account setup"
                  : "Minimize account setup"
              }
            >
              {setupCollapsed ? <ChevronDown /> : <Minus />}
            </button>
          )}
        </div>
      </section>
      <section className="sellerMetricGrid">
        {cards.map(([Icon, label, value, tone, note, target]) => (
          <button
            type="button"
            className={tone}
            key={label}
            onClick={() => onNavigate(target)}
          >
            <span>
              <small>{label}</small>
              <strong>{value}</strong>
              <em>{note}</em>
            </span>
            <i>
              <Icon />
            </i>
          </button>
        ))}
      </section>
      <section className="sellerReferenceChart dashboardCard">
        <header>
          <h3>Sales Overview</h3>
          <select aria-label="Sales period" value={salesOverviewPeriod} onChange={(event) => setSalesOverviewPeriod(event.target.value)}>
            <option value="week">This Week</option>
            <option value="month">This Month</option>
          </select>
        </header>
        <div className="chartPlot">
          <span className="chartValue">
            {money(salesOverviewTotal)}
            <small>{salesOverviewOrders} seller order{salesOverviewOrders === 1 ? "" : "s"} · Avg {money(salesOverviewTotal / Math.max(1, salesOverviewOrders))}</small>
          </span>
          <svg viewBox="0 0 720 250" preserveAspectRatio="none">
            <defs>
              <linearGradient
                id="sellerReferenceFill"
                x1="0"
                y1="0"
                x2="0"
                y2="1"
              >
                <stop offset="0" stopColor="#6727e8" stopOpacity=".28" />
                <stop offset="1" stopColor="#6727e8" stopOpacity=".02" />
              </linearGradient>
            </defs>
            <path
              className="gridLines"
              d="M0 45H720M0 95H720M0 145H720M0 195H720"
            />
            {salesOverviewChartPoints && <><polygon className="fill" points={`0,220 ${salesOverviewChartPoints} 720,220`} /><polyline className="trend" points={salesOverviewChartPoints} /></>}
          </svg>
          <div className="chartDates">
            {salesOverviewPoints.filter((_, index) => salesOverviewPeriod === "week" || index % 5 === 0 || index === salesOverviewPoints.length - 1).map((point) => <span key={point.date}>{new Date(`${point.date}T00:00:00`).toLocaleDateString("en-IN", { day: "numeric", month: "short" })}</span>)}
          </div>
        </div>
      </section>
      <section className="sellerOrderDonut dashboardCard">
        <header>
          <h3>Order Status</h3>
          <select>
            <option>This Week</option>
          </select>
        </header>
        <div className="orderDonutBody">
          <div
            className="orderDonut"
            style={{ "--delivered": `${deliveredPercent * 3.6}deg` }}
          >
            <span>
              <strong>{data.ordersCount || 0}</strong>
              <small>Total</small>
            </span>
          </div>
          <div className="orderLegend">
            {statuses.slice(0, 5).map((status) => (
              <button
                type="button"
                key={status}
                className={status.toLowerCase().replaceAll(" ", "-")}
                onClick={() => onNavigate(`orders?status=${encodeURIComponent(status)}`)}
                aria-label={`View ${status.toLowerCase()} orders: ${statusCounts[status]}`}
              >
                <i />
                <span>{status}</span>
                <strong>{statusCounts[status]}</strong>
              </button>
            ))}
          </div>
        </div>
      </section>
      <section className="sellerReferenceQuick dashboardCard">
        <h3>Quick Actions</h3>
        <nav>
          {quickActions.map(([Icon, label, target]) => (
            <button
              type="button"
              key={label}
              onClick={() => onNavigate(target)}
            >
              <i>
                <Icon />
              </i>
              <span>{label}</span>
              {label === "View Orders" && pendingOrders > 0 && (
                <b>{pendingOrders}</b>
              )}
            </button>
          ))}
        </nav>
      </section>
      <section className="sellerDashboardLowerGrid">
        <section className="sellerStoreSummary dashboardCard">
          <header>
            <h3>Store Summary</h3>
          </header>
          {[
            ["Active Products", activeProducts, "blue", "products?filter=active"],
            ["Low Stock Products", lowStockProducts, "orange", "products?filter=low-stock"],
            ["Out of Stock Products", outOfStockProducts, "red", "products?filter=out-of-stock"],
            ["Pending Orders", pendingOrders, "orange", "orders?status=open"],
            ["Completed Orders", completedOrders, "green", "orders?status=Completed"],
            ["Cancelled Orders", statusCounts.Cancelled, "red", "orders?status=Cancelled"],
            ["Return Requests", statusCounts.Returned, "pink", "returns"],
          ].map(([label, value, tone, target]) => (
            <button className="sellerSummaryLink" type="button" key={label} onClick={() => onNavigate(target)} aria-label={`${label}: ${value}`}>
              <span>▣ {label}</span>
              <strong className={tone}>{value}</strong>
            </button>
          ))}
          <button type="button" onClick={() => onNavigate("products")}>
            View All
          </button>
        </section>
        <section className="sellerTopProducts dashboardCard">
          <header>
            <h3>Top Selling Products</h3>
            <select>
              <option>This Week</option>
            </select>
          </header>
          {(data.topProducts || []).map((product) => (
            <article key={product._id}>
              {product.mainImage ? (
                <img src={product.mainImage} alt="" />
              ) : (
                <span className="productFallback">
                  <Boxes />
                </span>
              )}
              <div>
                <strong>{product.name}</strong>
                <small>
                  {product.units || 0} units · {product.orders || 0} orders
                </small>
              </div>
              <b>{money(product.sales)}</b>
            </article>
          ))}
          {!data.topProducts?.length && (
            <p className="emptyDashboardData">
              Top products will appear after your first orders.
            </p>
          )}
          <button type="button" onClick={() => onNavigate("products")}>
            View All Products
          </button>
        </section>
        <section className="sellerKycSummary dashboardCard">
          <header>
            <h3>KYC Status</h3>
            <span
              className={
                seller.approvalStatus === "approved" ? "verified" : "pending"
              }
            >
              {seller.approvalStatus === "approved" ? "Verified" : "Pending"}
            </span>
          </header>
          {kycRows.map(([Icon, label, approved]) => (
            <p key={label}>
              <Icon />
              <span>{label}</span>
              {approved === null ? (
                <strong>★ 4.8 / 5</strong>
              ) : (
                <b className={approved ? "verified" : "pending"}>
                  {approved ? "Verified" : "Pending"}
                </b>
              )}
            </p>
          ))}
          <div className="sellerKycNotice">
            <ShieldCheck />
            <span>
              <strong>
                {health === 100
                  ? "Great! Your store is fully verified."
                  : `Store setup is ${health}% complete.`}
              </strong>
              <small>
                Complete verification to receive payments without limits.
              </small>
            </span>
          </div>
          <button
            type="button"
            onClick={() => {
              const local = ["localhost", "127.0.0.1"].includes(window.location.hostname);
              const storefrontOrigin = String(import.meta.env.VITE_STOREFRONT_URL || (local ? "http://localhost:5173" : "https://hrsbasket.com")).replace(/\/+$/, "");
              window.open(`${storefrontOrigin}/#/sellers/${encodeURIComponent(seller.id || seller._id || seller.sellerNumber)}`, "_blank", "noopener,noreferrer");
            }}
          >
            View My Store
          </button>
        </section>
      </section>
      <section className="sellerReferenceOrders dashboardCard">
        <header>
          <h3>Recent Orders</h3>
          <button type="button" onClick={() => onNavigate("orders")}>
            View All →
          </button>
        </header>
        <div className="sellerRecentOrderList">
          {orders.slice(0, 5).map((order, index) => {
            const sellerItems = order.items || [];
            const status = sellerItems[0]?.sellerStatus || order.status;
            const customer =
              order.customer?.name || order.address?.name || "Customer";
            const paymentKind =
              order.payment?.provider === "cod" ? "cod" : "prepaid";
            return (
              <article key={order._id}>
                <div className="recentOrderId">
                  <strong>{order.orderNumber}</strong>
                  <small>
                    {new Date(order.createdAt).toLocaleString("en-IN", {
                      dateStyle: "medium",
                      timeStyle: "short",
                    })}
                  </small>
                </div>
                <span className={`recentCustomerAvatar tone${index % 4}`}>
                  {order.customer?.profileImage ? <img src={order.customer.profileImage} alt="" /> : customer.slice(0, 1)}
                </span>
                <div className="recentCustomer">
                  <strong>{customer}</strong>
                  <small>
                    {[order.address?.city, order.address?.state]
                      .filter(Boolean)
                      .join(", ")}
                  </small>
                </div>
                <div className="recentOrderAmount">
                  <strong>
                    {money(
                      sellerItems.reduce(
                        (sum, item) => sum + item.price * item.quantity,
                        0,
                      ),
                    )}
                  </strong>
                  <small className={paymentKind}>
                    {paymentKind === "cod" ? "COD" : "Prepaid"}
                  </small>
                </div>
                <span
                  className={`orderBadge ${String(status).toLowerCase().replaceAll(" ", "-")}`}
                >
                  {status}
                </span>
                <MoreVertical size={18} />
              </article>
            );
          })}
          {!orders.length && (
            <p className="emptyDashboardData">
              Your latest orders will appear here.
            </p>
          )}
        </div>
      </section>
      <section className="sellerBottomPromo sales">
        <div>
          <h3>Boost Your Sales</h3>
          <p>Run ads and reach more customers</p>
          <button type="button" onClick={() => onNavigate("marketing")}>
            Start Campaign
          </button>
        </div>
        <Megaphone />
      </section>
      <section className="sellerBottomPromo referral">
        <div>
          <h3>Refer &amp; Earn</h3>
          <p>
            Refer other sellers and grow your network. Your Seller ID will be
            filled automatically.
          </p>
          <small className="sellerReferralLink" title={referralUrl}>
            {referralUrl}
          </small>
          <div className="sellerReferralActions">
            <button type="button" onClick={copyReferralUrl}>
              {referralCopied ? "Copied!" : "Copy Link"}
            </button>
            <a
              href={`https://wa.me/?text=${encodeURIComponent(`Join HRS Basket as a seller using my referral link: ${referralUrl}`)}`}
              target="_blank"
              rel="noreferrer"
            >
              <WhatsAppIcon /> Share on WhatsApp
            </a>
            <button type="button" onClick={() => onNavigate("referrals")}>View All Referrals ({data.referralCount || 0})</button>
          </div>
        </div>
        <Users />
      </section>
    </div>
  );
}
function SellerProfile({ seller, save }) {
  const locked = seller.approvalStatus === "approved";
  const [form, setForm] = useState({
    companyName: seller.companyName,
    address: seller.address,
    city: seller.city,
    state: seller.state,
    pinCode: seller.pinCode,
    pickupSameAsBusiness: seller.pickupSameAsBusiness !== false,
    pickupAddress: seller.pickupAddress || seller.address,
    pickupCity: seller.pickupCity || seller.city,
    pickupState: seller.pickupState || seller.state,
    pickupPinCode: seller.pickupPinCode || seller.pinCode,
    mobile: seller.mobile,
    profileImage: seller.profileImage || "",
    shippingMode: seller.shippingMode || "shiprocket",
  });
  const update = (field, value) =>
    setForm((current) => ({ ...current, [field]: value }));
  const uploadPhoto = async (file) => {
    if (!file) return;
    const profileImage = (await api.uploadImage(file, "seller-profile")).url;
    update("profileImage", profileImage);
    if (locked) save({ profileImage });
  };
  return (
    <section className="sellerProfilePage">
      <div className="sellerProfileHeading">
        <div>
          <span>Dashboard　›　Profile</span>
          <h2
            className={`sellerVerifiedName ${locked ? "approved" : "pending"}`}
          >
            {seller.companyName}{" "}
            {locked ? <ShieldCheck size={22} /> : <ShieldAlert size={22} />}
          </h2>
          <p>
            Seller Profile ·{" "}
            <strong>{locked ? "Approved" : "Approval pending"}</strong>
          </p>
        </div>
        <span
          className={`sellerApprovalBadge ${locked ? "approved" : "pending"}`}
        >
          {locked ? "Approved seller" : "Not approved yet"}
        </span>
      </div>
      {locked && (
        <div className="notice">
          Approved business information is protected. Your profile picture and
          shipping preference remain editable.
        </div>
      )}
      <form
        onSubmit={(event) => {
          event.preventDefault();
          save(
            locked
              ? {
                  profileImage: form.profileImage,
                  shippingMode: form.shippingMode,
                }
              : form,
          );
        }}
      >
        <aside className="panel sellerProfileIdentity">
          <div
            className={`sellerProfilePhoto ${locked ? "approved" : "pending"}`}
          >
            {form.profileImage ? (
              <img src={form.profileImage} alt={seller.companyName} />
            ) : (
              <span>{seller.companyName?.[0]}</span>
            )}
            <i>
              {locked ? <ShieldCheck size={19} /> : <ShieldAlert size={19} />}
            </i>
            <label title="Change profile picture">
              ✎
              <input
                hidden
                type="file"
                accept="image/*"
                onChange={(event) => uploadPhoto(event.target.files?.[0])}
              />
            </label>
          </div>
          <h3
            className={`sellerIdentityApproval ${locked ? "approved" : "pending"}`}
          >
            {seller.companyName}{" "}
            {locked ? <ShieldCheck size={17} /> : <ShieldAlert size={17} />}
          </h3>
          <p>{seller.email}</p>
          <strong>{seller.sellerNumber}</strong>
          <dl>
            <div>
              <dt>Account status</dt>
              <dd
                className={seller.status === "active" ? "approved" : "pending"}
              >
                {seller.status || "pending"}
              </dd>
            </div>
            <div>
              <dt>Approval status</dt>
              <dd className={locked ? "approved" : "pending"}>
                {seller.approvalStatus || "pending"}
              </dd>
            </div>
            <div>
              <dt>Date of joining</dt>
              <dd>
                {seller.registeredAt || seller.createdAt
                  ? new Date(
                      seller.registeredAt || seller.createdAt,
                    ).toLocaleDateString("en-IN", {
                      day: "2-digit",
                      month: "short",
                      year: "numeric",
                    })
                  : "—"}
              </dd>
            </div>
            <div>
              <dt>Commission</dt>
              <dd>{seller.commissionRate}%</dd>
            </div>
          </dl>
        </aside>
        <div className="sellerProfileForms">
          <section className="panel">
            <div className="sellerProfileSectionTitle">
              <div>
                <h3>Business Information</h3>
                <p>Your registered seller and tax details.</p>
              </div>
              <Building2 />
            </div>
            <div className="formGrid twoColumn">
              <label>
                Company name
                <input
                  required
                  disabled={locked}
                  value={form.companyName}
                  onChange={(event) =>
                    update("companyName", event.target.value)
                  }
                />
              </label>
              <label>
                Business name
                <input
                  disabled
                  value={seller.businessName || seller.companyName}
                />
              </label>
              <label>
                Email address
                <input disabled value={seller.email} />
              </label>
              <label>
                Mobile number
                <input
                  required
                  disabled={locked}
                  value={form.mobile}
                  onChange={(event) => update("mobile", event.target.value)}
                />
              </label>
              <label>
                GST registration
                <input
                  disabled
                  value={
                    seller.isGstRegistered
                      ? "GST Registered"
                      : "Not GST Registered"
                  }
                />
              </label>
              <label>
                GST number
                <input disabled value={seller.gstNumber || "Not applicable"} />
              </label>
            </div>
          </section>
          <section className="panel">
            <div className="sellerProfileSectionTitle">
              <div>
                <h3>Business Address</h3>
                <p>Address used for seller verification and fulfillment.</p>
              </div>
              <Store />
            </div>
            <div className="formGrid twoColumn">
              <label className="full">
                Street address
                <input
                  required
                  disabled={locked}
                  value={form.address}
                  onChange={(event) => update("address", event.target.value)}
                />
              </label>
              <label>
                City
                <input
                  required
                  disabled={locked}
                  value={form.city}
                  onChange={(event) => update("city", event.target.value)}
                />
              </label>
              <label>
                State
                <input
                  required
                  disabled={locked}
                  value={form.state}
                  onChange={(event) => update("state", event.target.value)}
                />
              </label>
              <label>
                PIN code
                <input
                  required
                  disabled={locked}
                  value={form.pinCode}
                  onChange={(event) =>
                    update("pinCode", event.target.value.replace(/\D/g, ""))
                  }
                />
              </label>
            </div>
          </section>
          <section className="panel">
            <div className="sellerProfileSectionTitle">
              <div>
                <h3>Pickup Address</h3>
                <p>Address used to collect seller shipments.</p>
              </div>
              <Truck />
            </div>
            <div className="formGrid twoColumn">
              <label className="toggleRow full">
                <input
                  type="checkbox"
                  disabled={locked}
                  checked={form.pickupSameAsBusiness}
                  onChange={(event) =>
                    update("pickupSameAsBusiness", event.target.checked)
                  }
                />
                <span>Pickup address is the same as business address</span>
              </label>
              {!form.pickupSameAsBusiness && (
                <>
                  <label className="full">
                    Street address
                    <input
                      required
                      disabled={locked}
                      value={form.pickupAddress}
                      onChange={(event) =>
                        update("pickupAddress", event.target.value)
                      }
                    />
                  </label>
                  <label>
                    City
                    <input
                      required
                      disabled={locked}
                      value={form.pickupCity}
                      onChange={(event) =>
                        update("pickupCity", event.target.value)
                      }
                    />
                  </label>
                  <label>
                    State
                    <input
                      required
                      disabled={locked}
                      value={form.pickupState}
                      onChange={(event) =>
                        update("pickupState", event.target.value)
                      }
                    />
                  </label>
                  <label>
                    PIN code
                    <input
                      required
                      disabled={locked}
                      value={form.pickupPinCode}
                      onChange={(event) =>
                        update(
                          "pickupPinCode",
                          event.target.value.replace(/\D/g, ""),
                        )
                      }
                    />
                  </label>
                </>
              )}
            </div>
          </section>
          <section className="panel">
            <div className="sellerProfileSectionTitle">
              <div>
                <h3>Shipping Preference</h3>
                <p>Choose how orders will be fulfilled.</p>
              </div>
              <Truck />
            </div>
            <div className="sellerShippingChoices">
              <label
                className={form.shippingMode === "shiprocket" ? "selected" : ""}
              >
                <input
                  type="radio"
                  name="shippingMode"
                  value="shiprocket"
                  checked={form.shippingMode === "shiprocket"}
                  onChange={(event) =>
                    update("shippingMode", event.target.value)
                  }
                />
                <Truck />
                <span>
                  <strong>ShipRocket</strong>
                  <small>Use the configured shipping integration</small>
                </span>
              </label>
              <label className={form.shippingMode === "self" ? "selected" : ""}>
                <input
                  type="radio"
                  name="shippingMode"
                  value="self"
                  checked={form.shippingMode === "self"}
                  onChange={(event) =>
                    update("shippingMode", event.target.value)
                  }
                />
                <PackageCheck />
                <span>
                  <strong>Self shipping</strong>
                  <small>Manage fulfillment and delivery manually</small>
                </span>
              </label>
            </div>
          </section>
          <button className="primaryButton sellerProfileSave">
            Save profile changes
          </button>
        </div>
      </form>
    </section>
  );
}
function SellerProducts({ products, options, save, toggle, busy }) {
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(blankProduct);
  const edit = (product) => {
    setEditing(product);
    setForm({
      ...blankProduct,
      ...product,
      category: product.category?._id || product.category || "",
      taxCategory: product.taxCategory?._id || product.taxCategory || "",
      tags: product.tags?.join(", ") || "",
    });
  };
  const submitForm = (event) => {
    event.preventDefault();
    save(editing, {
      ...form,
      price: Number(form.price),
      offerPrice:
        form.offerPrice === "" ? Number(form.price) : Number(form.offerPrice),
      stock: form.isStockManageable ? Number(form.stock || 0) : 0,
      lowStockThreshold: Number(form.lowStockThreshold || 0),
      tags: String(form.tags)
        .split(",")
        .map((tag) => tag.trim())
        .filter(Boolean),
      taxCategory: form.taxCategory || undefined,
      videoUrl: form.displayType === "Reel" ? form.videoUrl : undefined,
      media: form.mainImage
        ? [{ url: form.mainImage, type: "image", isMain: true, alt: form.name }]
        : [],
    });
    setEditing(null);
    setForm(blankProduct);
  };
  return (
    <>
      <form className="panel formGrid twoColumn" onSubmit={submitForm}>
        <h3 className="full">
          {editing ? `Edit ${editing.name}` : "Add product"}
        </h3>
        {[
          ["name", "Product name"],
          ["sku", "SKU"],
          ["price", "Sale price"],
          ["offerPrice", "Offer price"],
          ["stock", "Stock"],
          ["lowStockThreshold", "Low stock alert"],
        ].map(([field, label]) => (
          <label key={field}>
            {label}
            <input
              type={
                ["price", "offerPrice", "stock", "lowStockThreshold"].includes(
                  field,
                )
                  ? "number"
                  : "text"
              }
              min="0"
              step="0.01"
              required={!["offerPrice"].includes(field)}
              disabled={field === "stock" && !form.isStockManageable}
              value={form[field]}
              onChange={(event) =>
                setForm({ ...form, [field]: event.target.value })
              }
            />
          </label>
        ))}
        <label>
          Category
          <CategoryTreeSelect
            categories={options.categories}
            value={form.category}
            onChange={(category) => setForm({ ...form, category })}
            required
          />
        </label>
        <label>
          Tax category
          <select
            value={form.taxCategory}
            onChange={(event) =>
              setForm({ ...form, taxCategory: event.target.value })
            }
          >
            <option value="">None</option>
            {options.taxCategories.map((item) => (
              <option key={item._id} value={item._id}>
                {item.name} ({item.rate}%)
              </option>
            ))}
          </select>
        </label>
        <label>
          Entered price includes GST?
          <select
            value={form.priceIncludesTax ? "yes" : "no"}
            onChange={(event) =>
              setForm({
                ...form,
                priceIncludesTax: event.target.value === "yes",
              })
            }
          >
            <option value="yes">Yes — GST included</option>
            <option value="no">No — add GST</option>
          </select>
        </label>
        <GstPricePreview
          price={form.price}
          offerPrice={form.offerPrice}
          taxCategory={options.taxCategories.find(
            (tax) => tax._id === form.taxCategory,
          )}
          priceIncludesTax={form.priceIncludesTax}
        />
        <label>
          Display type
          <select
            value={form.displayType}
            onChange={(event) =>
              setForm({
                ...form,
                displayType: event.target.value,
                videoUrl: event.target.value === "Reel" ? form.videoUrl : "",
              })
            }
          >
            <option>Product</option>
            <option>Reel</option>
          </select>
        </label>
        <label className="toggleRow">
          <input
            type="checkbox"
            checked={form.isStockManageable}
            onChange={(event) =>
              setForm({ ...form, isStockManageable: event.target.checked })
            }
          />
          <span>Manage stock</span>
        </label>
        <label className="full">
          Short description
          <input
            required
            value={form.shortDescription}
            onChange={(event) =>
              setForm({ ...form, shortDescription: event.target.value })
            }
          />
        </label>
        <label className="full">
          Detailed description
          <textarea
            required
            value={form.detailedDescription}
            onChange={(event) =>
              setForm({ ...form, detailedDescription: event.target.value })
            }
          />
        </label>
        <label>
          Tags
          <input
            value={form.tags}
            onChange={(event) => setForm({ ...form, tags: event.target.value })}
          />
        </label>
        {form.displayType === "Reel" && (
          <label>
            Upload reel
            <input
              type="file"
              accept="video/*"
              required={!form.videoUrl}
              onChange={async (event) => {
                try {
                  setForm({
                    ...form,
                    videoUrl: await reelData(event.target.files[0]),
                  });
                } catch (error) {
                  window.alert(error.message);
                  event.target.value = "";
                }
              }}
            />
          </label>
        )}
        <label className="full">
          Product image
          <input
            type="file"
            accept="image/*"
            onChange={async (event) =>
              setForm({
                ...form,
                mainImage: await fileData(event.target.files[0]),
              })
            }
          />
        </label>
        <button className="primaryButton" disabled={busy}>
          {editing ? "Submit changes" : "Submit product"}
        </button>
        {editing && (
          <button
            className="secondaryButton"
            type="button"
            onClick={() => {
              setEditing(null);
              setForm(blankProduct);
            }}
          >
            Cancel
          </button>
        )}
      </form>
      <div className="panel tableWrap">
        <table>
          <thead>
            <tr>
              <th>Product</th>
              <th>Price</th>
              <th>Approval</th>
              <th>Admin note</th>
              <th>Store visibility</th>
              <th>Action</th>
            </tr>
          </thead>
          <tbody>
            {products.map((product) => (
              <tr key={product._id}>
                <td>
                  <strong>{product.name}</strong>
                  <br />
                  {product.sku}
                </td>
                <td>{money(product.offerPrice || product.price)}</td>
                <td>{product.approvalStatus.replaceAll("_", " ")}</td>
                <td>{product.approvalNote || "—"}</td>
                <td>
                  <button type="button" onClick={() => toggle(product)}>
                    {product.sellerEnabled ? "Enabled" : "Disabled"}
                  </button>
                </td>
                <td>
                  <button type="button" onClick={() => edit(product)}>
                    Edit
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}
function SellerOrderDetails({ order, tab, setTab, onClose }) {
  return (
    <OperationsOrderDetails
      order={order}
      title="Seller Order Details"
      onClose={onClose}
      productUrl={storefrontProductUrl}
    />
  );
  /* Legacy tabbed detail markup retained temporarily for data compatibility. */
  const timeline = [...(order.timeline || [])].sort(
    (a, b) => new Date(b.createdAt) - new Date(a.createdAt),
  );
  const latestStatus = timeline[0];
  const sellers = [
    ...new Map(
      order.items
        .filter((item) => item.seller)
        .map((item) => [String(item.seller._id || item.seller), item.seller]),
    ).values(),
  ];
  return (
    <div className="modalOverlay" role="dialog" aria-modal="true">
      <section className="orderDetailModal">
        <div className="panelHeader">
          <div>
            <span className="eyebrow">Seller order details</span>
            <h2>{order.orderNumber}</h2>
          </div>
          <button className="inlineButton" type="button" onClick={onClose}>
            Close
          </button>
        </div>
        <nav>
          <button
            className={tab === "summary" ? "active" : ""}
            onClick={() => setTab("summary")}
          >
            Order Items &amp; Summary
          </button>
          <button
            className={tab === "parties" ? "active" : ""}
            onClick={() => setTab("parties")}
          >
            Seller &amp; Customer Details
          </button>
          <button
            className={tab === "status" ? "active" : ""}
            onClick={() => setTab("status")}
          >
            Item Status
          </button>
        </nav>
        {tab === "summary" ? (
          <div className="orderDetailSummary">
            <div className="orderDetailMeta">
              <span>
                <strong>Order dated</strong>
                {new Date(order.createdAt).toLocaleString("en-IN", {
                  dateStyle: "medium",
                  timeStyle: "short",
                })}
              </span>
              <span>
                <strong>Last status</strong>
                {latestStatus?.status || order.status || "Pending"}
              </span>
            </div>
            <table>
              <thead>
                <tr>
                  <th>Product</th>
                  <th>SKU</th>
                  <th>Qty</th>
                  <th>Amount</th>
                </tr>
              </thead>
              <tbody>
                {order.items.map((item) => {
                  const image =
                    item.productDetails?.imageVariants?.storefront ||
                    item.productDetails?.mainImage;
                  return (
                    <tr key={`${item.product}-${item.sku}`}>
                      <td>
                        <div className="orderProductCell">
                          {image ? (
                            <img src={image} alt="" />
                          ) : (
                            <span className="orderProductImageMissing">
                              No image
                            </span>
                          )}
                          <a
                            href={storefrontProductUrl(item.product)}
                            target="_blank"
                            rel="noreferrer"
                          >
                            {item.name}
                          </a>
                        </div>
                      </td>
                      <td>{item.sku}</td>
                      <td>{item.quantity}</td>
                      <td>{money(item.price * item.quantity)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
            <dl>
              <div>
                <dt>Items amount</dt>
                <dd>
                  {money(
                    Number(order.grandTotal || 0) -
                      (Number(order.shipping?.amount) ||
                        Number(order.shippingTotal)),
                  )}
                </dd>
              </div>
              <div>
                <dt>Shipping</dt>
                <dd>
                  {money(
                    Number(order.shipping?.amount) ||
                      Number(order.shippingTotal),
                  )}
                </dd>
              </div>
              <div>
                <dt>Total</dt>
                <dd>{money(order.grandTotal)}</dd>
              </div>
            </dl>
          </div>
        ) : tab === "parties" ? (
          <div className="orderPartyGrid">
            <section>
              <h3>Customer</h3>
              {order.customer?.profileImage && <img className="orderPartyAvatar" src={order.customer.profileImage} alt="" />}
              <p>
                <strong>
                  {order.customer?.name || order.address?.name || "Guest"}
                </strong>
                <br />
                {order.customer?.email || order.address?.email}
                <br />
                {order.customer?.phone || order.address?.phone}
                <br />
                {order.address?.shippingAddress ||
                  order.address?.billingAddress}
                <br />
                {[
                  order.address?.city,
                  order.address?.state,
                  order.address?.postalCode,
                ]
                  .filter(Boolean)
                  .join(", ")}
              </p>
            </section>
            {sellers.map((seller) => (
              <section key={seller._id || seller.sellerNumber}>
                <h3>Seller</h3>
                <p>
                  <strong>{seller.companyName}</strong>
                  <br />
                  Seller ID: {seller.sellerNumber}
                  <br />
                  {seller.email}
                  <br />
                  {seller.mobile}
                  <br />
                  {[seller.address, seller.city, seller.state, seller.pinCode]
                    .filter(Boolean)
                    .join(", ")}
                </p>
              </section>
            ))}
          </div>
        ) : (
          <div className="orderStatusHistory">
            {timeline.length ? (
              timeline.map((entry, index) => (
                <article key={entry._id || `${entry.createdAt}-${index}`}>
                  <span
                    className={`sellerStatusButton ${String(
                      entry.status || "pending",
                    )
                      .toLowerCase()
                      .replaceAll(" ", "-")}`}
                  >
                    {entry.status || "Update"}
                  </span>
                  <div>
                    <strong>{entry.title}</strong>
                    <small>
                      {new Date(entry.createdAt).toLocaleString("en-IN", {
                        dateStyle: "medium",
                        timeStyle: "short",
                      })}
                    </small>
                    {entry.comment && <p>{entry.comment}</p>}
                    {entry.details && <small>{entry.details}</small>}
                  </div>
                </article>
              ))
            ) : (
              <p>No item status updates have been recorded.</p>
            )}
          </div>
        )}
      </section>
    </div>
  );
}

function ManualCourierDialog({ dialog, setDialog, onSaved }) {
  if (!dialog) return null;
  return (
    <div className="modalOverlay" role="dialog" aria-modal="true">
      <form
        className="sellerStatusModal"
        onSubmit={async (event) => {
          event.preventDefault();
          setDialog((current) => ({ ...current, busy: true, error: "" }));
          try {
            const updated = await api.saveSellerManualCourier(
              dialog.order._id,
              {
                courierName: dialog.courierName,
                trackingId: dialog.trackingId,
                trackingUrl: dialog.trackingUrl,
              },
            );
            onSaved(updated);
          } catch (error) {
            setDialog((current) => ({
              ...current,
              busy: false,
              error: error.message,
            }));
          }
        }}
      >
        <div className="panelHeader">
          <div>
            <span className="eyebrow">Manual fulfillment</span>
            <h2>{dialog.order.orderNumber}</h2>
          </div>
          <button
            className="inlineButton"
            type="button"
            disabled={dialog.busy}
            onClick={() => setDialog(null)}
          >
            Close
          </button>
        </div>
        <p className="mutedText">
          Enter the courier details that the customer will use to track this
          order.
        </p>
        <label>
          Courier name
          <input
            required
            value={dialog.courierName}
            onChange={(event) =>
              setDialog({ ...dialog, courierName: event.target.value })
            }
            placeholder="Example: Blue Dart"
          />
        </label>
        <label>
          Tracking ID
          <input
            required
            value={dialog.trackingId}
            onChange={(event) =>
              setDialog({ ...dialog, trackingId: event.target.value })
            }
            placeholder="Courier AWB or tracking number"
          />
        </label>
        <label>
          Tracking URL
          <input
            required
            type="url"
            value={dialog.trackingUrl}
            onChange={(event) =>
              setDialog({ ...dialog, trackingUrl: event.target.value })
            }
            placeholder="https://courier.example/track/..."
          />
        </label>
        {dialog.error && <p className="errorText">{dialog.error}</p>}
        <button className="primaryButton" disabled={dialog.busy}>
          {dialog.busy ? "Saving…" : "Save courier details & mark shipped"}
        </button>
      </form>
    </div>
  );
}

const sellerReturnLabel = (status) =>
  ({
    Requested: "Pending",
    Approved: "Accepted",
    "Pickup Arranged": "In Transit",
    Received: "Received",
    Closed: "Refund Issued",
    Rejected: "Rejected",
  })[status] ||
  status ||
  "Pending";
function SellerReturnsReadOnly({ orders }) {
  const rows = orders.flatMap((order) =>
    (order.items || [])
      .filter((item) => item.returnRequest?.status)
      .map((item) => ({ order, item })),
  );
  return (
    <section className="sellerOrdersPage sellerReturnsReadOnly">
      <div className="sellerKycHeading">
        <div>
          <span className="eyebrow">Admin-managed returns</span>
          <h2>Returns &amp; Refunds</h2>
          <p>
            Customer return items and their current status. Return processing is
            controlled by Admin.
          </p>
        </div>
      </div>
      <div className="panel tableWrap">
        <table>
          <thead>
            <tr>
              <th>Order</th>
              <th>Product</th>
              <th>Customer</th>
              <th>Return reason</th>
              <th>Requested</th>
              <th>Status</th>
              <th>Admin update</th>
            </tr>
          </thead>
          <tbody>
            {rows.map(({ order, item }) => {
              const status = sellerReturnLabel(item.returnRequest.status);
              return (
                <tr key={`${order._id}-${item.product}`}>
                  <td>
                    <strong>{order.orderNumber}</strong>
                    <br />
                    <small>
                      {new Date(order.createdAt).toLocaleString("en-IN", {
                        dateStyle: "medium",
                        timeStyle: "short",
                      })}
                    </small>
                  </td>
                  <td>
                    <strong>{item.name}</strong>
                    <br />
                    <small>
                      {item.sku} · Qty {item.quantity}
                    </small>
                  </td>
                  <td>
                    {order.customer?.name || order.address?.name || "Customer"}
                  </td>
                  <td>
                    {item.returnRequest.reason || "—"}
                    <br />
                    <small>{item.returnRequest.comments || ""}</small>
                  </td>
                  <td>
                    {item.returnRequest.requestedAt
                      ? new Date(item.returnRequest.requestedAt).toLocaleString(
                          "en-IN",
                          { dateStyle: "medium", timeStyle: "short" },
                        )
                      : "—"}
                  </td>
                  <td>
                    <span
                      className={`sellerReturnStatus ${status.toLowerCase().replaceAll(" ", "-")}`}
                    >
                      {status}
                    </span>
                  </td>
                  <td>
                    {item.returnRequest.reviewNote ||
                      "Waiting for Admin update"}
                  </td>
                </tr>
              );
            })}
            {!rows.length && (
              <tr>
                <td colSpan="7">No customer return requests yet.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </section>
  );
}
function SellerOrders({ orders, update, returnUpdate, action, shippingMode }) {
  const statuses = [
    "Placed",
    "Confirmed",
    "Packed",
    "Ready to Ship",
    "Shipped",
    "Delivered",
    "Cancelled",
  ];
  const requestedStatus = new URLSearchParams(window.location.hash.split("?")[1] || "").get("status") || "all";
  const [filters, setFilters] = useState({
    search: "",
    from: "",
    to: "",
    status: requestedStatus,
  });
  const [statusDialog, setStatusDialog] = useState(null);
  const [menu, setMenu] = useState("");
  const [returnDialog, setReturnDialog] = useState(null);
  const [settlement, setSettlement] = useState(null);
  const [manualCourierDialog, setManualCourierDialog] = useState(null);
  const [tab, setTab] = useState(["Completed", "Delivered"].includes(requestedStatus) ? "delivered" : "pending");
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [detailTab, setDetailTab] = useState("summary");
  const itemIsPending = (item) => {
    if (["Cancelled", "Returned", "Completed"].includes(item.sellerStatus)) return false;
    return item.sellerStatus !== "Delivered";
  };
  useEffect(() => {
    const id = window.location.hash.match(/^#\/seller\/orders\/([^/?]+)/)?.[1];
    if (id && orders.length)
      setSelectedOrder(
        orders.find((order) => String(order._id) === decodeURIComponent(id)) ||
          null,
      );
  }, [orders]);
  const openOrder = (order) => {
    setSelectedOrder(order);
    window.location.hash = `#/seller/orders/${order._id}`;
  };
  useEffect(() => {
    if (
      selectedOrder &&
      !window.location.hash.includes(String(selectedOrder._id))
    )
      window.location.hash = `#/seller/orders/${selectedOrder._id}`;
  }, [selectedOrder]);
  useEffect(() => {
    const closeMenu = (event) => {
      if (!event.target.closest(".sellerOrderMenu")) setMenu("");
    };
    document.addEventListener("pointerdown", closeMenu);
    return () => document.removeEventListener("pointerdown", closeMenu);
  }, []);
  const filtered = orders.filter((order) => {
    const created = new Date(order.createdAt);
    const text = [
      order.orderNumber,
      order.customer?.name,
      order.customer?.email,
      order.address?.name,
      order.address?.email,
      ...order.items.flatMap((item) => [item.name, item.sku]),
    ]
      .filter(Boolean)
      .join(" ")
      .toLowerCase();
    const delivered = order.items.length > 0 && order.items.every((item) => !itemIsPending(item));
    const tabMatch =
      tab === "delivered" ? delivered : tab === "pending" ? !delivered : false;
    return (
      tabMatch &&
      text.includes(filters.search.toLowerCase()) &&
      (!filters.from || created >= new Date(filters.from)) &&
      (!filters.to || created <= new Date(`${filters.to}T23:59:59`)) &&
      (filters.status === "all" ||
        (filters.status === "open"
          ? order.items.some(itemIsPending)
          : order.items.some((item) => item.sellerStatus === filters.status)))
    );
  });
  const pendingGroups = [
    ...orders
      .flatMap((order) =>
        order.items
          .filter(
            (item) =>
              !["Delivered", "Completed", "Cancelled", "Returned"].includes(
                item.sellerStatus,
              ),
          )
          .map((item) => ({ ...item, orderNumber: order.orderNumber })),
      )
      .reduce((map, item) => {
        const key = item.sku;
        const current = map.get(key) || {
          sku: item.sku,
          name: item.name,
          quantity: 0,
          orders: new Set(),
          product: item.product,
          productDetails: item.productDetails,
        };
        current.quantity += item.quantity;
        current.orders.add(item.orderNumber);
        map.set(key, current);
        return map;
      }, new Map())
      .values(),
  ];
  if (activeSellerPortalScreen === "returns")
    return <SellerReturnsReadOnly orders={orders} />;
  return (
    <section className="sellerOrdersPage">
      <nav className="orderFulfillmentTabs">
        <button
          className={tab === "pending" ? "active" : ""}
          type="button"
          onClick={() => setTab("pending")}
        >
          Current Pending Orders
        </button>
        <button
          className={tab === "grouping" ? "active" : ""}
          type="button"
          onClick={() => setTab("grouping")}
        >
          Pending Item Grouping
        </button>
        <button
          className={tab === "delivered" ? "active" : ""}
          type="button"
          onClick={() => setTab("delivered")}
        >
          Delivered Orders
        </button>
      </nav>
      {selectedOrder && (
        <div className="trackingRouteOverlay">
          <OrderTrackingPage
            order={selectedOrder}
            onBack={() => {
              setSelectedOrder(null);
              window.location.hash = "#/seller/orders";
            }}
          />
        </div>
      )}
      {tab === "grouping" && (
        <div className="panel tableWrap sellerPendingGrouping">
          <table>
            <thead>
              <tr>
                <th>Image</th>
                <th>Product</th>
                <th>SKU</th>
                <th>Qty Required</th>
                <th>Orders</th>
              </tr>
            </thead>
            <tbody>
              {pendingGroups.map((item) => (
                <tr key={item.sku}>
                  <td>
                    {item.productDetails?.mainImage ? (
                      <img
                        className="sellerProductThumb"
                        src={item.productDetails.mainImage}
                        alt=""
                      />
                    ) : (
                      "—"
                    )}
                  </td>
                  <td>
                    <a
                      href={`#/product/${item.product}`}
                      target="_blank"
                      rel="noreferrer"
                    >
                      {item.name}
                    </a>
                  </td>
                  <td>{item.sku}</td>
                  <td>{item.quantity}</td>
                  <td>{[...item.orders].join(", ")}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      <div className="panel sellerOrderFilters">
        <label className="searchBox">
          <Search size={16} />
          <input
            placeholder="Order number, product or customer"
            value={filters.search}
            onChange={(event) =>
              setFilters({ ...filters, search: event.target.value })
            }
          />
        </label>
        <label>
          From
          <input
            type="date"
            value={filters.from}
            onChange={(event) =>
              setFilters({ ...filters, from: event.target.value })
            }
          />
        </label>
        <label>
          To
          <input
            type="date"
            value={filters.to}
            onChange={(event) =>
              setFilters({ ...filters, to: event.target.value })
            }
          />
        </label>
        <label>
          Item status
          <select
            value={filters.status}
            onChange={(event) =>
              setFilters({ ...filters, status: event.target.value })
            }
          >
            <option value="all">All statuses</option>
            <option value="open">Pending &amp; processing</option>
            <option>Pending</option>
            <option>Processing</option>
            {statuses.map((status) => (
              <option key={status}>{status}</option>
            ))}
          </select>
        </label>
      </div>
      {shippingMode !== "shiprocket" && tab === "pending" && (
        <>
          <div className="manualCourierActions">
            {filtered
              .filter(
                (order) =>
                  order.shipping?.syncStatus ===
                    "Manual courier details added" ||
                  order.items.every(
                    (item) => item.sellerStatus === "Ready to Dispatch",
                  ),
              )
              .map((order) => (
                <button
                  className="primaryButton"
                  type="button"
                  key={order._id}
                  onClick={() =>
                    setManualCourierDialog({
                      order,
                      courierName: order.shipping?.courierName || "",
                      trackingId: order.shipping?.awbCode || "",
                      trackingUrl: order.shipping?.trackingUrl || "",
                      error: "",
                      busy: false,
                    })
                  }
                >
                  <Truck size={16} />{" "}
                  {order.shipping?.awbCode
                    ? `Courier details · ${order.orderNumber}`
                    : `Add courier details · ${order.orderNumber}`}
                </button>
              ))}
          </div>
          <ManualCourierDialog
            dialog={manualCourierDialog}
            setDialog={setManualCourierDialog}
            onSaved={(updated) => {
              Object.assign(manualCourierDialog.order, updated);
              setFilters((current) => ({ ...current }));
              setManualCourierDialog(null);
            }}
          />
        </>
      )}
      <div className="panel tableWrap">
        <table>
          <thead>
            <tr>
              <th>Order</th>
              <th>Customer</th>
              <th>Invoice</th>
              <th>Item status</th>
              <th>Return information</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {filtered.flatMap((order) =>
              order.items.map((item, index) => {
                const closes = item.returnWindowClosesAt
                  ? new Date(item.returnWindowClosesAt)
                  : new Date(
                      new Date(item.deliveredAt || order.updatedAt).getTime() +
                        Number(item.returnDays || 0) * 86400000,
                    );
                const canViewCommission = ["Delivered", "Completed"].includes(
                  item.sellerStatus,
                );
                return (
                  <tr
                    className="clickableTableRow"
                    key={`${order._id}-${item.product}`}
                    onClick={(event) => {
                      if (
                        !event.target.closest("button,a,input,select,textarea")
                      ) {
                        setSelectedOrder(order);
                        setDetailTab("summary");
                      }
                    }}
                  >
                    <td>
                      <strong>{order.orderNumber}</strong>
                      <br />
                      {new Date(order.createdAt).toLocaleString("en-IN", {
                        dateStyle: "medium",
                        timeStyle: "short",
                      })}
                      {order.shipping?.awbCode && (
                        <>
                          <br />
                          <small>AWB: {order.shipping.awbCode}</small>
                        </>
                      )}
                    </td>
                    <td>
                      {order.customer?.name || order.address?.name}
                      <br />
                      <small>
                        {order.customer?.email || order.address?.email}
                      </small>
                    </td>
                    {index === 0 && (
                      <td rowSpan={order.items.length}>
                        <strong>
                          {order.invoiceNumber || "Not generated"}
                        </strong>
                        <br />
                        <small>
                          Shipping{" "}
                          {money(
                            Number(order.shipping?.amount) ||
                              Number(order.shippingTotal),
                          )}
                        </small>
                        <br />
                        <strong>Total {money(order.grandTotal)}</strong>
                      </td>
                    )}
                    <td>
                      <button
                        className={`sellerStatusButton ${String(item.sellerStatus).toLowerCase().replaceAll(" ", "-")}`}
                        type="button"
                        disabled={item.sellerStatus === "Completed"}
                        onClick={() =>
                          setStatusDialog({
                            order,
                            item,
                            status: item.sellerStatus || "Pending",
                            note: "",
                            statusDate: new Date().toISOString().slice(0, 10),
                          })
                        }
                      >
                        {item.sellerStatus || "Pending"} ▾
                      </button>
                      {item.sellerStatus === "Delivered" && (
                        <small>Delivered</small>
                      )}
                    </td>
                    <td>
                      <span
                        className={`returnWindowBadge ${canViewCommission && closes <= new Date() ? "closed" : "open"}`}
                      >
                        {!item.returnApplicable || !item.returnDays
                          ? "No return"
                          : !canViewCommission
                          ? "Starts after delivery"
                          : closes <= new Date()
                            ? "Return window closed"
                            : `Open until ${closes.toLocaleDateString("en-IN")}`}
                      </span>
                    </td>
                    <td>
                      {index === 0 && (
                        <div className="sellerOrderMenu">
                          <button
                            type="button"
                            aria-label="Order actions"
                            onClick={() =>
                              setMenu(menu === order._id ? "" : order._id)
                            }
                          >
                            <MoreVertical size={18} />
                          </button>
                          {menu === order._id && (
                            <div>
                              <button
                                type="button"
                                onClick={() => {
                                  setSelectedOrder(order);
                                  setDetailTab("summary");
                                  setMenu("");
                                }}
                              >
                                View order details
                              </button>
                              {order.invoiceNumber && (
                                <button
                                  type="button"
                                  onClick={() => {
                                    setMenu("");
                                    printSellerDocument(order, "invoice");
                                  }}
                                >
                                  Print invoice
                                </button>
                              )}
                              <button
                                type="button"
                                onClick={() => {
                                  setMenu("");
                                  printSellerDocument(order, "packing");
                                }}
                              >
                                Print packing slip
                              </button>
                              {shippingMode === "shiprocket" && (
                                <button
                                  type="button"
                                  title={order.items.some((entry) => entry.sellerStatus !== "Ready to Dispatch") ? "All items must be Ready to Dispatch. Click for details." : "Create shipment and assign courier/AWB"}
                                  onClick={() => {
                                    setMenu("");
                                    action("shiprocket", order);
                                  }}
                                >
                                  Send packet to ShipRocket
                                </button>
                              )}
                            </div>
                          )}
                        </div>
                      )}
                      {canViewCommission && (
                        <button
                          className="inlineButton"
                          type="button"
                          onClick={async () => {
                            const result = item.settlement?.settledAt
                              ? {
                                  payout: {
                                    ...item.settlement,
                                    commissionAmount:
                                      item.settlement.platformFee,
                                  },
                                }
                              : await api.settleSellerOrderItem(
                                  order._id,
                                  item.product,
                                );
                            setSettlement({
                              order,
                              item,
                              ...result.payout,
                              pending: Boolean(result.pending),
                              returnWindowClosesAt: result.returnWindowClosesAt,
                            });
                          }}
                        >
                          Commission
                        </button>
                      )}
                      {item.returnRequest?.status && (
                        <span
                          className={`sellerReturnStatus ${sellerReturnLabel(item.returnRequest.status).toLowerCase().replaceAll(" ", "-")}`}
                        >
                          {sellerReturnLabel(item.returnRequest.status)}
                        </span>
                      )}
                    </td>
                  </tr>
                );
              }),
            )}
            {!filtered.length && (
              <tr>
                <td colSpan="6">No orders match these filters.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
      {settlement && <OrderSettlementDetails order={settlement.order} item={settlement.item} settlement={settlement} onClose={() => setSettlement(null)} />}
      {statusDialog && (
        <div className="modalOverlay" role="dialog" aria-modal="true">
          <form
            className="sellerStatusModal"
            onSubmit={(event) => {
              event.preventDefault();
              update(statusDialog.order._id, statusDialog.item.product, {
                status: statusDialog.status,
                note: statusDialog.note,
                statusDate: statusDialog.statusDate,
              });
              setStatusDialog(null);
            }}
          >
            <div className="panelHeader">
              <div>
                <span className="eyebrow">Verify status change</span>
                <h2>{statusDialog.order.orderNumber}</h2>
              </div>
              <button
                className="inlineButton"
                type="button"
                onClick={() => setStatusDialog(null)}
              >
                Close
              </button>
            </div>
            <label>
              New item status
              <select
                value={statusDialog.status}
                onChange={(event) =>
                  setStatusDialog({
                    ...statusDialog,
                    status: event.target.value,
                  })
                }
              >
                {statuses.map((status) => (
                  <option key={status}>{status}</option>
                ))}
              </select>
            </label>
            {shippingMode === "self" ? (
              <label>
                Status date
                <input
                  type="date"
                  required
                  value={statusDialog.statusDate}
                  onChange={(event) =>
                    setStatusDialog({
                      ...statusDialog,
                      statusDate: event.target.value,
                    })
                  }
                />
              </label>
            ) : (
              <p className="mutedText">
                ShipRocket orders can be sent after every item is marked Ready
                to Dispatch.
              </p>
            )}
            <label>
              Verification notes
              <textarea
                required
                value={statusDialog.note}
                onChange={(event) =>
                  setStatusDialog({ ...statusDialog, note: event.target.value })
                }
                placeholder="Add notes about this fulfillment step..."
              />
            </label>
            <button className="primaryButton">Verify and update status</button>
          </form>
        </div>
      )}
      {returnDialog && (
        <div className="modalOverlay" role="dialog" aria-modal="true">
          <form
            className="sellerStatusModal"
            onSubmit={(event) => {
              event.preventDefault();
              returnUpdate(returnDialog.order._id, returnDialog.item.product, {
                status: returnDialog.status,
                note: returnDialog.note,
                statusDate: returnDialog.statusDate,
              });
              setReturnDialog(null);
            }}
          >
            <div className="panelHeader">
              <div>
                <span className="eyebrow">Customer return</span>
                <h2>{returnDialog.item.name}</h2>
              </div>
              <button
                className="inlineButton"
                type="button"
                onClick={() => setReturnDialog(null)}
              >
                Close
              </button>
            </div>
            <p>
              Reason: <strong>{returnDialog.item.returnRequest?.reason}</strong>
            </p>
            <label>
              Return status
              <select
                value={returnDialog.status}
                onChange={(event) =>
                  setReturnDialog({
                    ...returnDialog,
                    status: event.target.value,
                  })
                }
              >
                {[
                  "Approved",
                  "Rejected",
                  "Pickup Arranged",
                  "Received",
                  "Closed",
                ].map((status) => (
                  <option key={status}>{status}</option>
                ))}
              </select>
            </label>
            <label>
              Status date
              <input
                type="date"
                required
                value={returnDialog.statusDate}
                onChange={(event) =>
                  setReturnDialog({
                    ...returnDialog,
                    statusDate: event.target.value,
                  })
                }
              />
            </label>
            <label>
              Processing notes
              <textarea
                required
                value={returnDialog.note}
                onChange={(event) =>
                  setReturnDialog({ ...returnDialog, note: event.target.value })
                }
                placeholder="Pickup, inspection, rejection, or receipt notes"
              />
            </label>
            <button className="primaryButton">Update return status</button>
          </form>
        </div>
      )}
    </section>
  );
}
const transactionDate = (value) => {
  const date = new Date(value);
  const day = date.toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
  const time = date
    .toLocaleTimeString("en-IN", {
      hour: "2-digit",
      minute: "2-digit",
      hour12: true,
    })
    .toUpperCase();
  return `${day}, ${time}`;
};
export function SellerTransactionHistory({ sellerId = "", adminView = false, fullPage = false }) {
  const [result, setResult] = useState({
    items: [],
    pagination: { page: 1, limit: 10, total: 0 },
    summary: {},
  });
  const [filters, setFilters] = useState({
    page: 1,
    limit: 10,
    period: "all",
    type: "All",
    status: "All",
    q: "",
    from: "",
    to: "",
  });
  const [showAll, setShowAll] = useState(adminView || fullPage);
  const [selected, setSelected] = useState(null);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    let active = true;
    setLoading(true);
    const timer = window.setTimeout(
      () =>
        (sellerId
          ? api.adminSellerTransactions(sellerId, filters)
          : api.sellerTransactions(filters)
        )
          .then((data) => {
            if (active) setResult(data);
          })
          .catch((error) => showToast(error.message, "error"))
          .finally(() => active && setLoading(false)),
      200,
    );
    return () => {
      active = false;
      window.clearTimeout(timer);
    };
  }, [filters, sellerId]);
  const change = (key, value) =>
    setFilters((current) => ({
      ...current,
      [key]: value,
      page: key === "page" ? value : 1,
    }));
  const exportRows = result.items.map((item) => [
    transactionDate(item.date),
    item.transactionId,
    item.orderId,
    item.description,
    item.type,
    Number(item.amount).toFixed(2),
    item.status,
  ]);
  const download = (kind) => {
    if (kind === "pdf") {
      const popup = window.open("", "_blank");
      popup.document.write(
        `<title>Transaction Statement</title><h2>Transaction Statement</h2><table border="1" cellspacing="0" cellpadding="8"><tr><th>Date</th><th>Transaction ID</th><th>Order ID</th><th>Description</th><th>Type</th><th>Amount</th><th>Status</th></tr>${exportRows.map((row) => `<tr>${row.map((cell) => `<td>${String(cell).replaceAll("<", "&lt;")}</td>`).join("")}</tr>`).join("")}</table>`,
      );
      popup.document.close();
      popup.print();
      return;
    }
    const rows = [
      [
        "Date",
        "Transaction ID",
        "Order ID",
        "Description",
        "Type",
        "Amount",
        "Status",
      ],
      ...exportRows,
    ];
    const content = rows
      .map((row) =>
        row
          .map((value) => `"${String(value ?? "").replaceAll('"', '""')}"`)
          .join(","),
      )
      .join("\n");
    const link = document.createElement("a");
    link.href = URL.createObjectURL(
      new Blob([content], {
        type: kind === "excel" ? "application/vnd.ms-excel" : "text/csv",
      }),
    );
    link.download = `seller-transactions.${kind === "excel" ? "xls" : "csv"}`;
    link.click();
    URL.revokeObjectURL(link.href);
  };
  const copyReference = async (value) => {
    if (!value || value === "—") return;
    await navigator.clipboard.writeText(String(value));
    showToast("Reference copied.", "success");
  };
  const downloadReceipt = (transaction) => {
    const popup = window.open("", "_blank");
    if (!popup) return showToast("Please allow pop-ups to download the receipt.", "error");
    const receiptRows = [
      ["Transaction ID", transaction.transactionId],
      ["Order ID", transaction.orderId],
      ["Seller ID", transaction.sellerId],
      ["Date", transactionDate(transaction.date)],
      ["Payment method", transaction.paymentMethod],
      ["Transaction type", transaction.type],
      ["Settlement amount", money(transaction.settlementAmount)],
      ["Fee / Charges", money(Math.max(0, Number(transaction.settlementAmount || 0) - Number(transaction.netAmount || 0)))],
      ["Net amount", money(transaction.netAmount)],
      ["Status", transaction.status],
    ];
    popup.document.write(`<title>${transaction.transactionId} Receipt</title><style>body{max-width:680px;margin:40px auto;padding:28px;font:14px Arial;color:#202235}h1{margin-bottom:5px}p{color:#6d7280}table{width:100%;margin-top:28px;border-collapse:collapse}td{padding:12px;border-bottom:1px solid #e8e8ee}td:last-child{text-align:right;font-weight:700}.total{font-size:18px;color:#16884d}</style><h1>Transaction receipt</h1><p>HRS Basket Seller Dashboard</p><table>${receiptRows.map(([label, value], index) => `<tr${index === receiptRows.length - 2 ? ' class="total"' : ""}><td>${label}</td><td>${String(value ?? "—").replaceAll("<", "&lt;")}</td></tr>`).join("")}</table>`);
    popup.document.close();
    popup.print();
  };
  const summary = [
    ["Available Balance", result.summary.availableBalance],
    ["Pending Settlement", result.summary.pendingSettlement],
    ["Total Credit", result.summary.totalCredit],
    ["Total Debit", result.summary.totalDebit],
    ["Today's Credit", result.summary.todayCredit],
    ["Today's Debit", result.summary.todayDebit],
  ];
  return (
    <section
      className={`sellerTransactions panel ${showAll ? "expanded" : ""}`}
    >
      <div className="sellerWalletSectionTitle">
        <h3>{fullPage ? "Wallet Request Transactions" : "Recent Transactions"}</h3>
        {!adminView && !fullPage && <button type="button" onClick={() => window.dispatchEvent(new CustomEvent("seller-dashboard-navigate", { detail: "transactions" }))}>
          View All
        </button>}
      </div>
      {showAll && (
        <>
          <div className="transactionSummaryGrid">
            {summary.map(([label, value], index) => (
              <article
                key={label}
                className={
                  index === 2 || index === 4
                    ? "credit"
                    : index === 3 || index === 5
                      ? "debit"
                      : ""
                }
              >
                <span>{label}</span>
                <strong>{money(value)}</strong>
              </article>
            ))}
          </div>
          <div className="transactionToolbar">
            <label className="transactionSearch">
              <Search size={17} />
              <input
                value={filters.q}
                onChange={(event) => change("q", event.target.value)}
                placeholder="Order ID, Transaction ID, customer or amount"
              />
            </label>
            <select
              value={filters.period}
              onChange={(event) => change("period", event.target.value)}
            >
              <option value="all">All Dates</option>
              <option value="today">Today</option>
              <option value="yesterday">Yesterday</option>
              <option value="week">This Week</option>
              <option value="month">This Month</option>
              <option value="last_month">Last Month</option>
              <option value="custom">Custom Date</option>
            </select>
            <select
              value={filters.type}
              onChange={(event) => change("type", event.target.value)}
            >
              <option>All</option>
              <option>Credit</option>
              <option>Debit</option>
            </select>
            <select
              value={filters.status}
              onChange={(event) => change("status", event.target.value)}
            >
              {[
                "All",
                "Pending",
                "Processing",
                "Completed",
                "Success",
                "Failed",
                "Rejected",
                "Cancelled",
              ].map((status) => (
                <option key={status}>{status}</option>
              ))}
            </select>
            {filters.period === "custom" && (
              <>
                <input
                  type="date"
                  value={filters.from}
                  onChange={(event) => change("from", event.target.value)}
                />
                <input
                  type="date"
                  value={filters.to}
                  onChange={(event) => change("to", event.target.value)}
                />
              </>
            )}
            <div className="transactionExports">
              <button type="button" onClick={() => download("pdf")}>
                Export PDF
              </button>
              <button type="button" onClick={() => download("excel")}>
                Export Excel
              </button>
              <button type="button" onClick={() => download("csv")}>
                Export CSV
              </button>
            </div>
          </div>
        </>
      )}
      <div className="tableWrap transactionDesktopTable">
        <table>
          <thead>
            <tr>
              <th>Date</th>
              <th>Description</th>
              <th>Type</th>
              <th>Amount</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan="5">Loading transactions…</td>
              </tr>
            ) : (
              result.items
                .slice(0, showAll ? result.items.length : 5)
                .map((item) => (
                  <tr
                    key={item._id}
                    className="transactionClickableRow"
                    tabIndex={0}
                    role="button"
                    aria-label={`View transaction ${item.transactionId || item.description}`}
                    onClick={() => setSelected(item)}
                    onKeyDown={(event) => {
                      if (event.key === "Enter" || event.key === " ") {
                        event.preventDefault();
                        setSelected(item);
                      }
                    }}
                  >
                    <td><span className={`transactionDateCell ${item.type.toLowerCase()}`}>{item.type === "Credit" ? <ArrowUp size={15} /> : <ArrowDown size={15} />}<span>{transactionDate(item.date)}</span></span></td>
                    <td>
                      <span className="transactionDescription">{item.description}</span>
                    </td>
                    <td>
                      <span
                        className={`walletTransactionType ${item.type.toLowerCase()}`}
                      >
                        {item.type}
                      </span>
                    </td>
                    <td className={item.type.toLowerCase()}>
                      {item.type === "Credit" ? "+" : "−"} {money(item.amount)}
                    </td>
                    <td>
                      <span
                        className={`walletTransactionStatus ${String(item.status).toLowerCase()}`}
                      >
                        {item.status}
                      </span>
                    </td>
                  </tr>
                ))
            )}
            {!loading && !result.items.length && (
              <tr>
                <td colSpan="5">No transactions match these filters.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
      <div className="transactionMobileCards">
        {result.items
          .slice(0, showAll ? result.items.length : 5)
          .map((item) => (
            <button
              type="button"
              key={item._id}
              onClick={() => setSelected(item)}
            >
              <span>
                <small className={`transactionMobileDate ${item.type.toLowerCase()}`}>{item.type === "Credit" ? <ArrowUp size={14} /> : <ArrowDown size={14} />}{transactionDate(item.date)}</small>
                <strong>{item.description}</strong>
              </span>
              <span className={item.type.toLowerCase()}>
                <b>
                  {item.type === "Credit" ? "+" : "−"} {money(item.amount)}
                </b>
                <em className={String(item.status).toLowerCase()}>
                  {item.status}
                </em>
              </span>
            </button>
          ))}
      </div>
      {showAll && (
        <TablePagination
          total={result.pagination.total}
          page={result.pagination.page}
          pageSize={result.pagination.limit}
          pageSizes={[10, 25, 50, 100]}
          onPageChange={(value) => change("page", value)}
          onPageSizeChange={(value) => change("limit", value)}
        />
      )}
      {selected && (
        <div className="modalOverlay transactionDetailsOverlay" role="dialog" aria-modal="true" aria-labelledby="transaction-details-title" onMouseDown={(event) => event.target === event.currentTarget && setSelected(null)}>
          <section className="sellerStatusModal transactionDetails">
            <header className="transactionDetailsHeader">
              <span className="transactionHeaderIcon"><FileCheck2 size={27} /></span>
              <div>
                <span className="eyebrow">Transaction Details</span>
                <h2 id="transaction-details-title">{selected.transactionId}</h2>
                <p>{transactionDate(selected.date)} (UTC+05:30)</p>
              </div>
              <button
                type="button"
                className="transactionCloseIcon"
                onClick={() => setSelected(null)}
                aria-label="Close transaction details"
              >
                <X size={23} />
              </button>
            </header>
            <div className={`transactionDetailsHero ${selected.type?.toLowerCase() || "credit"}`}>
              <div className="transactionHeroAmount">
                <span>Net amount</span>
                <div><strong>{selected.type === "Credit" ? "+" : "−"}{money(selected.netAmount)}</strong><span className={`walletTransactionType ${selected.type?.toLowerCase()}`}>{selected.type}</span><span className={`walletTransactionStatus ${String(selected.status).toLowerCase()}`}>{selected.status}</span></div>
              </div>
              <div className="transactionHeroPayment">
                <span>Payment method</span>
                <strong>{selected.paymentMethod || "—"}</strong>
              </div>
            </div>
            <div className="transactionDetailsSections">
              <section className="transactionReferenceSection">
                <h3><span><FileText size={18} /></span>Reference</h3>
                <dl>
                  {[["Transaction ID", selected.transactionId, true], ["Customer", selected.customerName], ["Order ID", selected.orderId, true], ["Payment method", selected.paymentMethod], ["Seller ID", selected.sellerId, true], ["Transaction Type", selected.type]].map(([label, value, copy]) => <div key={label}><dt>{label}</dt><dd>{value || "—"}{copy && value && value !== "—" && <button type="button" className="transactionCopy" onClick={() => copyReference(value)} aria-label={`Copy ${label}`}><Copy size={15} /></button>}</dd></div>)}
                </dl>
              </section>
              <section className="transactionBreakdownSection">
                <h3><span><CircleDollarSign size={18} /></span>Amount breakdown</h3>
                <dl className="transactionAmountBreakdown">
                  <div><dt>Settlement amount</dt><dd>{money(selected.settlementAmount)}</dd></div>
                  <div><dt>Fee / Charges</dt><dd>−{money(Math.max(0, Number(selected.settlementAmount || 0) - Number(selected.netAmount || 0)))}</dd></div>
                  <div className="transactionNetRow"><dt>Net amount</dt><dd>{selected.type === "Credit" ? "+" : "−"}{money(selected.netAmount)}</dd></div>
                </dl>
              </section>
              <section className="transactionTimelineSection">
                <h3><span><Clock3 size={18} /></span>Timeline</h3>
                <div className="transactionTimeline">
                  <article><i><Check size={14} /></i><div><strong>{selected.description || `${selected.type} transaction`}</strong><small>{transactionDate(selected.date)}</small>{selected.remarks && <p>{selected.remarks}</p>}</div><b className={selected.type?.toLowerCase()}>{selected.type === "Credit" ? "+" : "−"}{money(selected.netAmount)}</b><em className={String(selected.status).toLowerCase()}>{selected.status}</em></article>
                  {selected.orderId && selected.orderId !== "—" && <article><i><Check size={14} /></i><div><strong>Settlement for {selected.orderId}</strong><small>{transactionDate(selected.date)}</small></div><b className={selected.type?.toLowerCase()}>{money(selected.settlementAmount)}</b><em className={String(selected.status).toLowerCase()}>{selected.status}</em></article>}
                </div>
              </section>
            </div>
            <footer className="transactionDetailsFooter">
              <button type="button" className="transactionReceiptButton" onClick={() => downloadReceipt(selected)}><Download size={18} />Download receipt</button>
              <button type="button" className="primaryButton" onClick={() => setSelected(null)}>Close</button>
            </footer>
          </section>
        </div>
      )}
    </section>
  );
}
function SellerWalletTransactions() {
  return (
    <section className="sellerWalletPage sellerWalletTransactionsPage">
      <div className="sellerWalletHeading">
        <div>
          <span>Dashboard　›　Wallet　›　Transactions</span>
          <h2>Wallet Request Transactions</h2>
          <p>Review settlement credits, wallet deductions, and withdrawal request statuses.</p>
        </div>
        <button
          className="inlineButton"
          type="button"
          onClick={() => window.dispatchEvent(new CustomEvent("seller-dashboard-navigate", { detail: "wallet" }))}
        >
          ← Back to Wallet
        </button>
      </div>
      <SellerTransactionHistory fullPage />
    </section>
  );
}
function SellerPayouts({ payouts = [] }) {
  const total = payouts.reduce(
    (sum, payout) => sum + Number(payout.netAmount || 0),
    0,
  );
  return (
    <section className="sellerPayoutsPage contentStack">
      <div className="sellerKycHeading">
        <div>
          <span className="eyebrow">Wallet settlements</span>
          <h2>Payouts</h2>
          <p>Order-wise settlement amounts credited to your seller wallet.</p>
        </div>
        <strong className="sellerPayoutTotal">Total {money(total)}</strong>
      </div>
      <div className="panel tableWrap sellerPayoutTable">
        <table>
          <thead>
            <tr>
              <th>Date</th>
              <th>Order</th>
              <th>Product</th>
              <th>Gross Amount</th>
              <th>Deductions</th>
              <th>Settlement Amount</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            {payouts.map((payout) => {
              const deductions =
                Number(payout.commissionAmount || 0) +
                Number(payout.paymentGatewayFee || 0) +
                Number(payout.paymentGatewayGst || 0) +
                Number(payout.shippingDeduction ?? (payout.shippingPaidBy === "seller" ? payout.shippingCharge : 0)) +
                Number(payout.gstOnCommission || 0) +
                Number(payout.codCharge || 0) +
                Number(payout.returnRtoCharge || 0);
              return (
                <tr key={payout._id}>
                  <td>
                    {transactionDate(payout.settledAt || payout.createdAt)}
                  </td>
                  <td>
                    <strong>{payout.order?.orderNumber || "—"}</strong>
                  </td>
                  <td>
                    {payout.product?.name || "—"}
                    <br />
                    <small>{payout.product?.sku || ""}</small>
                  </td>
                  <td>{money(payout.grossAmount)}</td>
                  <td className="debit">− {money(deductions)}</td>
                  <td className="credit">
                    <strong>{money(payout.netAmount)}</strong>
                  </td>
                  <td>
                    <span
                      className={`walletTransactionStatus ${payout.settledAt ? "completed" : "pending"}`}
                    >
                      {payout.settledAt ? "Completed" : "Pending"}
                    </span>
                  </td>
                </tr>
              );
            })}
            {!payouts.length && (
              <tr>
                <td colSpan="7">No settlement payouts are available yet.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </section>
  );
}

function SellerWallet({ wallet, withdrawals, requestWithdrawal }) {
  if (activeSellerPortalScreen === "payouts")
    return <SellerPayouts payouts={wallet.payouts || []} />;
  const [amount, setAmount] = useState("");
  const [withdrawChallenge, setWithdrawChallenge] = useState("");
  const [withdrawOtp, setWithdrawOtp] = useState("");
  const [withdrawStatus, setWithdrawStatus] = useState("");
  const [withdrawBusy, setWithdrawBusy] = useState(false);
  const [withdrawOpen, setWithdrawOpen] = useState(false);
  const payouts = wallet.payouts || [];
  const requests = withdrawals || [];
  const pendingBalance = requests
    .filter((item) => ["pending", "approved"].includes(item.status))
    .reduce((sum, item) => sum + Number(item.amount || 0), 0);
  const totalCommission = payouts.reduce(
    (sum, item) => sum + Number(item.commissionAmount || 0),
    0,
  );
  const totalEarnings = payouts.reduce(
    (sum, item) => sum + Number(item.netAmount || 0),
    0,
  );
  const transactions = [
    ...payouts.map((item) => ({
      id: `p-${item._id}`,
      date: item.createdAt,
      description:
        item.type === "referral_commission"
          ? `Referral Commission · ${item.order?.orderNumber || "Order"}`
          : `${item.order?.orderNumber || "Order"} · ${item.product?.name || "Product"} earnings`,
      type: "Credit",
      amount: item.netAmount,
      status: "Completed",
    })),
    ...requests.map((item) => ({
      id: `w-${item._id}`,
      date: item.createdAt,
      description: "Withdrawal to bank account",
      type: "Debit",
      amount: item.amount,
      status: item.status,
    })),
  ].sort((a, b) => new Date(b.date) - new Date(a.date));
  const submitWithdrawal = async (event) => {
    event.preventDefault();
    setWithdrawBusy(true);
    setWithdrawStatus("");
    try {
      if (!withdrawChallenge) {
        const result = await api.sellerWithdrawalOtp({
          amount: Number(amount),
        });
        setWithdrawChallenge(result.challengeId);
        setWithdrawStatus(result.message);
      } else {
        await api.sellerWithdrawalOtp({
          amount: Number(amount),
          challengeId: withdrawChallenge,
          otp: withdrawOtp,
        });
        await api.requestSellerWithdrawal(Number(amount), withdrawChallenge);
        setWithdrawStatus("Withdrawal request submitted successfully.");
        window.setTimeout(() => window.location.reload(), 700);
      }
    } catch (error) {
      setWithdrawStatus(error.message);
    } finally {
      setWithdrawBusy(false);
    }
  };
  const openWithdraw = () => setWithdrawOpen(true);
  const downloadStatement = () => {
    const rows = [
      ["Date", "Description", "Type", "Amount", "Status"],
      ...transactions.map((item) => [
        new Date(item.date).toLocaleString("en-IN"),
        item.description,
        item.type,
        item.amount,
        item.status,
      ]),
    ];
    const csv = rows
      .map((row) =>
        row
          .map((value) => `"${String(value ?? "").replaceAll('"', '""')}"`)
          .join(","),
      )
      .join("\n");
    const link = document.createElement("a");
    link.href = URL.createObjectURL(new Blob([csv], { type: "text/csv" }));
    link.download = "seller-wallet-statement.csv";
    link.click();
    URL.revokeObjectURL(link.href);
  };
  return (
    <section className="sellerWalletPage">
      <div className="sellerWalletHeading">
        <div>
          <span>Dashboard　›　Wallet</span>
          <h2>Seller Wallet</h2>
          <p>Manage your earnings, withdrawals and transactions</p>
        </div>
        <button
          className="sellerWithdrawButton"
          type="button"
          onClick={openWithdraw}
        >
          <BadgeIndianRupee size={18} /> Withdraw Now
        </button>
      </div>
      <div className="sellerWalletStats">
        <article className="purple">
          <WalletCards />
          <span>Total Balance</span>
          <strong>{money(wallet.walletBalance)}</strong>
          <small>Available in your wallet</small>
        </article>
        <article className="green">
          <BadgeIndianRupee />
          <span>Withdrawable Balance</span>
          <strong>{money(wallet.walletBalance)}</strong>
          <small>Available for withdrawal</small>
        </article>
        <article className="orange">
          <CircleDollarSign />
          <span>Total Commission</span>
          <strong>{money(totalCommission)}</strong>
          <small>All-time admin commission</small>
        </article>
        <article className="blue">
          <Bell />
          <span>Pending Balance</span>
          <strong>{money(pendingBalance)}</strong>
          <small>Processing withdrawal amount</small>
        </article>
      </div>
      <section className="sellerWalletOverview panel">
        <div className="sellerWalletSectionTitle">
          <h3>Wallet Overview</h3>
          <button type="button" onClick={downloadStatement}>
            View Statement
          </button>
        </div>
        <div className="sellerEarningsChart">
          <span>This Month Earnings</span>
          <strong>{money(totalEarnings)}</strong>
          <small>Completed product deliveries</small>
          <div className="sellerWalletChartScale">
            <i>800</i>
            <i>600</i>
            <i>400</i>
            <i>200</i>
            <i>0</i>
          </div>
          <svg
            viewBox="0 0 520 220"
            preserveAspectRatio="none"
            aria-label="Wallet earnings trend"
          >
            <defs>
              <linearGradient id="walletChartFill" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0" stopColor="#7c2ee8" stopOpacity=".3" />
                <stop offset="1" stopColor="#7c2ee8" stopOpacity=".02" />
              </linearGradient>
            </defs>
            <path
              className="fill"
              d="M15 190 C75 150 85 115 145 125 S225 80 285 92 S390 110 505 36 L505 215 L15 215Z"
            />
            <path
              className="line"
              d="M15 190 C75 150 85 115 145 125 S225 80 285 92 S390 110 505 36"
            />
          </svg>
          <div className="sellerWalletChartLabels">
            <span>01 May</span>
            <span>08 May</span>
            <span>15 May</span>
            <span>22 May</span>
            <span>31 May</span>
          </div>
        </div>
        <div className="sellerWalletRight">
          <div className="sellerWithdrawPromo">
            <div>
              <h3>Withdraw Money</h3>
              <p>Transfer your earnings to your bank account securely.</p>
              <button type="button" onClick={openWithdraw}>
                Withdraw Now →
              </button>
            </div>
            <WalletCards />
          </div>
          <div className="sellerAccountTitle">
            <h3>Account Details</h3>
            <button
              type="button"
              onClick={() =>
                window.dispatchEvent(
                  new CustomEvent("seller-dashboard-navigate", {
                    detail: "bank",
                  }),
                )
              }
            >
              Change Account
            </button>
          </div>
          <div className="sellerBankSummary">
            <Building2 />
            <div>
              <strong>
                {wallet.bankDetails?.bankName || "Bank details not added"}
              </strong>
              <span>
                {wallet.bankDetails?.accountNumber
                  ? `A/C No. · ${wallet.bankDetails.accountType || ""} ·•••• ${wallet.bankDetails.accountNumber.slice(-4)}`
                  : "Add an account to withdraw funds"}
              </span>
              <small>
                {wallet.bankDetails?.ifsc
                  ? `IFSC · ${wallet.bankDetails.ifsc}`
                  : ""}
              </small>
            </div>
            {wallet.bankDetails?.accountNumber && <em>✓ Verified</em>}
          </div>
        </div>
      </section>
      <SellerTransactionHistory />
      <div className="sellerWalletBottom">
        <section className="panel">
          <h3>Quick Actions</h3>
          <button type="button" onClick={openWithdraw}>
            <BadgeIndianRupee />
            <span>
              <strong>Withdraw Money</strong>
              <small>Transfer your balance to bank account</small>
            </span>
            →
          </button>
          <button
            type="button"
            onClick={() =>
              window.dispatchEvent(
                new CustomEvent("seller-dashboard-navigate", {
                  detail: "transactions",
                }),
              )
            }
          >
            <WalletCards />
            <span>
              <strong>Transaction History</strong>
              <small>View all your wallet transactions</small>
            </span>
            →
          </button>
          <button type="button" onClick={downloadStatement}>
            <FileCheck2 />
            <span>
              <strong>Download Statement</strong>
              <small>Download your wallet statement</small>
            </span>
            →
          </button>
        </section>
        <section className="panel sellerWalletInfo">
          <ShieldCheck />
          <h3>Important Information</h3>
          <p>◉ Complete your bank details before requesting a withdrawal.</p>
          <p>◉ Withdrawals are processed by the admin after approval.</p>
          <p>◉ Rejected requests are automatically returned to your wallet.</p>
          <p>◉ Contact support for any wallet-related issues.</p>
        </section>
      </div>
      {withdrawOpen && (
        <div
          className="modalOverlay"
          role="dialog"
          aria-modal="true"
          aria-label="Request wallet withdrawal"
        >
          <form className="sellerWithdrawModal" onSubmit={submitWithdrawal}>
            <div className="panelHeader">
              <div>
                <span className="eyebrow">Email confirmation</span>
                <h2>Withdraw Money</h2>
              </div>
              <button
                type="button"
                className="inlineButton"
                onClick={() => setWithdrawOpen(false)}
              >
                Close
              </button>
            </div>
            <p>
              Available balance: <strong>{money(wallet.walletBalance)}</strong>
            </p>
            <label>
              Withdrawal amount
              <input
                autoFocus
                type="number"
                min="0.01"
                max={wallet.walletBalance || 0}
                step="0.01"
                required
                disabled={Boolean(withdrawChallenge)}
                value={amount}
                onChange={(event) => setAmount(event.target.value)}
                placeholder="Enter amount"
              />
            </label>
            {withdrawChallenge && (
              <label>
                6-digit email OTP
                <input
                  autoFocus
                  inputMode="numeric"
                  pattern="\d{6}"
                  maxLength="6"
                  required
                  value={withdrawOtp}
                  onChange={(event) =>
                    setWithdrawOtp(
                      event.target.value.replace(/\D/g, "").slice(0, 6),
                    )
                  }
                />
              </label>
            )}
            {withdrawStatus && (
              <p className="accountNotice">{withdrawStatus}</p>
            )}
            <button
              className="sellerWithdrawButton"
              disabled={
                withdrawBusy ||
                !amount ||
                Number(amount) > Number(wallet.walletBalance || 0) ||
                (withdrawChallenge && withdrawOtp.length !== 6)
              }
            >
              {withdrawBusy
                ? "Please wait…"
                : withdrawChallenge
                  ? "Verify OTP & Submit Request"
                  : "Send Email OTP"}
            </button>
          </form>
        </div>
      )}
    </section>
  );
}
function SellerReviewsSummary() {
  return (
    <section className="sellerReviewsPage">
      <div className="sellerKycHeading">
        <div>
          <span className="eyebrow">Store reputation</span>
          <h2>Reviews &amp; Ratings</h2>
          <p>Customer reviews for your products will appear here.</p>
        </div>
        <span className="status pending">No reviews yet</span>
      </div>
      <div className="panel sellerReviewsEmpty">
        <Star size={42} />
        <h3>Build your store rating</h3>
        <p>
          Ratings and customer feedback will be shown after customers review
          delivered products.
        </p>
      </div>
    </section>
  );
}

function SellerKyc({ seller, save }) {
  const [files, setFiles] = useState({});
  const [previews, setPreviews] = useState({});
  const [progress, setProgress] = useState({});
  const [feedback, setFeedback] = useState({});
  const [previewDocument, setPreviewDocument] = useState(null);
  const docs = [
    ["pan", "PAN Card"],
    ["addressProof", "Address Proof"],
    ["aadharFront", "Owner / Company Aadhar Card (Front)"],
    ["aadharBack", "Owner / Company Aadhar Card (Back)"],
    ["cancelledCheque", "Cancelled Cheque"],
    ...(seller.isGstRegistered ? [["gstCertificate", "GST Certificate"]] : []),
  ];
  const sellerLocked = seller.approvalStatus === "approved";
  const choose = (type, file) => {
    if (!file) return;
    if (!file.type.startsWith("image/") && file.type !== "application/pdf") {
      setFeedback((current) => ({
        ...current,
        [type]: "Only image or PDF files are supported.",
      }));
      return;
    }
    if (previews[type]?.startsWith("blob:"))
      URL.revokeObjectURL(previews[type]);
    setFiles((current) => ({ ...current, [type]: file }));
    setPreviews((current) => ({
      ...current,
      [type]:
        file.type === "application/pdf" ? "pdf" : URL.createObjectURL(file),
    }));
    setFeedback((current) => ({ ...current, [type]: "" }));
  };
  return (
    <section className="sellerKycPage">
      <div className="sellerKycHeading">
        <div>
          <span className="eyebrow">Account verification</span>
          <h2>KYC Verification</h2>
          <p>
            Upload and manage the documents required to verify your seller
            account.
          </p>
        </div>
        <span className={`status ${sellerLocked ? "approved" : "pending"}`}>
          {sellerLocked ? "Seller verified" : "Verification pending"}
        </span>
      </div>
      {sellerLocked && (
        <div className="accountNotice">
          <ShieldCheck size={18} /> All required documents are approved and your
          seller KYC is locked.
        </div>
      )}
      <div className="cardGrid partnerKycGrid sellerPartnerKycGrid">
        {docs.map(([type, title]) => {
          const doc = seller.kyc?.[type] || {};
          const locked =
            sellerLocked || ["pending", "approved"].includes(doc.status);
          const selected = previews[type];
          return (
            <form
              className="panel partnerKycCard"
              key={type}
              onSubmit={async (event) => {
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
                  setFeedback((current) => ({
                    ...current,
                    [type]: `${title} uploaded successfully and submitted for verification.`,
                  }));
                  setFiles((current) => {
                    const next = { ...current };
                    delete next[type];
                    return next;
                  });
                  setPreviews((current) => {
                    const next = { ...current };
                    if (next[type]?.startsWith("blob:"))
                      URL.revokeObjectURL(next[type]);
                    delete next[type];
                    return next;
                  });
                } catch (error) {
                  setProgress((current) => ({ ...current, [type]: 0 }));
                  setFeedback((current) => ({
                    ...current,
                    [type]: error.message || `Unable to upload ${title}.`,
                  }));
                }
              }}
            >
              <div className="panelHeader">
                <h3>{title}</h3>
                <span className={`status ${doc.status || "not_submitted"}`}>
                  {(doc.status || "not_submitted").replaceAll("_", " ")}
                </span>
              </div>
              {doc.rejectionReason && (
                <p className="errorText">Rejected: {doc.rejectionReason}</p>
              )}
              {feedback[type] && (
                <p
                  className={
                    progress[type] === 100 ? "accountNotice" : "errorText"
                  }
                  role="status"
                >
                  {feedback[type]}
                </p>
              )}
              {doc.file && (
                <button
                  className="partnerKycExistingDocument"
                  type="button"
                  onClick={() => setPreviewDocument({ url: doc.file, title })}
                >
                  {String(doc.file).toLowerCase().includes(".pdf") ? (
                    <span>PDF</span>
                  ) : (
                    <img src={doc.file} alt={title} />
                  )}
                  <small>View submitted document</small>
                </button>
              )}
              {doc.reviewedAt && (
                <div className="kycReviewHistory">
                  <strong>Review history</strong>
                  <p>
                    <span className={`status ${doc.status}`}>{doc.status}</span>
                    {doc.rejectionReason ||
                      (doc.status === "approved"
                        ? "Document approved"
                        : "Document reviewed")}
                    <small>
                      {new Date(doc.reviewedAt).toLocaleString("en-IN")}
                    </small>
                  </p>
                </div>
              )}
              {!locked && (
                <label className="partnerKycUploadBox">
                  <ImagePlus size={28} />
                  <strong>
                    {doc.status === "rejected"
                      ? `Upload corrected ${title}`
                      : `Upload ${title}`}
                  </strong>
                  <span>Image or PDF · secure document upload</span>
                  <input
                    name="file"
                    type="file"
                    accept="image/*,.pdf"
                    required
                    onChange={(event) => choose(type, event.target.files?.[0])}
                  />
                  {selected === "pdf" ? (
                    <span className="sellerSelectedPdf">PDF selected</span>
                  ) : (
                    selected && <img src={selected} alt={`Selected ${title}`} />
                  )}
                </label>
              )}
              {locked && (
                <p className="mutedText">
                  {doc.status === "approved"
                    ? "Verified and approved by the administrator."
                    : "Uploaded successfully and awaiting admin verification."}
                </p>
              )}
              {!locked && (
                <>
                  <button
                    className="primaryButton"
                    disabled={progress[type] > 0 && progress[type] < 100}
                  >
                    {progress[type] > 0 && progress[type] < 100
                      ? "Uploading document…"
                      : doc.status === "rejected"
                        ? "Submit corrected document"
                        : "Submit for verification"}
                  </button>
                  {progress[type] > 0 && (
                    <div className="partnerKycProgress">
                      <div>
                        <span>
                          {progress[type] < 90
                            ? "Uploading document…"
                            : "Submitting for verification…"}
                        </span>
                        <strong>{progress[type]}%</strong>
                      </div>
                      <progress max="100" value={progress[type]} />
                    </div>
                  )}
                </>
              )}
            </form>
          );
        })}
      </div>
      {previewDocument && (
        <DocumentPreviewModal
          document={previewDocument}
          onClose={() => setPreviewDocument(null)}
        />
      )}
    </section>
  );
}
function SellerBank({ seller, save }) {
  const locked = Boolean(seller.bankDetails?.verifiedAt);
  const [form, setForm] = useState({
    ...(seller.bankDetails || {}),
    confirmAccountNumber: seller.bankDetails?.accountNumber || "",
  });
  const [lookupStatus, setLookupStatus] = useState("");
  const [challengeId, setChallengeId] = useState("");
  const [otp, setOtp] = useState("");
  const [busy, setBusy] = useState(false);
  const lookup = async (value) => {
    const ifsc = value.toUpperCase().replace(/\s/g, "").slice(0, 11);
    setForm((current) => ({ ...current, ifsc, bankName: "", branch: "" }));
    if (ifsc.length !== 11) return;
    setLookupStatus("Finding bank and branch…");
    try {
      const bank = await api.sellerLookupIfsc(ifsc);
      setForm((current) => ({
        ...current,
        ifsc: bank.ifsc,
        bankName: bank.bankName,
        branch: bank.branch,
      }));
      setLookupStatus("");
    } catch (error) {
      setLookupStatus(error.message);
    }
  };
  const numbersMatch =
    Boolean(form.accountNumber) &&
    form.accountNumber === form.confirmAccountNumber;
  return (
    <form
      className="panel formGrid twoColumn sellerBankForm"
      onSubmit={async (event) => {
        event.preventDefault();
        if (!numbersMatch) return;
        setBusy(true);
        setLookupStatus("");
        try {
          if (!challengeId) {
            const result = await api.sellerBankOtp(form);
            setChallengeId(result.challengeId);
            setLookupStatus(result.message);
          } else await save({ challengeId, otp });
        } catch (error) {
          setLookupStatus(error.message);
        } finally {
          setBusy(false);
        }
      }}
    >
      {locked && (
        <div className="notice full">
          Bank details verified by email OTP and locked.
        </div>
      )}
      <label>
        Account holder name
        <input
          required
          disabled={locked}
          value={form.accountHolderName || ""}
          onChange={(event) =>
            setForm({ ...form, accountHolderName: event.target.value })
          }
        />
      </label>
      <label>
        Account type
        <select
          required
          disabled={locked}
          value={form.accountType || ""}
          onChange={(event) =>
            setForm({ ...form, accountType: event.target.value })
          }
        >
          <option value="">Select account type</option>
          <option value="current">Current account</option>
          <option value="savings">Savings account</option>
        </select>
      </label>
      <label>
        IFSC code
        <input
          required
          disabled={locked}
          minLength="11"
          maxLength="11"
          value={form.ifsc || ""}
          onChange={(event) => lookup(event.target.value)}
          placeholder="Example: HDFC0001234"
        />
      </label>
      <label>
        Bank name
        <input
          readOnly
          required
          value={form.bankName || ""}
          placeholder="Filled from IFSC"
        />
      </label>
      <label>
        Branch
        <input
          readOnly
          required
          value={form.branch || ""}
          placeholder="Filled from IFSC"
        />
      </label>
      <label>
        Account number
        <input
          required
          disabled={locked}
          inputMode="numeric"
          value={form.accountNumber || ""}
          onChange={(event) =>
            setForm({
              ...form,
              accountNumber: event.target.value.replace(/\D/g, ""),
            })
          }
        />
      </label>
      <label>
        Confirm account number
        <input
          required
          disabled={locked}
          inputMode="numeric"
          value={form.confirmAccountNumber || ""}
          onChange={(event) =>
            setForm({
              ...form,
              confirmAccountNumber: event.target.value.replace(/\D/g, ""),
            })
          }
        />
      </label>
      {challengeId && (
        <label className="full">
          6-digit OTP sent to {seller.email}
          <input
            autoFocus
            required
            inputMode="numeric"
            pattern="\d{6}"
            maxLength="6"
            value={otp}
            onChange={(event) =>
              setOtp(event.target.value.replace(/\D/g, "").slice(0, 6))
            }
          />
        </label>
      )}
      {lookupStatus && <p className="accountNotice full">{lookupStatus}</p>}
      {form.confirmAccountNumber && !numbersMatch && (
        <p className="errorText full">Account numbers do not match.</p>
      )}
      {!locked && (
        <button
          className="primaryButton"
          disabled={
            busy ||
            !numbersMatch ||
            !form.bankName ||
            !form.branch ||
            (challengeId && otp.length !== 6)
          }
        >
          {busy
            ? "Please wait…"
            : challengeId
              ? "Verify OTP & Save Bank Details"
              : "Send Email OTP"}
        </button>
      )}
    </form>
  );
}
function SellerPassword({ save }) {
  const [form, setForm] = useState({
    currentPassword: "",
    newPassword: "",
    confirmPassword: "",
  });
  return (
    <form
      className="panel formGrid"
      onSubmit={(event) => {
        event.preventDefault();
        if (form.newPassword === form.confirmPassword)
          save({
            currentPassword: form.currentPassword,
            newPassword: form.newPassword,
          });
      }}
    >
      <label>
        Current password
        <input
          type="password"
          required
          value={form.currentPassword}
          onChange={(event) =>
            setForm({ ...form, currentPassword: event.target.value })
          }
        />
      </label>
      <label>
        New 4-digit password
        <input
          type="password"
          inputMode="numeric"
          pattern="\d{4}"
          required
          value={form.newPassword}
          onChange={(event) =>
            setForm({
              ...form,
              newPassword: event.target.value.replace(/\D/g, "").slice(0, 4),
            })
          }
        />
      </label>
      <label>
        Confirm password
        <input
          type="password"
          inputMode="numeric"
          pattern="\d{4}"
          required
          value={form.confirmPassword}
          onChange={(event) =>
            setForm({
              ...form,
              confirmPassword: event.target.value
                .replace(/\D/g, "")
                .slice(0, 4),
            })
          }
        />
      </label>
      {form.confirmPassword && form.newPassword !== form.confirmPassword && (
        <span className="errorText">Passwords do not match.</span>
      )}
      <button
        className="primaryButton"
        disabled={form.newPassword !== form.confirmPassword}
      >
        Change password
      </button>
    </form>
  );
}
