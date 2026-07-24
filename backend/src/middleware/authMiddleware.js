import jwt from "jsonwebtoken";
import Customer from "../models/Customer.js";
import User from "../models/User.js";
import Partner from "../models/Partner.js";
import Seller from "../models/Seller.js";
import asyncHandler from "../utils/asyncHandler.js";

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

export const authorize = (...roles) => (req, res, next) => {
  if (!roles.includes(req.user.role)) {
    res.status(403);
    throw new Error("You do not have permission to perform this action");
  }

  next();
};

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
      : await User.findById(decoded.id).select("_id isActive");
  const enabled = account && (decoded.role === "Partner" || decoded.role === "Seller" ? account.status === "active" : account.isActive);
  if (!enabled) { res.status(401); throw new Error("Account is not available"); }
  req.uploader = account;
  next();
});
