import { useEffect, useMemo, useRef, useState } from "react";
import { AlertTriangle, Bold, CheckCircle2, FileText, GripVertical, ImagePlus, Italic, Link, List, LogOut, MessageSquareText, PackageSearch, Plus, Printer, RefreshCw, Save, Search, Settings, Trash2, Truck } from "lucide-react";
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import DataTable from "./components/DataTable.jsx";
import LoginScreen from "./components/LoginScreen.jsx";
import Sidebar from "./components/Sidebar.jsx";
import StatCard from "./components/StatCard.jsx";
import { seed } from "./data.js";
import ProductCreatePage from "./pages/ProductCreatePage.jsx";
import StorefrontPage from "./pages/StorefrontPage.jsx";
import { api, authStore } from "./services/api.js";
import { optimizeImage } from "./utils/imageOptimizer.js";

const money = (value) =>
  new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 2 }).format(value || 0);

const sectionLocations = [
  ["home_before_new_arrivals", "Home before New Arrivals"],
  ["home_after_blog", "Home after Blog"],
  ["product_detail_below_details", "Product details below details"],
  ["products_top_right", "All products top right"]
];

const adminSectionIds = new Set(["analytics", "catalog", "add-product", "categories", "tax-categories", "orders", "customers", "blog", "blog-create", "marketing", "team", "settings"]);

const adminSectionFromHash = () => {
  const match = window.location.hash.match(/^#\/admin\/([^/]+)/);
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
      (item) => `<tr><td>${escapeHtml(item.name)}</td><td>${escapeHtml(item.sku)}</td><td>${item.quantity}</td><td>${money(item.price)}</td><td>${money(item.price * item.quantity)}</td></tr>`
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
    <table><thead><tr><th>Item</th><th>SKU</th><th>Qty</th><th>Rate</th><th>Total</th></tr></thead><tbody>${rows}</tbody></table>
    <section class="totals">
      <div><span>Subtotal</span><strong>${money(order.subtotal)}</strong></div>
      <div><span>Shipping</span><strong>${money(order.shippingTotal)}</strong></div>
      <div><span>Tax</span><strong>${money(order.taxTotal)}</strong></div>
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
    products: seed.products,
    featuredProducts: seed.products,
    categories: seed.categories,
    banner: {
      title: "Fresh arrivals for everyday living",
      imageUrl: "",
      linkUrl: "#products"
    },
    heroItems: [],
    contentSections: [],
    firstOrderDiscount: null,
    blogPosts: [],
    settings: {},
    paymentMethods: [],
    shippingRules: []
  });
  const [message, setMessage] = useState("Sign in verified. Loading admin workspace.");
  const [loading, setLoading] = useState(false);
  const [authError, setAuthError] = useState("");
  const [loginForm, setLoginForm] = useState({ email: "admin@example.com", password: "password123" });
  const [promotionForm, setPromotionForm] = useState({ code: "", name: "", type: "percentage", audience: "all", value: 10, maxDiscountAmount: 0, minimumOrderValue: 0, startsAt: "", endsAt: "", isActive: true });
  const [userForm, setUserForm] = useState({ name: "", email: "", password: "", role: "Customer Support" });
  const [blogDraft, setBlogDraft] = useState(null);
  const [query, setQuery] = useState("");
  const [state, setState] = useState(seed);

  const loadStorefront = async () => {
    try {
      const data = await api.storefront();
      setStorefront({
        products: data.products?.length ? data.products : seed.products,
        featuredProducts: data.featuredProducts?.length ? data.featuredProducts : seed.products,
        categories: data.categories?.length ? data.categories : seed.categories,
        banner: data.banner || storefront.banner,
        heroItems: data.heroItems || [],
        contentSections: data.contentSections || [],
        firstOrderDiscount: data.firstOrderDiscount || null,
        blogPosts: data.blogPosts || [],
        settings: data.settings || {},
        paymentMethods: data.paymentMethods || [],
        shippingRules: data.shippingRules || []
      });
    } catch (_error) {
      setStorefront({
        products: seed.products,
        featuredProducts: seed.products,
        categories: seed.categories,
        banner: storefront.banner,
        heroItems: [],
        contentSections: [],
        firstOrderDiscount: null,
        blogPosts: [],
        settings: {},
        paymentMethods: [],
        shippingRules: []
      });
    }
  };

  const loadApiData = async () => {
    if (!authStore.token) {
      setState(seed);
      return;
    }
    setLoading(true);
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
      setMessage("Live API data loaded.");
    } catch (error) {
      setMessage(error.message);
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
    syncAdminRoute();
    return () => window.removeEventListener("hashchange", syncAdminRoute);
  }, [view, token]);

  const filteredProducts = useMemo(() => {
    const text = query.toLowerCase();
    return state.products.filter((product) =>
      [product.name, product.sku, getCategoryName(product.category), product.taxCategory?.name].join(" ").toLowerCase().includes(text)
    );
  }, [query, state.products]);

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
    setState(seed);
    setActive("analytics");
    setView("storefront");
    setMessage("Signed out.");
    loadStorefront();
  };

  const addProduct = async (payload) => {
    const created = await api.createProduct(payload);
    setState((current) => ({ ...current, products: [created, ...current.products] }));
    setActive("catalog");
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

  if (view !== "admin" || !token) {
    return (
      <StorefrontPage
        products={storefront.products}
        featuredProducts={storefront.featuredProducts}
        categories={storefront.categories}
            banner={storefront.banner}
            heroItems={storefront.heroItems}
            contentSections={storefront.contentSections}
            firstOrderDiscount={storefront.firstOrderDiscount}
            blogPosts={storefront.blogPosts}
            settings={storefront.settings}
            paymentMethods={storefront.paymentMethods}
            shippingRules={storefront.shippingRules}
        onAdminLogin={() => setView("admin-login")}
      />
    );
  }

  return (
    <div className="appShell">
      <Sidebar active={active} onChange={navigateAdmin} />
      <main>
        <header className="topbar">
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
            products={filteredProducts}
            categories={state.categories}
            taxCategories={state.taxCategories}
            query={query}
            setQuery={setQuery}
            onAddProduct={() => navigateAdmin("add-product")}
            onFeature={updateProduct}
            onUpdateProduct={updateProduct}
            onDeleteProduct={deleteProduct}
            onCategories={() => navigateAdmin("categories")}
            onTaxCategories={() => navigateAdmin("tax-categories")}
          />
        )}
        {active === "categories" && (
          <CategoryManager categories={state.categories} onCreate={addCategory} onUpdate={updateCategory} onDelete={deleteCategory} />
        )}
        {active === "tax-categories" && (
          <TaxCategoryManager taxCategories={state.taxCategories} onCreate={addTaxCategory} onUpdate={updateTaxCategory} onDelete={deleteTaxCategory} />
        )}
        {active === "add-product" && (
          <ProductCreatePage
            categories={state.categories}
            taxCategories={state.taxCategories}
            onCreate={addProduct}
            onCreateCategory={addCategory}
            onCreateTaxCategory={addTaxCategory}
          />
        )}
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
    categories: "Category Management",
    "tax-categories": "Tax Category Management",
    orders: "Order Fulfillment",
    customers: "Customer CRM",
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

function Catalog({ products, categories, taxCategories, query, setQuery, onAddProduct, onFeature, onUpdateProduct, onDeleteProduct, onCategories, onTaxCategories }) {
  const [editing, setEditing] = useState(null);
  const [imageStatus, setImageStatus] = useState("");

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
      offerPrice: Number(editing.offerPrice || editing.price),
      status: editing.status,
      category: editing.category?._id || editing.category,
      taxCategory: editing.taxCategory?._id || editing.taxCategory || undefined,
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
      <div className="panel">
        <div className="panelHeader">
          <h2>Products</h2>
          <div className="toolbar">
            <label className="searchBox">
              <Search size={16} />
              <input placeholder="Search products" value={query} onChange={(event) => setQuery(event.target.value)} />
            </label>
            <button className="primaryButton" type="button" onClick={onAddProduct}>
              <Plus size={18} /> Add Product
            </button>
            <button className="inlineButton" type="button" onClick={onCategories}>Categories</button>
            <button className="inlineButton" type="button" onClick={onTaxCategories}>Tax</button>
          </div>
        </div>
        <DataTable
          rows={products}
          columns={[
            { key: "image", label: "Image", render: (row) => getProductThumb(row) ? <img className="tableThumb" src={getProductThumb(row)} alt="" /> : "None" },
            { key: "name", label: "Name" },
            { key: "sku", label: "SKU" },
            { key: "category", label: "Category", render: (row) => getCategoryName(row.category) },
            { key: "taxCategory", label: "Tax", render: (row) => row.taxCategory ? `${row.taxCategory.name} (${row.taxCategory.rate}%)` : "None" },
            { key: "displayType", label: "Type", render: (row) => <span className="badge">{row.displayType || "Product"}</span> },
            { key: "price", label: "Price", render: (row) => money(row.price) },
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
              render: (row) => (
                <div className="tableActions">
                  <button
                    type="button"
                    title="Edit product"
                    onClick={() => {
                      const media = row.media?.length ? row.media : row.mainImage ? [{ url: row.mainImage, type: "image", isMain: true, alt: row.name }] : [];
                      setEditing({ ...row, media });
                      setImageStatus("");
                    }}
                  >
                    <FileText size={16} />
                  </button>
                  <button type="button" title="Delete product" onClick={() => onDeleteProduct(row)}><Trash2 size={16} /></button>
                </div>
              )
            }
          ]}
        />
      </div>

      {editing && (
        <form className="panel formPanel" onSubmit={submitEdit}>
          <div className="panelHeader">
            <h2>Edit Product</h2>
            <button className="inlineButton" type="button" onClick={() => { setEditing(null); setImageStatus(""); }}>Close</button>
          </div>
          <div className="formGrid">
            <label><span>Name</span><input value={editing.name || ""} onChange={(event) => setEditing({ ...editing, name: event.target.value })} required /></label>
            <label><span>SKU</span><input value={editing.sku || ""} onChange={(event) => setEditing({ ...editing, sku: event.target.value })} required /></label>
            <label><span>Price</span><input type="number" value={editing.price || 0} onChange={(event) => setEditing({ ...editing, price: event.target.value })} required /></label>
            <label><span>Offer price</span><input type="number" value={editing.offerPrice || ""} onChange={(event) => setEditing({ ...editing, offerPrice: event.target.value })} /></label>
            <label><span>Category</span><select value={editing.category?._id || editing.category || ""} onChange={(event) => setEditing({ ...editing, category: event.target.value })}>{categories.map((category) => <option key={category._id} value={category._id}>{getCategoryName(category)}</option>)}</select></label>
            <label><span>Tax</span><select value={editing.taxCategory?._id || editing.taxCategory || ""} onChange={(event) => setEditing({ ...editing, taxCategory: event.target.value })}><option value="">None</option>{taxCategories.map((tax) => <option key={tax._id} value={tax._id}>{tax.name}</option>)}</select></label>
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

      <div className="twoColumn">
        <div className="panel">
          <div className="panelHeader">
            <h2>Categories</h2>
          </div>
          <DataTable
            rows={categories}
            columns={[
              { key: "name", label: "Name" },
              { key: "parent", label: "Parent", render: (row) => row.parent?.name || "None" },
              { key: "slug", label: "Slug" },
              { key: "isActive", label: "Active", render: (row) => (row.isActive ? "Yes" : "No") }
            ]}
          />
        </div>
        <div className="panel">
          <div className="panelHeader">
            <h2>Tax Categories</h2>
          </div>
          <DataTable
            rows={taxCategories}
            columns={[
              { key: "name", label: "Name" },
              { key: "code", label: "Code" },
              { key: "rate", label: "Rate", render: (row) => `${row.rate}%` },
              { key: "isActive", label: "Active", render: (row) => (row.isActive ? "Yes" : "No") }
            ]}
          />
        </div>
      </div>
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
          columns={[
            { key: "orderNumber", label: "Order" },
            { key: "invoiceNumber", label: "Invoice", render: (row) => row.invoiceNumber || "Not generated" },
            { key: "customer", label: "Customer", render: (row) => row.customer?.name || "Guest" },
            { key: "email", label: "Email", render: (row) => row.customer?.email || row.address?.email || "" },
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

function CategoryManager({ categories, onCreate, onUpdate, onDelete }) {
  const [form, setForm] = useState({ name: "", slug: "", parent: "", description: "", imageUrl: "", isActive: true });
  const [status, setStatus] = useState("");

  const edit = (category) => setForm({ ...category, parent: category.parent?._id || category.parent || "" });
  const uploadImage = async (event) => {
    const file = event.target.files?.[0];
    if (!file) return;
    setStatus("Optimizing category image...");
    const optimized = await optimizeImage(file, { maxWidth: 1200, maxHeight: 900, quality: 0.82 });
    setForm((current) => ({ ...current, imageUrl: optimized.url }));
    setStatus(`Image ready at ${optimized.width}x${optimized.height}.`);
  };
  const submit = async (event) => {
    event.preventDefault();
    const payload = { ...form, parent: form.parent || null };
    if (form._id) await onUpdate(form, payload);
    else await onCreate(payload);
    setForm({ name: "", slug: "", parent: "", description: "", imageUrl: "", isActive: true });
    setStatus("");
  };

  return (
    <section className="twoColumn">
      <div className="panel widePanel">
        <div className="panelHeader"><h2>Categories</h2></div>
        <DataTable
          rows={categories}
          columns={[
            { key: "imageUrl", label: "Image", render: (row) => row.imageUrl ? <img className="tableThumb" src={row.imageUrl} alt="" /> : "None" },
            { key: "name", label: "Name" },
            { key: "parent", label: "Parent", render: (row) => row.parent?.name || "None" },
            { key: "slug", label: "Slug" },
            { key: "isActive", label: "Active", render: (row) => (row.isActive ? "Yes" : "No") },
            {
              key: "actions",
              label: "Actions",
              render: (row) => (
                <div className="tableActions">
                  <button type="button" title="Edit category" onClick={() => edit(row)}><FileText size={16} /></button>
                  <button type="button" title="Delete category" onClick={() => onDelete(row)}><Trash2 size={16} /></button>
                </div>
              )
            }
          ]}
        />
      </div>
      <form className="panel formPanel" onSubmit={submit}>
        <div className="panelHeader"><h2>{form._id ? "Edit Category" : "Add Category"}</h2><Save size={18} /></div>
        <label><span>Name</span><input value={form.name || ""} onChange={(event) => setForm({ ...form, name: event.target.value })} required /></label>
        <label><span>Slug</span><input value={form.slug || ""} onChange={(event) => setForm({ ...form, slug: event.target.value })} /></label>
        <label><span>Parent</span><select value={form.parent || ""} onChange={(event) => setForm({ ...form, parent: event.target.value })}><option value="">No parent</option>{categories.filter((item) => item._id !== form._id).map((category) => <option key={category._id} value={category._id}>{category.name}</option>)}</select></label>
        <label><span>Description</span><textarea value={form.description || ""} onChange={(event) => setForm({ ...form, description: event.target.value })} /></label>
        <label><span>Image URL</span><input value={form.imageUrl || ""} onChange={(event) => setForm({ ...form, imageUrl: event.target.value })} /></label>
        <label className="uploadBox compactUpload"><ImagePlus size={18} /><span>Upload image</span><input type="file" accept="image/*" onChange={uploadImage} /></label>
        {form.imageUrl && <img className="formPreviewImage" src={form.imageUrl} alt="" />}
        {status && <p className="mutedText">{status}</p>}
        <label className="toggleRow"><input type="checkbox" checked={Boolean(form.isActive)} onChange={(event) => setForm({ ...form, isActive: event.target.checked })} /><span>Active</span></label>
        <button className="primaryButton" type="submit"><Save size={18} /> Save Category</button>
      </form>
    </section>
  );
}

function TaxCategoryManager({ taxCategories, onCreate, onUpdate, onDelete }) {
  const [form, setForm] = useState({ name: "", code: "", rate: "", description: "", isActive: true });
  const edit = (tax) => setForm(tax);
  const submit = async (event) => {
    event.preventDefault();
    const payload = { ...form, rate: Number(form.rate) };
    if (form._id) await onUpdate(form, payload);
    else await onCreate(payload);
    setForm({ name: "", code: "", rate: "", description: "", isActive: true });
  };

  return (
    <section className="twoColumn">
      <div className="panel widePanel">
        <div className="panelHeader"><h2>Tax Categories</h2></div>
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
                  <button type="button" title="Edit tax category" onClick={() => edit(row)}><FileText size={16} /></button>
                  <button type="button" title="Delete tax category" onClick={() => onDelete(row)}><Trash2 size={16} /></button>
                </div>
              )
            }
          ]}
        />
      </div>
      <form className="panel formPanel" onSubmit={submit}>
        <div className="panelHeader"><h2>{form._id ? "Edit Tax" : "Add Tax"}</h2><Save size={18} /></div>
        <label><span>Name</span><input value={form.name || ""} onChange={(event) => setForm({ ...form, name: event.target.value })} required /></label>
        <label><span>Code</span><input value={form.code || ""} onChange={(event) => setForm({ ...form, code: event.target.value })} required /></label>
        <label><span>Rate %</span><input type="number" min="0" step="0.01" value={form.rate || ""} onChange={(event) => setForm({ ...form, rate: event.target.value })} required /></label>
        <label><span>Description</span><textarea value={form.description || ""} onChange={(event) => setForm({ ...form, description: event.target.value })} /></label>
        <label className="toggleRow"><input type="checkbox" checked={Boolean(form.isActive)} onChange={(event) => setForm({ ...form, isActive: event.target.checked })} /><span>Active</span></label>
        <button className="primaryButton" type="submit"><Save size={18} /> Save Tax</button>
      </form>
    </section>
  );
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
  const [settingsTab, setSettingsTab] = useState("payments");
  const [uploadStatus, setUploadStatus] = useState("");
  const [expandedHomeSection, setExpandedHomeSection] = useState("");
  const [draggedHomeSection, setDraggedHomeSection] = useState(null);

  useEffect(() => setStoreForm(storefrontSettings || {}), [storefrontSettings]);
  useEffect(() => setShipForm(shipRocketSettings || {}), [shipRocketSettings]);

  const updatePayment = (field, value) => setPaymentForm((current) => ({ ...current, [field]: value }));
  const updateRazorpay = (field, value) => setPaymentForm((current) => ({ ...current, razorpay: { ...current.razorpay, [field]: value } }));
  const updateShipping = (field, value) => setShippingForm((current) => ({ ...current, [field]: value }));
  const pages = storeForm.pages?.length ? storeForm.pages : [{ title: "", slug: "", menu: "footer", content: "", isActive: true }];
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

  return (
    <section className="contentStack">
      <div className="settingsTabs">
        {[
          ["payments", "Payment Methods"],
          ["shipping", "Shipping Rules"],
          ["shiprocket", "ShipRocket Setting"],
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
                    <button type="button" title="Delete payment method" onClick={() => onDeletePayment(row)}><Trash2 size={16} /></button>
                  </div>
                )
              }
            ]}
          />
        </div>
        <form className="panel formPanel" onSubmit={(event) => { event.preventDefault(); onSavePayment(paymentForm); }}>
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
          <button className="primaryButton" type="submit"><Save size={18} /> Save Payment</button>
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
                    <button type="button" title="Delete shipping rule" onClick={() => onDeleteShipping(row)}><Trash2 size={16} /></button>
                  </div>
                )
              }
            ]}
          />
        </div>
        <form className="panel formPanel" onSubmit={(event) => { event.preventDefault(); onSaveShipping(shippingForm); }}>
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
          <button className="primaryButton" type="submit"><Save size={18} /> Save Shipping</button>
          <button className="inlineButton" type="button" onClick={() => setShippingForm({ name: "", type: "flat_rate", isActive: true, flatRate: 0, freeShippingAbove: 0, weightBands: [] })}>New Shipping Rule</button>
        </form>
      </div>
      )}

      {settingsTab === "storefront" && (
      <div className="twoColumn">
        <form className="panel formPanel widePanel" onSubmit={(event) => { event.preventDefault(); onSaveStorefront(storeForm); }}>
          <div className="panelHeader"><h2>Custom Storefront</h2><Save size={18} /></div>
          <div className="formGrid">
            <label><span>Shop name</span><input value={storeForm.shopName || ""} onChange={(event) => setStoreForm({ ...storeForm, shopName: event.target.value })} /></label>
            <label><span>Logo URL</span><input value={storeForm.logoUrl || ""} onChange={(event) => setStoreForm({ ...storeForm, logoUrl: event.target.value })} /></label>
            <label className="uploadBox compactUpload"><ImagePlus size={18} /><span>Upload logo</span><input type="file" accept="image/*" onChange={(event) => uploadSettingImage(event, (url) => setStoreForm((current) => ({ ...current, logoUrl: url })))} /></label>
            <label><span>Email</span><input value={storeForm.email || ""} onChange={(event) => setStoreForm({ ...storeForm, email: event.target.value })} /></label>
            <label><span>Phone</span><input value={storeForm.phone || ""} onChange={(event) => setStoreForm({ ...storeForm, phone: event.target.value })} /></label>
            <label><span>Product grid size</span><input type="number" min="2" max="5" value={storeForm.productGridSize || 3} onChange={(event) => setStoreForm({ ...storeForm, productGridSize: Number(event.target.value) })} /></label>
          </div>
          {storeForm.logoUrl && <img className="formPreviewImage" src={storeForm.logoUrl} alt="" />}
          {uploadStatus && <p className="mutedText">{uploadStatus}</p>}
          <label><span>Address</span><textarea value={storeForm.address || ""} onChange={(event) => setStoreForm({ ...storeForm, address: event.target.value })} /></label>
          <div className="formGrid">
            {pages.slice(0, 2).map((page, index) => (
              <label key={index}><span>Custom page {index + 1}</span><input value={page.title || ""} placeholder="Title" onChange={(event) => { const next = [...pages]; next[index] = { ...next[index], title: event.target.value, slug: event.target.value.toLowerCase().replace(/\s+/g, "-"), isActive: true }; setStoreForm({ ...storeForm, pages: next }); }} /></label>
            ))}
          </div>
          <button className="primaryButton" type="submit"><Save size={18} /> Save Storefront</button>
        </form>
      </div>
      )}

      {settingsTab === "shiprocket" && (
      <div className="twoColumn">
        <form className="panel formPanel" onSubmit={(event) => { event.preventDefault(); onSaveShipRocket(shipForm); }}>
          <div className="panelHeader"><h2>ShipRocket</h2><Truck size={18} /></div>
          <label className="toggleRow"><input type="checkbox" checked={Boolean(shipForm.isActive)} onChange={(event) => setShipForm({ ...shipForm, isActive: event.target.checked })} /><span>Active</span></label>
          {["email", "password", "pickupLocation", "channelId"].map((field) => (
            <label key={field}><span>{field}</span><input value={shipForm[field] || ""} onChange={(event) => setShipForm({ ...shipForm, [field]: event.target.value })} /></label>
          ))}
          <button className="primaryButton" type="submit"><Save size={18} /> Save ShipRocket</button>
        </form>
      </div>
      )}

      {settingsTab === "home-sections" && (
        <form className="panel formPanel widePanel" onSubmit={(event) => { event.preventDefault(); onSaveStorefront({ ...storeForm, homeSections: homeSectionsPayload() }); }}>
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
          <button className="primaryButton" type="submit"><Save size={18} /> Save Home Sections</button>
        </form>
      )}

      {settingsTab === "home" && (
        <form className="panel formPanel widePanel" onSubmit={(event) => { event.preventDefault(); onSaveStorefront({ ...storeForm, promoBanner, benefitItems }); }}>
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
          <button className="primaryButton" type="submit"><Save size={18} /> Save Home Content</button>
        </form>
      )}

      {settingsTab === "hero" && (
        <form className="panel formPanel" onSubmit={(event) => { event.preventDefault(); onSaveStorefront({ ...storeForm, heroItems }); }}>
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
            <button className="primaryButton" type="submit"><Save size={18} /> Save Heroes</button>
          </div>
        </form>
      )}

      {settingsTab === "sections" && (
        <form className="panel formPanel widePanel" onSubmit={(event) => { event.preventDefault(); onSaveStorefront({ ...storeForm, contentSections }); }}>
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
            <button className="primaryButton" type="submit"><Save size={18} /> Save Sections</button>
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
