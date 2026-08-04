const isLocalFrontend = ["localhost", "127.0.0.1"].includes(window.location.hostname);
const DEFAULT_API_URL = isLocalFrontend
  ? "http://localhost:5001/api"
  : "https://ebackend.hrsbasket.com/api";

const API_URL = String(
  window.__HRS_API_URL__ ||
  import.meta.env.VITE_API_URL ||
  DEFAULT_API_URL
).trim().replace(/\/+$/, "");

export const authStore = {
  get token() {
    return localStorage.getItem("admin_token");
  },
  set token(value) {
    if (value) localStorage.setItem("admin_token", value);
    else localStorage.removeItem("admin_token");
  }, get user() {
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
const lightweightPartner = (partner) => partner ? {
  id: partner.id || partner._id,
  registrationNumber: partner.registrationNumber,
  name: partner.name,
  email: partner.email,
  mobile: partner.mobile,
  status: partner.status,
  walletBalance: partner.walletBalance,
  package: partner.package,
  registrationPayment: partner.registrationPayment
} : null;

export const partnerAuthStore = {
  get token() { return localStorage.getItem("partner_token"); }, set token(value) { value ? localStorage.setItem("partner_token", value) : localStorage.removeItem("partner_token"); },
  get partner() { const value = localStorage.getItem("partner_user"); if (!value) return null; try { return JSON.parse(value); } catch (_error) { localStorage.removeItem("partner_user"); return null; } },
  set partner(value) {
    if (!value) { localStorage.removeItem("partner_user"); return; }
    const serialized = JSON.stringify(lightweightPartner(value));
    try { localStorage.setItem("partner_user", serialized); }
    catch (_error) { localStorage.removeItem("partner_user"); localStorage.setItem("partner_user", serialized); }
  },
  clear() { localStorage.removeItem("partner_token"); localStorage.removeItem("partner_user"); }
};
export const sellerAuthStore = {
  get token() { return localStorage.getItem("seller_token"); }, set token(value) { value ? localStorage.setItem("seller_token", value) : localStorage.removeItem("seller_token"); },
  get seller() { const value = localStorage.getItem("seller_user"); return value ? JSON.parse(value) : null; }, set seller(value) { value ? localStorage.setItem("seller_user", JSON.stringify(value)) : localStorage.removeItem("seller_user"); },
  clear() { localStorage.removeItem("seller_token"); localStorage.removeItem("seller_user"); }
};

const request = async (path, options = {}) => {
  const method = String(options.method || "GET").toUpperCase();
  const attempts = method === "GET" && !options.signal ? 3 : 1;
  let response;
  let lastError;
  for (let attempt = 1; attempt <= attempts; attempt += 1) {
    const controller = new AbortController();
    const timeout = window.setTimeout(() => controller.abort(), 60000);
    try {
      response = await fetch(`${API_URL}${path.startsWith("/") ? path : `/${path}`}`, {
        ...options,
        signal: options.signal || controller.signal,
        headers: {
          "Content-Type": "application/json",
          ...(authStore.token ? { Authorization: `Bearer ${authStore.token}` } : {}),
          ...options.headers
        }
      });
      break;
    } catch (error) {
      lastError = error;
      if (attempt < attempts) await new Promise((resolve) => window.setTimeout(resolve, attempt * 750));
    } finally {
      window.clearTimeout(timeout);
    }
  }
  if (!response) {
    if (lastError?.name === "AbortError") throw new Error("The server took longer than 60 seconds to respond after multiple attempts. Please refresh the page.");
    throw new Error(`Unable to reach ${API_URL} after ${attempts} attempt${attempts > 1 ? "s" : ""}. The production API may be temporarily unavailable; please refresh the page.`);
  }

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
const withQuery = (path, params = {}) => {
  const query = new URLSearchParams(Object.entries(params).filter(([, value]) => value !== undefined && value !== null && value !== ""));
  return query.size ? `${path}?${query}` : path;
};
const uploadImage = async (file, purpose = "general") => {
  const body = new FormData();
  body.append("image", file);
  body.append("purpose", purpose);
  const controller = new AbortController();
  const timeout = window.setTimeout(() => controller.abort(), 45000);
  try {
    const response = await fetch(`${API_URL}/uploads/image`, {
      method: "POST",
      headers: { Authorization: `Bearer ${authStore.token || sellerAuthStore.token || partnerAuthStore.token || ""}` },
      body,
      signal: controller.signal
    });
    const data = await response.json().catch(() => null);
    if (!response.ok) throw new Error(data?.message || `Image upload failed (${response.status})`);
    return data;
  } catch (error) {
    if (error?.name === "AbortError") throw new Error("Image upload timed out after 45 seconds. Check that the backend upload directory is writable.");
    throw error;
  } finally {
    window.clearTimeout(timeout);
  }
};
const uploadVideo = async (file) => {
  const body = new FormData();
  body.append("video", file);
  const controller = new AbortController();
  const timeout = window.setTimeout(() => controller.abort(), 120000);
  try {
    const response = await fetch(`${API_URL}/uploads/video`, {
      method: "POST",
      headers: { Authorization: `Bearer ${authStore.token || sellerAuthStore.token || ""}` },
      body,
      signal: controller.signal
    });
    const data = await response.json().catch(() => null);
    if (!response.ok) throw new Error(data?.message || `Video upload failed (${response.status})`);
    return data;
  } catch (error) {
    if (error?.name === "AbortError") throw new Error("Reel upload timed out after 2 minutes. Check the backend upload limit and connection.");
    throw error;
  } finally {
    window.clearTimeout(timeout);
  }
};
const uploadDocument = async (file, purpose = "document") => {
  const body = new FormData();
  body.append("document", file);
  body.append("purpose", purpose);
  const response = await fetch(`${API_URL}/uploads/document`, {
    method: "POST",
    headers: { Authorization: `Bearer ${authStore.token || sellerAuthStore.token || partnerAuthStore.token || ""}` },
    body
  });
  const data = await response.json().catch(() => null);
  if (!response.ok) throw new Error(data?.message || `Document upload failed (${response.status})`);
  return data;
};

export const api = {
  uploadImage,
  uploadVideo,
  uploadDocument,
  storefront: () => request("/storefront"),
  // v=2 bypasses any stale CDN entries created before storefront API responses
  // were changed from public caching to no-store.
  storefrontBootstrap: () => request("/storefront?bootstrap=1&v=2"),
  storefrontCatalog: () => request("/storefront/catalog?v=2"),
  storefrontProduct: (productId) => request(`/storefront/catalog/${encodeURIComponent(productId)}?v=2`),
  storefrontBlogPost: (slug) => request(`/storefront/blog/${encodeURIComponent(slug)}`),
  storefrontPaymentMethods: () => request("/storefront/payment-methods"),
  submitContactMessage: (payload) => request("/storefront/contact", { method: "POST", body: JSON.stringify(payload) }),
  subscribeNewsletter: (email) => request("/storefront/newsletter", { method: "POST", body: JSON.stringify({ email }) }),
  login: (payload) => request("/auth/login", { method: "POST", body: JSON.stringify(payload) }),
  customerLogin: (payload) => customerRequest("/auth/customer/login", { method: "POST", body: JSON.stringify(payload) }),
  customerRegister: (payload) => customerRequest("/auth/customer/register", { method: "POST", body: JSON.stringify(payload) }),
  customerMe: () => customerRequest("/auth/customer/me"),
  customerAccount: () => customerRequest("/auth/customer/account"),
  updateCustomerProfile: (payload) => customerRequest("/auth/customer/account/profile", { method: "PATCH", body: JSON.stringify(payload) }),
  saveCustomerAddresses: (addresses) => customerRequest("/auth/customer/account/addresses", { method: "PUT", body: JSON.stringify({ addresses }) }),
  customerOrders: (page = 1) => customerRequest(`/auth/customer/account/orders?page=${page}&limit=5`),
  trackCustomerOrder: (orderId) => customerRequest(`/auth/customer/account/orders/${orderId}/tracking`),
  requestCustomerItemReturn: (orderId, productId, payload) => customerRequest(`/auth/customer/account/orders/${orderId}/items/${productId}/return`, { method: "POST", body: JSON.stringify(payload) }),
  customerCart: () => customerRequest("/auth/customer/cart"),
  saveCustomerCart: (items) => customerRequest("/auth/customer/cart", { method: "PUT", body: JSON.stringify({ items }) }),
  requestOrderOtp: (payload) => customerRequest("/storefront/orders/otp", { method: "POST", body: JSON.stringify(payload) }),
  createRazorpayCheckoutOrder: (payload) => customerRequest("/storefront/orders/razorpay", { method: "POST", body: JSON.stringify(payload) }),
  createPayuCheckout: (payload) => customerRequest("/storefront/orders/payu", { method: "POST", body: JSON.stringify(payload) }),
  reelEngagement: (productId) => customerRequest(`/storefront/reels/${productId}/engagement`),
  recordReelView: (productId, visitorId) => customerRequest(`/storefront/reels/${productId}/view`, { method: "POST", body: JSON.stringify({ visitorId }) }),
  toggleReelLike: (productId) => customerRequest(`/storefront/reels/${productId}/like`, { method: "POST" }),
  createReelComment: (productId, text) => customerRequest(`/storefront/reels/${productId}/comments`, { method: "POST", body: JSON.stringify({ text }) }),
  productReviews: (productId) => request(`/storefront/products/${productId}/reviews`),
  createProductReview: (productId, payload) => customerRequest(`/storefront/products/${productId}/reviews`, { method: "POST", body: JSON.stringify(payload) }),
  sellerReviews: (sellerId) => request(`/storefront/sellers/${sellerId}/reviews`),
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
  products: (params = {}) => request(withQuery("/products", params)),
  product: (id) => request(`/products/${encodeURIComponent(id)}`),
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
  closeOrderItemReturn: (id, productId, payload) => request(`/orders/${id}/items/${productId}/return-refund`, { method: "POST", body: JSON.stringify(payload) }),
  customers: (params = {}) => request(withQuery("/customers", params)),
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
  shippingQuote: (pincode, items, cod = false) => request("/storefront/shipping-quote", { method: "POST", body: JSON.stringify({ pincode, items, cod }) }),
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
  requestPartnerPaymentOtp: (payload) => request("/partners/registration/payment-otp", { method: "POST", body: JSON.stringify(payload) }),
  verifyPartnerPaymentOtp: (payload) => request("/partners/registration/payment-otp/verify", { method: "POST", body: JSON.stringify(payload) }),
  partnerLogin: (payload) => partnerRequest("/partners/login", { method: "POST", body: JSON.stringify(payload) }),
  partnerMe: () => partnerRequest("/partners/me"), partnerDashboard: () => partnerRequest("/partners/dashboard"),
  partnerChangePackage: (packageId) => partnerRequest("/partners/package", { method: "PATCH", body: JSON.stringify({ package: packageId }) }),
  createMyPartnerPaymentOrder: (payload = {}) => partnerRequest("/partners/payment/order", { method: "POST", body: JSON.stringify(payload) }),
  verifyMyPartnerPayment: (payload) => partnerRequest("/partners/payment/verify", { method: "POST", body: JSON.stringify(payload) }),
  partnerUpdateProfile: (payload) => partnerRequest("/partners/profile", { method: "PATCH", body: JSON.stringify(payload) }),
  partnerChangePassword: (payload) => partnerRequest("/partners/password", { method: "PUT", body: JSON.stringify(payload) }),
  partnerUpdateBank: (payload) => partnerRequest("/partners/bank-details", { method: "PUT", body: JSON.stringify(payload) }),
  partnerLookupIfsc: (ifsc) => partnerRequest(`/partners/bank-details/ifsc/${encodeURIComponent(ifsc)}`),
  partnerBankOtp: (payload) => partnerRequest("/partners/bank-details/otp", { method: "POST", body: JSON.stringify(payload) }),
  partnerUploadKyc: (type, payload) => partnerRequest(`/partners/kyc/${type}`, { method: "PUT", body: JSON.stringify(payload) }),
  partnerPayouts: () => partnerRequest("/partners/payouts"), partnerWithdrawals: () => partnerRequest("/partners/withdrawals"),
  partnerWithdrawalOtp: (payload) => partnerRequest("/partners/withdrawals/otp", { method: "POST", body: JSON.stringify(payload) }),
  partnerRequestWithdrawal: (payload) => partnerRequest("/partners/withdrawals", { method: "POST", body: JSON.stringify(payload) }),
  adminPartners: (params = {}) => request(withQuery("/partners/admin/partners", params)), adminPartnerPackages: () => request("/partners/admin/packages"),
  adminPartner: (id) => request(`/partners/admin/partners/${encodeURIComponent(id)}`),
  deletePartner: (id) => request(`/partners/admin/partners/${id}`, { method: "DELETE" }),
  approvePartnerPayment: (id, payload) => request(`/partners/admin/partners/${id}/payment`, { method: "PATCH", body: JSON.stringify(payload) }),
  adminChangePartnerPackage: (id, packageId) => request(`/partners/admin/partners/${id}/package`, { method: "PATCH", body: JSON.stringify({ package: packageId }) }),
  revealPartnerPassword: (id) => request(`/partners/admin/partners/${id}/password`),
  resetPartnerPassword: (id) => request(`/partners/admin/partners/${id}/reset-password`, { method: "POST" }),
  createPartnerPackage: (payload) => request("/partners/admin/packages", { method: "POST", body: JSON.stringify(payload) }),
  updatePartnerPackage: (id, payload) => request(`/partners/admin/packages/${id}`, { method: "PUT", body: JSON.stringify(payload) }),
  deletePartnerPackage: (id) => request(`/partners/admin/packages/${id}`, { method: "DELETE" }),
  reviewPartnerKyc: (id, type, payload) => request(`/partners/admin/partners/${id}/kyc/${type}`, { method: "PATCH", body: JSON.stringify(payload) }),
  adminWithdrawals: () => request("/partners/admin/withdrawals"), processWithdrawal: (id, payload) => request(`/partners/admin/withdrawals/${id}`, { method: "PATCH", body: JSON.stringify(payload) }),
  sellerRegister: (payload) => request("/sellers/register", { method: "POST", body: JSON.stringify(payload) }),
  requestSellerRegistrationOtp: (payload) => request("/sellers/registration/otp", { method: "POST", body: JSON.stringify(payload) }),
  verifySellerRegistrationOtp: (payload) => request("/sellers/registration/verify-otp", { method: "POST", body: JSON.stringify(payload) }),
  sellerReferral: (sellerNumber) => request(`/sellers/referrals/${encodeURIComponent(sellerNumber)}`),
  sellerLogin: (payload) => sellerRequest("/sellers/login", { method: "POST", body: JSON.stringify(payload) }),
  sellerMe: () => sellerRequest("/sellers/me"), sellerDashboard: () => sellerRequest("/sellers/dashboard"),
  sellerCatalogOptions: () => sellerRequest("/sellers/catalog-options"),
  sellerUpdateProfile: (payload) => sellerRequest("/sellers/profile", { method: "PATCH", body: JSON.stringify(payload) }),
  sellerUpdateBank: (payload) => sellerRequest("/sellers/bank-details", { method: "PUT", body: JSON.stringify(payload) }),
  sellerLookupIfsc: (ifsc) => sellerRequest(`/sellers/bank-details/ifsc/${encodeURIComponent(ifsc)}`),
  sellerChangePassword: (payload) => sellerRequest("/sellers/password", { method: "PUT", body: JSON.stringify(payload) }),
  sellerUploadKyc: (type, payload) => sellerRequest(`/sellers/kyc/${type}`, { method: "PUT", body: JSON.stringify(payload) }),
  sellerProducts: () => sellerRequest("/sellers/products"),
  createSellerProduct: (payload) => sellerRequest("/sellers/products", { method: "POST", body: JSON.stringify(payload) }),
  updateSellerProduct: (id, payload) => sellerRequest(`/sellers/products/${id}`, { method: "PUT", body: JSON.stringify(payload) }),
  toggleSellerProduct: (id, enabled) => sellerRequest(`/sellers/products/${id}/enabled`, { method: "PATCH", body: JSON.stringify({ enabled }) }),
  sellerOrders: () => sellerRequest("/sellers/orders"),
  sellerWallet: () => sellerRequest("/sellers/wallet"),
  sellerWithdrawals: () => sellerRequest("/sellers/withdrawals"),
  requestSellerWithdrawal: (amount) => sellerRequest("/sellers/withdrawals", { method: "POST", body: JSON.stringify({ amount }) }),
  generateSellerInvoice: (orderId) => sellerRequest(`/sellers/orders/${orderId}/invoice`, { method: "POST" }),
  syncSellerShipRocket: (orderId) => sellerRequest(`/sellers/orders/${orderId}/shiprocket`, { method: "POST" }),
  updateSellerOrderItem: (orderId, productId, status, note) => sellerRequest(`/sellers/orders/${orderId}/items/${productId}`, { method: "PATCH", body: JSON.stringify(typeof status === "object" ? status : { status, note }) }),
  settleSellerOrderItem: (orderId, productId) => sellerRequest(`/sellers/orders/${orderId}/items/${productId}/settle`, { method: "POST" }),
  updateSellerItemReturn: (orderId, productId, payload) => sellerRequest(`/sellers/orders/${orderId}/items/${productId}/return`, { method: "PATCH", body: JSON.stringify(payload) }),
  adminSellers: (params = {}) => request(withQuery("/sellers/admin", params)),
  revealSellerPassword: (id) => request(`/sellers/admin/${id}/password`),
  resetSellerPassword: (id) => request(`/sellers/admin/${id}/reset-password`, { method: "POST" }),
  pendingSellerProducts: () => request("/sellers/admin/products/pending"),
  adminSellerProducts: (id) => request(`/sellers/admin/${id}/products`),
  adminSellerWithdrawals: () => request("/sellers/admin/withdrawals"),
  processSellerWithdrawal: (id, payload) => request(`/sellers/admin/withdrawals/${id}`, { method: "PATCH", body: JSON.stringify(payload) }),
  paySellerWithdrawal: (id) => request(`/sellers/admin/withdrawals/${id}/payout`, { method: "POST" }),
  updateSellerCommission: (id, commissionRate) => request(`/sellers/admin/${id}/commission`, { method: "PATCH", body: JSON.stringify({ commissionRate }) }),
  updateSellerCompliance: (id, payload) => request(`/sellers/admin/${id}/compliance`, { method: "PATCH", body: JSON.stringify(payload) }),
  approveSeller: (id) => request(`/sellers/admin/${id}/approve`, { method: "PATCH" }),
  rejectSeller: (id, reason) => request(`/sellers/admin/${id}/reject`, { method: "PATCH", body: JSON.stringify({ reason }) }),
  approveSellerProduct: (sellerId, productId) => request(`/sellers/admin/${sellerId}/products/${productId}/approve`, { method: "PATCH" }),
  rejectSellerProduct: (sellerId, productId, reason) => request(`/sellers/admin/${sellerId}/products/${productId}/reject`, { method: "PATCH", body: JSON.stringify({ reason }) }),
  reviewSellerKyc: (sellerId, type, payload) => request(`/sellers/admin/${sellerId}/kyc/${type}`, { method: "PATCH", body: JSON.stringify(payload) })
};
