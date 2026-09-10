import Order from "../models/Order.js";
import asyncHandler from "../utils/asyncHandler.js";

export const orderActivityFilters = (req) => {
  const scope = req.seller ? { "items.seller": req.seller._id }
    : req.reseller ? { "resellerAttribution.reseller": req.reseller._id } : {};
  const pendingItem = { sellerStatus: { $in: ["Pending", "Placed"] }, seller: req.seller ? req.seller._id : { $ne: null } };
  const pending = { ...scope, status: { $nin: ["Cancelled", "Delivered", "Completed", "Returned", "Refunded", "RTO"] }, $or: [
    { items: { $elemMatch: pendingItem } },
    ...(!req.seller ? [{ status: { $in: ["Pending", "Placed"] }, items: { $elemMatch: { seller: null, sellerStatus: { $in: ["Pending", "Placed"] } } } }] : [])
  ] };
  return { scope, pending };
};

export const getOrderActivity = asyncHandler(async (req, res) => {
  if (!req.seller && !req.reseller && req.user?.role !== "Super Admin") {
    res.status(403); throw new Error("Order activity is not available for this account");
  }
  const { scope, pending } = orderActivityFilters(req);
  const [pendingCount, recentOrders, pendingOrders] = await Promise.all([
    Order.countDocuments(pending),
    Order.find(scope).select("orderNumber createdAt").sort({ createdAt: -1, _id: -1 }).limit(10).lean(),
    Order.find(pending).select("orderNumber createdAt").sort({ createdAt: -1, _id: -1 }).limit(5).lean()
  ]);
  res.set("Cache-Control", "no-store");
  res.json({ pendingCount, recentOrders, pendingOrders });
});
