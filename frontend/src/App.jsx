import ProfileSettings from "./components/ProfileSettings.jsx";
import useOrderActivity from "./hooks/useOrderActivity.js";
import NewOrderNotice from "./components/NewOrderNotice.jsx";
import DashboardAnnouncements from "./components/DashboardAnnouncements.jsx";
import { useState, useEffect, Suspense, lazy } from "react";
import { adminSectionFromHash, currentClientRoute, isStandaloneAdminHost, adminApplicationUrl, catalogRouteFilters, sectionTitle, settingsSectionIds } from "./utils/adminRoutes.js";
import { authStore, api } from "./services/api.js";
import { cachedBrandSettings, cacheBrandSettings } from "./utils/brandSettings.js";
import { emptyAdminState } from "./constants/adminState.js";
import { printInvoice } from "./utils/orderPrinting.js";
import { Menu, RefreshCw, LogOut } from "lucide-react";
import PageLoader from "./components/admin/shared/PageLoader.jsx";
import BrandLogo from "./components/BrandLogo.jsx";
import AdminSidebarLoader from "./components/admin/shared/AdminSidebarLoader.jsx";

const AnnouncementDetailsPage = lazy(() => import("./pages/AnnouncementDetailsPage.jsx"));
const LoginScreen = lazy(() => import("./components/LoginScreen.jsx"));
const PartnerPortal = lazy(() => import("./pages/PartnerPortal.jsx"));
const SellerPortal = lazy(() => import("./pages/SellerPortal.jsx"));
const ResellerPortal = lazy(() => import("./pages/ResellerPortal.jsx"));
const StorefrontPage = lazy(() => import("./pages/StorefrontPage.jsx"));
const Sidebar = lazy(() => import("./components/Sidebar.jsx"));
const StaffWorkDashboard = lazy(() => import("./pages/StaffWorkDashboard.jsx"));
const Analytics = lazy(() => import("./pages/AnalyticsPage.jsx"));
const Catalog = lazy(() => import("./components/admin/catalog/Catalog.jsx"));
const CategoryManager = lazy(() => import("./components/admin/catalog/CategoryManager.jsx"));
const TaxCategoryManager = lazy(() => import("./components/admin/catalog/TaxCategoryManager.jsx"));
const ProductCreatePage = lazy(() => import("./pages/ProductCreatePage.jsx"));
const CategoryEditor = lazy(() => import("./components/admin/catalog/CategoryEditor.jsx"));
const TaxCategoryEditor = lazy(() => import("./components/admin/catalog/TaxCategoryEditor.jsx"));
const Orders = lazy(() => import("./components/admin/orders/Orders.jsx"));
const ReturnsRefunds = lazy(() => import("./components/admin/orders/ReturnsRefunds.jsx"));
const OperationsSettings = lazy(() => import("./components/admin/settings/OperationsSettings.jsx"));
const Customers = lazy(() => import("./components/admin/customers/Customers.jsx"));
const PartnerAdminPage = lazy(() => import("./pages/PartnerAdminPage.jsx"));
const SellerAdminPage = lazy(() => import("./pages/SellerAdminPage.jsx"));
const ResellerAdminPage = lazy(() => import("./pages/ResellerAdminPage.jsx"));
const SellerProductsAdminPage = lazy(() => import("./pages/SellerProductsAdminPage.jsx"));
const ReviewAdminPage = lazy(() => import("./pages/ReviewAdminPage.jsx"));
const AnnouncementsAdminPage = lazy(() => import("./pages/AnnouncementsAdminPage.jsx"));
const BannerAdminPage = lazy(() => import("./pages/BannerAdminPage.jsx"));
const BlogManager = lazy(() => import("./components/admin/blog/BlogManager.jsx"));
const BlogPostEditor = lazy(() => import("./components/admin/blog/BlogPostEditor.jsx"));
const PagesAdminPage = lazy(() => import("./pages/PagesAdminPage.jsx").then((module) => ({ default: module.PagesAdminPage })));
const PageEditorPage = lazy(() => import("./pages/PagesAdminPage.jsx").then((module) => ({ default: module.PageEditorPage })));
const FooterAdminPage = lazy(() => import("./pages/PagesAdminPage.jsx").then((module) => ({ default: module.FooterAdminPage })));
const Marketing = lazy(() => import("./components/admin/marketing/Marketing.jsx"));
const Team = lazy(() => import("./components/admin/team/Team.jsx"));

export default function App() {
  const [announcementRoute, setAnnouncementRoute] = useState(currentClientRoute);
  useEffect(() => {
    const sync = () => setAnnouncementRoute(currentClientRoute());
    window.addEventListener("hashchange", sync);
    window.addEventListener("popstate", sync);
    return () => { window.removeEventListener("hashchange", sync); window.removeEventListener("popstate", sync); };
  }, []);
  const selectedAnnouncementId = new URLSearchParams(announcementRoute.split("?")[1] || "").get("announcement");
  const [active, setActive] = useState(() => adminSectionFromHash() || "analytics");
  const [view, setView] = useState(() => currentClientRoute().startsWith("#/admin") ? (authStore.token ? "admin" : "admin-login") : "storefront");
  const [token, setToken] = useState(authStore.token);
  const [currentUser, setCurrentUser] = useState(authStore.user);
  const orderActivity = useOrderActivity(view === "admin" && token && currentUser?.role === "Super Admin" ? `admin:${currentUser._id}` : null, api.orderActivity);
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
  const [resellerRoute, setResellerRoute] = useState(() => /^#\/reseller(?:[/?]|$)/.test(currentClientRoute()));
  const [adminMenuOpen, setAdminMenuOpen] = useState(false);

  useEffect(() => {
    if (currentClientRoute().startsWith("#/admin") && !isStandaloneAdminHost()) window.location.replace(adminApplicationUrl());
  }, []);


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
      dashboard: ["Team Leader", "Staff"].includes(authStore.user?.role) ? {} : { metrics: api.analytics },
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
      announcements: { storefrontSettings: api.storefrontSettings },
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

  useEffect(() => {
    if (view !== "admin" || !["orders", "returns-refunds"].includes(active) || !orderActivity.recentOrders.length) return;
    let live = true;
    api.orders({ page: 1, limit: 100 }).then(result => {
      if (live) setState(current => ({ ...current, orders: result.items || [] }));
    }).catch(() => {});
    return () => { live = false; };
  }, [orderActivity, active, view]);

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
    if (view !== "admin" || selectedAnnouncementId !== null) loadStorefront();
  }, [view, selectedAnnouncementId !== null]);

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
  useEffect(() => { const sync = () => setResellerRoute(/^#\/reseller(?:[/?]|$)/.test(currentClientRoute())); window.addEventListener("hashchange", sync); window.addEventListener("popstate", sync); return () => { window.removeEventListener("hashchange", sync); window.removeEventListener("popstate", sync); }; }, []);
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
      window.location.hash = `#/admin/${["Staff", "Team Leader"].includes(data.user.role) ? "dashboard" : active || "analytics"}`;
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

  const portalAnnouncement = selectedAnnouncementId !== null && (sellerRoute || resellerRoute)
    ? <AnnouncementDetailsPage announcements={storefront.settings?.announcements} audience={sellerRoute ? "seller" : "reseller"} selectedId={selectedAnnouncementId} route={announcementRoute} loading={storefrontLoading} error={storefrontError} embedded />
    : null;

  if (selectedAnnouncementId !== null && !sellerRoute && !resellerRoute) {
    const audience = announcementRoute.match(/^#\/(seller|reseller|partner)(?:[/?]|$)/)?.[1] || "all";
    return <Suspense fallback={<PageLoader settings={storefront.settings} />}><AnnouncementDetailsPage announcements={storefront.settings?.announcements} audience={audience} selectedId={selectedAnnouncementId} route={announcementRoute} loading={storefrontLoading} error={storefrontError} /></Suspense>;
  }

  if (partnerRoute) return <Suspense fallback={<PageLoader settings={storefront.settings} />}><PartnerPortal settings={storefront.settings} onBack={() => { window.location.hash = "#/"; }} /></Suspense>;
  if (sellerRoute) return <Suspense fallback={<PageLoader settings={storefront.settings} />}><SellerPortal announcementContent={portalAnnouncement} settings={storefront.settings} onBack={() => { window.history.pushState(null, "", "/"); window.dispatchEvent(new PopStateEvent("popstate")); }} /></Suspense>;
  if (resellerRoute) return <Suspense fallback={<PageLoader settings={storefront.settings} />}><ResellerPortal announcementContent={portalAnnouncement} onBack={() => { window.history.pushState(null, "", "/"); window.dispatchEvent(new PopStateEvent("popstate")); }} /></Suspense>;

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
      <Suspense fallback={<AdminSidebarLoader />}><Sidebar pendingOrderCount={orderActivity.pendingCount} settings={state.storefrontSettings} active={active} onChange={navigateAdmin} open={adminMenuOpen} onClose={() => setAdminMenuOpen(false)} onOpen={() => setAdminMenuOpen(true)} /></Suspense>
      <main>
        <header className="topbar berryTopbar">
          <button className="adminMenuButton" type="button" onClick={() => setAdminMenuOpen(true)} aria-label="Open admin menu"><Menu size={22} /></button>
          <div>
            <h1>{sectionTitle(active)}</h1>
            <p>{message}</p>
          </div>
          <div className="sessionBar">
            <button type="button" className="iconButton" onClick={() => navigateAdmin("profile")}>Profile</button><div className="sessionUser">
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
        {["dashboard", "analytics"].includes(active) && <NewOrderNotice activity={orderActivity} onOpen={() => navigateAdmin("orders")} />}
        {["dashboard", "analytics"].includes(active) && <DashboardAnnouncements announcements={storefront.settings?.announcements} />}
        {active === "dashboard" && ["Team Leader", "Staff"].includes(currentUser?.role) && <StaffWorkDashboard onOpenAccess={()=>navigateAdmin("team")}/>} 
        {(active === "analytics" || (active === "dashboard" && !["Team Leader", "Staff"].includes(currentUser?.role))) && <Analytics metrics={state.metrics} />}
        {active === "profile" && <ProfileSettings role="admin" />}
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
            currentUser={currentUser}
            onAccountUpdated={(result) => { authStore.token = result.token; authStore.user = result.user; setToken(result.token); setCurrentUser(result.user); }}
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
        {active === "resellers" && <ResellerAdminPage />}
        {active === "seller-withdrawals" && <SellerAdminPage withdrawalsOnly onBack={currentUser?.role === "Super Admin" ? () => navigateAdmin("sellers") : undefined} />}
        {active === "seller-products" && <SellerProductsAdminPage />}
        {active === "reviews" && <ReviewAdminPage />}
        {active === "announcements" && <AnnouncementsAdminPage settings={state.storefrontSettings || {}} onSave={saveStorefrontSettings} />}
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
        {active === "staff" && <Team mode="staff" onAdd={() => navigateAdmin("create-staff")} onManageAccess={() => navigateAdmin("teams")} />}
        {active === "create-staff" && <Team mode="create" onBack={() => navigateAdmin("staff")} />}
        {active === "support-tickets" && <Team mode="support" />}
        {active === "team" && <Team mode="teams" />}
        {active === "teams" && <Team mode="teams" />}
        {active === "team-create" && <Team mode="team-create" />}
        {active === "team-edit" && <Team mode="team-edit" />}
        {active === "team-assign" && <Team mode="assign" />}
        {active === "team-roster" && <Team mode="roster" />}
        {active === "free-staff" && <Team mode="free-staff" />}
        {active === "team-assignments" && <Team mode="active-assignments" />}
        {active === "staff-history" && <Team mode="staff-history" />}
        </Suspense>
      </main>
    </div>
  );
}
