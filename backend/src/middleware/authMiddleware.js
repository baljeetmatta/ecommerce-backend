import jwt from "jsonwebtoken";
import Customer from "../models/Customer.js";
import User from "../models/User.js";
import Partner from "../models/Partner.js";
import Seller from "../models/Seller.js";
import asyncHandler from "../utils/asyncHandler.js";
import WorkAssignment from "../models/WorkAssignment.js";
import Order from "../models/Order.js";

export const protect = asyncHandler(async (req, res, next) => {
  const authHeader = req.headers.authorization || "";
  const token = authHeader.startsWith("Bearer ") ? authHeader.split(" ")[1] : null;

  if (!token) {
    res.status(401);
    throw new Error("Authentication token required");
  }

  const decoded = jwt.verify(token, process.env.JWT_SECRET);
  const user = await User.findById(decoded.id).select("-password");

  if (!user || !user.isActive) {
    res.status(401);
    throw new Error("User account is not available");
  }

  req.user = user;
  next();
});

const responsibilityFromPath = (path) => path.includes("kyc") ? "kyc" : path.includes("review") ? "reviews" : path.includes("product") ? "products" : path.includes("return") || path.includes("refund") ? "returns" : path.includes("withdraw") || path.includes("payout") ? "payouts" : path.includes("order") || path.includes("invoice") || path.includes("shiprocket") ? "orders" : path.includes("report") ? "reports" : path.includes("support") ? "support" : path.includes("customer") ? "customer_care" : "registration";
export const authorize = (...roles) => asyncHandler(async (req, res, next) => {
  if (roles.includes(req.user.role) || req.user.role === "Super Admin") return next();
  if (!["Team Leader", "Staff"].includes(req.user.role)) { res.status(403); throw new Error("You do not have permission to perform this action"); }
  const action = responsibilityFromPath(req.originalUrl.toLowerCase());
  const scope = req.user.role === "Team Leader" ? { teamLeader: req.user._id } : { staff: req.user._id };
  let allowed = false;
  const direct = req.originalUrl.match(/\/api\/(sellers|partners|customers)\/(?:admin\/(?:partners\/)?)?([a-f\d]{24})(?:\/|$)/i);
  if (direct) { const entityType = ({ sellers: "Seller", partners: "Partner", customers: "Customer" })[direct[1].toLowerCase()]; allowed = await WorkAssignment.exists({ ...scope, entityType, entity: direct[2], action, active: true }); }
  else {
    const orderId = req.originalUrl.match(/\/api\/orders\/([a-f\d]{24})(?:\/|$)/i)?.[1];
    if (orderId) { const order = await Order.findById(orderId).select("customer items.seller").lean(); const entities = [{ entityType: "Customer", entity: order?.customer }, ...(order?.items || []).filter((item) => item.seller).map((item) => ({ entityType: "Seller", entity: item.seller }))]; allowed = await WorkAssignment.exists({ ...scope, action, active: true, $or: entities }); }
    else allowed = await WorkAssignment.exists({ ...scope, action, active: true });
  }
  if (!allowed) { res.status(403); throw new Error(`No active ${action.replaceAll("_", " ")} assignment permits this action`); }
  req.staffResponsibility = action; req.staffScope = scope; next();
});

export const protectCustomer = asyncHandler(async (req, res, next) => {
  const authHeader = req.headers.authorization || "";
  const token = authHeader.startsWith("Bearer ") ? authHeader.split(" ")[1] : null;

  if (!token) {
    res.status(401);
    throw new Error("Authentication token required");
  }

  const decoded = jwt.verify(token, process.env.JWT_SECRET);

  if (decoded.role !== "Customer") {
    res.status(403);
    throw new Error("Customer account required");
  }

  const customer = await Customer.findById(decoded.id).select("-password");

  if (!customer || customer.status === "blocked") {
    res.status(401);
    throw new Error("Customer account is not available");
  }

  req.customer = customer;
  next();
});

export const optionalCustomer = asyncHandler(async (req, _res, next) => {
  const authHeader = req.headers.authorization || "";
  const token = authHeader.startsWith("Bearer ") ? authHeader.split(" ")[1] : null;
  if (!token) return next();
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    if (decoded.role !== "Customer") return next();
    const customer = await Customer.findById(decoded.id).select("_id status");
    if (customer && customer.status !== "blocked") req.customer = customer;
  } catch (_error) {
    // Public Reel engagement remains available when an old token is invalid.
  }
  next();
});

export const protectPartner = asyncHandler(async (req, res, next) => {
  const authHeader = req.headers.authorization || "";
  const token = authHeader.startsWith("Bearer ") ? authHeader.split(" ")[1] : null;
  if (!token) { res.status(401); throw new Error("Partner authentication token required"); }
  const decoded = jwt.verify(token, process.env.JWT_SECRET);
  if (decoded.role !== "Partner") { res.status(403); throw new Error("Partner account required"); }
  const partner = await Partner.findById(decoded.id);
  if (!partner || partner.status !== "active") { res.status(401); throw new Error("Partner account is not available"); }
  req.partner = partner;
  next();
});

export const protectSeller = asyncHandler(async (req, res, next) => {
  const authHeader = req.headers.authorization || "";
  const token = authHeader.startsWith("Bearer ") ? authHeader.split(" ")[1] : null;
  if (!token) { res.status(401); throw new Error("Seller authentication token required"); }
  const decoded = jwt.verify(token, process.env.JWT_SECRET);
  if (decoded.role !== "Seller") { res.status(403); throw new Error("Seller account required"); }
  const seller = await Seller.findById(decoded.id);
  if (!seller || seller.status !== "active") { res.status(401); throw new Error("Seller account is not available"); }
  req.seller = seller;
  next();
});

export const protectUploader = asyncHandler(async (req, res, next) => {
  const authHeader = req.headers.authorization || "";
  const token = authHeader.startsWith("Bearer ") ? authHeader.split(" ")[1] : null;
  if (!token) { res.status(401); throw new Error("Authentication token required"); }
  const decoded = jwt.verify(token, process.env.JWT_SECRET);
  const account = decoded.role === "Partner"
    ? await Partner.findById(decoded.id).select("_id status")
    : decoded.role === "Seller"
      ? await Seller.findById(decoded.id).select("_id status")
      : decoded.role === "Customer"
        ? await Customer.findById(decoded.id).select("_id status")
      : await User.findById(decoded.id).select("_id isActive");
  const enabled = account && (decoded.role === "Partner" || decoded.role === "Seller" || decoded.role === "Customer" ? !["blocked", "suspended"].includes(account.status) : account.isActive);
  if (!enabled) { res.status(401); throw new Error("Account is not available"); }
  req.uploader = account;
  next();
});
