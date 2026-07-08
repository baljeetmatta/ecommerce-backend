import jwt from "jsonwebtoken";
import Customer from "../models/Customer.js";
import User from "../models/User.js";
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
