

export const settingsSectionIds = ["settings-account", "settings-payments", "settings-shipping", "settings-shiprocket", "settings-email", "settings-storefront", "settings-home", "settings-home-sections", "settings-hero", "settings-sections"];

export const adminSectionIds = new Set(["profile", "dashboard", "analytics", "catalog", "add-product", "edit-product", "categories", "category-editor", "tax-categories", "tax-editor", "orders", "returns-refunds", "customers", "partners", "partner-packages", "partner-withdrawals", "partner-details", "sellers", "resellers", "seller-withdrawals", "seller-products", "reviews", "staff", "create-staff", "support-tickets", "announcements", "banners", "blog", "blog-create", "pages", "page-editor", "footer", "marketing", "team", "teams", "team-create", "team-edit", "team-assign", "team-roster", "free-staff", "team-assignments", "staff-history", ...settingsSectionIds]);

export const catalogRouteFilters = () => {
  const params = new URLSearchParams(String(window.location.hash).split("?")[1] || "");
  return { owner: params.get("owner") || "", seller: params.get("seller") || "" };
};

export const currentClientRoute = () => {
  if (window.location.hash) return window.location.hash;
  const pathname = window.location.pathname.replace(/\/+$/, "") || "/";
  return pathname === "/" ? "#/" : `#${pathname}${window.location.search}`;
};

export const adminApplicationUrl = () => {
  const local = ["localhost", "127.0.0.1"].includes(window.location.hostname);
  return local ? "http://localhost:5174/#/admin/login" : "https://admin.hrsbasket.com/#/admin/login";
};

export const storefrontProductUrl = (productId) => {
  const local = ["localhost", "127.0.0.1"].includes(window.location.hostname);
  const storefrontOrigin = String(import.meta.env.VITE_STOREFRONT_URL || (local ? "http://localhost:5173" : "https://hrsbasket.com")).replace(/\/+$/, "");
  return `${storefrontOrigin}/#/product/${productId}`;
};

export const isStandaloneAdminHost = () => window.location.hostname === "admin.hrsbasket.com" || (["localhost", "127.0.0.1"].includes(window.location.hostname) && window.location.port === "5174");

export const adminSectionFromHash = () => {
  const match = currentClientRoute().match(/^#\/admin\/([^/?]+)/);
  return match && adminSectionIds.has(match[1]) ? match[1] : "";
};

export function sectionTitle(active) {
  return {
    profile: "Profile Settings",
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
    reviews: "Reviews & Ratings Approval",
    banners: "Product Banners",
    blog: "Blog Content",
    "blog-create": "Create Blog Post",
    marketing: "Marketing & Promotions",
    staff: "Staff",
    team: "Role-Based Access",
    "create-staff": "Create Staff",
    "support-tickets": "Support Tickets",
    "settings-payments": "Settings · Payment Methods",
    "settings-account": "Change Password",
    announcements: "Add Announcement",
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
