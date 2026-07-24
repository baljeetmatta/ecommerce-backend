import React from "react";
import { createRoot } from "react-dom/client";
import App from "./App.jsx";
import ToastHost from "./components/ToastHost.jsx";
import "./styles/global.css";
import "./styles/operations.css";
import "./styles/partner-premium.css";
import "./styles/partner-success.css";

createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <App />
    <ToastHost />
  </React.StrictMode>
);
