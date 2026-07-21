import { useEffect, useMemo, useRef, useState } from "react";
import { AlertTriangle, Bold, CheckCircle2, FileText, GripVertical, ImagePlus, Italic, Link, List, LogOut, Menu, MessageSquareText, PackageSearch, Plus, Printer, RefreshCw, Save, Search, Settings, Trash2, Truck } from "lucide-react";
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import DataTable from "./components/DataTable.jsx";
import LoginScreen from "./components/LoginScreen.jsx";
import Sidebar from "./components/Sidebar.jsx";
import StatCard from "./components/StatCard.jsx";
import ProductCreatePage from "./pages/ProductCreatePage.jsx";
import StorefrontPage from "./pages/StorefrontPage.jsx";
import PartnerPortal from "./pages/PartnerPortal.jsx";
import PartnerAdminPage from "./pages/PartnerAdminPage.jsx";
import { FooterAdminPage, PageEditorPage, PagesAdminPage } from "./pages/PagesAdminPage.jsx";
import SellerPortal from "./pages/SellerPortal.jsx";
import SellerAdminPage from "./pages/SellerAdminPage.jsx";
import BannerAdminPage from "./pages/BannerAdminPage.jsx";
import SellerProductsAdminPage from "./pages/SellerProductsAdminPage.jsx";
import CategoryTreeSelect from "./components/CategoryTreeSelect.jsx";
import { api, authStore } from "./services/api.js";
import { optimizeImage } from "./utils/imageOptimizer.js";
import GstPricePreview from "./components/GstPricePreview.jsx";

const money = (value) =>
  new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 2 }).format(value || 0);

const sectionLocations = [
  ["home_before_new_arrivals", "Home before New Arrivals"],
  ["home_after_blog", "Home after Blog"],
  ["product_detail_below_details", "Product details below details"],
  ["products_top_right", "All products top right"]
];

const adminSectionIds = new Set(["analytics", "catalog", "add-product", "edit-product", "categories", "category-editor", "tax-categories", "tax-editor", "orders", "customers", "partners", "partner-details", "sellers", "seller-products", "banners", "blog", "blog-create", "pages", "page-editor", "footer", "marketing", "team", "settings"]);
const emptyAdminState = {
  metrics: { revenue: 0, averageOrderValue: 0, conversionRate: 0, orderCount: 0, customersCount: 0, partnersCount: 0, ecommerceSales: 0, ecommerceProfit: 0, statusCounts: {}, topProducts: [], lowStockProducts: [] },
  products: [], orders: [], customers: [], promotions: [], users: [], categories: [], taxCategories: [], paymentMethods: [], shippingRules: [], storefrontSettings: {}, shipRocketSettings: {}, pendingItems: [], blogCategories: [], blogPosts: []
};

const currentClientRoute = () => {
  if (window.location.hash) return window.location.hash;
  const pathname = window.location.pathname.replace(/\/+$/, "") || "/";
  return pathname === "/" ? "#/" : `#${pathname}${window.location.search}`;
};

const adminSectionFromHash = () => {
  const match = currentClientRoute().match(/^#\/admin\/([^/?]+)/);
  return match && adminSectionIds.has(match[1]) ? match[1] : "";
};

const escapeHtml = (value = "") =>
  String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");

const printHtml = (title, body) => {
  const frame = document.createElement("iframe");
  frame.style.position = "fixed";
  frame.style.right = "0";
  frame.style.bottom = "0";
  frame.style.width = "0";
  frame.style.height = "0";
  frame.style.border = "0";
  document.body.appendChild(frame);
  const doc = frame.contentWindow.document;
  doc.open();
  doc.write(`<!doctype html><html><head><title>${escapeHtml(title)}</title><style>
    body{font-family:Inter,Arial,sans-serif;color:#17211d;margin:0;padding:32px}
    .top{display:flex;justify-content:space-between;gap:24px;border-bottom:2px solid #17211d;padding-bottom:18px;margin-bottom:22px}
    img.logo{max-width:140px;max-height:72px;object-fit:contain}
    h1,h2,h3,p{margin:0} h1{font-size:28px} h2{font-size:18px;margin-bottom:10px}
    .muted{color:#68746e;line-height:1.5}.grid{display:grid;grid-template-columns:1fr 1fr;gap:18px;margin-bottom:22px}
    table{width:100%;border-collapse:collapse;margin-top:12px} th,td{border-bottom:1px solid #dfe5e1;padding:10px;text-align:left}
    th{font-size:12px;text-transform:uppercase;color:#68746e}.totals{margin-left:auto;width:320px;margin-top:18px}
    .totals div{display:flex;justify-content:space-between;padding:8px 0;border-bottom:1px solid #dfe5e1}.strong{font-weight:800}
    @media print{button{display:none} body{padding:18px}}
  </style></head><body>${body}</body></html>`);
  doc.close();
  window.setTimeout(() => {
    frame.contentWindow.focus();
    frame.contentWindow.print();
    window.setTimeout(() => frame.remove(), 1000);
  }, 150);
};

const printInvoice = (order) => {
  const store = order.invoiceStore || {};
  const rows = (order.items || [])
    .map(
      (item) => `<tr><td>${escapeHtml(item.name)}</td><td>${escapeHtml(item.sku)}</td><td>${item.quantity}</td><td>${money(item.taxableValue || item.price - (item.gstAmount || 0))}</td><td>${item.gstRate || 0}%</td><td>${money((item.gstAmount || 0) * item.quantity)}</td><td>${money(item.price * item.quantity)}</td></tr>`
    )
    .join("");
  printHtml(
    `Invoice ${order.invoiceNumber || order.orderNumber}`,
    `<section class="top">
      <div>
        ${store.logoUrl ? `<img class="logo" src="${escapeHtml(store.logoUrl)}" alt="">` : ""}
        <h1>${escapeHtml(store.shopName || "Store Invoice")}</h1>
        <p class="muted">${escapeHtml(store.address || "")}<br>${escapeHtml([store.email, store.phone].filter(Boolean).join(" / "))}</p>
      </div>
      <div>
        <h2>Tax Invoice</h2>
        <p><span class="strong">Invoice:</span> ${escapeHtml(order.invoiceNumber || "")}</p>
        <p><span class="strong">Order:</span> ${escapeHtml(order.orderNumber)}</p>
        <p><span class="strong">Date:</span> ${new Date(order.invoiceGeneratedAt || Date.now()).toLocaleDateString("en-IN")}</p>
      </div>
    </section>
    <section class="grid">
      <div><h2>Bill To</h2><p class="muted">${escapeHtml(order.customer?.name || order.address?.name || "Customer")}<br>${escapeHtml(order.customer?.email || order.address?.email || "")}</p></div>
      <div><h2>Ship To</h2><p class="muted">${escapeHtml(order.address?.shippingAddress || order.address?.billingAddress || "")}<br>${escapeHtml(order.address?.postalCode || "")}</p></div>
    </section>
    <table><thead><tr><th>Item</th><th>SKU</th><th>Qty</th><th>Taxable value</th><th>GST rate</th><th>GST collected</th><th>GST-inclusive total</th></tr></thead><tbody>${rows}</tbody></table>
    <section class="totals">
      <div><span>Taxable subtotal</span><strong>${money(order.subtotal)}</strong></div>
      <div><span>Shipping</span><strong>${money(order.shippingTotal)}</strong></div>
      <div><span>GST collected</span><strong>${money(order.taxTotal)}</strong></div>
      <div><span>Total</span><strong>${money(order.grandTotal)}</strong></div>
    </section>`
  );
};

const printPendingItems = (items) => {
  const rows = items
    .map((item) => `<tr><td>${escapeHtml(item.sku)}</td><td>${escapeHtml(item.name)}</td><td>${item.quantity}</td><td>${item.orderCount}</td><td>${escapeHtml(item.orderNumbers?.join(", ") || "")}</td></tr>`)
    .join("");
  printHtml(
    "Pending Items",
    `<section class="top"><div><h1>Pending Item Grouping</h1><p class="muted">Items required for pending and processing orders.</p></div><div><p>${new Date().toLocaleString("en-IN")}</p></div></section>
    <table><thead><tr><th>SKU</th><th>Item</th><th>Qty Required</th><th>Orders</th><th>Order Numbers</th></tr></thead><tbody>${rows}</tbody></table>`
  );
};

export default function App() {
  const [active, setActive] = useState(() => adminSectionFromHash() || "analytics");
  const [view, setView] = useState(authStore.token ? "admin" : "storefront");
  const [token, setToken] = useState(authStore.token);
  const [currentUser, setCurrentUser] = useState(authStore.user);
  const [storefront, setStorefront] = useState({
    products: [],
    featuredProducts: [],
    categories: [],
    banner: {
      title: "Fresh arrivals for everyday living",
      imageUrl: "",
      linkUrl: "#products"
    },
    heroItems: [],
    contentSections: [],
    productBanners: [],
    productBannerColumns: 2,
    firstOrderDiscount: null,
    blogPosts: [],
    settings: {},
    paymentMethods: [],
    shippingRules: []
  });
  const [storefrontLoading, setStorefrontLoading] = useState(true);
  const [storefrontError, setStorefrontError] = useState("");
  const [message, setMessage] = useState("Sign in verified. Loading admin workspace.");
  const [loading, setLoading] = useState(false);
  const [authError, setAuthError] = useState("");
  const [loginForm, setLoginForm] = useState({ email: "admin@example.com", password: "password123" });
  const [promotionForm, setPromotionForm] = useState({ code: "", name: "", type: "percentage", audience: "all", value: 10, maxDiscountAmount: 0, minimumOrderValue: 0, startsAt: "", endsAt: "", isActive: true });
  const [userForm, setUserForm] = useState({ name: "", email: "", password: "", role: "Customer Support" });
  const [blogDraft, setBlogDraft] = useState(null);
  const [pageDraft, setPageDraft] = useState(null);
  const [partnerDetailsId, setPartnerDetailsId] = useState(null);
  const [productDraft, setProductDraft] = useState(null);
  const [categoryDraft, setCategoryDraft] = useState(null);
  const [taxDraft, setTaxDraft] = useState(null);
  const [query, setQuery] = useState("");
  const [state, setState] = useState(emptyAdminState);
  const [adminDataReady, setAdminDataReady] = useState(false);
  const [adminLoadError, setAdminLoadError] = useState("");
  const [partnerRoute, setPartnerRoute] = useState(() => currentClientRoute().startsWith("#/partner"));
  const [sellerRoute, setSellerRoute] = useState(() => /^#\/seller(?:\/|$)/.test(currentClientRoute()));
  const [adminMenuOpen, setAdminMenuOpen] = useState(false);

  const loadStorefront = async () => {
    setStorefrontLoading(true);
    setStorefrontError("");
    try {
      const data = await api.storefront();
      setStorefront({
        products: data.products || [],
        featuredProducts: data.featuredProducts || [],
        categories: data.categories || [],
        banner: data.banner || storefront.banner,
        heroItems: data.heroItems || [],
        contentSections: data.contentSections || [],
        productBanners: data.productBanners || [],
        productBannerColumns: data.productBannerColumns || 2,
        firstOrderDiscount: data.firstOrderDiscount || null,
        blogPosts: data.blogPosts || [],
        settings: data.settings || {},
        paymentMethods: data.paymentMethods || [],
        shippingRules: data.shippingRules || []
      });
    } catch (error) {
      setStorefrontError(error.message || "Unable to load the storefront.");
    } finally {
      setStorefrontLoading(false);
    }
  };

  const loadApiData = async () => {
    if (!authStore.token) {
      setState(emptyAdminState);
      setAdminDataReady(false);
      return;
    }
    setLoading(true);
    setAdminDataReady(false);
    setAdminLoadError("");
    try {
      const [metrics, products, orders, customers, promotions, users, categories, taxCategories, paymentMethods, shippingRules, storefrontSettings, shipRocketSettings, pendingItems, blogCategories, blogPosts] = await Promise.all([
        api.analytics(),
        api.products(),
        api.orders(),
        api.customers(),
        api.promotions().catch(() => state.promotions),
        api.users().catch(() => state.users),
        api.categories(),
        api.taxCategories(),
        api.paymentMethods().catch(() => []),
        api.shippingRules().catch(() => []),
        api.storefrontSettings().catch(() => ({})),
        api.shipRocketSettings().catch(() => ({})),
        api.pendingItems().catch(() => []),
        api.blogCategories().catch(() => []),
        api.blogPosts().catch(() => [])
      ]);
      setState({ metrics, products, orders, customers, promotions, users, categories, taxCategories, paymentMethods, shippingRules, storefrontSettings, shipRocketSettings, pendingItems, blogCategories, blogPosts });
      setAdminDataReady(true);
      setMessage("Live API data loaded.");
    } catch (error) {
      setMessage(error.message);
      setAdminLoadError(error.message);
      if (error.message.toLowerCase().includes("token") || error.message.toLowerCase().includes("auth")) {
        authStore.clear();
        setToken(null);
        setCurrentUser(null);
      }
    } finally {
      setLoading(false);
    }
  };

  const navigateAdmin = (section) => {
    setActive(section);
    const nextHash = `#/admin/${section}`;
    if (window.location.hash !== nextHash) window.location.hash = nextHash;
  };

  useEffect(() => {
    loadStorefront();
  }, []);

  useEffect(() => {
    document.title = state.storefrontSettings?.projectTitle || storefront.settings?.projectTitle || "E-commerce Admin";
  }, [state.storefrontSettings?.projectTitle, storefront.settings?.projectTitle]);

  useEffect(() => {
    const sync = () => setPartnerRoute(currentClientRoute().startsWith("#/partner"));
    window.addEventListener("hashchange", sync);
    window.addEventListener("popstate", sync);
    return () => { window.removeEventListener("hashchange", sync); window.removeEventListener("popstate", sync); };
  }, []);
  useEffect(() => {
    const sync = () => setSellerRoute(/^#\/seller(?:\/|$)/.test(currentClientRoute()));
    window.addEventListener("hashchange", sync);
    window.addEventListener("popstate", sync);
    return () => { window.removeEventListener("hashchange", sync); window.removeEventListener("popstate", sync); };
  }, []);

  useEffect(() => {
    const verifySession = async () => {
      if (!authStore.token) return;

      try {
        const data = await api.me();
        authStore.user = data.user;
        setCurrentUser(data.user);
        setView("admin");
        loadApiData();
      } catch (error) {
        authStore.clear();
        setToken(null);
        setCurrentUser(null);
        setAuthError("Your session expired. Please sign in again.");
        setView("storefront");
      }
    };

    verifySession();
  }, [token]);

  useEffect(() => {
    if (view !== "admin" || !token) return undefined;
    const syncAdminRoute = () => {
      const nextSection = adminSectionFromHash();
      if (nextSection) setActive(nextSection);
    };
    window.addEventListener("hashchange", syncAdminRoute);
    window.addEventListener("popstate", syncAdminRoute);
    syncAdminRoute();
    return () => { window.removeEventListener("hashchange", syncAdminRoute); window.removeEventListener("popstate", syncAdminRoute); };
  }, [view, token]);

  const login = async (event) => {
    event.preventDefault();
    setLoading(true);
    setAuthError("");
    try {
      const data = await api.login(loginForm);
      authStore.token = data.token;
      authStore.user = data.user;
      setToken(data.token);
      setCurrentUser(data.user);
      setView("admin");
      setMessage(`Signed in as ${data.user.name}.`);
    } catch (error) {
      setAuthError(error.message);
    } finally {
      setLoading(false);
    }
  };

  const logout = () => {
    authStore.clear();
    setToken(null);
    setCurrentUser(null);
    setState(emptyAdminState);
    setAdminDataReady(false);
    setAdminLoadError("");
    setActive("analytics");
    setView("storefront");
    setMessage("Signed out.");
    loadStorefront();
  };

  const addProduct = async (payload) => {
    const created = await api.createProduct(payload);
    setState((current) => ({ ...current, products: [created, ...current.products] }));
    navigateAdmin("catalog");
    setMessage(`${created.name} was added to the catalog.`);
  };

  const addCategory = async (payload) => {
    const created = await api.createCategory(payload);
    setState((current) => ({ ...current, categories: [...current.categories, created] }));
    setMessage(`${created.name} category added.`);
    return created;
  };

  const addTaxCategory = async (payload) => {
    const created = await api.createTaxCategory(payload);
    setState((current) => ({ ...current, taxCategories: [...current.taxCategories, created] }));
    setMessage(`${created.name} tax category added.`);
    return created;
  };

  const updateProduct = async (product, payload) => {
    const saved = await api.updateProduct(product._id, payload);
    setState((current) => ({
      ...current,
      products: current.products.map((item) => (item._id === saved._id ? saved : item))
    }));
    setMessage(`${saved.name} updated.`);
  };

  const deleteProduct = async (product) => {
    await api.deleteProduct(product._id);
    setState((current) => ({ ...current, products: current.products.filter((item) => item._id !== product._id) }));
    setMessage(`${product.name} deleted.`);
  };

  const updateCategory = async (category, payload) => {
    const saved = await api.updateCategory(category._id, payload);
    setState((current) => ({
      ...current,
      categories: current.categories.map((item) => (item._id === saved._id ? saved : item))
    }));
    setMessage(`${saved.name} category updated.`);
  };

  const deleteCategory = async (category) => {
    await api.deleteCategory(category._id);
    setState((current) => ({ ...current, categories: current.categories.filter((item) => item._id !== category._id) }));
    setMessage(`${category.name} category deleted.`);
  };

  const updateTaxCategory = async (taxCategory, payload) => {
    const saved = await api.updateTaxCategory(taxCategory._id, payload);
    setState((current) => ({
      ...current,
      taxCategories: current.taxCategories.map((item) => (item._id === saved._id ? saved : item))
    }));
    setMessage(`${saved.name} tax category updated.`);
  };

  const deleteTaxCategory = async (taxCategory) => {
    await api.deleteTaxCategory(taxCategory._id);
    setState((current) => ({ ...current, taxCategories: current.taxCategories.filter((item) => item._id !== taxCategory._id) }));
    setMessage(`${taxCategory.name} tax category deleted.`);
  };

  const saveBlogCategory = async (payload) => {
    const saved = payload._id ? await api.updateBlogCategory(payload._id, payload) : await api.createBlogCategory(payload);
    setState((current) => ({
      ...current,
      blogCategories: (current.blogCategories || []).some((item) => item._id === saved._id)
        ? current.blogCategories.map((item) => (item._id === saved._id ? saved : item))
        : [...(current.blogCategories || []), saved]
    }));
    setMessage(`${saved.name} blog category saved.`);
  };

  const deleteBlogCategory = async (category) => {
    await api.deleteBlogCategory(category._id);
    setState((current) => ({ ...current, blogCategories: (current.blogCategories || []).filter((item) => item._id !== category._id) }));
    setMessage(`${category.name} blog category deleted.`);
  };

  const saveBlogPost = async (payload) => {
    const saved = payload._id ? await api.updateBlogPost(payload._id, payload) : await api.createBlogPost(payload);
    setState((current) => ({
      ...current,
      blogPosts: (current.blogPosts || []).some((item) => item._id === saved._id)
        ? current.blogPosts.map((item) => (item._id === saved._id ? saved : item))
        : [saved, ...(current.blogPosts || [])]
    }));
    setMessage(`${saved.title} blog post saved.`);
    loadStorefront();
  };

  const deleteBlogPost = async (post) => {
    await api.deleteBlogPost(post._id);
    setState((current) => ({ ...current, blogPosts: (current.blogPosts || []).filter((item) => item._id !== post._id) }));
    setMessage(`${post.title} blog post deleted.`);
    loadStorefront();
  };

  const updateLocalOrder = async (order, status, timelineComment = "", timelineDetails = "") => {
    const updated = await api.updateOrder(order._id, { status, timelineComment, timelineDetails });
    setState((current) => ({
      ...current,
      orders: current.orders.map((item) => (item._id === order._id ? updated : item))
    }));
    const pendingItems = await api.pendingItems().catch(() => state.pendingItems || []);
    setState((current) => ({ ...current, pendingItems }));
  };

  const savePaymentMethod = async (payload) => {
    const saved = await api.savePaymentMethod(payload);
    setState((current) => ({
      ...current,
      paymentMethods: current.paymentMethods.some((item) => item._id === saved._id)
        ? current.paymentMethods.map((item) => (item._id === saved._id ? saved : item))
        : [...current.paymentMethods, saved]
    }));
    setMessage(`${saved.name} payment method saved.`);
  };

  const deletePaymentMethod = async (paymentMethod) => {
    await api.deletePaymentMethod(paymentMethod._id);
    setState((current) => ({ ...current, paymentMethods: current.paymentMethods.filter((item) => item._id !== paymentMethod._id) }));
    setMessage(`${paymentMethod.name} payment method deleted.`);
  };

  const saveShippingRule = async (payload) => {
    const saved = await api.saveShippingRule(payload);
    setState((current) => ({
      ...current,
      shippingRules: current.shippingRules.some((item) => item._id === saved._id)
        ? current.shippingRules.map((item) => (item._id === saved._id ? saved : item))
        : [...current.shippingRules, saved]
    }));
    setMessage(`${saved.name} shipping rule saved.`);
  };

  const deleteShippingRule = async (shippingRule) => {
    await api.deleteShippingRule(shippingRule._id);
    setState((current) => ({ ...current, shippingRules: current.shippingRules.filter((item) => item._id !== shippingRule._id) }));
    setMessage(`${shippingRule.name} shipping rule deleted.`);
  };

  const saveStorefrontSettings = async (payload) => {
    const saved = await api.saveStorefrontSettings(payload);
    setState((current) => ({ ...current, storefrontSettings: saved }));
    setMessage("Storefront settings saved.");
    loadStorefront();
  };

  const saveShipRocketSettings = async (payload) => {
    const saved = await api.saveShipRocketSettings(payload);
    setState((current) => ({ ...current, shipRocketSettings: saved }));
    setMessage("ShipRocket settings saved.");
  };

  const orderAction = async (order, action, payload) => {
    const updated =
      action === "invoice"
        ? await api.generateInvoice(order._id)
        : action === "shiprocket"
          ? await api.syncShipRocket(order._id)
          : await api.updateTracking(order._id, payload);
    if (updated._id) {
      setState((current) => ({ ...current, orders: current.orders.map((item) => (item._id === updated._id ? updated : item)) }));
    }
    if (action === "invoice") printInvoice(updated);
    setMessage(action === "invoice" ? `Invoice ${updated.invoiceNumber} generated.` : "Order updated.");
  };

  const createPromotion = async (event) => {
    event.preventDefault();
    const payload = {
      ...promotionForm,
      value: Number(promotionForm.value),
      maxDiscountAmount: Number(promotionForm.maxDiscountAmount),
      minimumOrderValue: Number(promotionForm.minimumOrderValue),
      startsAt: promotionForm.startsAt || undefined,
      endsAt: promotionForm.endsAt || undefined
    };
    const created = await api.createPromotion(payload);
    setState((current) => ({ ...current, promotions: [created, ...current.promotions] }));
    setPromotionForm({ code: "", name: "", type: "percentage", audience: "all", value: 10, maxDiscountAmount: 0, minimumOrderValue: 0, startsAt: "", endsAt: "", isActive: true });
  };

  const updatePromotion = async (promotion, payload) => {
    const saved = await api.updatePromotion(promotion._id, payload);
    setState((current) => ({
      ...current,
      promotions: current.promotions.map((item) => (item._id === saved._id ? saved : item))
    }));
    setMessage(`${saved.name} promotion updated.`);
  };

  const createUser = async (event) => {
    event.preventDefault();
    const created = await api.createUser(userForm);
    setState((current) => ({ ...current, users: [created, ...current.users] }));
    setUserForm({ name: "", email: "", password: "", role: "Customer Support" });
  };

  if (view === "admin-login" && !token) {
    return (
      <LoginScreen
        form={loginForm}
        error={authError}
        loading={loading}
        onChange={setLoginForm}
        onSubmit={login}
      />
    );
  }

  if (partnerRoute && (view !== "admin" || !token)) return <PartnerPortal onBack={() => { window.location.hash = "#/"; }} />;
  if (sellerRoute && (view !== "admin" || !token)) return <SellerPortal onBack={() => { window.location.hash = "#/"; }} />;

  if (view !== "admin" || !token) {
    return (
      <StorefrontPage
        products={storefront.products}
        featuredProducts={storefront.featuredProducts}
        categories={storefront.categories}
            banner={storefront.banner}
            heroItems={storefront.heroItems}
            contentSections={storefront.contentSections}
            productBanners={storefront.productBanners}
            productBannerColumns={storefront.productBannerColumns}
            firstOrderDiscount={storefront.firstOrderDiscount}
            blogPosts={storefront.blogPosts}
            settings={storefront.settings}
            paymentMethods={storefront.paymentMethods}
        shippingRules={storefront.shippingRules}
        storefrontLoading={storefrontLoading}
        storefrontError={storefrontError}
        onReloadStorefront={loadStorefront}
        onAdminLogin={() => setView("admin-login")}
      />
    );
  }

  if (!adminDataReady) {
    return <main className="storefrontLoadingScreen" role="status" aria-live="polite"><div className="storefrontLoadingBrand"><span>HR</span><strong>HRSBasket Admin</strong></div>{!adminLoadError && <div className="storefrontLoadingSpinner" aria-hidden="true" />}<h1>{adminLoadError ? "Unable to load admin data" : "Loading admin workspace"}</h1><p>{adminLoadError || "Connecting to the database and loading live products…"}</p>{adminLoadError && <button className="heroPrimary" type="button" onClick={loadApiData}>Try Again</button>}</main>;
  }

  return (
    <div className="appShell berryWorkspace berryWorkspace--admin">
      {adminMenuOpen && <button className="sidebarBackdrop" type="button" aria-label="Close admin menu" onClick={() => setAdminMenuOpen(false)} />}
      <Sidebar active={active} onChange={navigateAdmin} open={adminMenuOpen} onClose={() => setAdminMenuOpen(false)} />
      <main>
        <header className="topbar berryTopbar">
          <button className="adminMenuButton" type="button" onClick={() => setAdminMenuOpen(true)} aria-label="Open admin menu"><Menu size={22} /></button>
          <div>
            <h1>{sectionTitle(active)}</h1>
            <p>{message}</p>
          </div>
          <div className="sessionBar">
            <div className="sessionUser">
              <strong>{currentUser?.name || "Admin"}</strong>
              <span>{currentUser?.role || "Staff"}</span>
            </div>
            <button className="iconButton" title="Refresh" type="button" onClick={loadApiData}>
              <RefreshCw size={18} className={loading ? "spin" : ""} />
            </button>
            <button className="iconButton" title="Sign out" type="button" onClick={logout}>
              <LogOut size={18} />
            </button>
          </div>
        </header>

        {active === "analytics" && <Analytics metrics={state.metrics} />}
        {active === "catalog" && (
          <Catalog
            products={state.products}
            categories={state.categories}
            taxCategories={state.taxCategories}
            query={query}
            setQuery={setQuery}
            onAddProduct={() => navigateAdmin("add-product")}
            onFeature={updateProduct}
            onUpdateProduct={updateProduct}
            onEditProduct={(product) => { setProductDraft(product); navigateAdmin("edit-product"); }}
            onDeleteProduct={deleteProduct}
            onCategories={() => navigateAdmin("categories")}
            onTaxCategories={() => navigateAdmin("tax-categories")}
          />
        )}
        {active === "categories" && (
          <CategoryManager categories={state.categories} products={state.products} onAdd={() => { setCategoryDraft(null); navigateAdmin("category-editor"); }} onEdit={(category) => { setCategoryDraft(category); navigateAdmin("category-editor"); }} onDelete={deleteCategory} />
        )}
        {active === "tax-categories" && (
          <TaxCategoryManager taxCategories={state.taxCategories} onAdd={() => { setTaxDraft(null); navigateAdmin("tax-editor"); }} onEdit={(tax) => { setTaxDraft(tax); navigateAdmin("tax-editor"); }} onDelete={deleteTaxCategory} />
        )}
        {active === "add-product" && (
          <ProductCreatePage
            categories={state.categories}
            taxCategories={state.taxCategories}
            products={state.products}
            onSave={addProduct}
            onBack={() => navigateAdmin("catalog")}
          />
        )}
        {active === "edit-product" && (
          <ProductCreatePage categories={state.categories} taxCategories={state.taxCategories} products={state.products} initialProduct={productDraft} onBack={() => navigateAdmin("catalog")} onSave={async (payload) => { await updateProduct(productDraft, payload); navigateAdmin("catalog"); }} />
        )}
        {active === "category-editor" && <CategoryEditor categories={state.categories} initialCategory={categoryDraft} onBack={() => navigateAdmin("categories")} onSave={async (payload) => { if (categoryDraft) await updateCategory(categoryDraft, payload); else await addCategory(payload); navigateAdmin("categories"); }} />}
        {active === "tax-editor" && <TaxCategoryEditor initialTax={taxDraft} onBack={() => navigateAdmin("tax-categories")} onSave={async (payload) => { if (taxDraft) await updateTaxCategory(taxDraft, payload); else await addTaxCategory(payload); navigateAdmin("tax-categories"); }} />}
        {active === "orders" && <Orders orders={state.orders} pendingItems={state.pendingItems || []} onStatus={updateLocalOrder} onAction={orderAction} />}
        {active === "settings" && (
          <OperationsSettings
            paymentMethods={state.paymentMethods || []}
            shippingRules={state.shippingRules || []}
            storefrontSettings={state.storefrontSettings || {}}
            shipRocketSettings={state.shipRocketSettings || {}}
            products={state.products || []}
            categories={state.categories || []}
            onSavePayment={savePaymentMethod}
            onSaveShipping={saveShippingRule}
            onDeletePayment={deletePaymentMethod}
            onDeleteShipping={deleteShippingRule}
            onSaveStorefront={saveStorefrontSettings}
            onSaveShipRocket={saveShipRocketSettings}
          />
        )}
        {active === "customers" && <Customers customers={state.customers} />}
        {active === "partners" && <PartnerAdminPage onViewDetails={(id) => { setPartnerDetailsId(id); navigateAdmin("partner-details"); }} />}
        {active === "partner-details" && <PartnerAdminPage detailOnly detailId={partnerDetailsId} onBack={() => navigateAdmin("partners")} onDelete={async (id) => { await api.deletePartner(id); setPartnerDetailsId(null); navigateAdmin("partners"); }} />}
        {active === "sellers" && <SellerAdminPage />}
        {active === "seller-products" && <SellerProductsAdminPage />}
        {active === "banners" && <BannerAdminPage settings={state.storefrontSettings || {}} products={state.products || []} onSave={saveStorefrontSettings} />}
        {active === "blog" && (
          <BlogManager
            categories={state.blogCategories || []}
            posts={state.blogPosts || []}
            onCreatePost={() => navigateAdmin("blog-create")}
            onEditPost={(post) => {
              setBlogDraft(post);
              navigateAdmin("blog-create");
            }}
            onSaveCategory={saveBlogCategory}
            onDeleteCategory={deleteBlogCategory}
            onDeletePost={deleteBlogPost}
          />
        )}
        {active === "blog-create" && (
          <BlogPostEditor
            categories={state.blogCategories || []}
            initialPost={blogDraft}
            onBack={() => {
              setBlogDraft(null);
              navigateAdmin("blog");
            }}
            onSave={async (payload) => {
              await saveBlogPost(payload);
              setBlogDraft(null);
              navigateAdmin("blog");
            }}
          />
        )}
        {active === "pages" && <PagesAdminPage settings={state.storefrontSettings || {}} onAdd={() => { setPageDraft(null); navigateAdmin("page-editor"); }} onEdit={(page) => { setPageDraft(page); navigateAdmin("page-editor"); }} onDelete={async (page) => { const next = (state.storefrontSettings?.pages || []).filter((item) => String(item._id || item.slug) !== String(page._id || page.slug)); await saveStorefrontSettings({ ...state.storefrontSettings, pages: next }); }} />}
        {active === "page-editor" && <PageEditorPage initialPage={pageDraft} onBack={() => navigateAdmin("pages")} onSave={async (page) => { const current = state.storefrontSettings?.pages || []; const next = pageDraft ? current.map((item) => String(item._id || item.slug) === String(pageDraft._id || pageDraft.slug) ? { ...item, ...page } : item) : [...current, page]; await saveStorefrontSettings({ ...state.storefrontSettings, pages: next }); setPageDraft(null); navigateAdmin("pages"); }} />}
        {active === "footer" && <FooterAdminPage settings={state.storefrontSettings || {}} onSave={saveStorefrontSettings} />}
        {active === "marketing" && (
          <Marketing
            promotions={state.promotions}
            promotionForm={promotionForm}
            setPromotionForm={setPromotionForm}
            createPromotion={createPromotion}
            updatePromotion={updatePromotion}
          />
        )}
        {active === "team" && <Team users={state.users} userForm={userForm} setUserForm={setUserForm} createUser={createUser} />}
      </main>
    </div>
  );
}

function sectionTitle(active) {
  return {
    analytics: "Analytics & Reporting",
    catalog: "Catalog & Inventory",
    "add-product": "Add Product",
    "edit-product": "Edit Product",
    categories: "Category Management",
    "category-editor": "Category Editor",
    "tax-categories": "Tax Category Management",
    "tax-editor": "Tax Editor",
    orders: "Order Fulfillment",
    customers: "Customer CRM",
    partners: "Partner Program",
    sellers: "Seller Management",
    "seller-products": "Seller Product Approvals",
    banners: "Product Banners",
    blog: "Blog Content",
    "blog-create": "Create Blog Post",
    marketing: "Marketing & Promotions",
    team: "Role-Based Access",
    settings: "Store Settings"
  }[active];
}

function getCategoryName(category) {
  if (!category) return "Unassigned";
  if (typeof category === "string") return category;
  return category.parent?.name ? `${category.parent.name} / ${category.name}` : category.name;
}

function getProductThumb(product) {
  return product.mainImage || product.media?.find((item) => item.type === "image")?.url || "";
}

function Analytics({ metrics }) {
  const statusData = Object.entries(metrics.statusCounts || {}).map(([name, count]) => ({ name, count }));

  return (
    <section className="contentGrid">
      <StatCard label="Revenue" value={money(metrics.revenue)} helper="Total sales in selected period" />
      <StatCard label="E-commerce Sales" value={money(metrics.ecommerceSales)} helper="Paid product sales, excluding shipping" />
      <StatCard label="Product Profit" value={money(metrics.ecommerceProfit)} helper="Sale price minus cost price" />
      <StatCard label="Registered Partners" value={metrics.partnersCount || 0} helper="Total partner accounts" />
      <StatCard label="AOV" value={money(metrics.averageOrderValue)} helper="Average order value" />
      <StatCard label="Conversion" value={`${metrics.conversionRate}%`} helper="Storefront conversion rate" />
      <StatCard label="Orders" value={metrics.orderCount} helper={`${metrics.customersCount} customers tracked`} />
      <div className="panel wide">
        <div className="panelHeader">
          <h2>Order Status</h2>
          <CheckCircle2 size={18} />
        </div>
        <ResponsiveContainer width="100%" height={260}>
          <BarChart data={statusData}>
            <CartesianGrid strokeDasharray="3 3" vertical={false} />
            <XAxis dataKey="name" />
            <YAxis allowDecimals={false} />
            <Tooltip />
            <Bar dataKey="count" fill="#1f7a6d" radius={[6, 6, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>
      <div className="panel">
        <div className="panelHeader">
          <h2>Top Products</h2>
        </div>
        {metrics.topProducts.map((product) => (
          <div className="listRow" key={product._id}>
            <span>{product.name}</span>
            <strong>{product.quantity} sold</strong>
          </div>
        ))}
      </div>
      <div className="panel">
        <div className="panelHeader">
          <h2>Low Stock</h2>
          <AlertTriangle size={18} />
        </div>
        {metrics.lowStockProducts.map((product) => (
          <div className="listRow" key={product._id}>
            <span>{product.name}</span>
            <strong>{product.stock} left</strong>
          </div>
        ))}
      </div>
    </section>
  );
}

function Catalog({ products, categories, taxCategories, query, setQuery, onAddProduct, onFeature, onUpdateProduct, onEditProduct, onDeleteProduct, onCategories, onTaxCategories }) {
  const [editing, setEditing] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [imageStatus, setImageStatus] = useState("");
  const [catalogFilters, setCatalogFilters] = useState({ category: "", tax: "", status: "", missingImage: false });
  const visibleProducts = useMemo(() => products.filter((product) => {
    const text = query.trim().toLowerCase();
    const textMatch = !text || [product.name, product.sku, getCategoryName(product.category), product.taxCategory?.name, product.taxCategory?.code].join(" ").toLowerCase().includes(text);
    const categoryMatch = !catalogFilters.category || String(product.category?._id || product.category || "") === catalogFilters.category;
    const taxMatch = !catalogFilters.tax || (catalogFilters.tax === "none" ? !product.taxCategory : String(product.taxCategory?._id || product.taxCategory || "") === catalogFilters.tax);
    const statusMatch = !catalogFilters.status || product.status === catalogFilters.status;
    const imageMatch = !catalogFilters.missingImage || !getProductThumb(product);
    return textMatch && categoryMatch && taxMatch && statusMatch && imageMatch;
  }), [products, query, catalogFilters]);

  const updateEditingMedia = (patch) => setEditing((current) => ({ ...current, ...patch }));

  const handleEditMainImage = async (event) => {
    const file = event.target.files?.[0];
    if (!file || !editing) return;
    setImageStatus("Optimizing main image...");
    const optimized = await optimizeImage(file, { maxWidth: 1600, maxHeight: 1600, quality: 0.8 });
    setEditing((current) => ({
      ...current,
      mainImage: optimized.url,
      media: [
        { url: optimized.url, type: "image", isMain: true, alt: current.name || optimized.name },
        ...(current.media || []).filter((item) => !item.isMain)
      ]
    }));
    setImageStatus(`Main image optimized to ${optimized.width}x${optimized.height}.`);
  };

  const handleEditGalleryImages = async (event) => {
    const files = Array.from(event.target.files || []);
    if (!files.length || !editing) return;
    setImageStatus(`Optimizing ${files.length} gallery image${files.length > 1 ? "s" : ""}...`);
    const optimizedImages = await Promise.all(files.map((file) => optimizeImage(file)));
    setEditing((current) => ({
      ...current,
      media: [
        ...(current.media || []),
        ...optimizedImages.map((image) => ({
          url: image.url,
          type: "image",
          isMain: false,
          alt: current.name || image.name
        }))
      ]
    }));
    setImageStatus(`${optimizedImages.length} gallery image${optimizedImages.length > 1 ? "s" : ""} optimized.`);
  };

  const setEditMainMedia = (index) => {
    setEditing((current) => {
      const media = (current.media || []).map((item, itemIndex) => ({ ...item, isMain: itemIndex === index }));
      return { ...current, media, mainImage: media[index]?.url || current.mainImage || "" };
    });
  };

  const removeEditMedia = (index) => {
    setEditing((current) => {
      const media = (current.media || []).filter((_item, itemIndex) => itemIndex !== index);
      const currentMainRemoved = current.media?.[index]?.isMain;
      const nextMedia = currentMainRemoved && media.length ? media.map((item, itemIndex) => ({ ...item, isMain: itemIndex === 0 })) : media;
      return {
        ...current,
        media: nextMedia,
        mainImage: nextMedia.find((item) => item.isMain)?.url || nextMedia[0]?.url || ""
      };
    });
  };

  const submitEdit = async (event) => {
    event.preventDefault();
    await onUpdateProduct(editing, {
      name: editing.name,
      sku: editing.sku,
      price: Number(editing.price),
      costPrice: Number(editing.costPrice),
      offerPrice: Number(editing.offerPrice || editing.price),
      status: editing.status,
      category: editing.category?._id || editing.category,
      taxCategory: editing.taxCategory?._id || editing.taxCategory || undefined,
      priceIncludesTax: editing.priceIncludesTax !== false,
      shortDescription: editing.shortDescription,
      detailedDescription: editing.detailedDescription,
      videoUrl: editing.videoUrl || undefined,
      mainImage: editing.mainImage || editing.media?.find((item) => item.isMain)?.url || "",
      media: editing.media || []
    });
    setEditing(null);
    setImageStatus("");
  };

  return (
    <section className="contentStack">
      {!editing && <div className="panel">
        <div className="panelHeader">
          <h2>Products</h2>
          <div className="toolbar">
            <label className="searchBox">
              <Search size={16} />
              <input placeholder="Search name, SKU, tax or category" value={query} onChange={(event) => setQuery(event.target.value)} />
            </label>
            <button className="primaryButton" type="button" onClick={onAddProduct}>
              <Plus size={18} /> Add Product
            </button>
            <button className="inlineButton" type="button" onClick={onCategories}>Categories</button>
            <button className="inlineButton" type="button" onClick={onTaxCategories}>Tax</button>
          </div>
        </div>
        <div className="catalogFilters">
          <label>Category<CategoryTreeSelect categories={categories} value={catalogFilters.category} onChange={(category) => setCatalogFilters({ ...catalogFilters, category })} placeholder="All categories" clearLabel="All categories" /></label>
          <label>Tax<select value={catalogFilters.tax} onChange={(event) => setCatalogFilters({ ...catalogFilters, tax: event.target.value })}><option value="">All tax categories</option><option value="none">No tax category</option>{taxCategories.map((tax) => <option key={tax._id} value={tax._id}>{tax.name} ({tax.rate}%)</option>)}</select></label>
          <label>Status<select value={catalogFilters.status} onChange={(event) => setCatalogFilters({ ...catalogFilters, status: event.target.value })}><option value="">All statuses</option><option value="active">Active</option><option value="draft">Draft</option><option value="archived">Archived</option></select></label>
          <label className="toggleRow"><input type="checkbox" checked={catalogFilters.missingImage} onChange={(event) => setCatalogFilters({ ...catalogFilters, missingImage: event.target.checked })} /><span>Without image only</span></label>
          <button className="inlineButton" type="button" onClick={() => { setCatalogFilters({ category: "", tax: "", status: "", missingImage: false }); setQuery(""); }}>Clear filters</button>
        </div>
        <DataTable
          rows={visibleProducts}
          sortable
          paginated
          className="catalogProductTable"
          columns={[
            { key: "image", label: "Image", sortable: false, render: (row) => getProductThumb(row) ? <img className="tableThumb" src={getProductThumb(row)} alt="" /> : "None" },
            { key: "name", label: "Name" },
            { key: "sku", label: "SKU" },
            { key: "category", label: "Category", sortValue: (row) => getCategoryName(row.category), render: (row) => getCategoryName(row.category) },
            { key: "taxCategory", label: "Tax", sortValue: (row) => row.taxCategory?.name || "", render: (row) => row.taxCategory ? `${row.taxCategory.name} (${row.taxCategory.rate}%)` : "None" },
            { key: "displayType", label: "Type", render: (row) => <span className="badge">{row.displayType || "Product"}</span> },
            { key: "price", label: "Price", render: (row) => money(row.price) },
            { key: "costPrice", label: "Cost price", render: (row) => money(row.costPrice) },
            { key: "offerPrice", label: "Offer", render: (row) => money(row.offerPrice || row.price) },
            {
              key: "stock",
              label: "Stock",
              render: (row) =>
                row.isStockManageable === false ? (
                  <span className="badge">Not managed</span>
                ) : (
                  <span className={row.stock <= row.lowStockThreshold ? "badge danger" : "badge"}>{row.stock}</span>
                )
            },
            { key: "status", label: "Status", render: (row) => <span className="badge">{row.status}</span> }
            ,
            {
              key: "isFeatured",
              label: "Featured",
              render: (row) => (
                <label className="toggleRow compactToggle">
                  <input type="checkbox" checked={Boolean(row.isFeatured)} onChange={(event) => onFeature(row, { isFeatured: event.target.checked })} />
                  <span>{row.isFeatured ? "Yes" : "No"}</span>
                </label>
              )
            },
            {
              key: "actions",
              label: "Actions",
              sortable: false,
              render: (row) => (
                <div className="tableActions">
                  <button
                    type="button"
                    title="Edit product"
                    onClick={() => onEditProduct(row)}
                  >
                    <FileText size={16} />
                  </button>
                  <button type="button" title="Delete product" onClick={() => setDeleteTarget(row)}><Trash2 size={16} /></button>
                </div>
              )
            }
          ]}
        />
      </div>}

      {editing && (
        <form className="panel formPanel" onSubmit={submitEdit}>
          <div className="panelHeader">
            <h2>Edit Product</h2>
            <button className="inlineButton" type="button" onClick={() => { setEditing(null); setImageStatus(""); }}>← Back to products</button>
          </div>
          <div className="formGrid">
            <label><span>Name</span><input value={editing.name || ""} onChange={(event) => setEditing({ ...editing, name: event.target.value })} required /></label>
            <label><span>SKU</span><input value={editing.sku || ""} onChange={(event) => setEditing({ ...editing, sku: event.target.value })} required /></label>
            <label><span>Price</span><input type="number" value={editing.price || 0} onChange={(event) => setEditing({ ...editing, price: event.target.value })} required /></label>
            <label><span>Cost price</span><input type="number" min="0" step="0.01" value={editing.costPrice ?? ""} onChange={(event) => setEditing({ ...editing, costPrice: event.target.value })} required /></label>
            <label><span>Offer price</span><input type="number" value={editing.offerPrice || ""} onChange={(event) => setEditing({ ...editing, offerPrice: event.target.value })} /></label>
            <label><span>Category</span><select value={editing.category?._id || editing.category || ""} onChange={(event) => setEditing({ ...editing, category: event.target.value })}>{categories.map((category) => <option key={category._id} value={category._id}>{getCategoryName(category)}</option>)}</select></label>
            <label><span>Tax</span><select value={editing.taxCategory?._id || editing.taxCategory || ""} onChange={(event) => setEditing({ ...editing, taxCategory: event.target.value })}><option value="">None</option>{taxCategories.map((tax) => <option key={tax._id} value={tax._id}>{tax.name}</option>)}</select></label>
            <label><span>Entered price includes GST?</span><select value={editing.priceIncludesTax === false ? "no" : "yes"} onChange={(event) => setEditing({ ...editing, priceIncludesTax: event.target.value === "yes" })}><option value="yes">Yes — GST included</option><option value="no">No — add GST</option></select></label>
            <GstPricePreview price={editing.price} offerPrice={editing.offerPrice} taxCategory={taxCategories.find((tax) => tax._id === (editing.taxCategory?._id || editing.taxCategory))} priceIncludesTax={editing.priceIncludesTax !== false} />
            <label><span>Status</span><select value={editing.status || "draft"} onChange={(event) => setEditing({ ...editing, status: event.target.value })}><option value="draft">Draft</option><option value="active">Active</option><option value="archived">Archived</option></select></label>
          </div>
          <label><span>Short description</span><input value={editing.shortDescription || ""} onChange={(event) => setEditing({ ...editing, shortDescription: event.target.value })} /></label>
          <label><span>Detailed description</span><textarea value={editing.detailedDescription || ""} onChange={(event) => setEditing({ ...editing, detailedDescription: event.target.value })} /></label>
          <div className="mediaGrid">
            <label className="uploadBox">
              <ImagePlus size={20} />
              <span>Main image</span>
              <input type="file" accept="image/*" onChange={handleEditMainImage} />
            </label>
            <label className="uploadBox">
              <ImagePlus size={20} />
              <span>Gallery images</span>
              <input type="file" accept="image/*" multiple onChange={handleEditGalleryImages} />
            </label>
            <label className="videoField">
              <span>Product video URL</span>
              <div>
                <input value={editing.videoUrl || ""} onChange={(event) => updateEditingMedia({ videoUrl: event.target.value })} placeholder="https://..." />
              </div>
            </label>
          </div>
          {imageStatus && <p className="mutedText">{imageStatus}</p>}
          {(editing.media || []).length > 0 && (
            <div className="mediaPreview">
              {(editing.media || []).map((item, index) => (
                <div className="mediaTile" key={`${item.url.slice(0, 24)}-${index}`}>
                  <img src={item.url} alt={item.alt || editing.name || "Product media"} />
                  {item.isMain && <span>Main</span>}
                  <div className="mediaActions">
                    {!item.isMain && <button type="button" title="Set as main image" onClick={() => setEditMainMedia(index)}>Main</button>}
                    <button type="button" className="mediaRemove" title="Remove image" onClick={() => removeEditMedia(index)}>
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
          <button className="primaryButton" type="submit"><Save size={18} /> Save Product</button>
        </form>
      )}

      {deleteTarget && <ConfirmDeleteModal recordName={deleteTarget.name} recordType="product" onCancel={() => setDeleteTarget(null)} onConfirm={async () => { await onDeleteProduct(deleteTarget); setDeleteTarget(null); }} />}

    </section>
  );
}

function Orders({ orders, pendingItems, onStatus, onAction }) {
  const [statusFilter, setStatusFilter] = useState("all");
  const [orderSearch, setOrderSearch] = useState("");
  const [notesOrder, setNotesOrder] = useState(null);
  const [noteDraft, setNoteDraft] = useState({ comment: "", details: "" });
  const [statusDrafts, setStatusDrafts] = useState({});
  const statuses = ["Pending", "Processing", "Packed", "Shipped", "Delivered", "Cancelled", "Returned"];
  const filteredOrders = orders.filter((order) => {
    const statusMatch = statusFilter === "all" || order.status === statusFilter;
    const text = [order.orderNumber, order.invoiceNumber, order.customer?.name, order.customer?.email, order.address?.name, order.address?.email]
      .filter(Boolean)
      .join(" ")
      .toLowerCase();
    return statusMatch && text.includes(orderSearch.toLowerCase());
  });

  return (
    <section className="contentStack">
      <div className="panel">
        <div className="panelHeader">
          <h2>Fulfillment Queue</h2>
          <div className="toolbar">
            <label className="searchBox">
              <Search size={16} />
              <input placeholder="Search order, email, name" value={orderSearch} onChange={(event) => setOrderSearch(event.target.value)} />
            </label>
            <select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)}>
              <option value="all">All Status</option>
              {statuses.map((status) => <option key={status} value={status}>{status}</option>)}
            </select>
            <Truck size={18} />
          </div>
        </div>
        <DataTable
          rows={filteredOrders}
          sortable
          paginated
          columns={[
            { key: "orderNumber", label: "Order" },
            { key: "invoiceNumber", label: "Invoice", render: (row) => row.invoiceNumber || "Not generated" },
            { key: "customer", label: "Customer", sortValue: (row) => row.customer?.name || row.address?.name || "Guest", render: (row) => row.customer?.name || "Guest" },
            { key: "email", label: "Email", sortValue: (row) => row.customer?.email || row.address?.email || "", render: (row) => row.customer?.email || row.address?.email || "" },
            { key: "grandTotal", label: "Total", render: (row) => money(row.grandTotal) },
            { key: "payment", label: "Payment", render: (row) => row.payment?.methodName || row.paymentStatus },
            { key: "shipping", label: "Shipping", render: (row) => row.shipping?.ruleName || "Manual" },
            {
              key: "status",
              label: "Status",
              render: (row) => (
                <select
                  value={statusDrafts[row._id] || row.status}
                  onChange={(event) => setStatusDrafts((current) => ({ ...current, [row._id]: event.target.value }))}
                >
                  {statuses.map((status) => (
                    <option key={status}>{status}</option>
                  ))}
                </select>
              )
            },
            { key: "timeline", label: "Last Note", render: (row) => row.timeline?.length ? row.timeline[row.timeline.length - 1].title : "No notes" },
            {
              key: "actions",
              label: "Actions",
              render: (row) => (
                <div className="tableActions">
                  <button
                    type="button"
                    onClick={async () => {
                      await onStatus(row, statusDrafts[row._id] || row.status);
                      setStatusDrafts((current) => {
                        const next = { ...current };
                        delete next[row._id];
                        return next;
                      });
                    }}
                    title="Update order status"
                  >
                    <Save size={16} />
                  </button>
                  <button type="button" title="Order notes" onClick={() => { setNotesOrder(row); setNoteDraft({ comment: "", details: "" }); }}><MessageSquareText size={16} /></button>
                  <button type="button" onClick={() => onAction(row, "invoice")} title="Generate and print invoice"><FileText size={16} /></button>
                  <button type="button" onClick={() => (row.invoiceNumber ? printInvoice(row) : onAction(row, "invoice"))} title="Print invoice"><Printer size={16} /></button>
                  <button type="button" onClick={() => onAction(row, "shiprocket")} title="Queue ShipRocket"><PackageSearch size={16} /></button>
                </div>
              )
            }
          ]}
        />
      </div>
      {notesOrder && (
        <div className="modalOverlay" role="dialog" aria-modal="true" aria-label="Order notes">
          <section className="orderNotesModal">
            <div className="panelHeader">
              <h2>Order Notes · {notesOrder.orderNumber}</h2>
              <button className="inlineButton" type="button" onClick={() => setNotesOrder(null)}>Close</button>
            </div>
            <div className="notesList">
              {(notesOrder.timeline || []).length === 0 ? (
                <p className="mutedText">No notes yet.</p>
              ) : (
                notesOrder.timeline.map((note) => (
                  <article key={note._id || `${note.title}-${note.createdAt}`}>
                    <strong>{note.title}</strong>
                    <span>{note.status} · {note.createdAt ? new Date(note.createdAt).toLocaleString("en-IN") : ""}</span>
                    {note.comment && <p>{note.comment}</p>}
                    {note.details && <small>{note.details}</small>}
                  </article>
                ))
              )}
            </div>
            <form
              className="formPanel"
              onSubmit={async (event) => {
                event.preventDefault();
                await onStatus(notesOrder, notesOrder.status, noteDraft.comment, noteDraft.details);
                setNotesOrder(null);
              }}
            >
              <label><span>New note</span><input value={noteDraft.comment} onChange={(event) => setNoteDraft({ ...noteDraft, comment: event.target.value })} required /></label>
              <label><span>Details</span><textarea value={noteDraft.details} onChange={(event) => setNoteDraft({ ...noteDraft, details: event.target.value })} /></label>
              <button className="primaryButton" type="submit"><Plus size={18} /> Add Note</button>
            </form>
          </section>
        </div>
      )}
      <div className="panel">
        <div className="panelHeader">
          <h2>Pending Item Grouping</h2>
          <div className="toolbar">
            <button className="inlineButton" type="button" onClick={() => printPendingItems(pendingItems)}>
              <Printer size={16} /> Print
            </button>
            <PackageSearch size={18} />
          </div>
        </div>
        <DataTable
          rows={pendingItems}
          columns={[
            { key: "sku", label: "SKU" },
            { key: "name", label: "Item" },
            { key: "quantity", label: "Qty Required" },
            { key: "orderCount", label: "Orders" },
            { key: "orderNumbers", label: "Order Numbers", render: (row) => row.orderNumbers?.join(", ") }
          ]}
        />
      </div>
    </section>
  );
}

function CategoryManager({ categories, products, onAdd, onEdit, onDelete }) {
  const [categorySearch, setCategorySearch] = useState("");
  const [deleteTarget, setDeleteTarget] = useState(null);
  const descendantIds = (categoryId) => { const ids = new Set([String(categoryId)]); let changed = true; while (changed) { changed = false; categories.forEach((item) => { if (ids.has(String(item.parent?._id || item.parent || "")) && !ids.has(String(item._id))) { ids.add(String(item._id)); changed = true; } }); } return ids; };
  const categoryRows = categories.map((category) => {
    const ids = descendantIds(category._id);
    const categoryProducts = products.filter((product) => ids.has(String(product.category?._id || product.category || "")));
    return { ...category, productCount: categoryProducts.length, productSearch: categoryProducts.map((product) => `${product.name} ${product.sku}`).join(" ") };
  }).filter((category) => !categorySearch.trim() || [category.name, category.parent?.name, category.slug, category.productSearch].join(" ").toLowerCase().includes(categorySearch.trim().toLowerCase()));

  return (
    <section className="contentStack">
      <div className="panel">
        <div className="panelHeader"><h2>Categories & Subcategories</h2><div className="toolbar"><label className="searchBox"><Search size={16} /><input value={categorySearch} onChange={(event) => setCategorySearch(event.target.value)} placeholder="Search name, product or SKU" /></label><button className="primaryButton" type="button" onClick={onAdd}><Plus size={18} /> Add Category</button></div></div>
        <DataTable
          rows={categoryRows}
          sortable
          paginated
          columns={[
            { key: "imageUrl", label: "Image", sortable: false, render: (row) => row.imageUrl ? <img className="tableThumb" src={row.imageUrl} alt="" /> : "None" },
            { key: "name", label: "Name" },
            { key: "parent", label: "Parent", sortValue: (row) => row.parent?.name || "", render: (row) => row.parent?.name || "None" },
            { key: "type", label: "Type", sortValue: (row) => row.parent ? "Subcategory" : "Category", render: (row) => row.parent ? "Subcategory" : "Category" },
            { key: "productCount", label: "Total products" },
            { key: "slug", label: "Slug" },
            { key: "isActive", label: "Active", render: (row) => (row.isActive ? "Yes" : "No") },
            {
              key: "actions",
              label: "Actions",
              sortable: false,
              render: (row) => (
                <div className="tableActions">
                  <button type="button" title="Edit category" onClick={() => onEdit(row)}><FileText size={16} /></button>
                  <button type="button" title="Delete category" onClick={() => setDeleteTarget(row)}><Trash2 size={16} /></button>
                </div>
              )
            }
          ]}
        />
      </div>
      {deleteTarget && <ConfirmDeleteModal recordName={deleteTarget.name} recordType="category" onCancel={() => setDeleteTarget(null)} onConfirm={async () => { await onDelete(deleteTarget); setDeleteTarget(null); }} />}
    </section>
  );
}

function TaxCategoryManager({ taxCategories, onAdd, onEdit, onDelete }) {
  const [deleteTarget, setDeleteTarget] = useState(null);
  return (
    <section className="contentStack">
      <div className="panel">
        <div className="panelHeader"><h2>Tax Categories</h2><button className="primaryButton" type="button" onClick={onAdd}><Plus size={18} /> Add Tax</button></div>
        <DataTable
          rows={taxCategories}
          columns={[
            { key: "name", label: "Name" },
            { key: "code", label: "Code" },
            { key: "rate", label: "Rate", render: (row) => `${row.rate}%` },
            { key: "isActive", label: "Active", render: (row) => (row.isActive ? "Yes" : "No") },
            {
              key: "actions",
              label: "Actions",
              render: (row) => (
                <div className="tableActions">
                  <button type="button" title="Edit tax category" onClick={() => onEdit(row)}><FileText size={16} /></button>
                  <button type="button" title="Delete tax category" onClick={() => setDeleteTarget(row)}><Trash2 size={16} /></button>
                </div>
              )
            }
          ]}
        />
      </div>
      {deleteTarget && <ConfirmDeleteModal recordName={deleteTarget.name} recordType="tax category" onCancel={() => setDeleteTarget(null)} onConfirm={async () => { await onDelete(deleteTarget); setDeleteTarget(null); }} />}
    </section>
  );
}

function CategoryEditor({ categories, initialCategory, onBack, onSave }) {
  const empty = { name: "", slug: "", parent: "", description: "", imageUrl: "", isActive: true };
  const [form, setForm] = useState(() => initialCategory ? { ...initialCategory, parent: initialCategory.parent?._id || initialCategory.parent || "" } : empty);
  const [status, setStatus] = useState("");
  const selectedParent = categories.find((item) => item._id === form.parent);
  const rootParent = selectedParent?.parent?._id || selectedParent?.parent || form.parent || "";
  const uploadImage = async (event) => {
    const file = event.target.files?.[0];
    if (!file) return;
    setStatus("Optimizing category image...");
    const optimized = await optimizeImage(file, { maxWidth: 1200, maxHeight: 900, quality: 0.82 });
    setForm((current) => ({ ...current, imageUrl: optimized.url }));
    setStatus(`Image ready at ${optimized.width}x${optimized.height}.`);
  };
  return <form className="panel formPanel" onSubmit={async (event) => { event.preventDefault(); await onSave({ ...form, parent: form.parent || null }); }}>
    <div className="panelHeader"><h2>{initialCategory ? "Edit Category" : "Add Category"}</h2><button className="inlineButton" type="button" onClick={onBack}>← Back to categories</button></div>
    <label><span>Name</span><input value={form.name || ""} onChange={(event) => setForm({ ...form, name: event.target.value })} required /></label>
    <label><span>Slug</span><input value={form.slug || ""} onChange={(event) => setForm({ ...form, slug: event.target.value })} /></label>
    <div className="formGrid">
      <label><span>Category</span><select value={rootParent} onChange={(event) => setForm({ ...form, parent: event.target.value })}><option value="">None (create top-level category)</option>{categories.filter((item) => !item.parent && item._id !== initialCategory?._id).map((category) => <option key={category._id} value={category._id}>{category.name}</option>)}</select></label>
      <label><span>Subcategory</span><select value={selectedParent?.parent ? form.parent : ""} disabled={!rootParent} onChange={(event) => setForm({ ...form, parent: event.target.value || rootParent })}><option value="">No subcategory</option>{categories.filter((item) => item._id !== initialCategory?._id && String(item.parent?._id || item.parent || "") === String(rootParent)).map((category) => <option key={category._id} value={category._id}>{category.name}</option>)}</select></label>
    </div>
    <label><span>Description</span><textarea value={form.description || ""} onChange={(event) => setForm({ ...form, description: event.target.value })} /></label>
    <label><span>Image URL</span><input value={form.imageUrl || ""} onChange={(event) => setForm({ ...form, imageUrl: event.target.value })} /></label>
    <label className="uploadBox compactUpload"><ImagePlus size={18} /><span>Upload image</span><input type="file" accept="image/*" onChange={uploadImage} /></label>
    {form.imageUrl && <img className="formPreviewImage" src={form.imageUrl} alt="" />}{status && <p className="mutedText">{status}</p>}
    <label className="toggleRow"><input type="checkbox" checked={Boolean(form.isActive)} onChange={(event) => setForm({ ...form, isActive: event.target.checked })} /><span>Active</span></label>
    <button className="primaryButton" type="submit"><Save size={18} /> {initialCategory ? "Update Category" : "Save Category"}</button>
  </form>;
}

function TaxCategoryEditor({ initialTax, onBack, onSave }) {
  const [form, setForm] = useState(() => initialTax ? { ...initialTax } : { name: "", code: "", rate: "", description: "", isActive: true });
  return <form className="panel formPanel" onSubmit={async (event) => { event.preventDefault(); await onSave({ ...form, rate: Number(form.rate) }); }}>
    <div className="panelHeader"><h2>{initialTax ? "Edit Tax" : "Add Tax"}</h2><button className="inlineButton" type="button" onClick={onBack}>← Back to taxes</button></div>
    <label><span>Name</span><input value={form.name || ""} onChange={(event) => setForm({ ...form, name: event.target.value })} required /></label>
    <label><span>Code</span><input value={form.code || ""} onChange={(event) => setForm({ ...form, code: event.target.value })} required /></label>
    <label><span>Rate %</span><input type="number" min="0" step="0.01" value={form.rate ?? ""} onChange={(event) => setForm({ ...form, rate: event.target.value })} required /></label>
    <label><span>Description</span><textarea value={form.description || ""} onChange={(event) => setForm({ ...form, description: event.target.value })} /></label>
    <label className="toggleRow"><input type="checkbox" checked={Boolean(form.isActive)} onChange={(event) => setForm({ ...form, isActive: event.target.checked })} /><span>Active</span></label>
    <button className="primaryButton" type="submit"><Save size={18} /> {initialTax ? "Update Tax" : "Save Tax"}</button>
  </form>;
}

function ConfirmDeleteModal({ recordName, recordType, onCancel, onConfirm }) {
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState("");
  const confirm = async () => {
    setDeleting(true);
    setError("");
    try { await onConfirm(); } catch (deleteError) { setError(deleteError.message || "Unable to delete this record."); setDeleting(false); }
  };
  return <div className="modalOverlay" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget && !deleting) onCancel(); }}>
    <section className="confirmDeleteModal" role="alertdialog" aria-modal="true" aria-labelledby="delete-confirm-title">
      <div className="confirmDeleteIcon"><AlertTriangle size={24} /></div>
      <h2 id="delete-confirm-title">Delete {recordType}?</h2>
      <p>You are about to permanently delete <strong>{recordName}</strong>. This action cannot be undone.</p>
      {error && <p className="errorText">{error}</p>}
      <div className="confirmDeleteActions">
        <button className="inlineButton" type="button" disabled={deleting} onClick={onCancel}>Cancel</button>
        <button className="dangerButton" type="button" disabled={deleting} onClick={confirm}>{deleting ? "Deleting…" : "Delete"}</button>
      </div>
    </section>
  </div>;
}

function Customers({ customers }) {
  return (
    <section className="panel">
      <div className="panelHeader">
        <h2>Customer Database</h2>
      </div>
      <DataTable
        rows={customers}
        columns={[
          { key: "name", label: "Name" },
          { key: "email", label: "Email" },
          { key: "phone", label: "Phone" },
          { key: "status", label: "Status", render: (row) => <span className="badge">{row.status}</span> },
          { key: "storeCredit", label: "Credit", render: (row) => money(row.storeCredit) }
        ]}
      />
    </section>
  );
}

function BlogManager({ categories, posts, onCreatePost, onEditPost, onSaveCategory, onDeleteCategory, onDeletePost }) {
  const [categoryForm, setCategoryForm] = useState({ name: "", slug: "", parent: "", description: "", isActive: true });
  const resetCategory = () => setCategoryForm({ name: "", slug: "", parent: "", description: "", isActive: true });
  const parentOptions = categories.filter((category) => category._id !== categoryForm._id);

  return (
    <section className="contentStack">
      <div className="panel widePanel">
        <div className="panelHeader">
          <h2>Blog Posts</h2>
          <button className="primaryButton" type="button" onClick={onCreatePost}><Plus size={18} /> New Post</button>
        </div>
        <DataTable
          rows={posts}
          columns={[
            { key: "title", label: "Title" },
            { key: "category", label: "Category", render: (row) => row.category?.name || "Unassigned" },
            { key: "publishedAt", label: "Published", render: (row) => (row.publishedAt ? new Date(row.publishedAt).toLocaleDateString("en-IN") : "Draft") },
            { key: "isActive", label: "Active", render: (row) => (row.isActive ? "Yes" : "No") },
            {
              key: "actions",
              label: "Actions",
              render: (row) => (
                <div className="tableActions">
                  <button type="button" title="Edit post" onClick={() => onEditPost(row)}><FileText size={16} /></button>
                  <button type="button" title="Delete post" onClick={() => onDeletePost(row)}><Trash2 size={16} /></button>
                </div>
              )
            }
          ]}
        />
      </div>

      <div className="twoColumn">
        <div className="panel widePanel">
          <div className="panelHeader"><h2>Blog Categories</h2><PackageSearch size={18} /></div>
          <DataTable
            rows={categories}
            columns={[
              { key: "name", label: "Name" },
              { key: "slug", label: "Slug" },
              { key: "parent", label: "Parent", render: (row) => row.parent?.name || "Parent" },
              { key: "isActive", label: "Active", render: (row) => (row.isActive ? "Yes" : "No") },
              {
                key: "actions",
                label: "Actions",
                render: (row) => (
                  <div className="tableActions">
                    <button type="button" title="Edit category" onClick={() => setCategoryForm({ ...row, parent: row.parent?._id || "" })}><FileText size={16} /></button>
                    <button type="button" title="Delete category" onClick={() => onDeleteCategory(row)}><Trash2 size={16} /></button>
                  </div>
                )
              }
            ]}
          />
        </div>
        <form className="panel formPanel" onSubmit={(event) => { event.preventDefault(); onSaveCategory(categoryForm); resetCategory(); }}>
          <div className="panelHeader"><h2>{categoryForm._id ? "Edit Category" : "New Category"}</h2><Save size={18} /></div>
          <label><span>Name</span><input value={categoryForm.name || ""} onChange={(event) => setCategoryForm({ ...categoryForm, name: event.target.value })} required /></label>
          <label><span>Slug</span><input value={categoryForm.slug || ""} onChange={(event) => setCategoryForm({ ...categoryForm, slug: event.target.value })} placeholder="Auto-generated from name" /></label>
          <label><span>Parent category</span>
            <select value={categoryForm.parent || ""} onChange={(event) => setCategoryForm({ ...categoryForm, parent: event.target.value })}>
              <option value="">None - top level parent</option>
              {parentOptions.map((category) => <option key={category._id} value={category._id}>{category.name}</option>)}
            </select>
          </label>
          <label><span>Description</span><textarea value={categoryForm.description || ""} onChange={(event) => setCategoryForm({ ...categoryForm, description: event.target.value })} /></label>
          <label className="toggleRow"><input type="checkbox" checked={categoryForm.isActive !== false} onChange={(event) => setCategoryForm({ ...categoryForm, isActive: event.target.checked })} /><span>Active</span></label>
          <button className="primaryButton" type="submit"><Save size={18} /> Save Category</button>
          <button className="inlineButton" type="button" onClick={resetCategory}>New Category</button>
        </form>
      </div>
    </section>
  );
}

function BlogPostEditor({ categories, initialPost, onBack, onSave }) {
  const [postForm, setPostForm] = useState(() => ({
    title: "",
    slug: "",
    excerpt: "",
    content: "",
    imageUrl: "",
    authorName: "Store Team",
    isActive: true,
    ...(initialPost || {}),
    category: initialPost?.category?._id || initialPost?.category || "",
    publishedAt: initialPost?.publishedAt ? new Date(initialPost.publishedAt).toISOString().slice(0, 10) : new Date().toISOString().slice(0, 10)
  }));
  const [uploadStatus, setUploadStatus] = useState("");

  const uploadBlogImage = async (event) => {
    const file = event.target.files?.[0];
    if (!file) return;
    setUploadStatus("Optimizing blog image...");
    const optimized = await optimizeImage(file, { maxWidth: 1400, maxHeight: 900, quality: 0.82 });
    setPostForm((current) => ({ ...current, imageUrl: optimized.url }));
    setUploadStatus(`Image ready at ${optimized.width}x${optimized.height}.`);
  };

  return (
    <form className="panel formPanel blogEditorPage" onSubmit={(event) => { event.preventDefault(); onSave(postForm); }}>
      <div className="panelHeader">
        <h2>{postForm._id ? "Edit Post" : "New Post"}</h2>
        <div className="toolbar">
          <button className="inlineButton" type="button" onClick={onBack}>Back to Blog</button>
          <button className="primaryButton" type="submit"><Save size={18} /> Save Post</button>
        </div>
      </div>
      <div className="formGrid">
        <label><span>Title</span><input value={postForm.title || ""} onChange={(event) => setPostForm({ ...postForm, title: event.target.value })} required /></label>
        <label><span>Slug</span><input value={postForm.slug || ""} onChange={(event) => setPostForm({ ...postForm, slug: event.target.value })} placeholder="Auto-generated from title" /></label>
        <label><span>Category</span>
          <select value={postForm.category || ""} onChange={(event) => setPostForm({ ...postForm, category: event.target.value })}>
            <option value="">No category</option>
            {categories.map((category) => (
              <option key={category._id} value={category._id}>
                {category.parent?.name ? `${category.parent.name} / ${category.name}` : category.name}
              </option>
            ))}
          </select>
        </label>
        <label><span>Author</span><input value={postForm.authorName || ""} onChange={(event) => setPostForm({ ...postForm, authorName: event.target.value })} /></label>
        <label><span>Publish date</span><input type="date" value={postForm.publishedAt || ""} onChange={(event) => setPostForm({ ...postForm, publishedAt: event.target.value })} /></label>
        <label className="toggleRow"><input type="checkbox" checked={postForm.isActive !== false} onChange={(event) => setPostForm({ ...postForm, isActive: event.target.checked })} /><span>Active</span></label>
      </div>
      <label><span>Excerpt</span><textarea value={postForm.excerpt || ""} onChange={(event) => setPostForm({ ...postForm, excerpt: event.target.value })} /></label>
      <RichTextEditor value={postForm.content || ""} onChange={(content) => setPostForm({ ...postForm, content })} />
      <label className="uploadBox compactUpload"><ImagePlus size={18} /><span>Upload blog image</span><input type="file" accept="image/*" onChange={uploadBlogImage} /></label>
      {postForm.imageUrl && <img className="formPreviewImage" src={postForm.imageUrl} alt="" />}
      {uploadStatus && <p className="mutedText">{uploadStatus}</p>}
    </form>
  );
}

function RichTextEditor({ value, onChange }) {
  const [linkUrl, setLinkUrl] = useState("");
  const editorRef = useRef(null);

  useEffect(() => {
    if (editorRef.current && editorRef.current.innerHTML !== value) {
      editorRef.current.innerHTML = value || "";
    }
  }, [value]);

  const runCommand = (command, commandValue = null) => {
    document.execCommand(command, false, commandValue);
    if (editorRef.current) onChange(editorRef.current.innerHTML);
  };

  return (
    <div className="richTextField">
      <span>Content</span>
      <div className="richToolbar">
        <button type="button" title="Bold" onClick={() => runCommand("bold")}><Bold size={16} /></button>
        <button type="button" title="Italic" onClick={() => runCommand("italic")}><Italic size={16} /></button>
        <button type="button" title="Bullet list" onClick={() => runCommand("insertUnorderedList")}><List size={16} /></button>
        <input value={linkUrl} onChange={(event) => setLinkUrl(event.target.value)} placeholder="https://example.com" />
        <button type="button" title="Add link" onClick={() => { if (linkUrl) runCommand("createLink", linkUrl); setLinkUrl(""); }}><Link size={16} /></button>
      </div>
      <div
        ref={editorRef}
        className="richEditor"
        contentEditable
        onInput={(event) => onChange(event.currentTarget.innerHTML)}
      />
    </div>
  );
}

function Marketing({ promotions, promotionForm, setPromotionForm, createPromotion, updatePromotion }) {
  return (
    <section className="twoColumn">
      <div className="panel widePanel">
        <div className="panelHeader">
          <h2>Discount Codes</h2>
        </div>
        <DataTable
          rows={promotions}
          columns={[
            { key: "code", label: "Code" },
            { key: "name", label: "Campaign" },
            { key: "type", label: "Type" },
            { key: "audience", label: "Audience", render: (row) => (row.audience === "first_order" ? "First order" : "All customers") },
            { key: "value", label: "Value" },
            { key: "maxDiscountAmount", label: "Max", render: (row) => (row.maxDiscountAmount ? money(row.maxDiscountAmount) : "No cap") },
            { key: "minimumOrderValue", label: "Threshold", render: (row) => money(row.minimumOrderValue) },
            { key: "isActive", label: "Active", render: (row) => (row.isActive ? "Yes" : "No") },
            {
              key: "actions",
              label: "Actions",
              render: (row) => (
                <button className="inlineButton miniButton" type="button" onClick={() => updatePromotion(row, { ...row, isActive: !row.isActive })}>
                  {row.isActive ? "Turn off" : "Turn on"}
                </button>
              )
            }
          ]}
        />
      </div>
      <form className="panel formPanel" onSubmit={createPromotion}>
        <div className="panelHeader">
          <h2>New Promotion</h2>
          <Plus size={18} />
        </div>
        {["code", "name", "value", "maxDiscountAmount", "minimumOrderValue"].map((field) => (
          <label key={field}>
            <span>{field}</span>
            <input type={["value", "maxDiscountAmount", "minimumOrderValue"].includes(field) ? "number" : "text"} value={promotionForm[field]} onChange={(event) => setPromotionForm({ ...promotionForm, [field]: event.target.value })} required={field !== "maxDiscountAmount"} />
          </label>
        ))}
        <select value={promotionForm.type} onChange={(event) => setPromotionForm({ ...promotionForm, type: event.target.value })}>
          <option value="percentage">Percentage</option>
          <option value="fixed">Fixed Amount</option>
          <option value="free_shipping">Free Shipping</option>
        </select>
        <select value={promotionForm.audience} onChange={(event) => setPromotionForm({ ...promotionForm, audience: event.target.value })}>
          <option value="all">All customers</option>
          <option value="first_order">First order only</option>
        </select>
        <label><span>Starts at</span><input type="date" value={promotionForm.startsAt || ""} onChange={(event) => setPromotionForm({ ...promotionForm, startsAt: event.target.value })} /></label>
        <label><span>Ends at</span><input type="date" value={promotionForm.endsAt || ""} onChange={(event) => setPromotionForm({ ...promotionForm, endsAt: event.target.value })} /></label>
        <label className="toggleRow"><input type="checkbox" checked={Boolean(promotionForm.isActive)} onChange={(event) => setPromotionForm({ ...promotionForm, isActive: event.target.checked })} /><span>Active</span></label>
        <button className="primaryButton" type="submit">
          <Plus size={18} /> Create Code
        </button>
      </form>
    </section>
  );
}

function OperationsSettings({
  paymentMethods,
  shippingRules,
  storefrontSettings,
  shipRocketSettings,
  products,
  categories,
  onSavePayment,
  onSaveShipping,
  onDeletePayment,
  onDeleteShipping,
  onSaveStorefront,
  onSaveShipRocket
}) {
  const [paymentForm, setPaymentForm] = useState(paymentMethods[0] || { code: "cod", name: "Cash on Delivery", type: "cod", isActive: true, sortOrder: 1, razorpay: {} });
  const [shippingForm, setShippingForm] = useState(shippingRules[0] || { name: "Flat Rate", type: "flat_rate", isActive: true, flatRate: 8, freeShippingAbove: 75, weightBands: [] });
  const [storeForm, setStoreForm] = useState(storefrontSettings || {});
  const [shipForm, setShipForm] = useState(shipRocketSettings || {});
  const [emailForm, setEmailForm] = useState({ host: "", port: 587, secure: false, username: "", password: "", fromName: "HRSBasket", fromEmail: "" });
  const [testEmailAddress, setTestEmailAddress] = useState("");
  const [settingsTab, setSettingsTab] = useState("payments");
  const [uploadStatus, setUploadStatus] = useState("");
  const [settingsMessage, setSettingsMessage] = useState("");
  const [savingSettings, setSavingSettings] = useState(false);
  const [expandedHomeSection, setExpandedHomeSection] = useState("");
  const [draggedHomeSection, setDraggedHomeSection] = useState(null);

  useEffect(() => setStoreForm(storefrontSettings || {}), [storefrontSettings]);
  useEffect(() => setShipForm(shipRocketSettings || {}), [shipRocketSettings]);
  useEffect(() => { if (settingsTab === "email") api.emailSettings().then(setEmailForm).catch((error) => setSettingsMessage(error.message)); }, [settingsTab]);

  const updatePayment = (field, value) => setPaymentForm((current) => ({ ...current, [field]: value }));
  const updateRazorpay = (field, value) => setPaymentForm((current) => ({ ...current, razorpay: { ...current.razorpay, [field]: value } }));
  const updateShipping = (field, value) => setShippingForm((current) => ({ ...current, [field]: value }));
  const pages = storeForm.pages?.length ? storeForm.pages : [{ title: "", slug: "", menu: "footer", content: "", isActive: true }];
  const footerColumns = storeForm.footerColumns || [];
  const promoBanner = {
    title: "Spring sale",
    line1: "Premium comfort, template-polished storefront",
    line2: "Inspired by the imported ecommerce theme: sharper merchandising, richer imagery, and clear product paths.",
    buttonText: "Explore Now",
    linkUrl: "#/products",
    imageUrl: "/images/e-commerce/home/promo.png",
    ...(storeForm.promoBanner || {})
  };
  const benefitItems = storeForm.benefitItems?.length
    ? storeForm.benefitItems
    : [
        { icon: "/images/e-commerce/home/car.svg", title: "Free Shipping", text: "Free delivery for orders above your store threshold." },
        { icon: "/images/e-commerce/home/headphones.svg", title: "24/7 Support", text: "Fast help for product, delivery, and return questions." },
        { icon: "/images/e-commerce/home/Sync.svg", title: "Easy Returns", text: "Simple exchanges and refunds with clear tracking." }
      ];
  const homeSectionTypes = [
    ["shipping_info", "Shipping info"],
    ["browse_collections", "Browse Collections"],
    ["seasonal_banner", "Seasonal banner"],
    ["new_arrivals", "New Arrival"],
    ["promo_banner", "Banner"],
    ["blog", "Blog"],
    ["instagram", "Instagram"],
    ["custom_banner", "Custom banner"],
    ["category_products", "Category products"],
    ["custom_content", "Custom content"]
  ];
  const homeSections = storeForm.homeSections?.length
    ? [...storeForm.homeSections].sort((a, b) => (a.sortOrder || 0) - (b.sortOrder || 0))
    : [
        { type: "shipping_info", title: "Shipping info", isActive: true, sortOrder: 1 },
        { type: "browse_collections", title: "Browse Collections", isActive: true, sortOrder: 2 },
        { type: "seasonal_banner", title: "Seasonal banner", isActive: true, sortOrder: 3 },
        { type: "new_arrivals", title: "New Arrival", isActive: true, sortOrder: 4 },
        { type: "promo_banner", title: "Banner", isActive: true, sortOrder: 5 },
        { type: "blog", title: "Blog", isActive: true, sortOrder: 6 }
      ];
  const heroItems = storeForm.heroItems?.length
    ? storeForm.heroItems
    : [{ title: storeForm.hero?.title || "", subtitle: storeForm.hero?.subtitle || "", imageUrl: storeForm.hero?.imageUrl || "", linkUrl: storeForm.hero?.linkUrl || "#/products", isActive: true, sortOrder: 1 }];
  const contentSections = storeForm.contentSections?.length
    ? storeForm.contentSections
    : [
        {
          title: "Seasonal banners",
          subtitle: "",
          locations: ["home_before_new_arrivals"],
          columns: 2,
          isActive: true,
          sortOrder: 1,
          items: [{ type: "image_text", title: "", text: "", imageUrl: "", linkUrl: "#/products", linkLabel: "Shop now" }]
        }
      ];
  const updateContentSection = (index, patch) => {
    const next = [...contentSections];
    next[index] = { ...next[index], ...patch };
    setStoreForm({ ...storeForm, contentSections: next });
  };
  const updateContentItem = (sectionIndex, itemIndex, patch) => {
    const next = [...contentSections];
    const items = next[sectionIndex].items?.length ? [...next[sectionIndex].items] : [];
    items[itemIndex] = { ...items[itemIndex], ...patch };
    next[sectionIndex] = { ...next[sectionIndex], items };
    setStoreForm({ ...storeForm, contentSections: next });
  };
  const updatePromoBanner = (patch) => setStoreForm((current) => ({ ...current, promoBanner: { ...promoBanner, ...patch } }));
  const updateBenefit = (index, patch) => {
    const next = [...benefitItems];
    next[index] = { ...next[index], ...patch };
    setStoreForm({ ...storeForm, benefitItems: next });
  };
  const setHomeSections = (nextSections) => {
    setStoreForm({
      ...storeForm,
      homeSections: nextSections.map((section, index) => ({ ...section, sortOrder: index + 1 }))
    });
  };
  const updateHomeSection = (index, patch) => {
    const next = [...homeSections];
    next[index] = { ...next[index], ...patch };
    setHomeSections(next);
  };
  const updateHomeSectionItem = (sectionIndex, itemIndex, patch) => {
    const next = [...homeSections];
    const items = next[sectionIndex].items?.length ? [...next[sectionIndex].items] : [];
    items[itemIndex] = { ...items[itemIndex], ...patch };
    next[sectionIndex] = { ...next[sectionIndex], items };
    setHomeSections(next);
  };
  const reorderHomeSection = (index, target) => {
    if (index === target || target < 0 || target >= homeSections.length) return;
    const next = [...homeSections];
    const [moved] = next.splice(index, 1);
    next.splice(target, 0, moved);
    setHomeSections(next);
  };
  const homeSectionsPayload = () =>
    homeSections.map((section) => ({
      ...section,
      category: section.category?._id || section.category || undefined
    }));
  const uploadSettingImage = async (event, apply) => {
    const file = event.target.files?.[0];
    if (!file) return;
    setUploadStatus("Optimizing image...");
    const optimized = await optimizeImage(file, { maxWidth: 1800, maxHeight: 1200, quality: 0.82 });
    apply(optimized.url);
    setUploadStatus(`Image ready at ${optimized.width}x${optimized.height}.`);
  };
  const runSettingAction = async (action, successMessage) => {
    setSavingSettings(true);
    setSettingsMessage("Saving changes...");
    try {
      await action();
      setSettingsMessage(successMessage);
    } catch (error) {
      setSettingsMessage(`Changes were not saved: ${error.message}`);
    } finally {
      setSavingSettings(false);
    }
  };

  return (
    <section className="contentStack" onChange={() => setSettingsMessage("You have unsaved changes.")}>
      <div className="settingsTabs">
        {[
          ["payments", "Payment Methods"],
          ["shipping", "Shipping Rules"],
          ["shiprocket", "ShipRocket Setting"],
          ["email", "Email / SMTP"],
          ["pages", "Pages"],
          ["footer", "Footer"],
          ["storefront", "Custom Storefront"],
          ["home", "Home Content"],
          ["home-sections", "Home Sections"],
          ["hero", "Hero Settings"],
          ["sections", "Banner Sections"]
        ].map(([id, label]) => (
          <button className={settingsTab === id ? "active" : ""} key={id} type="button" onClick={() => setSettingsTab(id)}>
            {label}
          </button>
        ))}
      </div>
      {settingsMessage && (
        <div className={settingsMessage.startsWith("Changes were not saved") ? "notice errorText" : "notice"} role="status" aria-live="polite">
          {settingsMessage}
        </div>
      )}

      {settingsTab === "payments" && (
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
          </select>
          <label className="toggleRow"><input type="checkbox" checked={Boolean(paymentForm.isActive)} onChange={(event) => updatePayment("isActive", event.target.checked)} /><span>Active</span></label>
          {paymentForm.type === "razorpay" && (
            <>
              <label><span>Key ID</span><input value={paymentForm.razorpay?.keyId || ""} onChange={(event) => updateRazorpay("keyId", event.target.value)} /></label>
              <label><span>Key Secret</span><input value={paymentForm.razorpay?.keySecret || ""} onChange={(event) => updateRazorpay("keySecret", event.target.value)} /></label>
              <label><span>Merchant ID</span><input value={paymentForm.razorpay?.merchantId || ""} onChange={(event) => updateRazorpay("merchantId", event.target.value)} /></label>
              <label><span>Webhook Secret</span><input value={paymentForm.razorpay?.webhookSecret || ""} onChange={(event) => updateRazorpay("webhookSecret", event.target.value)} /></label>
              <select value={paymentForm.razorpay?.environment || "test"} onChange={(event) => updateRazorpay("environment", event.target.value)}>
                <option value="test">Test</option>
                <option value="live">Live</option>
              </select>
            </>
          )}
          <button className="primaryButton" type="submit" disabled={savingSettings}><Save size={18} /> {savingSettings ? "Saving..." : "Save Payment"}</button>
          <button className="inlineButton" type="button" onClick={() => setPaymentForm({ code: "", name: "", type: "cod", isActive: true, sortOrder: paymentMethods.length + 1, razorpay: {} })}>New Payment Method</button>
        </form>
      </div>
      )}

      {settingsTab === "shipping" && (
      <div className="twoColumn">
        <div className="panel widePanel">
          <div className="panelHeader"><h2>Shipping Rules</h2><Truck size={18} /></div>
          <DataTable
            rows={shippingRules}
            columns={[
              { key: "name", label: "Rule" },
              { key: "type", label: "Type" },
              { key: "flatRate", label: "Rate", render: (row) => money(row.flatRate) },
              { key: "isActive", label: "Active", render: (row) => (row.isActive ? "Yes" : "No") },
              { key: "shiprocketEnabled", label: "ShipRocket", render: (row) => (row.shiprocketEnabled ? "Yes" : "No") },
              {
                key: "actions",
                label: "Actions",
                render: (row) => (
                  <div className="tableActions">
                    <button type="button" title="Edit shipping rule" onClick={() => setShippingForm(row)}><FileText size={16} /></button>
                    <button type="button" title="Delete shipping rule" onClick={() => runSettingAction(() => onDeleteShipping(row), `${row.name} shipping rule deleted successfully.`)}><Trash2 size={16} /></button>
                  </div>
                )
              }
            ]}
          />
        </div>
        <form className="panel formPanel" onSubmit={(event) => { event.preventDefault(); runSettingAction(() => onSaveShipping(shippingForm), `${shippingForm.name} shipping rule saved successfully.`); }}>
          <div className="panelHeader"><h2>Shipping Setup</h2><Save size={18} /></div>
          <label><span>Name</span><input value={shippingForm.name || ""} onChange={(event) => updateShipping("name", event.target.value)} required /></label>
          <select value={shippingForm.type || "flat_rate"} onChange={(event) => updateShipping("type", event.target.value)}>
            <option value="flat_rate">Flat Rate</option>
            <option value="weight_based">Weight Based</option>
          </select>
          <label><span>Flat rate</span><input type="number" value={shippingForm.flatRate || 0} onChange={(event) => updateShipping("flatRate", Number(event.target.value))} /></label>
          <label><span>Free shipping above</span><input type="number" value={shippingForm.freeShippingAbove || 0} onChange={(event) => updateShipping("freeShippingAbove", Number(event.target.value))} /></label>
          <label><span>Weight bands (min-max-rate, comma separated)</span><input value={(shippingForm.weightBands || []).map((band) => `${band.minWeight}-${band.maxWeight}-${band.rate}`).join(", ")} onChange={(event) => updateShipping("weightBands", event.target.value.split(",").map((part) => { const [minWeight, maxWeight, rate] = part.trim().split("-").map(Number); return { minWeight, maxWeight, rate }; }).filter((band) => Number.isFinite(band.maxWeight) && Number.isFinite(band.rate)))} /></label>
          <label className="toggleRow"><input type="checkbox" checked={Boolean(shippingForm.isActive)} onChange={(event) => updateShipping("isActive", event.target.checked)} /><span>Active</span></label>
          <label className="toggleRow"><input type="checkbox" checked={Boolean(shippingForm.shiprocketEnabled)} onChange={(event) => updateShipping("shiprocketEnabled", event.target.checked)} /><span>Use ShipRocket</span></label>
          <button className="primaryButton" type="submit" disabled={savingSettings}><Save size={18} /> {savingSettings ? "Saving..." : "Save Shipping"}</button>
          <button className="inlineButton" type="button" onClick={() => setShippingForm({ name: "", type: "flat_rate", isActive: true, flatRate: 0, freeShippingAbove: 0, weightBands: [] })}>New Shipping Rule</button>
        </form>
      </div>
      )}

      {settingsTab === "email" && (
        <form className="panel formPanel" onSubmit={(event) => { event.preventDefault(); runSettingAction(() => api.saveEmailSettings(emailForm), "Email settings saved successfully."); }}>
          <div className="panelHeader"><h2>Email / SMTP Settings</h2><Settings size={18} /></div>
          <label><span>SMTP host</span><input required placeholder="smtp.example.com" value={emailForm.host || ""} onChange={(event) => setEmailForm({ ...emailForm, host: event.target.value })} /></label>
          <label><span>Port</span><input required type="number" value={emailForm.port || 587} onChange={(event) => setEmailForm({ ...emailForm, port: Number(event.target.value) })} /></label>
          <label className="toggleRow"><input type="checkbox" checked={Boolean(emailForm.secure)} onChange={(event) => setEmailForm({ ...emailForm, secure: event.target.checked })} /><span>Use SSL/TLS (usually port 465)</span></label>
          <label><span>Username</span><input value={emailForm.username || ""} onChange={(event) => setEmailForm({ ...emailForm, username: event.target.value })} /></label>
          <label><span>Password</span><input type="password" placeholder={emailForm.password === "********" ? "Saved password" : "SMTP password"} value={emailForm.password || ""} onChange={(event) => setEmailForm({ ...emailForm, password: event.target.value })} /></label>
          <label><span>From name</span><input required value={emailForm.fromName || ""} onChange={(event) => setEmailForm({ ...emailForm, fromName: event.target.value })} /></label>
          <label><span>From email</span><input required type="email" value={emailForm.fromEmail || ""} onChange={(event) => setEmailForm({ ...emailForm, fromEmail: event.target.value })} /></label>
          <button className="primaryButton" type="submit" disabled={savingSettings}><Save size={18} /> {savingSettings ? "Saving..." : "Save Email Settings"}</button>
          <div className="smtpTestBox"><strong>Test SMTP email</strong><p>Enter an email address to receive a test message after saving your SMTP settings.</p><label><span>Test recipient email</span><input type="email" placeholder="you@example.com" value={testEmailAddress} onChange={(event) => setTestEmailAddress(event.target.value)} /></label><button className="inlineButton" type="button" disabled={savingSettings || !testEmailAddress} onClick={() => runSettingAction(() => api.sendTestEmail(testEmailAddress), `Test email sent to ${testEmailAddress}.`)}>Send test email</button></div>
        </form>
      )}

      {settingsTab === "pages" && (
        <section className="contentStack">
          <div className="panelHeader"><div><h2>Pages</h2><p className="mutedText">Create the content pages available across your storefront.</p></div><button className="inlineButton" type="button" onClick={() => setStoreForm({ ...storeForm, pages: [...pages, { title: "", slug: "", content: "", menu: "hidden", isActive: true }] })}>Add page</button></div>
          {pages.map((page, index) => <article className="panel pageEditor" key={page._id || index}><div className="panelHeader"><h3>Page {index + 1}</h3><button className="inlineButton" type="button" onClick={() => setStoreForm({ ...storeForm, pages: pages.filter((_, itemIndex) => itemIndex !== index) })}>Remove</button></div><div className="formGrid twoColumn"><label><span>Page title</span><input required value={page.title || ""} onChange={(event) => { const next = [...pages]; next[index] = { ...page, title: event.target.value, slug: page.slug || event.target.value.toLowerCase().trim().replace(/[^a-z0-9]+/g, "-") }; setStoreForm({ ...storeForm, pages: next }); }} /></label><label><span>URL slug</span><input required value={page.slug || ""} onChange={(event) => { const next = [...pages]; next[index] = { ...page, slug: event.target.value.toLowerCase().replace(/[^a-z0-9-]/g, "") }; setStoreForm({ ...storeForm, pages: next }); }} /></label><label><span>Menu visibility</span><select value={page.menu || "hidden"} onChange={(event) => { const next = [...pages]; next[index] = { ...page, menu: event.target.value }; setStoreForm({ ...storeForm, pages: next }); }}><option value="hidden">Hidden</option><option value="header">Header</option><option value="footer">Footer</option><option value="both">Header and footer</option></select></label><label className="toggleRow"><input type="checkbox" checked={page.isActive !== false} onChange={(event) => { const next = [...pages]; next[index] = { ...page, isActive: event.target.checked }; setStoreForm({ ...storeForm, pages: next }); }} /><span>Published</span></label><label className="full"><span>Page content</span><textarea rows="10" value={page.content || ""} placeholder="Write page content here…" onChange={(event) => { const next = [...pages]; next[index] = { ...page, content: event.target.value }; setStoreForm({ ...storeForm, pages: next }); }} /></label></div></article>)}
          <button className="primaryButton" type="button" disabled={savingSettings} onClick={() => runSettingAction(() => onSaveStorefront(storeForm), "Pages saved successfully.")}><Save size={18} />Save pages</button>
        </section>
      )}

      {settingsTab === "footer" && (
        <section className="contentStack"><div className="panelHeader"><div><h2>Footer columns</h2><p className="mutedText">Drag columns to set their order. Add between 2 and 4 columns.</p></div><button className="inlineButton" type="button" disabled={footerColumns.length >= 4} onClick={() => setStoreForm({ ...storeForm, footerColumns: [...footerColumns, { title: "", type: "links", text: "", links: [{ label: "", url: "" }], pageIds: [], sortOrder: footerColumns.length }] })}>Add column</button></div><div className="footerColumnEditors">{footerColumns.map((column, index) => <article className="panel footerColumnEditor" key={column._id || index} draggable onDragStart={(event) => event.dataTransfer.setData("text/plain", String(index))} onDragOver={(event) => event.preventDefault()} onDrop={(event) => { const from = Number(event.dataTransfer.getData("text/plain")); const next = [...footerColumns]; const [moved] = next.splice(from, 1); next.splice(index, 0, moved); setStoreForm({ ...storeForm, footerColumns: next.map((item, order) => ({ ...item, sortOrder: order })) }); }}><div className="panelHeader"><h3>⋮⋮ Column {index + 1}</h3><button className="inlineButton" type="button" onClick={() => setStoreForm({ ...storeForm, footerColumns: footerColumns.filter((_, itemIndex) => itemIndex !== index) })}>Remove</button></div><label><span>Menu title</span><input value={column.title || ""} onChange={(event) => { const next = [...footerColumns]; next[index] = { ...column, title: event.target.value }; setStoreForm({ ...storeForm, footerColumns: next }); }} /></label><label><span>Content type</span><select value={column.type || "links"} onChange={(event) => { const next = [...footerColumns]; next[index] = { ...column, type: event.target.value }; setStoreForm({ ...storeForm, footerColumns: next }); }}><option value="text">Text</option><option value="links">Custom links</option><option value="pages">Pages</option></select></label>{column.type === "text" && <label><span>Text</span><textarea value={column.text || ""} onChange={(event) => { const next = [...footerColumns]; next[index] = { ...column, text: event.target.value }; setStoreForm({ ...storeForm, footerColumns: next }); }} /></label>}{column.type === "links" && <label><span>Links (label | URL, one per line)</span><textarea value={(column.links || []).map((link) => `${link.label || ""} | ${link.url || ""}`).join("\n")} onChange={(event) => { const links = event.target.value.split("\n").filter(Boolean).map((line) => { const [label, url] = line.split("|"); return { label: label?.trim() || "Link", url: url?.trim() || "#" }; }); const next = [...footerColumns]; next[index] = { ...column, links }; setStoreForm({ ...storeForm, footerColumns: next }); }} /></label>}{column.type === "pages" && <label><span>Pages to show</span><select multiple value={column.pageIds || []} onChange={(event) => { const next = [...footerColumns]; next[index] = { ...column, pageIds: [...event.target.selectedOptions].map((option) => option.value) }; setStoreForm({ ...storeForm, footerColumns: next }); }}>{pages.filter((page) => page.isActive !== false && page.title).map((page) => <option key={page._id || page.slug} value={page._id || page.slug}>{page.title}</option>)}</select></label>}</article>)}</div><button className="primaryButton" type="button" disabled={savingSettings} onClick={() => runSettingAction(() => onSaveStorefront(storeForm), "Footer saved successfully.")}><Save size={18} />Save footer</button></section>
      )}

      {settingsTab === "storefront" && (
      <div className="twoColumn">
        <form className="panel formPanel widePanel" onSubmit={(event) => { event.preventDefault(); runSettingAction(() => onSaveStorefront(storeForm), "Storefront settings saved successfully."); }}>
          <div className="panelHeader"><h2>Custom Storefront</h2><Save size={18} /></div>
          <div className="formGrid">
            <label><span>Project title</span><input value={storeForm.projectTitle || "E-commerce Admin"} onChange={(event) => setStoreForm({ ...storeForm, projectTitle: event.target.value })} /></label>
            <label><span>Shop name</span><input value={storeForm.shopName || ""} onChange={(event) => setStoreForm({ ...storeForm, shopName: event.target.value })} /></label>
            <label><span>Logo URL</span><input value={storeForm.logoUrl || ""} onChange={(event) => setStoreForm({ ...storeForm, logoUrl: event.target.value })} /></label>
            <label className="uploadBox compactUpload"><ImagePlus size={18} /><span>Upload logo</span><input type="file" accept="image/*" onChange={(event) => uploadSettingImage(event, (url) => setStoreForm((current) => ({ ...current, logoUrl: url })))} /></label>
            <label><span>Email</span><input value={storeForm.email || ""} onChange={(event) => setStoreForm({ ...storeForm, email: event.target.value })} /></label>
            <label><span>Phone</span><input value={storeForm.phone || ""} onChange={(event) => setStoreForm({ ...storeForm, phone: event.target.value })} /></label>
            <label><span>Products per row</span><select value={storeForm.productGridSize || 3} onChange={(event) => setStoreForm({ ...storeForm, productGridSize: Number(event.target.value) })}><option value="3">3 products</option><option value="4">4 products</option><option value="5">5 products</option></select></label>
            <label><span>Payment assurance</span><input value={storeForm.productAssurances?.securePayment || "Secure payment"} onChange={(event) => setStoreForm({ ...storeForm, productAssurances: { ...storeForm.productAssurances, securePayment: event.target.value } })} /></label>
            <label><span>Returns assurance</span><input value={storeForm.productAssurances?.returns || "30-day returns"} onChange={(event) => setStoreForm({ ...storeForm, productAssurances: { ...storeForm.productAssurances, returns: event.target.value } })} /></label>
            <label><span>Shipping assurance</span><input value={storeForm.productAssurances?.shipping || "Ships in 24 hours"} onChange={(event) => setStoreForm({ ...storeForm, productAssurances: { ...storeForm.productAssurances, shipping: event.target.value } })} /></label>
            <label className="toggleRow"><input type="checkbox" checked={Boolean(storeForm.partnerPaymentBypassEnabled)} onChange={(event) => setStoreForm({ ...storeForm, partnerPaymentBypassEnabled: event.target.checked })} /><span>Allow partner registration without payment (testing only)</span></label>
            <label className="toggleRow"><input type="checkbox" checked={Boolean(storeForm.showCodOtpOnScreen)} onChange={(event) => setStoreForm({ ...storeForm, showCodOtpOnScreen: event.target.checked })} /><span>Show Cash on Delivery OTP on checkout screen (testing only)</span></label>
          </div>
          <div className="panelHeader"><h3>Contact Us details</h3></div>
          <div className="formGrid">
            {[["address", "Address"], ["state", "State"], ["city", "City"], ["pincode", "Pincode"], ["email", "Contact email"], ["mobile", "Mobile"], ["phone", "Phone"], ["googleMapUrl", "Google Map link"]].map(([field, label]) => <label key={field}><span>{label}</span><input type={field === "email" ? "email" : field === "googleMapUrl" ? "url" : "text"} value={storeForm.contactDetails?.[field] || ""} onChange={(event) => setStoreForm({ ...storeForm, contactDetails: { ...storeForm.contactDetails, [field]: event.target.value } })} /></label>)}
          </div>
          {storeForm.logoUrl && <img className="formPreviewImage" src={storeForm.logoUrl} alt="" />}
          {uploadStatus && <p className="mutedText">{uploadStatus}</p>}
          <label><span>Address</span><textarea value={storeForm.address || ""} onChange={(event) => setStoreForm({ ...storeForm, address: event.target.value })} /></label>
          <div className="formGrid">
            {pages.slice(0, 2).map((page, index) => (
              <label key={index}><span>Custom page {index + 1}</span><input value={page.title || ""} placeholder="Title" onChange={(event) => { const next = [...pages]; next[index] = { ...next[index], title: event.target.value, slug: event.target.value.toLowerCase().replace(/\s+/g, "-"), isActive: true }; setStoreForm({ ...storeForm, pages: next }); }} /></label>
            ))}
          </div>
          <button className="primaryButton" type="submit" disabled={savingSettings}><Save size={18} /> {savingSettings ? "Saving..." : "Save Storefront"}</button>
        </form>
      </div>
      )}

      {settingsTab === "shiprocket" && (
      <div className="twoColumn">
        <form className="panel formPanel" onSubmit={(event) => { event.preventDefault(); runSettingAction(() => onSaveShipRocket(shipForm), "ShipRocket settings saved successfully."); }}>
          <div className="panelHeader"><h2>ShipRocket</h2><Truck size={18} /></div>
          <label className="toggleRow"><input type="checkbox" checked={Boolean(shipForm.isActive)} onChange={(event) => setShipForm({ ...shipForm, isActive: event.target.checked })} /><span>Active</span></label>
          {["email", "password", "pickupLocation", "channelId"].map((field) => (
            <label key={field}><span>{field}</span><input value={shipForm[field] || ""} onChange={(event) => setShipForm({ ...shipForm, [field]: event.target.value })} /></label>
          ))}
          <button className="primaryButton" type="submit" disabled={savingSettings}><Save size={18} /> {savingSettings ? "Saving..." : "Save ShipRocket"}</button>
        </form>
      </div>
      )}

      {settingsTab === "home-sections" && (
        <form className="panel formPanel widePanel" onSubmit={(event) => { event.preventDefault(); runSettingAction(() => onSaveStorefront({ ...storeForm, homeSections: homeSectionsPayload() }), "Home sections saved successfully."); }}>
          <div className="panelHeader">
            <h2>Home Sections</h2>
            <button
              className="inlineButton"
              type="button"
              onClick={() => setHomeSections([...homeSections, { type: "custom_content", title: "New Section", subtitle: "", columns: 2, isActive: true, sortOrder: homeSections.length + 1, items: [] }])}
            >
              <Plus size={16} /> Add Section
            </button>
          </div>
          <div className="heroEditorItem">
            <div className="heroEditorList">
              {homeSections.map((section, sectionIndex) => (
                <div
                  className="sectionColumnItem draggableSection"
                  draggable
                  key={section._id || `${section.type}-${sectionIndex}`}
                  onDragStart={(event) => {
                    setDraggedHomeSection(sectionIndex);
                    event.dataTransfer.effectAllowed = "move";
                  }}
                  onDragOver={(event) => event.preventDefault()}
                  onDrop={(event) => {
                    event.preventDefault();
                    reorderHomeSection(draggedHomeSection, sectionIndex);
                    setDraggedHomeSection(null);
                  }}
                  onDragEnd={() => setDraggedHomeSection(null)}
                >
                  <button
                    className="sectionCollapseHeader"
                    type="button"
                    onClick={() => setExpandedHomeSection(expandedHomeSection === String(sectionIndex) ? "" : String(sectionIndex))}
                  >
                    <GripVertical size={18} />
                    <span>
                      <strong>{section.title || homeSectionTypes.find(([value]) => value === section.type)?.[1] || "Home Section"}</strong>
                      <small>{homeSectionTypes.find(([value]) => value === section.type)?.[1] || section.type} · {section.isActive === false ? "Inactive" : "Active"}</small>
                    </span>
                    <b>{expandedHomeSection === String(sectionIndex) ? "Hide" : "Edit"}</b>
                  </button>
                  {expandedHomeSection === String(sectionIndex) && (
                    <>
                      <div className="formGrid">
                        <label><span>Type</span>
                          <select value={section.type || "custom_content"} onChange={(event) => updateHomeSection(sectionIndex, { type: event.target.value })}>
                            {homeSectionTypes.map(([value, label]) => <option key={value} value={value}>{label}</option>)}
                          </select>
                        </label>
                        <label><span>Title</span><input value={section.title || ""} onChange={(event) => updateHomeSection(sectionIndex, { title: event.target.value })} /></label>
                        <label><span>Subtitle</span><input value={section.subtitle || ""} onChange={(event) => updateHomeSection(sectionIndex, { subtitle: event.target.value })} /></label>
                        <label><span>Columns</span><input type="number" min="1" max="4" value={section.columns || 2} onChange={(event) => updateHomeSection(sectionIndex, { columns: Number(event.target.value) })} /></label>
                        <label className="toggleRow"><input type="checkbox" checked={section.isActive !== false} onChange={(event) => updateHomeSection(sectionIndex, { isActive: event.target.checked })} /><span>Active</span></label>
                        {section.type === "category_products" && (
                          <label><span>Category</span>
                            <select value={section.category?._id || section.category || ""} onChange={(event) => updateHomeSection(sectionIndex, { category: event.target.value })}>
                              <option value="">Select category</option>
                              {categories.map((category) => (
                                <option key={category._id} value={category._id}>{category.parent?.name ? `${category.parent.name} / ${category.name}` : category.name}</option>
                              ))}
                            </select>
                          </label>
                        )}
                      </div>
                      {section.type === "custom_banner" && (
                        <div className="formGrid">
                          <label><span>Banner title</span><input value={section.banner?.title || ""} onChange={(event) => updateHomeSection(sectionIndex, { banner: { ...(section.banner || {}), title: event.target.value } })} /></label>
                          <label><span>Line 1</span><input value={section.banner?.line1 || ""} onChange={(event) => updateHomeSection(sectionIndex, { banner: { ...(section.banner || {}), line1: event.target.value } })} /></label>
                          <label><span>Line 2</span><input value={section.banner?.line2 || ""} onChange={(event) => updateHomeSection(sectionIndex, { banner: { ...(section.banner || {}), line2: event.target.value } })} /></label>
                          <label><span>Button text</span><input value={section.banner?.buttonText || ""} onChange={(event) => updateHomeSection(sectionIndex, { banner: { ...(section.banner || {}), buttonText: event.target.value } })} /></label>
                          <label><span>Button link</span><input value={section.banner?.linkUrl || "#/products"} onChange={(event) => updateHomeSection(sectionIndex, { banner: { ...(section.banner || {}), linkUrl: event.target.value } })} /></label>
                          <label><span>Image URL</span><input value={section.banner?.imageUrl || ""} onChange={(event) => updateHomeSection(sectionIndex, { banner: { ...(section.banner || {}), imageUrl: event.target.value } })} /></label>
                          <label className="uploadBox compactUpload"><ImagePlus size={18} /><span>Upload banner image</span><input type="file" accept="image/*" onChange={(event) => uploadSettingImage(event, (url) => updateHomeSection(sectionIndex, { banner: { ...(section.banner || {}), imageUrl: url } }))} /></label>
                        </div>
                      )}
                      {section.type === "custom_content" && (
                        <div className="sectionColumnEditor">
                          {(section.items || []).map((item, itemIndex) => (
                            <div className="sectionColumnItem" key={item._id || itemIndex}>
                              <div className="formGrid">
                                <select value={item.type || "image_text"} onChange={(event) => updateHomeSectionItem(sectionIndex, itemIndex, { type: event.target.value })}>
                                  <option value="image_text">Image and text</option>
                                  <option value="image">Image only</option>
                                  <option value="text">Text only</option>
                                </select>
                                <label><span>Title</span><input value={item.title || ""} onChange={(event) => updateHomeSectionItem(sectionIndex, itemIndex, { title: event.target.value })} /></label>
                                <label><span>Text</span><input value={item.text || ""} onChange={(event) => updateHomeSectionItem(sectionIndex, itemIndex, { text: event.target.value })} /></label>
                                <label><span>Image URL</span><input value={item.imageUrl || ""} onChange={(event) => updateHomeSectionItem(sectionIndex, itemIndex, { imageUrl: event.target.value })} /></label>
                                <label><span>Link URL</span><input value={item.linkUrl || ""} onChange={(event) => updateHomeSectionItem(sectionIndex, itemIndex, { linkUrl: event.target.value })} /></label>
                                <label><span>Link label</span><input value={item.linkLabel || ""} onChange={(event) => updateHomeSectionItem(sectionIndex, itemIndex, { linkLabel: event.target.value })} /></label>
                              </div>
                              <label className="uploadBox compactUpload"><ImagePlus size={18} /><span>Upload image</span><input type="file" accept="image/*" onChange={(event) => uploadSettingImage(event, (url) => updateHomeSectionItem(sectionIndex, itemIndex, { imageUrl: url }))} /></label>
                              <button className="inlineButton" type="button" onClick={() => updateHomeSection(sectionIndex, { items: (section.items || []).filter((_item, index) => index !== itemIndex) })}><Trash2 size={16} /> Delete Content</button>
                            </div>
                          ))}
                          <button className="inlineButton" type="button" onClick={() => updateHomeSection(sectionIndex, { items: [...(section.items || []), { type: "image_text", title: "", text: "", imageUrl: "", linkUrl: "#/products", linkLabel: "Shop now" }] })}>Add Content</button>
                        </div>
                      )}
                      <div className="toolbar">
                        <button className="inlineButton" type="button" onClick={() => setHomeSections(homeSections.filter((_section, index) => index !== sectionIndex))}><Trash2 size={16} /> Delete Section</button>
                      </div>
                    </>
                  )}
                </div>
              ))}
            </div>
          </div>
          {uploadStatus && <p className="mutedText">{uploadStatus}</p>}
          <button className="primaryButton" type="submit" disabled={savingSettings}><Save size={18} /> {savingSettings ? "Saving..." : "Save Home Sections"}</button>
        </form>
      )}

      {settingsTab === "home" && (
        <form className="panel formPanel widePanel" onSubmit={(event) => { event.preventDefault(); runSettingAction(() => onSaveStorefront({ ...storeForm, promoBanner, benefitItems }), "Home content saved successfully."); }}>
          <div className="panelHeader"><h2>Home Content</h2><Save size={18} /></div>
          <div className="heroEditorItem">
            <div className="panelHeader"><h2>Sale Banner</h2></div>
            <div className="formGrid">
              <label><span>Title</span><input value={promoBanner.title || ""} onChange={(event) => updatePromoBanner({ title: event.target.value })} /></label>
              <label><span>Line 1</span><input value={promoBanner.line1 || ""} onChange={(event) => updatePromoBanner({ line1: event.target.value })} /></label>
              <label><span>Line 2</span><input value={promoBanner.line2 || ""} onChange={(event) => updatePromoBanner({ line2: event.target.value })} /></label>
              <label><span>Button text</span><input value={promoBanner.buttonText || ""} onChange={(event) => updatePromoBanner({ buttonText: event.target.value })} /></label>
              <label><span>Button link</span><input value={promoBanner.linkUrl || ""} onChange={(event) => updatePromoBanner({ linkUrl: event.target.value })} /></label>
              <label><span>Background image URL</span><input value={promoBanner.imageUrl || ""} onChange={(event) => updatePromoBanner({ imageUrl: event.target.value })} /></label>
            </div>
            <label className="uploadBox compactUpload"><ImagePlus size={18} /><span>Upload banner image</span><input type="file" accept="image/*" onChange={(event) => uploadSettingImage(event, (url) => updatePromoBanner({ imageUrl: url }))} /></label>
            {promoBanner.imageUrl && <img className="heroEditorPreview" src={promoBanner.imageUrl} alt="" />}
          </div>
          <div className="heroEditorItem">
            <div className="panelHeader"><h2>Home Benefits</h2></div>
            <div className="sectionColumnEditor">
              {benefitItems.map((item, index) => (
                <div className="sectionColumnItem" key={index}>
                  <div className="formGrid">
                    <label><span>Title</span><input value={item.title || ""} onChange={(event) => updateBenefit(index, { title: event.target.value })} /></label>
                    <label><span>Description</span><input value={item.text || ""} onChange={(event) => updateBenefit(index, { text: event.target.value })} /></label>
                    <label><span>Icon URL</span><input value={item.icon || ""} onChange={(event) => updateBenefit(index, { icon: event.target.value })} /></label>
                  </div>
                  <label className="uploadBox compactUpload"><ImagePlus size={18} /><span>Upload icon</span><input type="file" accept="image/*" onChange={(event) => uploadSettingImage(event, (url) => updateBenefit(index, { icon: url }))} /></label>
                </div>
              ))}
            </div>
          </div>
          {uploadStatus && <p className="mutedText">{uploadStatus}</p>}
          <button className="primaryButton" type="submit" disabled={savingSettings}><Save size={18} /> {savingSettings ? "Saving..." : "Save Home Content"}</button>
        </form>
      )}

      {settingsTab === "hero" && (
        <form className="panel formPanel" onSubmit={(event) => { event.preventDefault(); runSettingAction(() => onSaveStorefront({ ...storeForm, heroItems }), "Hero settings saved successfully."); }}>
          <div className="panelHeader"><h2>Hero Settings</h2><Save size={18} /></div>
          <div className="heroEditorList">
            {heroItems.map((item, index) => (
              <div className="heroEditorItem" key={item._id || index}>
                <div className="formGrid">
                  <label><span>Title</span><input value={item.title || ""} onChange={(event) => { const next = [...heroItems]; next[index] = { ...next[index], title: event.target.value }; setStoreForm({ ...storeForm, heroItems: next }); }} /></label>
                  <label><span>Subtitle</span><input value={item.subtitle || ""} onChange={(event) => { const next = [...heroItems]; next[index] = { ...next[index], subtitle: event.target.value }; setStoreForm({ ...storeForm, heroItems: next }); }} /></label>
                  <label><span>Image URL</span><input value={item.imageUrl || ""} onChange={(event) => { const next = [...heroItems]; next[index] = { ...next[index], imageUrl: event.target.value }; setStoreForm({ ...storeForm, heroItems: next }); }} /></label>
                  <label><span>Link URL</span><input value={item.linkUrl || "#/products"} onChange={(event) => { const next = [...heroItems]; next[index] = { ...next[index], linkUrl: event.target.value }; setStoreForm({ ...storeForm, heroItems: next }); }} /></label>
                  <label><span>Sort</span><input type="number" value={item.sortOrder || index + 1} onChange={(event) => { const next = [...heroItems]; next[index] = { ...next[index], sortOrder: Number(event.target.value) }; setStoreForm({ ...storeForm, heroItems: next }); }} /></label>
                  <label className="toggleRow"><input type="checkbox" checked={item.isActive !== false} onChange={(event) => { const next = [...heroItems]; next[index] = { ...next[index], isActive: event.target.checked }; setStoreForm({ ...storeForm, heroItems: next }); }} /><span>Active</span></label>
                </div>
                <label className="uploadBox compactUpload"><ImagePlus size={18} /><span>Upload hero image</span><input type="file" accept="image/*" onChange={(event) => uploadSettingImage(event, (url) => { const next = [...heroItems]; next[index] = { ...next[index], imageUrl: url }; setStoreForm({ ...storeForm, heroItems: next }); })} /></label>
                {item.imageUrl && <img className="heroEditorPreview" src={item.imageUrl} alt="" />}
                <button
                  className="inlineButton"
                  type="button"
                  onClick={() => setStoreForm({ ...storeForm, heroItems: heroItems.filter((_hero, heroIndex) => heroIndex !== index) })}
                >
                  <Trash2 size={16} /> Delete Hero
                </button>
              </div>
            ))}
          </div>
          {uploadStatus && <p className="mutedText">{uploadStatus}</p>}
          <div className="toolbar">
            <button className="inlineButton" type="button" onClick={() => setStoreForm({ ...storeForm, heroItems: [...heroItems, { title: "", subtitle: "", imageUrl: "", linkUrl: "#/products", isActive: true, sortOrder: heroItems.length + 1 }] })}>Add Hero</button>
            <button className="primaryButton" type="submit" disabled={savingSettings}><Save size={18} /> {savingSettings ? "Saving..." : "Save Heroes"}</button>
          </div>
        </form>
      )}

      {settingsTab === "sections" && (
        <form className="panel formPanel widePanel" onSubmit={(event) => { event.preventDefault(); runSettingAction(() => onSaveStorefront({ ...storeForm, contentSections }), "Banner sections saved successfully."); }}>
          <div className="panelHeader"><h2>Banner Sections</h2><Save size={18} /></div>
          <div className="heroEditorList">
            {contentSections.map((section, sectionIndex) => (
              <div className="heroEditorItem" key={section._id || sectionIndex}>
                <div className="formGrid">
                  <label><span>Title</span><input value={section.title || ""} onChange={(event) => updateContentSection(sectionIndex, { title: event.target.value })} required /></label>
                  <label><span>Subtitle</span><input value={section.subtitle || ""} onChange={(event) => updateContentSection(sectionIndex, { subtitle: event.target.value })} /></label>
                  <label><span>Columns</span><input type="number" min="1" max="4" value={section.columns || 2} onChange={(event) => updateContentSection(sectionIndex, { columns: Number(event.target.value) })} /></label>
                  <label><span>Sort</span><input type="number" value={section.sortOrder || sectionIndex + 1} onChange={(event) => updateContentSection(sectionIndex, { sortOrder: Number(event.target.value) })} /></label>
                  <label className="toggleRow"><input type="checkbox" checked={section.isActive !== false} onChange={(event) => updateContentSection(sectionIndex, { isActive: event.target.checked })} /><span>Active</span></label>
                </div>
                <div className="locationPicker">
                  {sectionLocations.map(([value, label]) => (
                    <label className="toggleRow" key={value}>
                      <input
                        type="checkbox"
                        checked={(section.locations || []).includes(value)}
                        onChange={(event) => {
                          const currentLocations = section.locations || [];
                          updateContentSection(sectionIndex, {
                            locations: event.target.checked ? [...currentLocations, value] : currentLocations.filter((item) => item !== value)
                          });
                        }}
                      />
                      <span>{label}</span>
                    </label>
                  ))}
                </div>
                <div className="sectionColumnEditor">
                  {(section.items || []).map((item, itemIndex) => (
                    <div className="sectionColumnItem" key={item._id || itemIndex}>
                      <div className="formGrid">
                        <select value={item.type || "image_text"} onChange={(event) => updateContentItem(sectionIndex, itemIndex, { type: event.target.value })}>
                          <option value="image_text">Image and text</option>
                          <option value="image">Image only</option>
                          <option value="text">Text only</option>
                        </select>
                        <label><span>Title</span><input value={item.title || ""} onChange={(event) => updateContentItem(sectionIndex, itemIndex, { title: event.target.value })} /></label>
                        <label><span>Text</span><input value={item.text || ""} onChange={(event) => updateContentItem(sectionIndex, itemIndex, { text: event.target.value })} /></label>
                        <label><span>Image URL</span><input value={item.imageUrl || ""} onChange={(event) => updateContentItem(sectionIndex, itemIndex, { imageUrl: event.target.value })} /></label>
                        <label><span>Link URL</span><input value={item.linkUrl || ""} onChange={(event) => updateContentItem(sectionIndex, itemIndex, { linkUrl: event.target.value })} /></label>
                        <label><span>Link label</span><input value={item.linkLabel || ""} onChange={(event) => updateContentItem(sectionIndex, itemIndex, { linkLabel: event.target.value })} /></label>
                      </div>
                      <label className="uploadBox compactUpload"><ImagePlus size={18} /><span>Upload image</span><input type="file" accept="image/*" onChange={(event) => uploadSettingImage(event, (url) => updateContentItem(sectionIndex, itemIndex, { imageUrl: url }))} /></label>
                      {item.imageUrl && <img className="heroEditorPreview" src={item.imageUrl} alt="" />}
                      <button className="inlineButton" type="button" onClick={() => updateContentSection(sectionIndex, { items: (section.items || []).filter((_item, index) => index !== itemIndex) })}>
                        <Trash2 size={16} /> Delete Column
                      </button>
                    </div>
                  ))}
                </div>
                <div className="toolbar">
                  <button className="inlineButton" type="button" onClick={() => updateContentSection(sectionIndex, { items: [...(section.items || []), { type: "image_text", title: "", text: "", imageUrl: "", linkUrl: "#/products", linkLabel: "Shop now" }] })}>Add Column</button>
                  <button className="inlineButton" type="button" onClick={() => setStoreForm({ ...storeForm, contentSections: contentSections.filter((_section, index) => index !== sectionIndex) })}><Trash2 size={16} /> Delete Section</button>
                </div>
              </div>
            ))}
          </div>
          {uploadStatus && <p className="mutedText">{uploadStatus}</p>}
          <div className="toolbar">
            <button className="inlineButton" type="button" onClick={() => setStoreForm({ ...storeForm, contentSections: [...contentSections, { title: "", subtitle: "", locations: ["home_before_new_arrivals"], columns: 2, isActive: true, sortOrder: contentSections.length + 1, items: [] }] })}>Add Section</button>
            <button className="primaryButton" type="submit" disabled={savingSettings}><Save size={18} /> {savingSettings ? "Saving..." : "Save Sections"}</button>
          </div>
        </form>
      )}
    </section>
  );
}

function Team({ users, userForm, setUserForm, createUser }) {
  return (
    <section className="twoColumn">
      <div className="panel widePanel">
        <div className="panelHeader">
          <h2>Team Members</h2>
        </div>
        <DataTable
          rows={users}
          columns={[
            { key: "name", label: "Name" },
            { key: "email", label: "Email" },
            { key: "role", label: "Role", render: (row) => <span className="badge">{row.role}</span> },
            { key: "isActive", label: "Active", render: (row) => (row.isActive ? "Yes" : "No") }
          ]}
        />
      </div>
      <form className="panel formPanel" onSubmit={createUser}>
        <div className="panelHeader">
          <h2>Invite Staff</h2>
          <Plus size={18} />
        </div>
        {["name", "email", "password"].map((field) => (
          <label key={field}>
            <span>{field}</span>
            <input
              type={field === "password" ? "password" : "text"}
              value={userForm[field]}
              onChange={(event) => setUserForm({ ...userForm, [field]: event.target.value })}
              required
            />
          </label>
        ))}
        <select value={userForm.role} onChange={(event) => setUserForm({ ...userForm, role: event.target.value })}>
          <option>Super Admin</option>
          <option>Inventory Clerk</option>
          <option>Customer Support</option>
          <option>Marketing Manager</option>
          <option>Analyst</option>
        </select>
        <button className="primaryButton" type="submit">
          <Plus size={18} /> Create User
        </button>
      </form>
    </section>
  );
}
