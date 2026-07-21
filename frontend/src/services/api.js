//const API_URL = import.meta.env.VITE_API_URL || "https://ebackend.hrsbasket.com/api";
const API_URL = import.meta.env.VITE_API_URL || "http://localhost:5001/api";

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
export const partnerAuthStore = {
  get token() { return localStorage.getItem("partner_token"); }, set token(value) { value ? localStorage.setItem("partner_token", value) : localStorage.removeItem("partner_token"); },
  get partner() { const value = localStorage.getItem("partner_user"); return value ? JSON.parse(value) : null; }, set partner(value) { value ? localStorage.setItem("partner_user", JSON.stringify(value)) : localStorage.removeItem("partner_user"); },
  clear() { localStorage.removeItem("partner_token"); localStorage.removeItem("partner_user"); }
};
export const sellerAuthStore = {
  get token() { return localStorage.getItem("seller_token"); }, set token(value) { value ? localStorage.setItem("seller_token", value) : localStorage.removeItem("seller_token"); },
  get seller() { const value = localStorage.getItem("seller_user"); return value ? JSON.parse(value) : null; }, set seller(value) { value ? localStorage.setItem("seller_user", JSON.stringify(value)) : localStorage.removeItem("seller_user"); },
  clear() { localStorage.removeItem("seller_token"); localStorage.removeItem("seller_user"); }
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

  const contentType = response.headers.get("content-type") || "";
  const data = contentType.includes("application/json") ? await response.json().catch(() => null) : null;

  if (!response.ok) {
    throw new Error(data?.message || `API request failed (${response.status}). Check that the ecommerce backend is running at ${API_URL}.`);
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
const partnerRequest = (path, options = {}) => request(path, { ...options, headers: { ...(partnerAuthStore.token ? { Authorization: `Bearer ${partnerAuthStore.token}` } : {}), ...options.headers } });
const sellerRequest = (path, options = {}) => request(path, { ...options, headers: { ...(sellerAuthStore.token ? { Authorization: `Bearer ${sellerAuthStore.token}` } : {}), ...options.headers } });

export const api = {
  storefront: () => request("/storefront"),
  storefrontPaymentMethods: () => request("/storefront/payment-methods"),
  login: (payload) => request("/auth/login", { method: "POST", body: JSON.stringify(payload) }),
  customerLogin: (payload) => customerRequest("/auth/customer/login", { method: "POST", body: JSON.stringify(payload) }),
  customerRegister: (payload) => customerRequest("/auth/customer/register", { method: "POST", body: JSON.stringify(payload) }),
  customerMe: () => customerRequest("/auth/customer/me"),
  customerAccount: () => customerRequest("/auth/customer/account"),
  updateCustomerProfile: (payload) => customerRequest("/auth/customer/account/profile", { method: "PATCH", body: JSON.stringify(payload) }),
  saveCustomerAddresses: (addresses) => customerRequest("/auth/customer/account/addresses", { method: "PUT", body: JSON.stringify({ addresses }) }),
  customerOrders: () => customerRequest("/auth/customer/account/orders"),
  customerCart: () => customerRequest("/auth/customer/cart"),
  saveCustomerCart: (items) => customerRequest("/auth/customer/cart", { method: "PUT", body: JSON.stringify({ items }) }),
  requestOrderOtp: (payload) => customerRequest("/storefront/orders/otp", { method: "POST", body: JSON.stringify(payload) }),
  productReviews: (productId) => request(`/storefront/products/${productId}/reviews`),
  createProductReview: (productId, payload) => customerRequest(`/storefront/products/${productId}/reviews`, { method: "POST", body: JSON.stringify(payload) }),
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
  createStorefrontOrder: (payload) => customerRequest("/storefront/orders", { method: "POST", body: JSON.stringify(payload) }),
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
  saveShipRocketSettings: (payload) => request("/settings/shiprocket", { method: "PUT", body: JSON.stringify(payload) }),
  emailSettings: () => request("/settings/email"),
  saveEmailSettings: (payload) => request("/settings/email", { method: "PUT", body: JSON.stringify(payload) }),
  sendTestEmail: (email) => request("/settings/email/test", { method: "POST", body: JSON.stringify({ email }) }),
  partnerPackages: () => request("/partners/packages/public"),
  partnerRegistrationSettings: () => request("/partners/registration-settings"),
  partnerReferral: (registrationNumber) => request(`/partners/referrals/${encodeURIComponent(registrationNumber)}`),
  createPartnerRegistrationOrder: (payload) => request("/partners/registration/order", { method: "POST", body: JSON.stringify(payload) }),
  partnerRegister: (payload) => request("/partners/register", { method: "POST", body: JSON.stringify(payload) }),
  requestPartnerRegistrationOtp: (payload) => request("/partners/registration/otp", { method: "POST", body: JSON.stringify(payload) }),
  verifyPartnerRegistrationOtp: (payload) => request("/partners/registration/verify-otp", { method: "POST", body: JSON.stringify(payload) }),
  partnerLogin: (payload) => partnerRequest("/partners/login", { method: "POST", body: JSON.stringify(payload) }),
  partnerMe: () => partnerRequest("/partners/me"), partnerDashboard: () => partnerRequest("/partners/dashboard"),
  createMyPartnerPaymentOrder: () => partnerRequest("/partners/payment/order", { method: "POST", body: JSON.stringify({}) }),
  verifyMyPartnerPayment: (payload) => partnerRequest("/partners/payment/verify", { method: "POST", body: JSON.stringify(payload) }),
  partnerUpdateProfile: (payload) => partnerRequest("/partners/profile", { method: "PATCH", body: JSON.stringify(payload) }),
  partnerChangePassword: (payload) => partnerRequest("/partners/password", { method: "PUT", body: JSON.stringify(payload) }),
  partnerUpdateBank: (payload) => partnerRequest("/partners/bank-details", { method: "PUT", body: JSON.stringify(payload) }),
  partnerUploadKyc: (type, payload) => partnerRequest(`/partners/kyc/${type}`, { method: "PUT", body: JSON.stringify(payload) }),
  partnerPayouts: () => partnerRequest("/partners/payouts"), partnerWithdrawals: () => partnerRequest("/partners/withdrawals"),
  partnerRequestWithdrawal: (payload) => partnerRequest("/partners/withdrawals", { method: "POST", body: JSON.stringify(payload) }),
  adminPartners: () => request("/partners/admin/partners"), adminPartnerPackages: () => request("/partners/admin/packages"),
  deletePartner: (id) => request(`/partners/admin/partners/${id}`, { method: "DELETE" }),
  approvePartnerPayment: (id, payload) => request(`/partners/admin/partners/${id}/payment`, { method: "PATCH", body: JSON.stringify(payload) }),
  revealPartnerPassword: (id) => request(`/partners/admin/partners/${id}/password`),
  resetPartnerPassword: (id) => request(`/partners/admin/partners/${id}/reset-password`, { method: "POST" }),
  createPartnerPackage: (payload) => request("/partners/admin/packages", { method: "POST", body: JSON.stringify(payload) }),
  updatePartnerPackage: (id, payload) => request(`/partners/admin/packages/${id}`, { method: "PUT", body: JSON.stringify(payload) }),
  reviewPartnerKyc: (id, type, payload) => request(`/partners/admin/partners/${id}/kyc/${type}`, { method: "PATCH", body: JSON.stringify(payload) }),
  adminWithdrawals: () => request("/partners/admin/withdrawals"), processWithdrawal: (id, payload) => request(`/partners/admin/withdrawals/${id}`, { method: "PATCH", body: JSON.stringify(payload) }),
  sellerRegister: (payload) => request("/sellers/register", { method: "POST", body: JSON.stringify(payload) }),
  sellerLogin: (payload) => sellerRequest("/sellers/login", { method: "POST", body: JSON.stringify(payload) }),
  sellerMe: () => sellerRequest("/sellers/me"), sellerDashboard: () => sellerRequest("/sellers/dashboard"),
  sellerCatalogOptions: () => sellerRequest("/sellers/catalog-options"),
  sellerUpdateProfile: (payload) => sellerRequest("/sellers/profile", { method: "PATCH", body: JSON.stringify(payload) }),
  sellerUpdateBank: (payload) => sellerRequest("/sellers/bank-details", { method: "PUT", body: JSON.stringify(payload) }),
  sellerChangePassword: (payload) => sellerRequest("/sellers/password", { method: "PUT", body: JSON.stringify(payload) }),
  sellerUploadKyc: (type, payload) => sellerRequest(`/sellers/kyc/${type}`, { method: "PUT", body: JSON.stringify(payload) }),
  sellerProducts: () => sellerRequest("/sellers/products"),
  createSellerProduct: (payload) => sellerRequest("/sellers/products", { method: "POST", body: JSON.stringify(payload) }),
  updateSellerProduct: (id, payload) => sellerRequest(`/sellers/products/${id}`, { method: "PUT", body: JSON.stringify(payload) }),
  toggleSellerProduct: (id, enabled) => sellerRequest(`/sellers/products/${id}/enabled`, { method: "PATCH", body: JSON.stringify({ enabled }) }),
  sellerOrders: () => sellerRequest("/sellers/orders"),
  sellerWallet: () => sellerRequest("/sellers/wallet"),
  updateSellerOrderItem: (orderId, productId, status) => sellerRequest(`/sellers/orders/${orderId}/items/${productId}`, { method: "PATCH", body: JSON.stringify({ status }) }),
  adminSellers: () => request("/sellers/admin"),
  revealSellerPassword: (id) => request(`/sellers/admin/${id}/password`),
  resetSellerPassword: (id) => request(`/sellers/admin/${id}/reset-password`, { method: "POST" }),
  pendingSellerProducts: () => request("/sellers/admin/products/pending"),
  adminSellerProducts: (id) => request(`/sellers/admin/${id}/products`),
  updateSellerCommission: (id, commissionRate) => request(`/sellers/admin/${id}/commission`, { method: "PATCH", body: JSON.stringify({ commissionRate }) }),
  approveSeller: (id) => request(`/sellers/admin/${id}/approve`, { method: "PATCH" }),
  rejectSeller: (id, reason) => request(`/sellers/admin/${id}/reject`, { method: "PATCH", body: JSON.stringify({ reason }) }),
  approveSellerProduct: (sellerId, productId) => request(`/sellers/admin/${sellerId}/products/${productId}/approve`, { method: "PATCH" }),
  rejectSellerProduct: (sellerId, productId, reason) => request(`/sellers/admin/${sellerId}/products/${productId}/reject`, { method: "PATCH", body: JSON.stringify({ reason }) }),
  reviewSellerKyc: (sellerId, type, payload) => request(`/sellers/admin/${sellerId}/kyc/${type}`, { method: "PATCH", body: JSON.stringify(payload) })
};
