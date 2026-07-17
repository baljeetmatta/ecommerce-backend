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
import partnerRoutes from "./routes/partnerRoutes.js";
import sellerRoutes from "./routes/sellerRoutes.js";
import { errorHandler, notFound } from "./middleware/errorMiddleware.js";

const app = express();

app.use(helmet());
app.use(
  cors({
    origin: process.env.CLIENT_URL || "http://localhost:5173",
    credentials: true
  })
);
app.use(express.json({ limit: "15mb" }));
app.use(express.urlencoded({ extended: true }));
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
app.use("/api/partners", partnerRoutes);
app.use("/api/sellers", sellerRoutes);

app.use(notFound);
app.use(errorHandler);

export default app;
