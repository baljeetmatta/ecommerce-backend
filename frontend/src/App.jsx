import { lazy, Suspense, useEffect, useMemo, useRef, useState } from "react";
import { AlertTriangle, Bold, FileText, GripVertical, ImagePlus, Italic, Link, List, LogOut, Menu, MessageSquareText, MoreVertical, PackageSearch, Plus, Printer, RefreshCw, Save, Search, Settings, Trash2, Truck } from "lucide-react";
import { api, authStore } from "./services/api.js";
import { optimizeImage } from "./utils/imageOptimizer.js";
import BrandLogo from "./components/BrandLogo.jsx";
import OrderTrackingPage from "./components/OrderTrackingPage.jsx";
import OperationsOrderDetails from "./components/OperationsOrderDetails.jsx";
import { isSaveMessage, showToast } from "./utils/toast.js";

const DataTable = lazy(() => import("./components/DataTable.jsx"));
const LoginScreen = lazy(() => import("./components/LoginScreen.jsx"));
const Sidebar = lazy(() => import("./components/Sidebar.jsx"));
const CategoryTreeSelect = lazy(() => import("./components/CategoryTreeSelect.jsx"));
const GstPricePreview = lazy(() => import("./components/GstPricePreview.jsx"));
const ProductCreatePage = lazy(() => import("./pages/ProductCreatePage.jsx"));
const StorefrontPage = lazy(() => import("./pages/StorefrontPage.jsx"));
const PartnerPortal = lazy(() => import("./pages/PartnerPortal.jsx"));
const SellerPortal = lazy(() => import("./pages/SellerPortal.jsx"));
const PartnerAdminPage = lazy(() => import("./pages/PartnerAdminPage.jsx"));
const SellerAdminPage = lazy(() => import("./pages/SellerAdminPage.jsx"));
const SellerProductsAdminPage = lazy(() => import("./pages/SellerProductsAdminPage.jsx"));
const BannerAdminPage = lazy(() => import("./pages/BannerAdminPage.jsx"));
const PagesAdminPage = lazy(() => import("./pages/PagesAdminPage.jsx").then((module) => ({ default: module.PagesAdminPage })));
const PageEditorPage = lazy(() => import("./pages/PagesAdminPage.jsx").then((module) => ({ default: module.PageEditorPage })));
const FooterAdminPage = lazy(() => import("./pages/PagesAdminPage.jsx").then((module) => ({ default: module.FooterAdminPage })));
const Analytics = lazy(() => import("./pages/AnalyticsPage.jsx"));
const SettingsRouteTabs = lazy(() => import("./components/SettingsRouteTabs.jsx"));
const TablePagination = lazy(() => import("./components/TablePagination.jsx"));

const money = (value) =>
  new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 2 }).format(value || 0);

const sectionLocations = [
  ["home_before_new_arrivals", "Home before New Arrivals"],
  ["home_after_blog", "Home after Blog"],
  ["product_detail_below_details", "Product details below details"],
  ["products_top_right", "All products top right"]
];

const settingsSectionIds = ["settings-payments", "settings-shipping", "settings-shiprocket", "settings-email", "settings-storefront", "settings-home", "settings-home-sections", "settings-hero", "settings-sections"];
const adminSectionIds = new Set(["dashboard", "analytics", "catalog", "add-product", "edit-product", "categories", "category-editor", "tax-categories", "tax-editor", "orders", "returns-refunds", "customers", "partners", "partner-packages", "partner-withdrawals", "partner-details", "sellers", "seller-withdrawals", "seller-products", "staff", "create-staff", "support-tickets", "banners", "blog", "blog-create", "pages", "page-editor", "footer", "marketing", "team", ...settingsSectionIds]);
const catalogRouteFilters = () => {
  const params = new URLSearchParams(String(window.location.hash).split("?")[1] || "");
  return { owner: params.get("owner") || "", seller: params.get("seller") || "" };
};
const emptyAdminState = {
  metrics: { revenue: 0, averageOrderValue: 0, conversionRate: 0, orderCount: 0, customersCount: 0, partnersCount: 0, ecommerceSales: 0, ecommerceProfit: 0, statusCounts: {}, topProducts: [], lowStockProducts: [] },
  products: [], orders: [], customers: [], promotions: [], users: [], categories: [], taxCategories: [], paymentMethods: [], shippingRules: [], storefrontSettings: {}, shipRocketSettings: {}, pendingItems: [], blogCategories: [], blogPosts: []
};
const cachedBrandSettings = () => {
  try { return JSON.parse(localStorage.getItem("storefront_brand_settings") || "{}"); }
  catch (_error) { return {}; }
};
const cacheBrandSettings = (settings = {}) => {
  const { shopName, logoUrl, logoWidth, logoHeight, hideLogoText, loadingLogoUrl, loadingLogoWidth, loadingLogoHeight } = settings;
  localStorage.setItem("storefront_brand_settings", JSON.stringify({ shopName, logoUrl, logoWidth, logoHeight, hideLogoText, loadingLogoUrl, loadingLogoWidth, loadingLogoHeight }));
};
const PageLoader = ({ settings = {} }) => (
  <main className="storefrontLoadingScreen" role="status" aria-live="polite">
    <BrandLogo settings={settings} loading className="storefrontLoadingBrand" showText={false} />
    <div className="storefrontLoadingSpinner" aria-hidden="true" />
  </main>
);
const AdminSidebarLoader = () => <aside className="sidebar sidebarLoading" aria-label="Loading admin navigation"><div className="storefrontLoadingSpinner" aria-hidden="true" /></aside>;

const currentClientRoute = () => {
  if (window.location.hash) return window.location.hash;
  const pathname = window.location.pathname.replace(/\/+$/, "") || "/";
  return pathname === "/" ? "#/" : `#${pathname}${window.location.search}`;
};
const adminApplicationUrl = () => {
  const local = ["localhost", "127.0.0.1"].includes(window.location.hostname);
  return local ? "http://localhost:5174/#/admin/login" : "https://admin.hrsbasket.com/#/admin/login";
};
const storefrontProductUrl = (productId) => {
  const local = ["localhost", "127.0.0.1"].includes(window.location.hostname);
  const storefrontOrigin = String(import.meta.env.VITE_STOREFRONT_URL || (local ? "http://localhost:5173" : "https://hrsbasket.com")).replace(/\/+$/, "");
  return `${storefrontOrigin}/#/product/${productId}`;
};
const isStandaloneAdminHost = () => window.location.hostname === "admin.hrsbasket.com" || (["localhost", "127.0.0.1"].includes(window.location.hostname) && window.location.port === "5174");

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
const printableMediaUrl = (value = "") => {
  if (!value) return "/images/e-commerce/logo.svg";
  try { const apiOrigin = new URL(String(window.__HRS_API_URL__ || import.meta.env.VITE_API_URL || (window.location.hostname === "localhost" ? "http://localhost:5001/api" : "https://ebackend.hrsbasket.com/api"))).origin; return new URL(value, value.startsWith("/uploads/") || value.startsWith("/api/") ? apiOrigin : window.location.origin).href; }
  catch (_error) { return "/images/e-commerce/logo.svg"; }
};

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
  const customerCodCharge = order.codChargePaidBy === "customer" ? Number(order.codCharge || 0) : 0;
  const hasGst = Boolean(store.sellerGstNumber) && Number(order.taxTotal || 0) > 0;
  const rows = (order.items || [])
    .map(
      (item) => `<tr><td>${escapeHtml(item.name)}</td><td>${escapeHtml(item.sku)}</td><td>${item.quantity}</td><td>${money((item.taxableValue ?? item.price - (item.gstAmount || 0)) * item.quantity)}</td>${hasGst ? `<td>${item.gstRate || 0}%</td><td>${money((item.gstAmount || 0) * item.quantity)}</td>` : ""}<td>${money(item.price * item.quantity)}</td></tr>`
    )
    .join("");
  printHtml(
    `Invoice ${order.invoiceNumber || order.orderNumber}`,
    `<section class="top">
      <div>
        <img class="logo" src="${escapeHtml(printableMediaUrl(store.logoUrl))}" alt="HRSBasket logo">
        <h1>${escapeHtml(store.shopName || "Store Invoice")}</h1>
      </div>
      <div>
        <h2>${hasGst ? "Tax Invoice" : "Invoice"}</h2>
        <p><span class="strong">Invoice:</span> ${escapeHtml(order.invoiceNumber || "")}</p>
        <p><span class="strong">Order:</span> ${escapeHtml(order.orderNumber)}</p>
        <p><span class="strong">Date:</span> ${new Date(order.invoiceGeneratedAt || Date.now()).toLocaleDateString("en-IN")}</p>
      </div>
    </section>
    <section class="grid">
      <div><h2>Seller Address</h2><p class="muted">${escapeHtml(store.sellerName || "Seller")}<br>${escapeHtml(store.sellerAddress || "—")}${store.sellerGstNumber ? `<br>GSTIN: ${escapeHtml(store.sellerGstNumber)}` : ""}</p></div>
      <div><h2>Customer Address</h2><p class="muted">${escapeHtml(order.customer?.name || order.address?.name || "Customer")}<br>${escapeHtml(order.address?.shippingAddress || order.address?.billingAddress || "")}<br>${escapeHtml([order.address?.city, order.address?.state, order.address?.postalCode].filter(Boolean).join(", "))}<br>${escapeHtml(order.customer?.email || order.address?.email || "")}</p></div>
    </section>
    <table><thead><tr><th>Item</th><th>SKU</th><th>Qty</th><th>${hasGst ? "Taxable value" : "Item total"}</th>${hasGst ? "<th>GST rate</th><th>GST collected</th>" : ""}<th>${hasGst ? "GST-inclusive total" : "Total"}</th></tr></thead><tbody>${rows}</tbody></table>
    <section class="totals">
      <div><span>${hasGst ? "Taxable subtotal" : "Subtotal"}</span><strong>${money(order.subtotal)}</strong></div>
      <div><span>Shipping</span><strong>${money(order.shippingTotal)}</strong></div>
      ${customerCodCharge > 0 ? `<div><span>COD charges</span><strong>${money(customerCodCharge)}</strong></div>` : ""}
      ${hasGst ? `<div><span>GST collected</span><strong>${money(order.taxTotal)}</strong></div>` : ""}
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
  const [view, setView] = useState(() => currentClientRoute().startsWith("#/admin") ? (authStore.token ? "admin" : "admin-login") : "storefront");
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
    settings: cachedBrandSettings(),
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
  const [loadedAdminData, setLoadedAdminData] = useState({});
  const [productPagination, setProductPagination] = useState({ page: 1, limit: 10, total: 0, pages: 1 });
  const [orderPagination, setOrderPagination] = useState({ page: 1, limit: 10, total: 0, pages: 1 });
  const [customerPagination, setCustomerPagination] = useState({ page: 1, limit: 10, total: 0, pages: 1 });
  const [partnerRoute, setPartnerRoute] = useState(() => currentClientRoute().startsWith("#/partner"));
  const [sellerRoute, setSellerRoute] = useState(() => /^#\/seller(?:\/|$)/.test(currentClientRoute()));
  const [adminMenuOpen, setAdminMenuOpen] = useState(false);

  useEffect(() => {
    if (currentClientRoute().startsWith("#/admin") && !isStandaloneAdminHost()) window.location.replace(adminApplicationUrl());
  }, []);

  useEffect(() => {
    if (isSaveMessage(message)) showToast(message);
  }, [message]);

  const applyStorefrontData = (data) => {
    cacheBrandSettings(data.settings || {});
    const featuredIds = new Set((data.featuredProductIds || []).map(String));
    setStorefront((current) => {
      const products = data.products?.length ? data.products : current.products;
      const featuredProducts = data.featuredProducts || products.filter((product) => featuredIds.has(String(product._id)));
      return {
        products,
        featuredProducts,
        categories: data.categories || current.categories,
        banner: data.banner || current.banner,
        heroItems: data.heroItems || current.heroItems,
        contentSections: data.contentSections || current.contentSections,
        productBanners: data.productBanners || current.productBanners,
        productBannerColumns: data.productBannerColumns || current.productBannerColumns,
        firstOrderDiscount: data.firstOrderDiscount || null,
        blogPosts: data.blogPosts || current.blogPosts,
        settings: data.settings || current.settings,
        paymentMethods: data.paymentMethods || current.paymentMethods,
        shippingRules: data.shippingRules || current.shippingRules
      };
    });
  };

  const loadStorefront = async () => {
    setStorefrontLoading(true);
    setStorefrontError("");
    try {
      const bootstrap = await api.storefrontBootstrap();
      applyStorefrontData(bootstrap);
      setStorefrontLoading(false);
      api.storefrontCatalog()
        .then(applyStorefrontData)
        .catch((error) => setStorefrontError(error.message || "Products are taking longer than expected to load."));
    } catch (error) {
      setStorefrontError(error.message || "Unable to load the storefront.");
    } finally {
      setStorefrontLoading(false);
    }
  };

  const loadApiData = async (section = active, force = false) => {
    if (!authStore.token) {
      setState(emptyAdminState);
      setAdminDataReady(false);
      return;
    }
    const productRequest = async (fields) => {
      const result = await api.products({ page: 1, limit: 10, fields, ...(section === "catalog" ? catalogRouteFilters() : {}) });
      if (result.pagination) setProductPagination(result.pagination);
      return result.items || result;
    };
    const orderRequest = async () => {
      const result = await api.orders({ page: 1, limit: 100 });
      if (result.pagination) setOrderPagination(result.pagination);
      return result.items || result;
    };
    const customerRequest = async () => {
      const result = await api.customers({ page: 1, limit: 10 });
      if (result.pagination) setCustomerPagination(result.pagination);
      return result.items || result;
    };
    const requestsBySection = {
      dashboard: { metrics: api.analytics },
      analytics: { metrics: api.analytics },
      catalog: { products: () => productRequest("table"), categories: api.categories, taxCategories: api.taxCategories },
      "add-product": { products: productRequest, categories: api.categories, taxCategories: api.taxCategories },
      "edit-product": { products: productRequest, categories: api.categories, taxCategories: api.taxCategories },
      categories: { products: productRequest, categories: api.categories },
      "category-editor": { categories: api.categories },
      "tax-categories": { taxCategories: api.taxCategories },
      orders: { orders: orderRequest, pendingItems: api.pendingItems },
      "returns-refunds": { orders: orderRequest },
      customers: { customers: customerRequest },
      banners: { products: productRequest, storefrontSettings: api.storefrontSettings },
      blog: { blogCategories: api.blogCategories, blogPosts: api.blogPosts },
      "blog-create": { blogCategories: api.blogCategories },
      pages: { storefrontSettings: api.storefrontSettings },
      "page-editor": { storefrontSettings: api.storefrontSettings },
      footer: { storefrontSettings: api.storefrontSettings },
      marketing: { promotions: api.promotions },
      team: {},
      "settings-payments": { paymentMethods: api.paymentMethods },
      "settings-shipping": { shippingRules: api.shippingRules },
      "settings-shiprocket": { shipRocketSettings: api.shipRocketSettings },
      "settings-email": {},
      "settings-storefront": { storefrontSettings: api.storefrontSettings },
      "settings-home": { storefrontSettings: api.storefrontSettings },
      "settings-home-sections": { storefrontSettings: api.storefrontSettings, products: productRequest, categories: api.categories },
      "settings-hero": { storefrontSettings: api.storefrontSettings, products: productRequest },
      "settings-sections": { storefrontSettings: api.storefrontSettings }
    };
    if (!force && loadedAdminData[section]) return;
    setLoading(true);
    setAdminDataReady(true);
    setAdminLoadError("");
    const requests = requestsBySection[section] || {};
    const results = await Promise.allSettled(Object.entries(requests).map(async ([key, requestData]) => {
      const value = await requestData();
      setState((current) => ({ ...current, [key]: value }));
      return key;
    }));
    const failures = results.filter((result) => result.status === "rejected");
    if (failures.length) {
      const error = failures[0].reason;
      setMessage(`${sectionTitle(section)} could not load: ${error?.message || "request failed"}`);
      setAdminLoadError(error?.message || "Some dashboard data could not be loaded.");
      if (String(error?.message || "").toLowerCase().match(/token|auth/)) {
        authStore.clear();
        setToken(null);
        setCurrentUser(null);
      }
    } else {
      setLoadedAdminData((current) => ({ ...current, [section]: true }));
      setMessage(`${sectionTitle(section)} loaded.`);
    }
    setLoading(false);
  };

  const loadProductPage = async (page, limit = productPagination.limit) => {
    setLoading(true);
    try {
      const result = await api.products({ page, limit, fields: "table", ...catalogRouteFilters() });
      setState((current) => ({ ...current, products: result.items || [] }));
      setProductPagination(result.pagination || { page, limit, total: result.items?.length || 0, pages: 1 });
      setMessage("Catalog & Inventory loaded.");
    } catch (error) {
      setMessage(`Catalog & Inventory could not load: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const filterCatalogByOwner = async ({ owner = "", seller = "" }) => {
    const params = new URLSearchParams();
    if (owner) params.set("owner", owner);
    if (seller.trim()) params.set("seller", seller.trim().toUpperCase());
    window.location.hash = `#/admin/catalog${params.size ? `?${params}` : ""}`;
    await loadProductPage(1, 10);
  };

  const loadOrderPage = async (page) => {
    setLoading(true);
    try {
      const result = await api.orders({ page: 1, limit: 100 });
      setState((current) => ({ ...current, orders: result.items || [] }));
      setOrderPagination(result.pagination || { page: 1, limit: 100, total: result.items?.length || 0, pages: 1 });
    } catch (error) {
      setMessage(`Order Fulfillment could not load: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const loadCustomerPage = async (page) => {
    setLoading(true);
    try {
      const result = await api.customers({ page, limit: 10 });
      setState((current) => ({ ...current, customers: result.items || [] }));
      setCustomerPagination(result.pagination || { page, limit: 10, total: result.items?.length || 0, pages: 1 });
    } catch (error) {
      setMessage(`Customer CRM could not load: ${error.message}`);
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
    if (view !== "admin") loadStorefront();
  }, [view]);

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
    const syncRouteView = () => {
      const route = currentClientRoute();
      if (route.startsWith("#/admin")) setView(authStore.token ? "admin" : "admin-login");
      else setView("storefront");
    };
    window.addEventListener("hashchange", syncRouteView);
    window.addEventListener("popstate", syncRouteView);
    syncRouteView();
    return () => { window.removeEventListener("hashchange", syncRouteView); window.removeEventListener("popstate", syncRouteView); };
  }, [token]);

  useEffect(() => {
    const verifySession = async () => {
      if (!authStore.token) return;
      setAdminDataReady(true);

      try {
        const data = await api.me();
        authStore.user = data.user;
        setCurrentUser(data.user);
        if (currentClientRoute().startsWith("#/admin")) setView("admin");
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
    if (view === "admin" && token) loadApiData(active);
  }, [view, token, active]);

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
      window.location.hash = `#/admin/${["Staff", "Team Leader"].includes(data.user.role) ? "team" : active || "analytics"}`;
      setAdminDataReady(true);
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
    setLoadedAdminData({});
    setActive("analytics");
    setView("storefront");
    window.location.hash = "#/";
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
    cacheBrandSettings(saved);
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
        : action === "return-refund"
          ? await api.closeOrderItemReturn(order._id, payload.productId, payload)
        : action === "return-status"
          ? await api.updateOrderItemReturn(order._id, payload.productId, payload)
        : action === "return-shipment"
          ? await api.createOrderItemReturnShipment(order._id, payload.productId)
        : action === "shiprocket"
          ? await api.syncShipRocket(order._id)
          : await api.updateTracking(order._id, payload);
    if (updated._id) {
      setState((current) => ({ ...current, orders: current.orders.map((item) => (item._id === updated._id ? updated : item)) }));
    }
    if (action === "invoice") printInvoice(updated);
    if (action === "shiprocket") setMessage(`Packet sent to ShipRocket. Tracking number: ${updated.shipping?.awbCode}. Packaging slip is ready.`);
    else setMessage(action === "invoice" ? `Invoice ${updated.invoiceNumber} generated.` : "Order updated.");
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
      <Suspense fallback={<PageLoader settings={storefront.settings} />}>
      <LoginScreen
        form={loginForm}
        error={authError}
        loading={loading}
        onChange={setLoginForm}
        onSubmit={login}
        onBack={() => { window.location.hash = "#/"; setView("storefront"); }}
        settings={storefront.settings}
      />
      </Suspense>
    );
  }

  if (partnerRoute) return <Suspense fallback={<PageLoader settings={storefront.settings} />}><PartnerPortal settings={storefront.settings} onBack={() => { window.location.hash = "#/"; }} /></Suspense>;
  if (sellerRoute) return <Suspense fallback={<PageLoader settings={storefront.settings} />}><SellerPortal settings={storefront.settings} onBack={() => { window.history.pushState(null, "", "/"); window.dispatchEvent(new PopStateEvent("popstate")); }} /></Suspense>;

  if (view !== "admin" || !token) {
    return (
      <Suspense fallback={<PageLoader settings={storefront.settings} />}>
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
        onAdminLogin={() => { window.location.href = adminApplicationUrl(); }}
      />
      </Suspense>
    );
  }

  if (!adminDataReady) {
    return <main className="storefrontLoadingScreen" role="status" aria-live="polite"><BrandLogo settings={state.storefrontSettings || storefront.settings} loading className="storefrontLoadingBrand" showText={false} />{!adminLoadError && <div className="storefrontLoadingSpinner" aria-hidden="true" />}{adminLoadError && <><h1>Unable to load admin data</h1><p>{adminLoadError}</p><button className="heroPrimary" type="button" onClick={loadApiData}>Try Again</button></>}</main>;
  }

  return (
    <div className="appShell berryWorkspace berryWorkspace--admin" style={{ "--admin-button-color": state.storefrontSettings.adminButtonColor || "#1e88e5" }}>
      {adminMenuOpen && <button className="sidebarBackdrop" type="button" aria-label="Close admin menu" onClick={() => setAdminMenuOpen(false)} />}
      <Suspense fallback={<AdminSidebarLoader />}><Sidebar settings={state.storefrontSettings} active={active} onChange={navigateAdmin} open={adminMenuOpen} onClose={() => setAdminMenuOpen(false)} /></Suspense>
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
            <button className="iconButton" title="Refresh" type="button" onClick={() => loadApiData(active, true)}>
              <RefreshCw size={18} className={loading ? "spin" : ""} />
            </button>
            <button className="iconButton" title="Sign out" type="button" onClick={logout}>
              <LogOut size={18} />
            </button>
          </div>
        </header>

        <Suspense fallback={<div className="adminSectionLoader"><div className="storefrontLoadingSpinner" aria-hidden="true" /></div>}>
        {["dashboard", "analytics"].includes(active) && <Analytics metrics={state.metrics} />}
        {active === "catalog" && (
          <Catalog
            products={state.products}
            categories={state.categories}
            taxCategories={state.taxCategories}
            pagination={productPagination}
            onPageChange={loadProductPage}
            loading={loading}
            query={query}
            setQuery={setQuery}
            ownerFilter={catalogRouteFilters().owner}
            sellerFilter={catalogRouteFilters().seller}
            onOwnerFilter={filterCatalogByOwner}
            onAddProduct={() => navigateAdmin("add-product")}
            onFeature={updateProduct}
            onUpdateProduct={updateProduct}
            onEditProduct={async (product) => { try { setProductDraft(await api.product(product._id)); navigateAdmin("edit-product"); } catch (error) { setMessage(error.message); } }}
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
            sellerSettlement={state.storefrontSettings?.sellerSettlement || {}}
            products={state.products}
            onSave={addProduct}
            onBack={() => navigateAdmin("catalog")}
          />
        )}
        {active === "edit-product" && (
          <ProductCreatePage categories={state.categories} taxCategories={state.taxCategories} sellerSettlement={state.storefrontSettings?.sellerSettlement || {}} products={state.products} initialProduct={productDraft} onBack={() => navigateAdmin("catalog")} onSave={async (payload) => { await updateProduct(productDraft, payload); navigateAdmin("catalog"); }} />
        )}
        {active === "category-editor" && <CategoryEditor categories={state.categories} initialCategory={categoryDraft} onBack={() => navigateAdmin("categories")} onSave={async (payload) => { if (categoryDraft) await updateCategory(categoryDraft, payload); else await addCategory(payload); navigateAdmin("categories"); }} />}
        {active === "tax-editor" && <TaxCategoryEditor initialTax={taxDraft} onBack={() => navigateAdmin("tax-categories")} onSave={async (payload) => { if (taxDraft) await updateTaxCategory(taxDraft, payload); else await addTaxCategory(payload); navigateAdmin("tax-categories"); }} />}
        {active === "orders" && <Orders orders={state.orders} pendingItems={state.pendingItems || []} pagination={orderPagination} onPageChange={loadOrderPage} loading={loading} onStatus={updateLocalOrder} onAction={orderAction} />}
        {active === "returns-refunds" && <ReturnsRefunds orders={state.orders} loading={loading} onAction={orderAction} />}
        {settingsSectionIds.includes(active) && (
          <OperationsSettings
            activeTab={active.replace("settings-", "")}
            onTabChange={(tab) => navigateAdmin(`settings-${tab}`)}
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
        {active === "customers" && <Customers customers={state.customers} pagination={customerPagination} onPageChange={loadCustomerPage} loading={loading} />}
        {["partners", "partner-packages", "partner-withdrawals"].includes(active) && <PartnerAdminPage activeTab={active === "partner-packages" ? "packages" : active === "partner-withdrawals" ? "withdrawals" : "partners"} onTabChange={(tab) => navigateAdmin(tab === "packages" ? "partner-packages" : tab === "withdrawals" ? "partner-withdrawals" : "partners")} onViewDetails={(id) => { setPartnerDetailsId(id); navigateAdmin("partner-details"); }} />}
        {active === "partner-details" && <PartnerAdminPage detailOnly detailId={partnerDetailsId} onBack={() => navigateAdmin("partners")} onDelete={async (id) => { await api.deletePartner(id); setPartnerDetailsId(null); navigateAdmin("partners"); }} />}
        {active === "sellers" && <SellerAdminPage onWithdrawals={() => navigateAdmin("seller-withdrawals")} onViewProducts={(seller) => filterCatalogByOwner({ owner: "seller", seller: seller.sellerNumber })} />}
        {active === "seller-withdrawals" && <SellerAdminPage withdrawalsOnly onBack={currentUser?.role === "Super Admin" ? () => navigateAdmin("sellers") : undefined} />}
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
        {active === "staff" && <Team mode="staff" onAdd={() => navigateAdmin("create-staff")} />}
        {active === "create-staff" && <Team mode="create" onBack={() => navigateAdmin("staff")} />}
        {active === "support-tickets" && <Team mode="support" />}
        {active === "team" && <Team mode="access" />}
        </Suspense>
      </main>
    </div>
  );
}

function sectionTitle(active) {
  return {
    dashboard: "Dashboard",
    analytics: "Analytics & Reporting",
    catalog: "Catalog & Inventory",
    "add-product": "Add Product",
    "edit-product": "Edit Product",
    categories: "Category Management",
    "category-editor": "Category Editor",
    "tax-categories": "Tax Category Management",
    "tax-editor": "Tax Editor",
    orders: "Order Fulfillment",
    "returns-refunds": "Returns & Refunds",
    customers: "Customer CRM",
    partners: "Partner Program",
    "partner-packages": "Partner Packages",
    "partner-withdrawals": "Partner Withdrawals",
    sellers: "Seller Management",
    "seller-withdrawals": "Seller Withdrawals",
    "seller-products": "Seller Product Approvals",
    banners: "Product Banners",
    blog: "Blog Content",
    "blog-create": "Create Blog Post",
    marketing: "Marketing & Promotions",
    staff: "Staff",
    team: "Role-Based Access",
    "create-staff": "Create Staff",
    "support-tickets": "Support Tickets",
    "settings-payments": "Settings · Payment Methods",
    "settings-shipping": "Settings · Shipping Rules",
    "settings-shiprocket": "Settings · ShipRocket",
    "settings-email": "Settings · Email / SMTP",
    "settings-storefront": "Settings · Custom Storefront",
    "settings-home": "Settings · Home Content",
    "settings-home-sections": "Settings · Home Sections",
    "settings-hero": "Settings · Hero",
    "settings-sections": "Settings · Banner Sections"
  }[active] || "Admin";
}

function getCategoryName(category) {
  if (!category) return "Unassigned";
  if (typeof category === "string") return category;
  return category.parent?.name ? `${category.parent.name} / ${category.name}` : category.name;
}

function getProductThumb(product) {
  return product.imageVariants?.admin || product.mainImage || product.media?.find((item) => item.type === "image")?.url || "";
}

function Catalog({ products, categories, taxCategories, pagination, onPageChange, loading, query, setQuery, ownerFilter, sellerFilter, onOwnerFilter, onAddProduct, onFeature, onUpdateProduct, onEditProduct, onDeleteProduct, onCategories, onTaxCategories }) {
  const [editing, setEditing] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [imageStatus, setImageStatus] = useState("");
  const [sellerId, setSellerId] = useState(sellerFilter || "");
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
    try {
      const optimized = await optimizeImage(file, { purpose: "product-main" });
      setEditing((current) => ({
        ...current,
        mainImage: optimized.url,
        imageVariants: optimized.variants || {},
        media: [
          { url: optimized.url, type: "image", isMain: true, alt: current.name || optimized.name },
          ...(current.media || []).filter((item) => !item.isMain)
        ]
      }));
      setImageStatus(`Main image uploaded and optimized from ${optimized.width}x${optimized.height}.`);
    } catch (error) {
      setImageStatus(error.message || "Unable to upload the main image.");
      event.target.value = "";
    }
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
      imageVariants: editing.imageVariants || {},
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
          <label>Product owner<select value={ownerFilter} onChange={(event) => onOwnerFilter({ owner: event.target.value, seller: event.target.value === "seller" ? sellerId : "" })}><option value="">Admin &amp; sellers</option><option value="admin">Admin only</option><option value="seller">Seller only</option></select></label>
          <label>Seller ID<div className="searchBox"><input placeholder="e.g. HRS000123" value={sellerId} onChange={(event) => setSellerId(event.target.value.toUpperCase())} onKeyDown={(event) => { if (event.key === "Enter") { event.preventDefault(); onOwnerFilter({ owner: "seller", seller: sellerId }); } }} /><button type="button" title="Filter by seller ID" onClick={() => onOwnerFilter({ owner: "seller", seller: sellerId })}><Search size={16} /></button></div></label>
          <label>Category<CategoryTreeSelect categories={categories} value={catalogFilters.category} onChange={(category) => setCatalogFilters({ ...catalogFilters, category })} placeholder="All categories" clearLabel="All categories" /></label>
          <label>Tax<select value={catalogFilters.tax} onChange={(event) => setCatalogFilters({ ...catalogFilters, tax: event.target.value })}><option value="">All tax categories</option><option value="none">No tax category</option>{taxCategories.map((tax) => <option key={tax._id} value={tax._id}>{tax.name} ({tax.rate}%)</option>)}</select></label>
          <label>Status<select value={catalogFilters.status} onChange={(event) => setCatalogFilters({ ...catalogFilters, status: event.target.value })}><option value="">All statuses</option><option value="active">Active</option><option value="draft">Draft</option><option value="archived">Archived</option></select></label>
          <label className="toggleRow"><input type="checkbox" checked={catalogFilters.missingImage} onChange={(event) => setCatalogFilters({ ...catalogFilters, missingImage: event.target.checked })} /><span>Without image only</span></label>
          <button className="inlineButton" type="button" onClick={() => { setCatalogFilters({ category: "", tax: "", status: "", missingImage: false }); setQuery(""); setSellerId(""); onOwnerFilter({}); }}>Clear filters</button>
        </div>
        <DataTable
          rows={visibleProducts}
          loading={loading}
          loadingMessage="Loading products…"
          sortable
          paginated={false}
          className="catalogProductTable"
          columns={[
            { key: "image", label: "Image", sortable: false, render: (row) => getProductThumb(row) ? <img className="tableThumb" src={getProductThumb(row)} alt="" /> : "None" },
            { key: "name", label: "Product", render: (row) => <div><strong>{row.name}</strong><br /><small>SKU: {row.sku} · Price: {money(row.price)} · Offer: {money(row.offerPrice || row.price)}</small></div> },
            { key: "owner", label: "Owner", sortValue: (row) => row.seller?.sellerNumber || "Admin", render: (row) => row.seller ? <div><strong>{row.seller.companyName}</strong><br /><small>Seller ID: {row.seller.sellerNumber}</small></div> : <strong>Admin</strong> },
            { key: "category", label: "Category", sortValue: (row) => getCategoryName(row.category), render: (row) => getCategoryName(row.category) },
            { key: "taxCategory", label: "Tax", sortValue: (row) => row.taxCategory?.name || "", render: (row) => row.taxCategory ? `${row.taxCategory.name} (${row.taxCategory.rate}%)` : "None" },
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
        <TablePagination total={pagination.total} page={pagination.page} pageSize={pagination.limit} pageSizes={[10]} onPageChange={(page) => onPageChange(page, 10)} onPageSizeChange={() => {}} />
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

function OrderDetailsModal({ order, tab, setTab, onClose }) {
  return <OperationsOrderDetails order={order} title="Order Details" onClose={onClose} productUrl={storefrontProductUrl} />;
  /* Legacy tabbed detail markup retained temporarily for data compatibility. */
  const latestStatus = [...(order.timeline || [])].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))[0];
  const timeline = [...(order.timeline || [])].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  return <div className="modalOverlay" role="dialog" aria-modal="true"><section className="orderDetailModal"><div className="panelHeader"><div><span className="eyebrow">Order details</span><h2>{order.orderNumber}</h2></div><button className="inlineButton" onClick={onClose}>Close</button></div><nav><button className={tab === "summary" ? "active" : ""} onClick={() => setTab("summary")}>Order Items &amp; Summary</button><button className={tab === "parties" ? "active" : ""} onClick={() => setTab("parties")}>Seller &amp; Customer Details</button><button className={tab === "status" ? "active" : ""} onClick={() => setTab("status")}>Item Status</button></nav>{tab === "summary" ? <div className="orderDetailSummary"><div className="orderDetailMeta"><span><strong>Order dated</strong>{new Date(order.createdAt).toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short" })}</span><span><strong>Last status</strong>{latestStatus?.status || order.status || "Pending"}</span></div><table><thead><tr><th>Product</th><th>SKU</th><th>Qty</th><th>Price</th></tr></thead><tbody>{order.items.map((item) => { const product = item.product; const productId = product?._id || product; const image = product?.imageVariants?.storefront || product?.mainImage; return <tr key={`${productId}-${item.sku}`}><td><div className="orderProductCell">{image ? <img src={image} alt="" /> : <span className="orderProductImageMissing">No image</span>}<a href={storefrontProductUrl(productId)} target="_blank" rel="noreferrer">{item.name}</a></div></td><td>{item.sku}</td><td>{item.quantity}</td><td>{money(item.price * item.quantity)}</td></tr>; })}</tbody></table><dl><div><dt>Items amount</dt><dd>{money(Number(order.grandTotal || 0) - (Number(order.shipping?.amount) || Number(order.shippingTotal)))}</dd></div><div><dt>Shipping</dt><dd>{money(Number(order.shipping?.amount) || Number(order.shippingTotal))}</dd></div><div><dt>Total</dt><dd>{money(order.grandTotal)}</dd></div><div><dt>Payment</dt><dd>{order.paymentStatus}</dd></div></dl></div> : tab === "parties" ? <div className="orderPartyGrid"><section><h3>Customer</h3><p><strong>{order.customer?.name || order.address?.name || "Guest"}</strong><br />{order.customer?.email || order.address?.email}<br />{order.customer?.phone || order.address?.phone}<br />{order.address?.shippingAddress || order.address?.billingAddress}<br />{[order.address?.city, order.address?.state, order.address?.postalCode].filter(Boolean).join(", ")}</p></section>{[...new Map(order.items.filter((item) => item.seller).map((item) => [String(item.seller._id || item.seller), item.seller])).values()].map((seller) => <section key={seller._id || seller.sellerNumber}><h3>Seller</h3><p><strong>{seller.companyName}</strong><br />Seller ID: {seller.sellerNumber}<br />{seller.email}<br />{seller.mobile}<br />{[seller.address, seller.city, seller.state, seller.pinCode].filter(Boolean).join(", ")}</p></section>)}{!order.items.some((item) => item.seller) && <section><h3>Order owner</h3><p><strong>Admin</strong><br />Store-managed inventory and fulfillment</p></section>}</div> : <div className="orderStatusHistory">{timeline.length ? timeline.map((entry, index) => <article key={entry._id || `${entry.createdAt}-${index}`}><span className={`sellerStatusButton ${String(entry.status || "pending").toLowerCase().replaceAll(" ", "-")}`}>{entry.status || "Update"}</span><div><strong>{entry.title}</strong><small>{new Date(entry.createdAt).toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short" })}</small>{entry.comment && <p>{entry.comment}</p>}{entry.details && <small>{entry.details}</small>}</div></article>) : <p>No item status updates have been recorded.</p>}</div>}</section></div>;
}

function ReturnsRefunds({ orders, loading, onAction }) {
  const [search, setSearch] = useState("");
  const [target, setTarget] = useState(null);
  const [form, setForm] = useState({ amount: "", reason: "", note: "" });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const rows = orders.flatMap((order) => (order.items || [])
    .filter((item) => item.returnRequest?.status)
    .map((item) => ({
      ...item,
      _id: `${order._id}-${item.product?._id || item.product}-${item.sku}`,
      order,
      productId: item.product?._id || item.product,
      customerName: order.customer?.name || order.address?.name || "Customer",
      refundTotal: (order.refunds || []).reduce((sum, refund) => sum + Number(refund.amount || 0), 0)
    })))
    .filter((row) => [row.order.orderNumber, row.name, row.sku, row.customerName, row.returnRequest?.reason, row.returnRequest?.status]
      .filter(Boolean).join(" ").toLowerCase().includes(search.toLowerCase()));
  const openRefund = (row) => {
    setTarget(row);
    setForm({ amount: String(Number(row.price || 0) * Number(row.quantity || 1)), reason: row.returnRequest?.reason || "Returned item refund", note: "Refund processed and return closed by admin" });
  };
  const submitRefund = async (event) => {
    event.preventDefault();
    setBusy(true);
    setError("");
    try {
      await onAction(target.order, "return-refund", { productId: target.productId, amount: Number(form.amount), reason: form.reason, note: form.note });
      setTarget(null);
    } catch (actionError) { setError(actionError.message); } finally { setBusy(false); }
  };
  const runStage = async (row, action, payload = {}) => {
    setBusy(true); setError("");
    try { await onAction(row.order, action, { productId: row.productId, ...payload }); }
    catch (actionError) { setError(actionError.message); }
    finally { setBusy(false); }
  };
  const returnAction = (row) => {
    const status = row.returnRequest?.status;
    if (status === "Requested") return <div className="tableActions"><button className="primaryButton" disabled={busy} type="button" onClick={() => runStage(row, "return-status", { status: "Approved", note: "Return accepted by admin" })}>Accept return</button><button className="secondaryButton" disabled={busy} type="button" onClick={() => runStage(row, "return-status", { status: "Rejected", note: "Return rejected by admin" })}>Reject</button></div>;
    if (status === "Approved") return <button className="primaryButton" disabled={busy} type="button" onClick={() => runStage(row, "return-shipment")}>Create ShipRocket return</button>;
    if (status === "Pickup Arranged") return <button className="primaryButton" disabled={busy} type="button" onClick={() => runStage(row, "return-status", { status: "Received", note: "Returned product received and inspected" })}>Mark product received</button>;
    if (status === "Received") return <button className="primaryButton" disabled={busy} type="button" onClick={() => openRefund(row)}>Issue refund</button>;
    if (status === "Closed") return <small>{row.returnRequest.reviewNote || "Refund issued"}</small>;
    return <small>{status}</small>;
  };
  return <section className="contentStack returnsRefundsPage">
    <div className="panel">
      <div className="panelHeader"><div><h2>Returns &amp; Refunds</h2><p className="mutedText">Review customer return requests and close them after processing the refund.</p></div><label className="searchBox"><Search size={16} /><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search order, product or customer" /></label></div>
      {error && <div className="notice errorText" role="alert">{error}</div>}
      <DataTable rows={rows} loading={loading} loadingMessage="Loading returns…" sortable paginated columns={[
        { key: "order", label: "Order", sortValue: (row) => row.order.orderNumber, render: (row) => <><strong>{row.order.orderNumber}</strong><br /><small>{new Date(row.returnRequest.requestedAt || row.order.createdAt).toLocaleDateString("en-IN")}</small></> },
        { key: "name", label: "Product", render: (row) => <><strong>{row.name}</strong><br /><small>{row.sku} · Qty {row.quantity}</small></> },
        { key: "customerName", label: "Customer" },
        { key: "reason", label: "Return reason", sortValue: (row) => row.returnRequest?.reason || "", render: (row) => <>{row.returnRequest?.reason || "—"}<br /><small>{row.returnRequest?.comments || ""}</small></> },
        { key: "status", label: "Status", sortValue: (row) => row.returnRequest?.status || "", render: (row) => <><span className={`status ${row.returnRequest?.status === "Closed" ? "approved" : "pending"}`}>{({ Requested: "Requested", Approved: "Accepted", "Pickup Arranged": "Return in transit", Received: "Product received", Closed: "Refund issued", Rejected: "Rejected" })[row.returnRequest?.status] || row.returnRequest?.status}</span>{row.returnRequest?.returnShipment?.awbCode && <><br /><small>AWB: {row.returnRequest.returnShipment.awbCode}</small>{row.returnRequest.returnShipment.trackingUrl && <><br /><a href={row.returnRequest.returnShipment.trackingUrl} target="_blank" rel="noreferrer">Track return</a></>}</>}</> },
        { key: "refundTotal", label: "Refunded", render: (row) => money(row.refundTotal) },
        { key: "actions", label: "Next action", sortable: false, render: returnAction }
      ]} />
    </div>
    {target && <div className="modalOverlay" role="dialog" aria-modal="true"><form className="sellerStatusModal" onSubmit={submitRefund}><div className="panelHeader"><div><span className="eyebrow">{target.order.orderNumber}</span><h2>Process return refund</h2></div><button className="inlineButton" type="button" disabled={busy} onClick={() => setTarget(null)}>Close</button></div><label>Refund amount<input required type="number" min="0.01" step="0.01" value={form.amount} onChange={(event) => setForm({ ...form, amount: event.target.value })} /></label><label>Reason<input required value={form.reason} onChange={(event) => setForm({ ...form, reason: event.target.value })} /></label><label>Admin note<textarea required value={form.note} onChange={(event) => setForm({ ...form, note: event.target.value })} /></label><button className="primaryButton" disabled={busy}>{busy ? "Processing…" : "Process refund & close return"}</button></form></div>}
  </section>;
}

function Orders({ orders, pendingItems, pagination, onPageChange, loading, onStatus, onAction }) {
  const [tab, setTab] = useState("pending");
  const [ownershipFilter, setOwnershipFilter] = useState("all");
  const [paymentFilter, setPaymentFilter] = useState("all");
  const [orderSearch, setOrderSearch] = useState("");
  const [statusDrafts, setStatusDrafts] = useState({});
  const [menu, setMenu] = useState("");
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [detailTab, setDetailTab] = useState("summary");
  useEffect(() => {
    const id = currentClientRoute().match(/^#\/admin\/orders\/([^/?]+)/)?.[1];
    if (id && orders.length) setSelectedOrder(orders.find((order) => String(order._id) === decodeURIComponent(id)) || null);
  }, [orders]);
  const openOrder = (order) => { setSelectedOrder(order); window.location.hash = `#/admin/orders/${order._id}`; };
  const closeOrder = () => { setSelectedOrder(null); window.location.hash = "#/admin/orders"; };
  useEffect(() => { if (selectedOrder && !window.location.hash.includes(String(selectedOrder._id))) window.location.hash = `#/admin/orders/${selectedOrder._id}`; }, [selectedOrder]);
  useEffect(() => {
    const closeMenu = (event) => { if (!event.target.closest(".verticalActionMenu")) setMenu(""); };
    document.addEventListener("pointerdown", closeMenu);
    return () => document.removeEventListener("pointerdown", closeMenu);
  }, []);
  const statuses = ["Placed", "Confirmed", "Packed", "Ready to Ship", "Shipped", "Delivered", "Cancelled"];
  const isSellerOrder = (order) => (order.items || []).some((item) => item.seller);
  const itemStatuses = (order) => [...new Set((order.items || []).map((item) => item.sellerStatus || order.status).filter(Boolean))];
  const owner = (order) => {
    const sellers = [...new Map((order.items || []).filter((item) => item.seller).map((item) => [String(item.seller._id || item.seller), item.seller])).values()];
    return sellers.length ? sellers.map((seller) => `${seller.companyName || "Seller"} (${seller.sellerNumber || "No ID"})`).join(", ") : "Admin";
  };
  const searchMatch = (order) => [order.orderNumber, order.invoiceNumber, order.customer?.name, order.customer?.email, order.address?.name, order.address?.email, owner(order)].filter(Boolean).join(" ").toLowerCase().includes(orderSearch.toLowerCase());
  const ownershipMatch = (order) => ownershipFilter === "all" || (ownershipFilter === "seller" ? owner(order) !== "Admin" : owner(order) === "Admin");
  const paymentMatch = (order) => paymentFilter === "all" || order.paymentStatus === paymentFilter;
  const isDelivered = (order) => order.status === "Delivered" || ((order.items || []).length > 0 && order.items.every((item) => ["Delivered", "Completed"].includes(item.sellerStatus)));
  const currentOrders = orders.filter((order) => !isDelivered(order) && !["Cancelled", "Returned"].includes(order.status) && searchMatch(order) && ownershipMatch(order) && paymentMatch(order));
  const deliveredOrders = orders.filter((order) => isDelivered(order) && searchMatch(order) && ownershipMatch(order) && paymentMatch(order));
  const displayOrders = tab === "delivered" ? deliveredOrders : currentOrders;
  const columns = [
    { key: "orderNumber", label: "Order", render: (row) => <><strong>{row.orderNumber}</strong><br /><small>{new Date(row.createdAt).toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short" })}</small></> },
    { key: "owner", label: "Order owner", render: (row) => <span className={`orderOwnerBadge ${isSellerOrder(row) ? "seller" : "admin"}`}><strong>{isSellerOrder(row) ? "Seller" : "Admin"}</strong><small>{isSellerOrder(row) ? owner(row) : "Store fulfilled"}</small></span> },
    { key: "customer", label: "Customer", render: (row) => <>{row.customer?.name || row.address?.name || "Guest"}<br /><small>{row.customer?.email || row.address?.email || ""}</small></> },
    { key: "invoiceNumber", label: "Invoice", render: (row) => <><strong>{row.invoiceNumber || "Not generated"}</strong><br /><small>Shipping {money(Number(row.shipping?.amount) || Number(row.shippingTotal))}</small><br /><small>Total {money(Number(row.grandTotal || 0))}</small><br /><small>Payment: {row.payment?.methodName || "—"} · {row.paymentStatus}</small></> },
    { key: "status", label: "Item status", render: (row) => tab === "delivered" ? <span className="status approved">Delivered</span> : isSellerOrder(row) ? <div className="adminItemStatuses">{itemStatuses(row).map((status) => <span key={status} className={`sellerStatusButton ${String(status).toLowerCase().replaceAll(" ", "-")}`}>{status}</span>)}</div> : <select value={statusDrafts[row._id] || row.status} onChange={(event) => setStatusDrafts((current) => ({ ...current, [row._id]: event.target.value }))}>{statuses.map((status) => <option key={status}>{status}</option>)}</select> },
    { key: "actions", label: "Actions", render: (row) => <div className="verticalActionMenu"><button type="button" aria-label="Order actions" onClick={() => setMenu(menu === row._id ? "" : row._id)}><MoreVertical size={18} /></button>{menu === row._id && <div><button type="button" onClick={() => { setSelectedOrder(row); setDetailTab("summary"); setMenu(""); }}>View details</button>{tab !== "delivered" && !isSellerOrder(row) && <button type="button" onClick={() => onStatus(row, statusDrafts[row._id] || row.status)}>Update status</button>}{row.invoiceNumber && <button type="button" onClick={() => printInvoice(row)}>Print invoice</button>}{tab !== "delivered" && <button type="button" onClick={() => onAction(row, "shiprocket")}>Queue ShipRocket</button>}</div>}</div> }
  ];
  return <section className="contentStack orderFulfillmentPage">
    <nav className="orderFulfillmentTabs"><button className={tab === "pending" ? "active" : ""} onClick={() => setTab("pending")}>Current Pending Orders</button><button className={tab === "grouping" ? "active" : ""} onClick={() => setTab("grouping")}>Pending Item Grouping</button><button className={tab === "delivered" ? "active" : ""} onClick={() => setTab("delivered")}>Delivered Orders</button></nav>
    <div className="panel"><div className="panelHeader"><h2>{tab === "pending" ? "Fulfillment Queue" : tab === "grouping" ? "Seller Pending Item Grouping" : "Delivered Orders"}</h2><div className="toolbar"><label className="searchBox"><Search size={16} /><input placeholder="Search order, seller code/name or Admin" value={orderSearch} onChange={(event) => setOrderSearch(event.target.value)} /></label>{tab !== "grouping" && <><select value={ownershipFilter} onChange={(event) => setOwnershipFilter(event.target.value)}><option value="all">Seller + Admin</option><option value="seller">Seller orders</option><option value="admin">Admin orders</option></select><select aria-label="Filter by payment status" value={paymentFilter} onChange={(event) => setPaymentFilter(event.target.value)}><option value="all">All payments</option><option>Pending</option><option>Paid</option><option>Partially Refunded</option><option>Refunded</option><option>Failed</option></select></>}{tab === "grouping" && <button className="inlineButton" type="button" onClick={() => printPendingItems(pendingItems)}><Printer size={16} /> Print</button>}</div></div>
      {tab === "grouping" ? <DataTable rows={pendingItems.filter((item) => `${item.sku} ${item.name} ${item.seller?.companyName || ""} ${item.seller?.sellerNumber || ""} ${(item.orderNumbers || []).join(" ")}`.toLowerCase().includes(orderSearch.toLowerCase()))} columns={[{ key: "owner", label: "Order owner", render: () => "Admin" },{ key: "sku", label: "SKU" },{ key: "name", label: "Admin Item" },{ key: "quantity", label: "Qty Required" },{ key: "orderCount", label: "Orders" },{ key: "orderNumbers", label: "Order Numbers", render: (row) => row.orderNumbers?.join(", ") }]} /> : <DataTable rows={displayOrders} loading={loading} loadingMessage="Loading orders…" sortable paginated columns={columns} onRowClick={openOrder} />}
    </div>
    {selectedOrder && <div className="trackingRouteOverlay"><OrderTrackingPage order={selectedOrder} onBack={closeOrder} /></div>}
  </section>;
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

function Customers({ customers, pagination, onPageChange, loading }) {
  return (
    <section className="panel">
      <div className="panelHeader">
        <h2>Customer Database</h2>
      </div>
      <DataTable
        rows={customers}
        loading={loading}
        loadingMessage="Loading customers…"
        paginated={false}
        columns={[
          { key: "name", label: "Name" },
          { key: "email", label: "Email" },
          { key: "phone", label: "Phone" },
          { key: "status", label: "Status", render: (row) => <span className="badge">{row.status}</span> },
          { key: "storeCredit", label: "Credit", render: (row) => money(row.storeCredit) }
        ]}
      />
      {!loading && <TablePagination total={pagination.total} page={pagination.page} pageSize={pagination.limit} pageSizes={[10]} onPageChange={onPageChange} onPageSizeChange={() => {}} />}
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
    imageVariants: {},
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
    try {
      const optimized = await optimizeImage(file, { purpose: "blog" });
      setPostForm((current) => ({ ...current, imageUrl: optimized.url, imageVariants: optimized.variants || {} }));
      setUploadStatus("Two optimized images created: 300×300 for home and up to 800×400 for the blog page.");
    } catch (error) {
      setUploadStatus(error.message || "Unable to optimize the blog image.");
      event.target.value = "";
    }
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
      {postForm.imageUrl && <div className="blogImagePreview"><img className="formPreviewImage" src={postForm.imageVariants?.detail || postForm.imageUrl} alt="" /><button className="mediaRemove" type="button" title="Delete blog image" aria-label="Delete blog image" onClick={() => setPostForm({ ...postForm, imageUrl: "", imageVariants: {} })}><Trash2 size={16} /></button></div>}
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
  activeTab,
  onTabChange,
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
  const [paymentForm, setPaymentForm] = useState(paymentMethods[0] || { code: "cod", name: "Cash on Delivery", type: "cod", isActive: true, sortOrder: 1, razorpay: {}, payu: {} });
  const [shippingForm, setShippingForm] = useState(shippingRules[0] || { name: "Flat Rate", type: "flat_rate", isActive: true, flatRate: 8, freeShippingAbove: 75, weightBands: [] });
  const [storeForm, setStoreForm] = useState(storefrontSettings || {});
  const [shipForm, setShipForm] = useState(shipRocketSettings || {});
  const [emailForm, setEmailForm] = useState({ host: "", port: 587, secure: false, username: "", password: "", fromName: "HRSBasket", fromEmail: "" });
  const [testEmailAddress, setTestEmailAddress] = useState("");
  const [uploadStatus, setUploadStatus] = useState("");
  const [settingsMessage, setSettingsMessage] = useState("");
  const [savingSettings, setSavingSettings] = useState(false);
  const [expandedHomeSection, setExpandedHomeSection] = useState("");
  const [draggedHomeSection, setDraggedHomeSection] = useState(null);
  const [categoryPickerValues, setCategoryPickerValues] = useState({});

  useEffect(() => setStoreForm(storefrontSettings || {}), [storefrontSettings]);
  useEffect(() => setShipForm(shipRocketSettings || {}), [shipRocketSettings]);
  useEffect(() => { if (activeTab === "email") api.emailSettings().then(setEmailForm).catch((error) => setSettingsMessage(error.message)); }, [activeTab]);

  const updatePayment = (field, value) => setPaymentForm((current) => ({ ...current, [field]: value }));
  const updateRazorpay = (field, value) => setPaymentForm((current) => ({ ...current, razorpay: { ...current.razorpay, [field]: value } }));
  const updatePayu = (field, value) => setPaymentForm((current) => ({ ...current, payu: { ...current.payu, [field]: value } }));
  const updateShipping = (field, value) => setShippingForm((current) => ({ ...current, [field]: value }));
  const pages = storeForm.pages?.length ? storeForm.pages : [{ title: "", slug: "", menu: "footer", content: "", isActive: true }];
  const footerColumns = storeForm.footerColumns || [];
  const promoBanner = { linkUrl: "#/products", ...(storeForm.promoBanner || {}) };
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
        { type: "browse_collections", title: "Browse Collections", columns: 6, mobileColumns: 2, mobileRows: 2, isActive: true, sortOrder: 2 },
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
      <SettingsRouteTabs activeTab={activeTab} onChange={onTabChange} />
      {settingsMessage && (
        <div className={settingsMessage.startsWith("Changes were not saved") ? "notice errorText" : "notice"} role="status" aria-live="polite">
          {settingsMessage}
        </div>
      )}

      {activeTab === "payments" && (
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
            <option value="payu">PayU Hosted Checkout</option>
          </select>
          <label className="toggleRow"><input type="checkbox" checked={Boolean(paymentForm.isActive)} onChange={(event) => updatePayment("isActive", event.target.checked)} /><span>Active</span></label>
          {paymentForm.type === "razorpay" && (
            <>
              <label><span>Key ID</span><input value={paymentForm.razorpay?.keyId || ""} onChange={(event) => updateRazorpay("keyId", event.target.value)} /></label>
              <label><span>Key Secret</span><input value={paymentForm.razorpay?.keySecret || ""} onChange={(event) => updateRazorpay("keySecret", event.target.value)} /></label>
              <label><span>Merchant ID</span><input value={paymentForm.razorpay?.merchantId || ""} onChange={(event) => updateRazorpay("merchantId", event.target.value)} /></label>
              <label><span>Webhook Secret</span><input value={paymentForm.razorpay?.webhookSecret || ""} onChange={(event) => updateRazorpay("webhookSecret", event.target.value)} /></label>
              <label><span>RazorpayX account number</span><input placeholder="Current account linked to RazorpayX" value={paymentForm.razorpay?.payoutAccountNumber || ""} onChange={(event) => updateRazorpay("payoutAccountNumber", event.target.value)} /></label>
              <select value={paymentForm.razorpay?.environment || "test"} onChange={(event) => updateRazorpay("environment", event.target.value)}>
                <option value="test">Test</option>
                <option value="live">Live</option>
              </select>
            </>
          )}
          {paymentForm.type === "payu" && (
            <>
              <label><span>Merchant Key</span><input required value={paymentForm.payu?.merchantKey || ""} onChange={(event) => updatePayu("merchantKey", event.target.value)} /></label>
              <label><span>Merchant Salt</span><input required type="password" value={paymentForm.payu?.salt || ""} onChange={(event) => updatePayu("salt", event.target.value)} /></label>
              <label><span>Merchant ID</span><input value={paymentForm.payu?.merchantId || ""} onChange={(event) => updatePayu("merchantId", event.target.value)} /></label>
              <label><span>Environment</span><select value={paymentForm.payu?.environment || "test"} onChange={(event) => updatePayu("environment", event.target.value)}><option value="test">Test / UAT</option><option value="live">Live / Production</option></select></label>
              <p className="fieldHint">PayU callback URLs are generated automatically. Keep the Salt private and configure this site domain in your PayU dashboard.</p>
            </>
          )}
          <button className="primaryButton" type="submit" disabled={savingSettings}><Save size={18} /> {savingSettings ? "Saving..." : "Save Payment"}</button>
          <button className="inlineButton" type="button" onClick={() => setPaymentForm({ code: "", name: "", type: "cod", isActive: true, sortOrder: paymentMethods.length + 1, razorpay: {}, payu: {} })}>New Payment Method</button>
        </form>
      </div>
      )}

      {activeTab === "shipping" && (
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

      {activeTab === "email" && (
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

      {false && (
        <section className="contentStack">
          <div className="panelHeader"><div><h2>Pages</h2><p className="mutedText">Create the content pages available across your storefront.</p></div><button className="inlineButton" type="button" onClick={() => setStoreForm({ ...storeForm, pages: [...pages, { title: "", slug: "", content: "", menu: "hidden", isActive: true }] })}>Add page</button></div>
          {pages.map((page, index) => <article className="panel pageEditor" key={page._id || index}><div className="panelHeader"><h3>Page {index + 1}</h3><button className="inlineButton" type="button" onClick={() => setStoreForm({ ...storeForm, pages: pages.filter((_, itemIndex) => itemIndex !== index) })}>Remove</button></div><div className="formGrid twoColumn"><label><span>Page title</span><input required value={page.title || ""} onChange={(event) => { const next = [...pages]; next[index] = { ...page, title: event.target.value, slug: page.slug || event.target.value.toLowerCase().trim().replace(/[^a-z0-9]+/g, "-") }; setStoreForm({ ...storeForm, pages: next }); }} /></label><label><span>URL slug</span><input required value={page.slug || ""} onChange={(event) => { const next = [...pages]; next[index] = { ...page, slug: event.target.value.toLowerCase().replace(/[^a-z0-9-]/g, "") }; setStoreForm({ ...storeForm, pages: next }); }} /></label><label><span>Menu visibility</span><select value={page.menu || "hidden"} onChange={(event) => { const next = [...pages]; next[index] = { ...page, menu: event.target.value }; setStoreForm({ ...storeForm, pages: next }); }}><option value="hidden">Hidden</option><option value="header">Header</option><option value="footer">Footer</option><option value="both">Header and footer</option></select></label><label className="toggleRow"><input type="checkbox" checked={page.isActive !== false} onChange={(event) => { const next = [...pages]; next[index] = { ...page, isActive: event.target.checked }; setStoreForm({ ...storeForm, pages: next }); }} /><span>Published</span></label><label className="full"><span>Page content</span><textarea rows="10" value={page.content || ""} placeholder="Write page content here…" onChange={(event) => { const next = [...pages]; next[index] = { ...page, content: event.target.value }; setStoreForm({ ...storeForm, pages: next }); }} /></label></div></article>)}
          <button className="primaryButton" type="button" disabled={savingSettings} onClick={() => runSettingAction(() => onSaveStorefront(storeForm), "Pages saved successfully.")}><Save size={18} />Save pages</button>
        </section>
      )}

      {false && (
        <section className="contentStack"><div className="panelHeader"><div><h2>Footer columns</h2><p className="mutedText">Drag columns to set their order. Add between 2 and 4 columns.</p></div><button className="inlineButton" type="button" disabled={footerColumns.length >= 4} onClick={() => setStoreForm({ ...storeForm, footerColumns: [...footerColumns, { title: "", type: "links", text: "", links: [{ label: "", url: "" }], pageIds: [], sortOrder: footerColumns.length }] })}>Add column</button></div><div className="footerColumnEditors">{footerColumns.map((column, index) => <article className="panel footerColumnEditor" key={column._id || index} draggable onDragStart={(event) => event.dataTransfer.setData("text/plain", String(index))} onDragOver={(event) => event.preventDefault()} onDrop={(event) => { const from = Number(event.dataTransfer.getData("text/plain")); const next = [...footerColumns]; const [moved] = next.splice(from, 1); next.splice(index, 0, moved); setStoreForm({ ...storeForm, footerColumns: next.map((item, order) => ({ ...item, sortOrder: order })) }); }}><div className="panelHeader"><h3>⋮⋮ Column {index + 1}</h3><button className="inlineButton" type="button" onClick={() => setStoreForm({ ...storeForm, footerColumns: footerColumns.filter((_, itemIndex) => itemIndex !== index) })}>Remove</button></div><label><span>Menu title</span><input value={column.title || ""} onChange={(event) => { const next = [...footerColumns]; next[index] = { ...column, title: event.target.value }; setStoreForm({ ...storeForm, footerColumns: next }); }} /></label><label><span>Content type</span><select value={column.type || "links"} onChange={(event) => { const next = [...footerColumns]; next[index] = { ...column, type: event.target.value }; setStoreForm({ ...storeForm, footerColumns: next }); }}><option value="text">Text</option><option value="links">Custom links</option><option value="pages">Pages</option></select></label>{column.type === "text" && <label><span>Text</span><textarea value={column.text || ""} onChange={(event) => { const next = [...footerColumns]; next[index] = { ...column, text: event.target.value }; setStoreForm({ ...storeForm, footerColumns: next }); }} /></label>}{column.type === "links" && <label><span>Links (label | URL, one per line)</span><textarea value={(column.links || []).map((link) => `${link.label || ""} | ${link.url || ""}`).join("\n")} onChange={(event) => { const links = event.target.value.split("\n").filter(Boolean).map((line) => { const [label, url] = line.split("|"); return { label: label?.trim() || "Link", url: url?.trim() || "#" }; }); const next = [...footerColumns]; next[index] = { ...column, links }; setStoreForm({ ...storeForm, footerColumns: next }); }} /></label>}{column.type === "pages" && <label><span>Pages to show</span><select multiple value={column.pageIds || []} onChange={(event) => { const next = [...footerColumns]; next[index] = { ...column, pageIds: [...event.target.selectedOptions].map((option) => option.value) }; setStoreForm({ ...storeForm, footerColumns: next }); }}>{pages.filter((page) => page.isActive !== false && page.title).map((page) => <option key={page._id || page.slug} value={page._id || page.slug}>{page.title}</option>)}</select></label>}</article>)}</div><button className="primaryButton" type="button" disabled={savingSettings} onClick={() => runSettingAction(() => onSaveStorefront(storeForm), "Footer saved successfully.")}><Save size={18} />Save footer</button></section>
      )}

      {activeTab === "storefront" && (
      <div className="twoColumn">
        <form className="panel formPanel widePanel" onSubmit={(event) => { event.preventDefault(); runSettingAction(() => onSaveStorefront(storeForm), "Storefront settings saved successfully."); }}>
          <div className="panelHeader"><h2>Custom Storefront</h2><Save size={18} /></div>
          <div className="formGrid">
            <label><span>Project title</span><input value={storeForm.projectTitle || "E-commerce Admin"} onChange={(event) => setStoreForm({ ...storeForm, projectTitle: event.target.value })} /></label>
            <label><span>Shop name</span><input value={storeForm.shopName || ""} onChange={(event) => setStoreForm({ ...storeForm, shopName: event.target.value })} /></label>
            <label><span>Admin / portal button color</span><input type="color" value={storeForm.adminButtonColor || "#1e88e5"} onChange={(event) => setStoreForm({ ...storeForm, adminButtonColor: event.target.value })} /></label>
            <label className="uploadBox compactUpload"><ImagePlus size={18} /><span>Upload logo</span><input type="file" accept="image/*" onChange={(event) => uploadSettingImage(event, (url) => setStoreForm((current) => ({ ...current, logoUrl: url })))} /></label>
            <label><span>Header logo width (px)</span><input type="number" min="1" value={storeForm.logoWidth || 140} onChange={(event) => setStoreForm({ ...storeForm, logoWidth: Math.max(1, Number(event.target.value) || 1) })} /></label>
            <label><span>Header logo height (px)</span><input type="number" min="1" value={storeForm.logoHeight || 56} onChange={(event) => setStoreForm({ ...storeForm, logoHeight: Math.max(1, Number(event.target.value) || 1) })} /></label>
            <label className="toggleRow"><input type="checkbox" checked={Boolean(storeForm.hideLogoText)} onChange={(event) => setStoreForm({ ...storeForm, hideLogoText: event.target.checked })} /><span>Hide shop name beside logo</span></label>
            <label className="uploadBox compactUpload"><ImagePlus size={18} /><span>Upload loading screen logo</span><input type="file" accept="image/*" onChange={(event) => uploadSettingImage(event, (url) => setStoreForm((current) => ({ ...current, loadingLogoUrl: url })))} /></label>
            <label><span>Loading logo width (px)</span><input type="number" min="1" value={storeForm.loadingLogoWidth || 120} onChange={(event) => setStoreForm({ ...storeForm, loadingLogoWidth: Math.max(1, Number(event.target.value) || 1) })} /></label>
            <label><span>Loading logo height (px)</span><input type="number" min="1" value={storeForm.loadingLogoHeight || 80} onChange={(event) => setStoreForm({ ...storeForm, loadingLogoHeight: Math.max(1, Number(event.target.value) || 1) })} /></label>
            <label><span>Email</span><input value={storeForm.email || ""} onChange={(event) => setStoreForm({ ...storeForm, email: event.target.value })} /></label>
            <label><span>Phone</span><input value={storeForm.phone || ""} onChange={(event) => setStoreForm({ ...storeForm, phone: event.target.value })} /></label>
            <label><span>Desktop products per row</span><select value={storeForm.productGridSize || 3} onChange={(event) => setStoreForm({ ...storeForm, productGridSize: Number(event.target.value) })}><option value="2">2 products</option><option value="3">3 products</option><option value="4">4 products</option><option value="5">5 products</option></select></label>
            <label><span>Mobile products per row</span><select value={storeForm.mobileProductGridSize || 2} onChange={(event) => setStoreForm({ ...storeForm, mobileProductGridSize: Number(event.target.value) })}><option value="1">1 product</option><option value="2">2 products</option><option value="3">3 products</option></select></label>
            <label><span>Minimum partner withdrawal amount (₹)</span><input type="number" min="0" step="0.01" value={storeForm.minimumPartnerWithdrawalAmount ?? 0} onChange={(event) => setStoreForm({ ...storeForm, minimumPartnerWithdrawalAmount: Math.max(0, Number(event.target.value) || 0) })} /></label>
            <label><span>Seller payment gateway fee (%)</span><input type="number" min="0" max="100" step="0.01" value={storeForm.sellerSettlement?.paymentGatewayFeeRate ?? 2} onChange={(event) => setStoreForm({ ...storeForm, sellerSettlement: { ...storeForm.sellerSettlement, paymentGatewayFeeRate: Number(event.target.value) || 0 } })} /></label>
            <label><span>GST on seller commission (%)</span><input type="number" min="0" max="100" step="0.01" value={storeForm.sellerSettlement?.commissionGstRate ?? 5} onChange={(event) => setStoreForm({ ...storeForm, sellerSettlement: { ...storeForm.sellerSettlement, commissionGstRate: Number(event.target.value) || 0 } })} /></label>
            <label><span>Seller referral commission (% of platform fee)</span><input type="number" min="0" max="100" step="0.01" value={storeForm.sellerSettlement?.referralCommissionRate ?? 0} onChange={(event) => setStoreForm({ ...storeForm, sellerSettlement: { ...storeForm.sellerSettlement, referralCommissionRate: Number(event.target.value) || 0 } })} /></label>
            <label><span>Shipping paid by</span><select value={storeForm.sellerSettlement?.shippingPaidBy || "customer"} onChange={(event) => setStoreForm({ ...storeForm, sellerSettlement: { ...storeForm.sellerSettlement, shippingPaidBy: event.target.value } })}><option value="customer">Customer</option><option value="seller">Seller</option><option value="admin">Admin</option></select></label>
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
          {storeForm.loadingLogoUrl && <img className="formPreviewImage" src={storeForm.loadingLogoUrl} alt="Loading screen logo preview" />}
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

      {activeTab === "shiprocket" && (
      <div className="twoColumn">
        <form className="panel formPanel" onSubmit={(event) => { event.preventDefault(); runSettingAction(() => onSaveShipRocket(shipForm), "ShipRocket settings saved successfully."); }}>
          <div className="panelHeader"><h2>ShipRocket</h2><Truck size={18} /></div>
          <label className="toggleRow"><input type="checkbox" checked={Boolean(shipForm.isActive)} onChange={(event) => setShipForm({ ...shipForm, isActive: event.target.checked })} /><span>Active</span></label>
          <label><span>Shiprocket API user email</span><input type="email" required value={shipForm.email || ""} onChange={(event) => setShipForm({ ...shipForm, email: event.target.value })} /><small>Use the dedicated user generated under Shiprocket Settings → API, not your normal login.</small></label>
          <label><span>Shiprocket API user password</span><input type="password" required value={shipForm.password || ""} onChange={(event) => setShipForm({ ...shipForm, password: event.target.value })} /></label>
          <label><span>Channel ID (optional)</span><input value={shipForm.channelId || ""} onChange={(event) => setShipForm({ ...shipForm, channelId: event.target.value })} /></label>
          <label><span>Preferred courier ID (optional)</span><input value={shipForm.preferredCourierId || ""} onChange={(event) => setShipForm({ ...shipForm, preferredCourierId: event.target.value })} /></label>
          <p className="mutedText">Shipping is calculated separately for each seller using the seller registration pincode as pickup and the customer delivery pincode as destination.</p>
          <button className="primaryButton" type="submit" disabled={savingSettings}><Save size={18} /> {savingSettings ? "Saving..." : "Save ShipRocket"}</button>
        </form>
      </div>
      )}

      {activeTab === "home-sections" && (
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
                      <strong>{section.type === "custom_banner" ? "Custom banner" : section.title || homeSectionTypes.find(([value]) => value === section.type)?.[1] || "Home Section"}</strong>
                      <small>{section.type === "custom_banner" ? `${Math.max(1, Math.min(3, Number(section.columns) || 1))} column layout · ${(section.items || []).filter((item) => item.imageUrl).length || (section.banner?.imageUrl ? 1 : 0)} image(s) selected` : `${homeSectionTypes.find(([value]) => value === section.type)?.[1] || section.type} · ${section.isActive === false ? "Inactive" : "Active"}`}</small>
                    </span>
                    <b>{expandedHomeSection === String(sectionIndex) ? "Hide" : "Edit"}</b>
                  </button>
                  {expandedHomeSection === String(sectionIndex) && (
                    <>
                      <div className="formGrid">
                        {section.type !== "custom_banner" && <label><span>Type</span>
                          <select value={section.type || "custom_content"} onChange={(event) => updateHomeSection(sectionIndex, { type: event.target.value })}>
                            {homeSectionTypes.map(([value, label]) => <option key={value} value={value}>{label}</option>)}
                          </select>
                        </label>}
                        {section.type !== "custom_banner" && <><label><span>Title</span><input value={section.title || ""} onChange={(event) => updateHomeSection(sectionIndex, { title: event.target.value })} /></label><label><span>Subtitle</span><input value={section.subtitle || ""} onChange={(event) => updateHomeSection(sectionIndex, { subtitle: event.target.value })} /></label></>}
                        {section.type !== "browse_collections" && <label><span>{section.type === "custom_banner" ? "Banner columns" : "Desktop columns"}</span>{section.type === "custom_banner" ? <select value={Math.max(1, Math.min(3, Number(section.columns) || 1))} onChange={(event) => { const columns = Number(event.target.value); const legacyImage = section.banner?.imageUrl; const items = Array.from({ length: columns }, (_item, index) => ({ ...(section.items?.[index] || {}), imageUrl: section.items?.[index]?.imageUrl || (index === 0 ? legacyImage : "") || "" })); updateHomeSection(sectionIndex, { columns, items }); }}><option value="1">1 column — 1 image</option><option value="2">2 columns — 2 images</option><option value="3">3 columns — 3 images</option></select> : <input type="number" min={section.type === "category_products" ? 3 : 1} max={section.type === "category_products" ? 5 : 4} value={section.columns || (section.type === "category_products" ? 3 : 2)} onChange={(event) => updateHomeSection(sectionIndex, { columns: Math.max(1, Math.min(8, Number(event.target.value) || 1)) })} />}</label>}
                        {section.type === "category_products" && <label><span>Mobile columns</span><input type="number" min="1" value={section.mobileColumns || 2} onChange={(event) => updateHomeSection(sectionIndex, { mobileColumns: Math.max(1, Number(event.target.value)) })} /></label>}
                        {section.type !== "custom_banner" && <label className="toggleRow"><input type="checkbox" checked={section.isActive !== false} onChange={(event) => updateHomeSection(sectionIndex, { isActive: event.target.checked })} /><span>Active</span></label>}
                        {section.type === "category_products" && (
                          <>
                            {section.type === "category_products" && <label><span>Products per category</span><input type="number" min="1" max="24" value={section.productLimit || 6} onChange={(event) => updateHomeSection(sectionIndex, { productLimit: Number(event.target.value) })} /></label>}
                            <fieldset className="categorySelectionFieldset">
                              <legend>Categories to display</legend>
                              {(() => {
                                const selectedIds = (section.categories?.length ? section.categories : [section.category]).filter(Boolean).map((item) => String(item?._id || item));
                                const categoryLabel = (category) => category.parent?.name ? `${category.parent.name} / ${category.name}` : category.name;
                                const pickerValue = categoryPickerValues[sectionIndex] || "";
                                const addCategory = () => {
                                  const match = categories.find((category) => categoryLabel(category).toLowerCase() === pickerValue.trim().toLowerCase());
                                  if (!match || selectedIds.includes(String(match._id))) return;
                                  updateHomeSection(sectionIndex, { categories: [...selectedIds, match._id], category: undefined });
                                  setCategoryPickerValues((current) => ({ ...current, [sectionIndex]: "" }));
                                };
                                return <>
                                  <div className="categoryAutocomplete">
                                    <input
                                      type="text"
                                      list={`home-category-options-${sectionIndex}`}
                                      placeholder="Type a category name..."
                                      value={pickerValue}
                                      onChange={(event) => setCategoryPickerValues((current) => ({ ...current, [sectionIndex]: event.target.value }))}
                                      onKeyDown={(event) => { if (event.key === "Enter") { event.preventDefault(); addCategory(); } }}
                                    />
                                    <datalist id={`home-category-options-${sectionIndex}`}>
                                      {categories.filter((category) => !selectedIds.includes(String(category._id))).map((category) => <option key={category._id} value={categoryLabel(category)} />)}
                                    </datalist>
                                    <button className="inlineButton" type="button" onClick={addCategory}>Add category</button>
                                    <button className="inlineButton" type="button" onClick={() => updateHomeSection(sectionIndex, { categories: categories.map((category) => category._id), category: undefined })}>Select all</button>
                                    {selectedIds.length > 0 && <button className="inlineButton" type="button" onClick={() => updateHomeSection(sectionIndex, { categories: [], category: undefined })}>Clear</button>}
                                  </div>
                                  <div className="selectedCategoryChips">
                                    {selectedIds.map((categoryId) => {
                                      const category = categories.find((item) => String(item._id) === categoryId);
                                      if (!category) return null;
                                      return <span className="selectedCategoryChip" key={categoryId}>{categoryLabel(category)}<button type="button" aria-label={`Remove ${category.name}`} onClick={() => updateHomeSection(sectionIndex, { categories: selectedIds.filter((id) => id !== categoryId), category: undefined })}>×</button></span>;
                                    })}
                                    {!selectedIds.length && <small className="mutedText">No categories selected.</small>}
                                  </div>
                                </>;
                              })()}
                            </fieldset>
                          </>
                        )}
                      </div>
                      {section.type === "custom_banner" && (
                        <div className="formGrid homeSectionBannerEditor">
                          {Array.from({ length: Math.max(1, Math.min(3, Number(section.columns) || 1)) }, (_slot, imageIndex) => { const imageUrl = section.items?.[imageIndex]?.imageUrl || (imageIndex === 0 ? section.banner?.imageUrl : "") || ""; const linkUrl = section.items?.[imageIndex]?.linkUrl || (imageIndex === 0 ? section.banner?.linkUrl : "") || ""; return <div className="homeSectionBannerSlot" key={imageIndex}><label className="uploadBox compactUpload"><ImagePlus size={18} /><span>{imageUrl ? `Change image ${imageIndex + 1}` : `Choose image ${imageIndex + 1}`}</span><small>Required for column {imageIndex + 1}.</small><input type="file" accept="image/*" required={!imageUrl} onChange={(event) => uploadSettingImage(event, (url) => { const columns = Math.max(1, Math.min(3, Number(section.columns) || 1)); const items = Array.from({ length: columns }, (_item, index) => ({ ...(section.items?.[index] || {}), imageUrl: index === imageIndex ? url : section.items?.[index]?.imageUrl || (index === 0 ? section.banner?.imageUrl : "") || "" })); updateHomeSection(sectionIndex, { items }); })} /></label><label><span>Image {imageIndex + 1} link</span><input value={linkUrl} placeholder="#/products or https://..." onChange={(event) => { const columns = Math.max(1, Math.min(3, Number(section.columns) || 1)); const items = Array.from({ length: columns }, (_item, index) => ({ ...(section.items?.[index] || {}), imageUrl: section.items?.[index]?.imageUrl || (index === 0 ? section.banner?.imageUrl : "") || "", linkUrl: index === imageIndex ? event.target.value : section.items?.[index]?.linkUrl || (index === 0 ? section.banner?.linkUrl : "") || "" })); updateHomeSection(sectionIndex, { items }); }} /></label>{imageUrl && <figure className="homeSectionBannerPreview"><img src={imageUrl} alt={`Custom banner image ${imageIndex + 1} preview`} /><figcaption>Column {imageIndex + 1} preview</figcaption></figure>}</div>; })}
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
                                <label><span>Link URL</span><input value={item.linkUrl || ""} onChange={(event) => updateHomeSectionItem(sectionIndex, itemIndex, { linkUrl: event.target.value })} /></label>
                                <label><span>Link label</span><input value={item.linkLabel || ""} onChange={(event) => updateHomeSectionItem(sectionIndex, itemIndex, { linkLabel: event.target.value })} /></label>
                              </div>
                              {item.type !== "text" && <><label className="uploadBox compactUpload"><ImagePlus size={18} /><span>{item.imageUrl ? "Change content image" : "Choose content image"}</span><small>Choose the image displayed in this home section.</small><input type="file" accept="image/*" required={!item.imageUrl} onChange={(event) => uploadSettingImage(event, (url) => updateHomeSectionItem(sectionIndex, itemIndex, { imageUrl: url }))} /></label>{item.imageUrl && <figure className="homeSectionBannerPreview"><img src={item.imageUrl} alt={`${item.title || "Home section content"} preview`} /><figcaption>Content image preview</figcaption></figure>}</>}
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

      {activeTab === "home" && (
        <form className="panel formPanel widePanel" onSubmit={(event) => { event.preventDefault(); runSettingAction(() => onSaveStorefront({ ...storeForm, promoBanner, benefitItems }), "Home content saved successfully."); }}>
          <div className="panelHeader"><h2>Home Content</h2><Save size={18} /></div>
          <div className="heroEditorItem">
            <div className="panelHeader"><h2>Sale Banner</h2></div>
            <div className="formGrid"><label><span>Banner image link</span><input value={promoBanner.linkUrl || ""} placeholder="#/products or https://..." onChange={(event) => updatePromoBanner({ linkUrl: event.target.value })} /></label></div>
            <label className="uploadBox compactUpload"><ImagePlus size={18} /><span>{promoBanner.imageUrl ? "Change banner image" : "Choose banner image"}</span><input type="file" accept="image/*" required={!promoBanner.imageUrl} onChange={(event) => uploadSettingImage(event, (url) => updatePromoBanner({ imageUrl: url }))} /></label>
            {promoBanner.imageUrl && <figure className="homeSectionBannerPreview"><img src={promoBanner.imageUrl} alt="Sale banner preview" /><figcaption>Banner image preview</figcaption></figure>}
          </div>
          <div className="heroEditorItem">
            <div className="panelHeader"><div><h2>Home Benefits</h2><p className="mutedText">Free Shipping, 24/7 Support and Easy Returns.</p></div></div>
            <label className="toggleRow"><input type="checkbox" checked={storeForm.showBenefitItems !== false} onChange={(event) => setStoreForm({ ...storeForm, showBenefitItems: event.target.checked })} /><span>Show benefits section on storefront</span></label>
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

      {activeTab === "hero" && (
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

      {activeTab === "sections" && (
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

function Team({ mode = "access", onAdd, onBack }) {
  const blankStaff = { name: "", employeeCode: "", email: "", phone: "", mobile: "", address: "", city: "", state: "", pinCode: "", designation: "", joiningDate: "", role: "Staff" };
  const [staff, setStaff] = useState([]); const [teams, setTeams] = useState([]); const [assignments, setAssignments] = useState({ actions: [], items: [] }); const [logs, setLogs] = useState([]); const [tickets, setTickets] = useState([]); const [selectedTicket, setSelectedTicket] = useState(null); const [ticketReply, setTicketReply] = useState("");
  const [staffForm, setStaffForm] = useState(blankStaff); const [teamForm, setTeamForm] = useState({ name: "", code: "", leader: "", members: [] }); const [assignment, setAssignment] = useState({ entityType: "Seller", entity: "", action: "kyc", team: "", staff: "" }); const [notice, setNotice] = useState("");
  const load = async () => {
    if (["staff", "create"].includes(mode)) { setStaff(await api.staff()); return; }
    if (mode === "support") { setTickets(await api.adminTickets()); return; }
    const [staffRows, teamRows, assignmentRows, auditRows] = await Promise.all([api.staff(), api.staffTeams(), api.workAssignments(), api.staffAuditLogs({ limit: 100 })]); setStaff(staffRows); setTeams(teamRows); setAssignments(assignmentRows); setLogs(auditRows);
  };
  useEffect(() => { load().catch((error) => setNotice(error.message)); }, []);
  useEffect(() => {
    if (mode !== "support" || selectedTicket) return undefined;
    const rows = [...document.querySelectorAll(".staffManagementPage .tableWrap tbody tr")];
    const cleanups = rows.map((row, index) => { const open = (event) => { if (event.target.closest("button,select,a,input,textarea")) return; const ticket = tickets[index]; if (!ticket) return; setSelectedTicket(ticket); window.history.pushState({ adminTicket: ticket._id }, "", `${window.location.pathname}${window.location.search}#/admin/support-tickets/${ticket._id}`); }; row.classList.add("clickableTableRow"); row.addEventListener("click", open); return () => row.removeEventListener("click", open); });
    return () => cleanups.forEach((cleanup) => cleanup());
  }, [mode, tickets, selectedTicket]);
  const submit = async (event, action, success) => { event.preventDefault(); try { const result = await action(); setNotice(success(result)); await load(); } catch (error) { setNotice(error.message); } };
  const staffList = <div className="panel tableWrap"><div className="panelHeader"><div><h3>Staff Directory</h3><p>{staff.length} staff member{staff.length === 1 ? "" : "s"}</p></div></div><table><thead><tr><th>Employee</th><th>Contact</th><th>Role</th><th>Designation</th><th>Location</th><th>Status</th><th>Joined</th></tr></thead><tbody>{staff.map((user) => <tr key={user._id}><td><strong>{user.name}</strong><br/><small>{user.employeeCode}</small></td><td>{user.email}<br/><small>{user.mobile || user.phone || "—"}</small></td><td><span className="badge">{user.role}</span></td><td>{user.designation || "—"}</td><td>{[user.city, user.state].filter(Boolean).join(", ") || "—"}</td><td>{user.isActive ? "Active" : "Inactive"}</td><td>{user.joiningDate ? new Date(user.joiningDate).toLocaleDateString("en-IN") : "—"}</td></tr>)}{!staff.length && <tr><td colSpan="7">No staff accounts have been created yet.</td></tr>}</tbody></table></div>;
  const createStaffForm = <form className="panel formPanel" onSubmit={(event) => submit(event, () => api.createStaff(staffForm), (result) => { setStaffForm(blankStaff); return `${result.staff.name} created. Temporary password: ${result.temporaryPassword}`; })}><h3>Create Staff Login</h3><div className="formGrid compact">{[["name","Name"],["employeeCode","Employee code"],["email","Login email"],["phone","Phone"],["mobile","Mobile"],["designation","Designation"],["address","Address"],["city","City"],["state","State"],["pinCode","PIN code"],["joiningDate","Joining date"]].map(([field,label]) => <label key={field}><span>{label}</span><input type={field === "email" ? "email" : field === "joiningDate" ? "date" : "text"} required={["name","employeeCode","email","mobile","address"].includes(field)} value={staffForm[field]} onChange={(event) => setStaffForm({ ...staffForm, [field]: event.target.value })}/></label>)}</div><label><span>Role</span><select value={staffForm.role} onChange={(event) => setStaffForm({ ...staffForm, role: event.target.value })}><option>Staff</option><option>Team Leader</option></select></label><button className="primaryButton"><Plus size={16}/> Create login</button></form>;
  const supportTickets = <div className="panel tableWrap"><div className="panelHeader"><div><h3>Support Ticket Flow</h3><p>Track requests from the admin queue through assignment and resolution.</p></div></div><table><thead><tr><th>Ticket</th><th>Requester</th><th>Issue</th><th>Order</th><th>Team / Staff</th><th>Status</th><th>Action</th></tr></thead><tbody>{tickets.map((ticket) => <tr key={ticket._id}><td><strong>{ticket.ticketNumber}</strong><br/><small>{new Date(ticket.createdAt).toLocaleString("en-IN")}</small></td><td>{ticket.requesterType}<br/><strong>{ticket.requester?.companyName || ticket.requester?.name}</strong></td><td>{ticket.subject}<br/><small>{ticket.category} · {ticket.priority}</small></td><td>{ticket.order?.orderNumber || "General"}</td><td>{ticket.assignedTeam?.name || "Admin Queue"}<br/><small>{ticket.assignedStaff?.name || "Unassigned"}</small></td><td><select value={ticket.status} onChange={async (event) => { try { await api.updateTicket(ticket._id, { status: event.target.value, note: "Status updated from Admin panel" }); await load(); } catch (error) { setNotice(error.message); } }}>{["Open","Assigned","In Progress","Waiting for Customer","Resolved","Closed"].map((status) => <option key={status}>{status}</option>)}</select></td><td><button type="button" onClick={async () => { const reply = window.prompt(`Reply to ${ticket.ticketNumber}`); if (reply?.trim()) { await api.updateTicket(ticket._id, { message: reply.trim(), status: "In Progress" }); await load(); } }}>Reply</button></td></tr>)}{!tickets.length && <tr><td colSpan="7">No support tickets.</td></tr>}</tbody></table></div>;
  if (mode === "staff") return <section className="staffManagementPage contentStack"><div className="panelHeader"><div><span className="eyebrow">Master</span><h2>Staff</h2><p>View all Staff and Team Leader accounts.</p></div><button className="primaryButton" type="button" onClick={onAdd}><Plus size={16}/> Add Staff</button></div>{notice && <div className="notice">{notice}</div>}{staffList}</section>;
  if (mode === "create") return <section className="staffManagementPage contentStack"><div className="panelHeader"><div><span className="eyebrow">Master · Staff</span><h2>Add Staff</h2><p>Create a Staff or Team Leader login and issue its temporary password.</p></div><button className="inlineButton" type="button" onClick={onBack}>Back to Staff</button></div>{notice && <div className="notice">{notice}</div>}<div className="staffManagementGrid singleForm">{createStaffForm}</div></section>;
  if (mode === "support" && selectedTicket) return <section className="ticketDetailRoute"><section className="ticketConversation"><div className="panelHeader"><div><span className="eyebrow">{selectedTicket.ticketNumber}</span><h2>{selectedTicket.subject}</h2><p>{selectedTicket.status} · {selectedTicket.assignedStaff?.name || "Admin Queue"}</p></div><button className="inlineButton" onClick={() => { setSelectedTicket(null); window.history.back(); }}>Back to tickets</button></div><div className="ticketMessages">{selectedTicket.messages.map((entry) => <article key={entry._id} className={entry.authorType === "User" ? "staff" : "requester"}><strong>{entry.authorName || entry.authorType}</strong><p>{entry.message}</p><small>{new Date(entry.createdAt).toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short" })}</small></article>)}</div>{!["Resolved", "Closed"].includes(selectedTicket.status) && <form className="ticketReply" onSubmit={async (event) => { event.preventDefault(); try { const updated = await api.updateTicket(selectedTicket._id, { message: ticketReply.trim(), status: "In Progress" }); setSelectedTicket(updated); setTicketReply(""); await load(); } catch (error) { setNotice(error.message); } }}><MessageSquareText/><textarea required value={ticketReply} onChange={(event) => setTicketReply(event.target.value)} placeholder="Write a reply…"/><button className="primaryButton">Send reply</button></form>}</section></section>;
  if (mode === "support") return <section className="staffManagementPage contentStack"><div className="panelHeader"><div><span className="eyebrow">Operations</span><h2>Support Tickets</h2><p>Track and respond to customer, partner, and seller requests.</p></div></div><div className="ticketFlow" aria-label="Support ticket workflow">{["Open","Assigned","In Progress","Waiting for Customer","Resolved","Closed"].map((status, index) => <div key={status} className="ticketFlowStep"><span>{index + 1}</span><strong>{status}</strong></div>)}</div>{notice && <div className="notice">{notice}</div>}{supportTickets}</section>;
  return <section className="staffManagementPage contentStack">
    <div className="panelHeader"><div><span className="eyebrow">Role-based operations</span><h2>Staff, Teams &amp; Responsibilities</h2><p>Admin delegates entity responsibilities to Team Leaders; Team Leaders delegate them to staff in their team.</p></div></div>{notice && <div className="notice">{notice}</div>}
    <div className="staffManagementGrid"><form className="panel formPanel" onSubmit={(event) => submit(event, () => api.createStaffTeam(teamForm), () => { setTeamForm({ name:"",code:"",leader:"",members:[] }); return "Team created."; })}><h3>Create Team</h3><label>Team name<input required value={teamForm.name} onChange={(event) => setTeamForm({...teamForm,name:event.target.value})}/></label><label>Team code<input required value={teamForm.code} onChange={(event) => setTeamForm({...teamForm,code:event.target.value.toUpperCase()})}/></label><label>Team Leader<select required value={teamForm.leader} onChange={(event) => setTeamForm({...teamForm,leader:event.target.value})}><option value="">Select leader</option>{staff.filter((user) => user.role === "Team Leader" && user.isActive).map((user) => <option key={user._id} value={user._id}>{user.name} · {user.employeeCode}</option>)}</select></label><label>Staff members<select multiple value={teamForm.members} onChange={(event) => setTeamForm({...teamForm,members:[...event.target.selectedOptions].map((option) => option.value)})}>{staff.filter((user) => user.role === "Staff" && user.isActive).map((user) => <option key={user._id} value={user._id}>{user.name} · {user.employeeCode}</option>)}</select><small>A staff member may belong to multiple teams.</small></label><button className="primaryButton"><Plus size={16}/> Create team</button></form>
      <form className="panel formPanel" onSubmit={(event) => submit(event, () => api.assignWork({...assignment,staff:assignment.staff || undefined}), () => "Responsibility assigned." )}><h3>Assign Responsibility</h3><label>Entity type<select value={assignment.entityType} onChange={(event) => setAssignment({...assignment,entityType:event.target.value})}><option>Seller</option><option>Partner</option><option>Customer</option></select></label><label>Seller / Partner / Customer database ID<input required value={assignment.entity} onChange={(event) => setAssignment({...assignment,entity:event.target.value})} placeholder="Paste entity ID"/></label><label>Responsibility<select value={assignment.action} onChange={(event) => setAssignment({...assignment,action:event.target.value})}>{(assignments.actions.length ? assignments.actions : ["kyc","registration","products","orders","returns","customer_care","support","reports","payouts"]).map((action) => <option key={action} value={action}>{action.replaceAll("_"," ")}</option>)}</select></label><label>Team<select required value={assignment.team} onChange={(event) => setAssignment({...assignment,team:event.target.value,staff:""})}><option value="">Select team</option>{teams.filter((team) => team.isActive).map((team) => <option key={team._id} value={team._id}>{team.name}</option>)}</select></label><label>Assign to staff (optional)<select value={assignment.staff} onChange={(event) => setAssignment({...assignment,staff:event.target.value})}><option value="">Team Leader first</option>{(teams.find((team) => team._id === assignment.team)?.members || []).filter((member) => member.isActive).map((member) => <option key={member._id} value={member._id}>{member.name} · {member.employeeCode}</option>)}</select></label><button className="primaryButton">Assign work</button></form></div>
    <div className="panel tableWrap"><h3>Active Assignments</h3><table><thead><tr><th>Entity</th><th>Responsibility</th><th>Team</th><th>Team Leader</th><th>Staff</th><th>Assigned</th></tr></thead><tbody>{assignments.items.filter((item) => item.active).map((item) => <tr key={item._id}><td>{item.entityType}<br/><small>{item.entity?.companyName || item.entity?.name || item.entity?.sellerNumber || item.entity?._id}</small></td><td>{item.action.replaceAll("_"," ")}</td><td>{item.team?.name}</td><td>{item.teamLeader?.name}</td><td>{item.staff?.name || "Not delegated"}</td><td>{new Date(item.createdAt).toLocaleString("en-IN")}</td></tr>)}</tbody></table></div>
    <div className="panel tableWrap"><h3>Staff &amp; Team Audit Trail</h3><table><thead><tr><th>Date &amp; time</th><th>User</th><th>Entity</th><th>Modification</th></tr></thead><tbody>{logs.map((item) => <tr key={item._id}><td>{new Date(item.occurredAt).toLocaleString("en-IN")}</td><td>{item.actorName}<br/><small>{item.actorRole}</small></td><td>{item.entityType}</td><td>{item.description}</td></tr>)}</tbody></table></div>
  </section>;
}
