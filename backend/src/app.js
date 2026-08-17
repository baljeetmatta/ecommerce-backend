import cors from "cors";
import express from "express";
import helmet from "helmet";
import rateLimit from "express-rate-limit";
import morgan from "morgan";

import analyticsRoutes from "./routes/analyticsRoutes.js";
import authRoutes from "./routes/authRoutes.js";
import blogRoutes from "./routes/blogRoutes.js";
import categoryRoutes from "./routes/categoryRoutes.js";
import customerRoutes from "./routes/customerRoutes.js";
import orderRoutes from "./routes/orderRoutes.js";
import productRoutes from "./routes/productRoutes.js";
import promotionRoutes from "./routes/promotionRoutes.js";
import settingsRoutes from "./routes/settingsRoutes.js";
import storefrontRoutes from "./routes/storefrontRoutes.js";
import taxCategoryRoutes from "./routes/taxCategoryRoutes.js";
import userRoutes from "./routes/userRoutes.js";
import staffRoutes from "./routes/staffRoutes.js";
import supportRoutes from "./routes/supportRoutes.js";
import staffAuditMiddleware from "./middleware/staffAuditMiddleware.js";
import partnerRoutes from "./routes/partnerRoutes.js";
import sellerRoutes from "./routes/sellerRoutes.js";
import reviewRoutes from "./routes/reviewRoutes.js";
import uploadRoutes from "./routes/uploadRoutes.js";
import { errorHandler, notFound } from "./middleware/errorMiddleware.js";

const app = express();

// Production traffic is terminated by a reverse proxy. Trust its forwarded
// protocol so externally generated URLs (including PayU surl/furl) stay HTTPS.
app.set("trust proxy", 1);

app.use(helmet());
const configuredClientOrigins = String(process.env.CLIENT_URL || "")
  .split(",")
  .map((origin) => origin.trim().replace(/\/+$/, ""))
  .filter(Boolean);
const allowedClientOrigins = new Set([
  "https://hrsbasket.com",
  "https://www.hrsbasket.com",
  "https://admin.hrsbasket.com",
  "https://secure.payu.in",
  "https://test.payu.in",
  "http://localhost:5173",
  "http://127.0.0.1:5173",
  "http://localhost:5174",
  "http://127.0.0.1:5174",
  ...configuredClientOrigins
]);
app.use((req, res, next) => {
  // CORS responses differ by request origin. This is required even when the
  // request is served through a CDN or reverse proxy.
  res.vary("Origin");

  // Storefront JSON previously used shared public caching. Some CDNs cache the
  // Access-Control-Allow-Origin header by URL only, which can serve the apex
  // domain's header to www (or omit it entirely). Keep these API responses out
  // of shared caches; browser-side application state remains unaffected.
  if (req.path.startsWith("/api/storefront")) {
    res.setHeader("Cache-Control", "private, no-store, max-age=0");
    res.setHeader("CDN-Cache-Control", "no-store");
    res.setHeader("Surrogate-Control", "no-store");
  }
  next();
});
app.use(
  cors({
    origin(origin, callback) {
      // Requests without an Origin header are server-to-server or same-origin.
      if (!origin || allowedClientOrigins.has(origin.replace(/\/+$/, ""))) return callback(null, true);
      return callback(new Error(`Origin ${origin} is not allowed by CORS`));
    },
    credentials: true
  })
);
app.use(express.json({ limit: "15mb" }));
app.use(express.urlencoded({ extended: true }));
app.use(
  "/uploads",
  (_req, res, next) => {
    // Uploaded media is intentionally embedded by the separate storefront
    // origin (hrsbasket.com). Helmet defaults CORP to same-origin, which makes
    // successful uploads appear broken in every frontend image preview.
    res.setHeader("Cross-Origin-Resource-Policy", "cross-origin");
    res.setHeader("Access-Control-Allow-Origin", "*");
    next();
  },
  express.static(process.env.UPLOAD_DIR || "uploads", { immutable: true, maxAge: "30d" })
);
app.use(morgan("dev"));
app.use(
  rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 500
  })
);

app.get("/api/health", (_req, res) => {
  res.json({ status: "ok", service: "ecommerce-admin-api" });
});

app.use(staffAuditMiddleware);
app.use("/api/auth", authRoutes);
app.use("/api/storefront", storefrontRoutes);
app.use("/api/analytics", analyticsRoutes);
app.use("/api/blog", blogRoutes);
app.use("/api/categories", categoryRoutes);
app.use("/api/customers", customerRoutes);
app.use("/api/orders", orderRoutes);
app.use("/api/products", productRoutes);
app.use("/api/promotions", promotionRoutes);
app.use("/api/settings", settingsRoutes);
app.use("/api/tax-categories", taxCategoryRoutes);
app.use("/api/users", userRoutes);
app.use("/api/staff", staffRoutes);
app.use("/api/support", supportRoutes);
app.use("/api/partners", partnerRoutes);
app.use("/api/sellers", sellerRoutes);
app.use("/api/reviews", reviewRoutes);
app.use("/api/uploads", uploadRoutes);

app.use(notFound);
app.use(errorHandler);

export default app;
