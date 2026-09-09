import { useState, useEffect } from "react";
import { api, customerAuthStore } from "../services/api.js";
import { resellerViewFromHash, resellerLocationRoute, initialForm, resellerRoutes, strongPasswordPattern } from "../components/reseller/portalUtils.js";
import { Home, ShoppingBag, Share2, ShoppingCart, RotateCcw, PackageCheck, WalletCards, Gift, TrendingUp, Tag, Heart, BarChart3, Bell, CircleHelp, User, Settings, IndianRupee, Megaphone } from "lucide-react";
import {  } from "../styles/reseller-dashboard.css";
import ResellerQuickRegistration from "../components/reseller/ResellerQuickRegistration.jsx";
import ResellerLogin from "../components/reseller/ResellerLogin.jsx";
import ResellerRegistration from "../components/reseller/ResellerRegistration.jsx";
import ResellerSidebar from "../components/reseller/ResellerSidebar.jsx";
import ResellerTopbar from "../components/reseller/ResellerTopbar.jsx";
import DashboardOverview from "../components/reseller/DashboardOverview.jsx";
import ResellerCatalog from "../components/reseller/ResellerCatalog.jsx";
import ResellerMarginFlow from "../components/reseller/ResellerMarginFlow.jsx";
import ResellerLinks from "../components/reseller/ResellerLinks.jsx";
import ResellerOrders from "../components/reseller/ResellerOrders.jsx";
import ResellerInsights from "../components/reseller/ResellerInsights.jsx";
import ResellerSupport from "../components/reseller/ResellerSupport.jsx";
import ResellerExtras from "../components/reseller/ResellerExtras.jsx";
import ResellerWalletPage from "../components/reseller/ResellerWalletPage.jsx";
import ResellerPayoutPage from "../components/reseller/ResellerPayoutPage.jsx";
import ResellerBankProfile from "../components/reseller/ResellerBankProfile.jsx";
export default function ResellerPortal({ onBack }) {
  const [branding, setBranding] = useState({});
  useEffect(() => { api.storefront().then(data => setBranding(data.settings || {})).catch(() => { }); }, []);
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
  if (loading) return <main className="resellerAccessPage" ><span className="storefrontLoadingSpinner" /><p>Loading reseller workspace…</p></main>;
  if (!customerAuthStore.token && registrationRoute) return <ResellerQuickRegistration setPortalRoute={setPortalRoute} branding={branding} status={status} submitQuickRegistration={submitQuickRegistration} quickForm={quickForm} setQuickForm={setQuickForm} showAccessPassword={showAccessPassword} setShowAccessPassword={setShowAccessPassword} setQuickGstVerification={setQuickGstVerification} quickGstVerification={quickGstVerification} verifyQuickGstin={verifyQuickGstin} quickCertificate={quickCertificate} setQuickCertificate={setQuickCertificate} accessBusy={accessBusy} />;
  if (!customerAuthStore.token) return <ResellerLogin onBack={onBack} accessMode={accessMode} status={status} submitAccess={submitAccess} accessForm={accessForm} setAccessForm={setAccessForm} showAccessPassword={showAccessPassword} setShowAccessPassword={setShowAccessPassword} accessBusy={accessBusy} setPortalRoute={setPortalRoute} setStatus={setStatus} />;
  if (!account) return <ResellerRegistration onBack={onBack} status={status} register={register} form={form} setForm={setForm} requestOtp={requestOtp} setAccount={setAccount} setPortalRoute={setPortalRoute} />;
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
    {menuOpen && <button className="resellerMenuBackdrop" aria-label="Close navigation" onClick={() => setMenuOpen(false)} />}
    <ResellerSidebar menuOpen={menuOpen} setMenuOpen={setMenuOpen} branding={branding} navItems={navItems} view={view} openAddFlow={openAddFlow} setView={setView} orders={orders} onBack={onBack} logout={logout} />
    <section className="resellerWorkspaceBody" inert={menuOpen ? true : undefined}>
      <ResellerTopbar menuOpen={menuOpen} setMenuOpen={setMenuOpen} view={view} account={account} title={title} setView={setView} logout={logout} />
      <div className="resellerWorkspaceContent">
        {status && <p className="resellerWorkspaceNotice" role="status">{status}</p>}
        {view === "dashboard" && <DashboardOverview account={account} dashboard={dashboard} orders={orders} wallet={wallet} withdrawals={withdrawals} products={products} links={links} navigate={setView} />}
        {view === "products" && <ResellerCatalog openAddFlow={openAddFlow} catalogLinks={catalogLinks} products={products} setSelectedProduct={setSelectedProduct} setMargins={setMargins} margins={margins} setAddStep={setAddStep} setView={setView} setCreatedLink={setCreatedLink} />}
        {view === "add" && <ResellerMarginFlow title={title} addStep={addStep} products={products} selectMarginProduct={selectMarginProduct} selectedProduct={selectedProduct} chosenBase={chosenBase} setMargins={setMargins} margins={margins} chosenMargin={chosenMargin} setAddStep={setAddStep} generate={generate} createdLink={createdLink} sellingUrl={sellingUrl} copy={copy} setStatus={setStatus} setView={setView} />}
        {view === "links" && <ResellerLinks openAddFlow={openAddFlow} links={links} copy={copy} />}
        {["orders", "returns"].includes(view) && <ResellerOrders key={view} orders={orders} returnsOnly={view === "returns"} onSupport={() => setView("support")} />}
        {["performance", "reports"].includes(view) && <ResellerInsights orders={orders} links={links} reports={view === "reports"} />}
        {view === "support" && <ResellerSupport />}
        {["referrals", "offers", "wishlist", "notifications", "settings", "marketing"].includes(view) && <ResellerExtras key={`${account._id}-${view}`} view={view} account={account} products={products} orders={orders} withdrawals={withdrawals} links={links} navigate={setView} onSelect={product => { selectMarginProduct(product); setView("add") }} copy={copy} />}
        {view === "earnings" && <ResellerWalletPage wallet={wallet} />}
        {view === "payouts" && <ResellerPayoutPage wallet={wallet} withdrawals={withdrawals} onChanged={load} setStatus={setStatus} onProfile={() => setView("profile")} />}
        {view === "profile" && <ResellerBankProfile account={account} onSaved={(updated) => { setAccount(updated); load(); }} setStatus={setStatus} />}
      </div>
    </section>
  </main>;
}
