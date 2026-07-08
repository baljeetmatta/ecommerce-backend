const API_URL = import.meta.env.VITE_API_URL || "http://localhost:5000/api";

export const authStore = {
  get token() {
    return localStorage.getItem("admin_token");
  },
  set token(value) {
    if (value) localStorage.setItem("admin_token", value);
    else localStorage.removeItem("admin_token");
  },
  get user() {
    const value = localStorage.getItem("admin_user");
    return value ? JSON.parse(value) : null;
  },
  set user(value) {
    if (value) localStorage.setItem("admin_user", JSON.stringify(value));
    else localStorage.removeItem("admin_user");
  },
  clear() {
    localStorage.removeItem("admin_token");
    localStorage.removeItem("admin_user");
  }
};

export const customerAuthStore = {
  get token() {
    return localStorage.getItem("customer_token");
  },
  set token(value) {
    if (value) localStorage.setItem("customer_token", value);
    else localStorage.removeItem("customer_token");
  },
  get customer() {
    const value = localStorage.getItem("customer_user");
    return value ? JSON.parse(value) : null;
  },
  set customer(value) {
    if (value) localStorage.setItem("customer_user", JSON.stringify(value));
    else localStorage.removeItem("customer_user");
  },
  clear() {
    localStorage.removeItem("customer_token");
    localStorage.removeItem("customer_user");
  }
};

const request = async (path, options = {}) => {
  const response = await fetch(`${API_URL}${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...(authStore.token ? { Authorization: `Bearer ${authStore.token}` } : {}),
      ...options.headers
    }
  });

  const data = await response.json().catch(() => null);

  if (!response.ok) {
    throw new Error(data?.message || "Request failed");
  }

  return data;
};

const customerRequest = (path, options = {}) =>
  request(path, {
    ...options,
    headers: {
      ...(customerAuthStore.token ? { Authorization: `Bearer ${customerAuthStore.token}` } : {}),
      ...options.headers
    }
  });

export const api = {
  storefront: () => request("/storefront"),
  login: (payload) => request("/auth/login", { method: "POST", body: JSON.stringify(payload) }),
  customerLogin: (payload) => customerRequest("/auth/customer/login", { method: "POST", body: JSON.stringify(payload) }),
  customerRegister: (payload) => customerRequest("/auth/customer/register", { method: "POST", body: JSON.stringify(payload) }),
  customerMe: () => customerRequest("/auth/customer/me"),
  me: () => request("/auth/me"),
  analytics: () => request("/analytics"),
  categories: () => request("/categories"),
  createCategory: (payload) => request("/categories", { method: "POST", body: JSON.stringify(payload) }),
  updateCategory: (id, payload) => request(`/categories/${id}`, { method: "PUT", body: JSON.stringify(payload) }),
  deleteCategory: (id) => request(`/categories/${id}`, { method: "DELETE" }),
  taxCategories: () => request("/tax-categories"),
  createTaxCategory: (payload) => request("/tax-categories", { method: "POST", body: JSON.stringify(payload) }),
  updateTaxCategory: (id, payload) => request(`/tax-categories/${id}`, { method: "PUT", body: JSON.stringify(payload) }),
  deleteTaxCategory: (id) => request(`/tax-categories/${id}`, { method: "DELETE" }),
  products: () => request("/products"),
  createProduct: (payload) => request("/products", { method: "POST", body: JSON.stringify(payload) }),
  updateProduct: (id, payload) => request(`/products/${id}`, { method: "PUT", body: JSON.stringify(payload) }),
  deleteProduct: (id) => request(`/products/${id}`, { method: "DELETE" }),
  updateInventory: (id, payload) => request(`/products/${id}/inventory`, { method: "PATCH", body: JSON.stringify(payload) }),
  orders: (params = {}) => request(`/orders${new URLSearchParams(params).toString() ? `?${new URLSearchParams(params)}` : ""}`),
  pendingItems: () => request("/orders/reports/pending-items"),
  updateOrder: (id, payload) => request(`/orders/${id}/status`, { method: "PATCH", body: JSON.stringify(payload) }),
  updateOrderItems: (id, payload) => request(`/orders/${id}/items`, { method: "PATCH", body: JSON.stringify(payload) }),
  generateInvoice: (id) => request(`/orders/${id}/invoice`, { method: "POST" }),
  updateTracking: (id, payload) => request(`/orders/${id}/tracking`, { method: "PATCH", body: JSON.stringify(payload) }),
  syncShipRocket: (id) => request(`/orders/${id}/shiprocket`, { method: "POST" }),
  createStorefrontOrder: (payload) => request("/storefront/orders", { method: "POST", body: JSON.stringify(payload) }),
  refundOrder: (id, payload) => request(`/orders/${id}/refunds`, { method: "POST", body: JSON.stringify(payload) }),
  customers: () => request("/customers"),
  issueCredit: (id, payload) => request(`/customers/${id}/store-credit`, { method: "POST", body: JSON.stringify(payload) }),
  blogCategories: () => request("/blog/categories"),
  createBlogCategory: (payload) => request("/blog/categories", { method: "POST", body: JSON.stringify(payload) }),
  updateBlogCategory: (id, payload) => request(`/blog/categories/${id}`, { method: "PUT", body: JSON.stringify(payload) }),
  deleteBlogCategory: (id) => request(`/blog/categories/${id}`, { method: "DELETE" }),
  blogPosts: () => request("/blog/posts"),
  createBlogPost: (payload) => request("/blog/posts", { method: "POST", body: JSON.stringify(payload) }),
  updateBlogPost: (id, payload) => request(`/blog/posts/${id}`, { method: "PUT", body: JSON.stringify(payload) }),
  deleteBlogPost: (id) => request(`/blog/posts/${id}`, { method: "DELETE" }),
  promotions: () => request("/promotions"),
  createPromotion: (payload) => request("/promotions", { method: "POST", body: JSON.stringify(payload) }),
  updatePromotion: (id, payload) => request(`/promotions/${id}`, { method: "PUT", body: JSON.stringify(payload) }),
  users: () => request("/users"),
  createUser: (payload) => request("/users", { method: "POST", body: JSON.stringify(payload) }),
  paymentMethods: () => request("/settings/payment-methods"),
  savePaymentMethod: (payload) =>
    request(`/settings/payment-methods${payload._id ? `/${payload._id}` : ""}`, { method: payload._id ? "PUT" : "POST", body: JSON.stringify(payload) }),
  deletePaymentMethod: (id) => request(`/settings/payment-methods/${id}`, { method: "DELETE" }),
  shippingRules: () => request("/settings/shipping-rules"),
  saveShippingRule: (payload) =>
    request(`/settings/shipping-rules${payload._id ? `/${payload._id}` : ""}`, { method: payload._id ? "PUT" : "POST", body: JSON.stringify(payload) }),
  deleteShippingRule: (id) => request(`/settings/shipping-rules/${id}`, { method: "DELETE" }),
  storefrontSettings: () => request("/settings/storefront"),
  saveStorefrontSettings: (payload) => request("/settings/storefront", { method: "PUT", body: JSON.stringify(payload) }),
  shipRocketSettings: () => request("/settings/shiprocket"),
  saveShipRocketSettings: (payload) => request("/settings/shiprocket", { method: "PUT", body: JSON.stringify(payload) })
};
