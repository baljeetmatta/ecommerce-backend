
export const money = (value) => new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 2 }).format(value || 0);
export const normalizeProductSearch = (value) => String(value || "").normalize("NFKD").replace(/[\u0300-\u036f]/g, "").toLocaleLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
export const strongPasswordPattern = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z0-9]).{8,}$/;
export const initialForm = { fullName: "", mobile: "", address: "", pan: "", gstStatus: "non-gst", gstin: "", paymentDetails: { method: "upi", upiId: "" }, kyc: { panDocument: "", addressDocument: "" }, termsAccepted: false, challengeId: "", otp: "" };
export const resellerRoutes = { dashboard: "dashboard", products: "products", add: "margin", links: "links", orders: "orders", earnings: "earnings", payouts: "payouts", marketing: "marketing", reports: "reports", profile: "profile", kyc: "kyc", support: "support", settings: "settings", password: "password", returns: "returns", referrals: "referrals", performance: "performance", offers: "offers", wishlist: "wishlist", notifications: "notifications" };
export const resellerLocationRoute = () => window.location.hash || `${window.location.pathname}${window.location.search}`;
export const resellerViewFromHash = (hash = resellerLocationRoute()) => {
  const segment = String(hash).split("?")[0].replace(/^#?\/reseller\/?/, "").split("/")[0];
  return Object.entries(resellerRoutes).find(([, route]) => route === segment)?.[0] || "dashboard";
};
