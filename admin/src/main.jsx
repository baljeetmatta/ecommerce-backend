import React, { lazy, Suspense, useEffect } from "react";
import { createRoot } from "react-dom/client";
import ToastHost from "../../frontend/src/components/ToastHost.jsx";
import { ADMIN_API_URL } from "./services/api.js";
import "../../frontend/src/styles/global.css";
import "../../frontend/src/styles/operations.css";
import "../../frontend/src/styles/partner-premium.css";
import "../../frontend/src/styles/partner-success.css";
import "../../frontend/src/styles/partner-login.css";
import "../../frontend/src/styles/seller-panel.css";
import "./admin.css";

const AdminWorkspace = lazy(() => import("../../frontend/src/App.jsx"));
const hostname = window.location.hostname.toLowerCase();
const localDevelopment = hostname === "localhost" || hostname === "127.0.0.1";
const permittedHost = localDevelopment || hostname === "admin.hrsbasket.com";

if (!window.location.hash.startsWith("#/admin")) {
  window.history.replaceState(null, "", `${window.location.pathname}${window.location.search}#/admin/analytics`);
}

function AdminDomainGuard() {
  useEffect(() => {
    if (!permittedHost) return undefined;
    const keepAdminRoute = () => {
      if (!window.location.hash.startsWith("#/admin")) window.location.hash = "#/admin/analytics";
    };
    window.addEventListener("hashchange", keepAdminRoute);
    return () => window.removeEventListener("hashchange", keepAdminRoute);
  }, []);
  if (permittedHost) return <Suspense fallback={<main className="adminAppLoading" role="status">Loading HRSBasket Admin…</main>}><AdminWorkspace /><ToastHost /></Suspense>;
  return <main className="adminDomainBlocked"><section><h1>Admin access has moved</h1><p>The HRSBasket administration console is available only on the secure admin domain.</p><a href="https://admin.hrsbasket.com/#/admin/login">Open admin.hrsbasket.com</a></section></main>;
}

console.info(`HRSBasket Admin API: ${ADMIN_API_URL}`);

createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <AdminDomainGuard />
  </React.StrictMode>
);
