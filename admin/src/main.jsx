import React, { useEffect } from "react";
import { createRoot } from "react-dom/client";
import AdminWorkspace from "../../frontend/src/App.jsx";
import ToastHost from "../../frontend/src/components/ToastHost.jsx";
import "../../frontend/src/styles/global.css";
import "../../frontend/src/styles/operations.css";
import "../../frontend/src/styles/partner-premium.css";
import "../../frontend/src/styles/partner-success.css";
import "../../frontend/src/styles/partner-login.css";
import "./admin.css";

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
  if (permittedHost) return <><AdminWorkspace /><ToastHost /></>;
  return <main className="adminDomainBlocked"><section><h1>Admin access has moved</h1><p>The HRSBasket administration console is available only on the secure admin domain.</p><a href="https://admin.hrsbasket.com/#/admin/login">Open admin.hrsbasket.com</a></section></main>;
}

createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <AdminDomainGuard />
  </React.StrictMode>
);
