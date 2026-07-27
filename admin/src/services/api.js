/**
 * Backend configuration for the standalone admin application.
 *
 * Set VITE_API_URL in admin/.env.production when deploying to another API
 * origin. Keeping this file inside the admin project prevents its deployment
 * from depending on the storefront's environment configuration.
 */
export const ADMIN_API_URL = String(
  import.meta.env.VITE_API_URL || "https://ebackend.hrsbasket.com/api"
).trim().replace(/\/+$/, "");

// The existing admin workspace and its API methods are shared with the
// storefront codebase. They read this value when the admin bundle is loaded.
window.__HRS_API_URL__ = ADMIN_API_URL;

export const adminApiUrl = (path = "") =>
  `${ADMIN_API_URL}${path ? `/${String(path).replace(/^\/+/, "")}` : ""}`;
