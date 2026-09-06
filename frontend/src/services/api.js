import { withActionNotifications } from "../utils/actionNotifications.js";

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
  get token() { return sessionStorage.getItem("seller_impersonation_token") || localStorage.getItem("seller_token"); }, set token(value) { value ? localStorage.setItem("seller_token", value) : localStorage.removeItem("seller_token"); },
  get seller() { const value = sessionStorage.getItem("seller_impersonation_user") || localStorage.getItem("seller_user"); return value ? JSON.parse(value) : null; }, set seller(value) { value ? localStorage.setItem("seller_user", JSON.stringify(value)) : localStorage.removeItem("seller_user"); },
  setImpersonation(value) { sessionStorage.setItem("seller_impersonation_token", value.token); sessionStorage.setItem("seller_impersonation_user", JSON.stringify(value.seller)); },
  clearImpersonation() { sessionStorage.removeItem("seller_impersonation_token"); sessionStorage.removeItem("seller_impersonation_user"); },
  clear() { if (sessionStorage.getItem("seller_impersonation_token")) this.clearImpersonation(); else { localStorage.removeItem("seller_token"); localStorage.removeItem("seller_user"); } }
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
    const error = new Error(data?.message || `API request failed (${response.status}). Check that the ecommerce backend is running at ${API_URL}.`);
    error.status = response.status;
    throw error;
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
const sellerRequest = async (path, options = {}) => {
  const hadSellerToken = Boolean(sellerAuthStore.token);
  try {
    return await request(path, { ...options, headers: { ...(sellerAuthStore.token ? { Authorization: `Bearer ${sellerAuthStore.token}` } : {}), ...options.headers } });
  } catch (error) {
    if (hadSellerToken && (error.status === 401 || /jwt expired|invalid token|authentication token/i.test(String(error.message)))) {
      sellerAuthStore.clear();
      window.dispatchEvent(new CustomEvent("seller-session-expired"));
      if (window.location.hash !== "#/seller/login") window.location.hash = "#/seller/login";
      throw new Error("Your session expired. Please sign in again.");
    }
    throw error;
  }
};
const withQuery = (path, params = {}) => {
  const query = new URLSearchParams(Object.entries(params).filter(([, value]) => value !== undefined && value !== null && value !== ""));
  return query.size ? `${path}?${query}` : path;
};
const isMissingStaffRoute = (error) => /not found:\s*\/api\/staff/i.test(String(error?.message || ""));
const temporaryStaffPassword = () => {
  const random = new Uint32Array(1);
  window.crypto.getRandomValues(random);
  return `Hrs@${String(random[0] % 900000 + 100000)}`;
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
      headers: { Authorization: `Bearer ${authStore.token || sellerAuthStore.token || partnerAuthStore.token || customerAuthStore.token || ""}` },
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
const uploadSellerRegistrationDocument = async (file) => {
  const body = new FormData();
  body.append("document", file);
  const response = await fetch(`${API_URL}/uploads/seller-registration-document`, { method: "POST", body });
  const data = await response.json().catch(() => null);
  if (!response.ok) throw new Error(data?.message || `GST certificate upload failed (${response.status})`);
  return data;
};

export const api = withActionNotifications({
  uploadImage,
  uploadVideo,
  uploadDocument,
  uploadSellerRegistrationDocument,
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
  adminReviews: (params = {}) => request(`/reviews?${new URLSearchParams(params)}`),
  moderateReview: (id, payload) => request(`/reviews/${id}`, { method: "PATCH", body: JSON.stringify(payload) }),
  sellerStore: (sellerId) => request(`/storefront/sellers/${sellerId}`),
  me: () => request("/auth/me"),
  updateLoginEmail: async (payload) => {
    try {
      return await request("/auth/me/email", { method: "PATCH", body: JSON.stringify(payload) });
    } catch (error) {
      if (error.status !== 404 || !/not found:\s*\/api\/auth\/me\/email/i.test(String(error.message))) throw error;
      const current = authStore.user;
      if (!current?.id || current.role !== "Super Admin") throw new Error("The backend must be updated before this account can change its login email");
      const verified = await request("/auth/login", { method: "POST", body: JSON.stringify({ email: current.email, password: payload.currentPassword }) });
      const updated = await request(`/users/${current.id}`, { method: "PUT", body: JSON.stringify({ email: String(payload.email || "").trim().toLowerCase() }) });
      return { user: { ...current, ...updated, id: updated.id || updated._id || current.id }, token: verified.token, message: "Login email updated successfully" };
    }
  },
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
  resolveResellerLink: (code) => request(`/resellers/links/${encodeURIComponent(code)}`),
  resellerMe: () => customerRequest("/resellers/me"),
  resellerRegistrationOtp: () => customerRequest("/resellers/registration/otp", { method: "POST" }),
  resellerRegister: (payload) => customerRequest("/resellers/register", { method: "POST", body: JSON.stringify(payload) }),
  resellerQuickRegister: (payload) => request("/resellers/register/quick", { method: "POST", body: JSON.stringify(payload) }),
  resellerLogin: (payload) => customerRequest("/resellers/login", { method: "POST", body: JSON.stringify(payload) }),
  resellerDashboard: () => customerRequest("/resellers/dashboard"),
  resellerProducts: () => customerRequest("/resellers/products"),
  resellerLinks: () => customerRequest("/resellers/my-links"),
  createResellerLink: (payload) => customerRequest("/resellers/my-links", { method: "POST", body: JSON.stringify(payload) }),
  resellerOrders: () => customerRequest("/resellers/orders"),
  resellerWallet: () => customerRequest("/resellers/wallet"),
  resellerWithdrawals: () => customerRequest("/resellers/withdrawals"),
  requestResellerWithdrawal: (amount) => customerRequest("/resellers/withdrawals", { method: "POST", body: JSON.stringify({ amount }) }),
  resellerLookupIfsc: (ifsc) => customerRequest(`/resellers/bank-details/ifsc/${encodeURIComponent(ifsc)}`),
  updateResellerBank: (payload) => customerRequest("/resellers/bank-details", { method: "PUT", body: JSON.stringify(payload) }),
  adminResellers: () => request("/resellers/admin/accounts"),
  revealResellerPassword: (id) => request(`/resellers/admin/accounts/${id}/password`),
  resetResellerPassword: (id) => request(`/resellers/admin/accounts/${id}/reset-password`, { method: "POST" }),
  adminResellerWithdrawals: () => request("/resellers/admin/withdrawals"),
  processResellerWithdrawal: (id, payload) => request(`/resellers/admin/withdrawals/${id}`, { method: "PATCH", body: JSON.stringify(payload) }),
  payResellerWithdrawal: (id) => request(`/resellers/admin/withdrawals/${id}/payout`, { method: "POST" }),
  resellerPayoutStatus: (id) => request(`/resellers/admin/withdrawals/${id}/payout/status`, { method: "POST" }),
  adminReseller: (id) => request(`/resellers/admin/accounts/${id}`),
  reviewReseller: (id, payload) => request(`/resellers/admin/accounts/${id}`, { method: "PATCH", body: JSON.stringify(payload) }),
  refundOrder: (id, payload) => request(`/orders/${id}/refunds`, { method: "POST", body: JSON.stringify(payload) }),
  closeOrderItemReturn: (id, productId, payload) => request(`/orders/${id}/items/${productId}/return-refund`, { method: "POST", body: JSON.stringify(payload) }),
  updateOrderItemReturn: (id, productId, payload) => request(`/orders/${id}/items/${productId}/return`, { method: "PATCH", body: JSON.stringify(payload) }),
  createOrderItemReturnShipment: (id, productId) => request(`/orders/${id}/items/${productId}/return-shipment`, { method: "POST" }),
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
  staff: async () => {
    try { return await request("/staff"); }
    catch (error) {
      if (!isMissingStaffRoute(error)) throw error;
      const users = await request("/users");
      return users.filter((user) => ["Staff", "Team Leader"].includes(user.role));
    }
  },
  createStaff: async (payload) => {
    try { return await request("/staff", { method: "POST", body: JSON.stringify(payload) }); }
    catch (error) {
      if (!isMissingStaffRoute(error)) throw error;
      const temporaryPassword = temporaryStaffPassword();
      try {
        const staff = await request("/users", { method: "POST", body: JSON.stringify({ ...payload, password: temporaryPassword, permissions: [] }) });
        return { staff, temporaryPassword };
      } catch (fallbackError) {
        if (/role:.*not a valid enum value/i.test(String(fallbackError?.message || ""))) {
          throw new Error("The production backend is outdated and does not support Staff or Team Leader accounts. Deploy the current backend and restart the Node.js application, then try again.");
        }
        throw fallbackError;
      }
    }
  },
  updateStaff: (id, payload) => request(`/staff/${id}`, { method: "PATCH", body: JSON.stringify(payload) }),
  staffTeams: () => request("/staff/management/teams"),
  createStaffTeam: (payload) => request("/staff/management/teams", { method: "POST", body: JSON.stringify(payload) }),
  updateStaffTeam: (id, payload) => request(`/staff/management/teams/${id}`, { method: "PATCH", body: JSON.stringify(payload) }),
  moveStaffTeam: (payload) => request("/staff/management/teams/move-staff", { method: "POST", body: JSON.stringify(payload) }),
  relieveStaff: (teamId, staffId, payload = {}) => request(`/staff/management/teams/${teamId}/members/${staffId}/relieve`, { method: "POST", body: JSON.stringify(payload) }),
  workAssignments: (params = {}) => request(withQuery("/staff/management/assignments", params)),
  assignWork: (payload) => request("/staff/management/assignments", { method: "POST", body: JSON.stringify(payload) }),
  endWorkAssignment: (id) => request(`/staff/management/assignments/${id}/end`, { method: "PATCH" }),
  updateWorkPermissions: (id, payload) => request(`/staff/management/assignments/${id}/permissions`, { method: "PATCH", body: JSON.stringify(payload) }),
  assignmentMetadata: () => request("/staff/management/metadata"),
  staffWorkDashboard: () => request("/staff/management/dashboard"),
  staffTeamHistory: (staffId = "") => request(`/staff/management/history${staffId ? `/${staffId}` : ""}`),
  staffAuditLogs: (params = {}) => request(withQuery("/staff/management/audit-logs", params)),
  adminTickets: (params = {}) => request(withQuery("/support/admin", params)),
  adminTicket: (id) => request(`/support/admin/${id}`),
  updateTicket: (id, payload) => request(`/support/admin/${id}`, { method: "PATCH", body: JSON.stringify(payload) }),
  customerTickets: () => customerRequest("/support/customer"),
  createCustomerTicket: (payload) => customerRequest("/support/customer", { method: "POST", body: JSON.stringify(payload) }),
  replyCustomerTicket: (id, message) => customerRequest(`/support/customer/${id}/replies`, { method: "POST", body: JSON.stringify({ message }) }),
  sellerTickets: () => sellerRequest("/support/seller"),
  createSellerTicket: (payload) => sellerRequest("/support/seller", { method: "POST", body: JSON.stringify(payload) }),
  replySellerTicket: (id, message) => sellerRequest(`/support/seller/${id}/replies`, { method: "POST", body: JSON.stringify({ message }) }),
  partnerTickets: () => partnerRequest("/support/partner"),
  createPartnerTicket: (payload) => partnerRequest("/support/partner", { method: "POST", body: JSON.stringify(payload) }),
  replyPartnerTicket: (id, message) => partnerRequest(`/support/partner/${id}/replies`, { method: "POST", body: JSON.stringify({ message }) }),
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
  verifySellerTaxIdentifier: (payload) => request("/sellers/registration/verify-tax", { method: "POST", body: JSON.stringify(payload) }),
  sellerReferral: (sellerNumber) => request(`/sellers/referrals/${encodeURIComponent(sellerNumber)}`),
  sellerLogin: (payload) => sellerRequest("/sellers/login", { method: "POST", body: JSON.stringify(payload) }),
  sellerMe: () => sellerRequest("/sellers/me"), sellerDashboard: () => sellerRequest("/sellers/dashboard"),
  sellerReferrals: () => sellerRequest("/sellers/my-referrals"),
  sellerCatalogOptions: () => sellerRequest("/sellers/catalog-options"),
  sellerUpdateProfile: (payload) => sellerRequest("/sellers/profile", { method: "PATCH", body: JSON.stringify(payload) }),
  sellerUpdateBank: (payload) => sellerRequest("/sellers/bank-details", { method: "PUT", body: JSON.stringify(payload) }),
  sellerBankOtp: (payload) => sellerRequest("/sellers/bank-details/otp", { method: "POST", body: JSON.stringify(payload) }),
  sellerLookupIfsc: (ifsc) => sellerRequest(`/sellers/bank-details/ifsc/${encodeURIComponent(ifsc)}`),
  sellerChangePassword: (payload) => sellerRequest("/sellers/password", { method: "PUT", body: JSON.stringify(payload) }),
  sellerUploadKyc: (type, payload) => sellerRequest(`/sellers/kyc/${type}`, { method: "PUT", body: JSON.stringify(payload) }),
  sellerProducts: () => sellerRequest("/sellers/products"),
  createSellerProduct: (payload) => sellerRequest("/sellers/products", { method: "POST", body: JSON.stringify(payload) }),
  updateSellerProduct: (id, payload) => sellerRequest(`/sellers/products/${id}`, { method: "PUT", body: JSON.stringify(payload) }),
  toggleSellerProduct: (id, enabled) => sellerRequest(`/sellers/products/${id}/enabled`, { method: "PATCH", body: JSON.stringify({ enabled }) }),
  sellerOrders: () => sellerRequest("/sellers/orders"),
  sellerWallet: () => sellerRequest("/sellers/wallet"),
  sellerTransactions: (params = {}) => sellerRequest(withQuery("/sellers/transactions", params)),
  sellerWithdrawals: () => sellerRequest("/sellers/withdrawals"),
  sellerWithdrawalOtp: (payload) => sellerRequest("/sellers/withdrawals/otp", { method: "POST", body: JSON.stringify(payload) }),
  requestSellerWithdrawal: (amount, otpChallengeId) => sellerRequest("/sellers/withdrawals", { method: "POST", body: JSON.stringify({ amount, otpChallengeId }) }),
  generateSellerInvoice: (orderId) => sellerRequest(`/sellers/orders/${orderId}/invoice`, { method: "POST" }),
  syncSellerShipRocket: (orderId) => sellerRequest(`/sellers/orders/${orderId}/shiprocket`, { method: "POST" }),
  saveSellerManualCourier: (orderId, payload) => sellerRequest(`/sellers/orders/${orderId}/manual-courier`, { method: "POST", body: JSON.stringify(payload) }),
  updateSellerOrderItem: (orderId, productId, status, note) => { const payload = typeof status === "object" ? { ...status } : { status, note }; payload.status = ({ Placed: "Pending", Confirmed: "Processing", "Ready to Ship": "Ready to Dispatch" })[payload.status] || payload.status; return sellerRequest(`/sellers/orders/${orderId}/items/${productId}`, { method: "PATCH", body: JSON.stringify(payload) }); },
  settleSellerOrderItem: (orderId, productId) => sellerRequest(`/sellers/orders/${orderId}/items/${productId}/settle`, { method: "POST" }),
  updateSellerItemReturn: (orderId, productId, payload) => sellerRequest(`/sellers/orders/${orderId}/items/${productId}/return`, { method: "PATCH", body: JSON.stringify(payload) }),
  adminSellers: (params = {}) => request(withQuery("/sellers/admin", params)),
  sellerBalanceCollections: () => request("/sellers/admin/balance-collections"),
  collectSellerBalance: (id, payload) => request(`/sellers/admin/balance-collections/${id}`, { method: "POST", body: JSON.stringify(payload) }),
  revealSellerPassword: (id) => request(`/sellers/admin/${id}/password`),
  createSellerImpersonation: (id) => request(`/sellers/admin/${id}/impersonation`, { method: "POST" }),
  exchangeSellerImpersonation: (code) => request("/sellers/impersonation/exchange", { method: "POST", headers: { Authorization: "" }, body: JSON.stringify({ code }) }),
  resetSellerPassword: (id) => request(`/sellers/admin/${id}/reset-password`, { method: "POST" }),
  pendingSellerProducts: () => request("/sellers/admin/products/pending"),
  adminSellerProducts: (id) => request(`/sellers/admin/${id}/products`),
  adminSellerReferrals: (id) => request(`/sellers/admin/${id}/referrals`),
  reviewAdminSellerSettlement: (orderId, productId) => request(`/sellers/admin/orders/${orderId}/items/${productId}/settlement`, { method: "POST" }),
  adminSellerTransactions: (id, params = {}) => request(withQuery(`/sellers/admin/${id}/transactions`, params)),
  adminSellerWithdrawals: () => request("/sellers/admin/withdrawals"),
  processSellerWithdrawal: (id, payload) => request(`/sellers/admin/withdrawals/${id}`, { method: "PATCH", body: JSON.stringify(payload) }),
  sellerPayoutOtp: (id) => request(`/sellers/admin/withdrawals/${id}/payout/otp`, { method: "POST" }),
  paySellerWithdrawal: (id, payload) => request(`/sellers/admin/withdrawals/${id}/payout`, { method: "POST", body: JSON.stringify(payload) }),
  sellerPayoutStatus: (id) => request(`/sellers/admin/withdrawals/${id}/payout/status`, { method: "POST" }),
  updateSellerCommission: (id, commissionRate) => request(`/sellers/admin/${id}/commission`, { method: "PATCH", body: JSON.stringify({ commissionRate }) }),
  updateSellerCompliance: (id, payload) => request(`/sellers/admin/${id}/compliance`, { method: "PATCH", body: JSON.stringify(payload) }),
  updateSellerByAdmin: async (id, payload) => {
    try { return await request(`/sellers/admin/${id}`, { method: "PUT", body: JSON.stringify(payload) }); }
    catch (error) {
      if (!/not found/i.test(String(error.message))) throw error;
      return request(`/sellers/admin/${id}`, { method: "PATCH", body: JSON.stringify(payload) });
    }
  },
  approveSeller: (id) => request(`/sellers/admin/${id}/approve`, { method: "PATCH" }),
  rejectSeller: (id, reason) => request(`/sellers/admin/${id}/reject`, { method: "PATCH", body: JSON.stringify({ reason }) }),
  approveSellerProduct: (sellerId, productId) => request(`/sellers/admin/${sellerId}/products/${productId}/approve`, { method: "PATCH" }),
  rejectSellerProduct: (sellerId, productId, reason) => request(`/sellers/admin/${sellerId}/products/${productId}/reject`, { method: "PATCH", body: JSON.stringify({ reason }) }),
  reviewSellerKyc: (sellerId, type, payload) => request(`/sellers/admin/${sellerId}/kyc/${type}`, { method: "PATCH", body: JSON.stringify(payload) })
});
