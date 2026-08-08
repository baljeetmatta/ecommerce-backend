import mongoose from "mongoose";
import StaffAuditLog from "../models/StaffAuditLog.js";
import Order from "../models/Order.js";

const safeChanges = (body = {}) => Object.fromEntries(Object.entries(body).filter(([key]) => !/password|token|secret|otp/i.test(key)).map(([key, value]) => [key, value]));
export default function staffAuditMiddleware(req, res, next) {
  if (!["POST", "PUT", "PATCH", "DELETE"].includes(req.method)) return next();
  res.on("finish", async () => {
    if (!req.user || res.statusCode >= 400 || req.originalUrl.startsWith("/api/staff")) return;
    try {
      const path = req.originalUrl.split("?")[0]; const changes = safeChanges(req.body); const common = { actor: req.user._id, actorName: req.user.name, actorRole: req.user.role, action: `${req.method} ${path}`, description: `${req.user.role} ${req.user.name} changed ${path}`, changes, request: { method: req.method, path, ip: req.ip } };
      const direct = path.match(/^\/api\/(sellers|partners|customers)\/(?:admin\/(?:partners\/)?)?([a-f\d]{24})(?:\/|$)/i);
      if (direct) { const entityType = ({ sellers: "Seller", partners: "Partner", customers: "Customer" })[direct[1].toLowerCase()]; await StaffAuditLog.create({ ...common, entityType, entity: direct[2] }); return; }
      const orderMatch = path.match(/^\/api\/orders\/([a-f\d]{24})(?:\/|$)/i);
      if (orderMatch) { const order = await Order.findById(orderMatch[1]).select("customer items.seller").lean(); const targets = new Map(); if (order?.customer) targets.set(`Customer:${order.customer}`, ["Customer", order.customer]); for (const item of order?.items || []) if (item.seller) targets.set(`Seller:${item.seller}`, ["Seller", item.seller]); await Promise.all([...targets.values()].map(([entityType, entity]) => StaffAuditLog.create({ ...common, entityType, entity }))); return; }
      await StaffAuditLog.create({ ...common, entityType: "System", entity: mongoose.isObjectIdOrHexString(req.params?.id) ? req.params.id : undefined });
    } catch (_error) { /* Audit failure must not break a completed business request. */ }
  });
  next();
}
