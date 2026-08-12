import Order from "../models/Order.js";
import Product from "../models/Product.js";
import ShipRocketSetting from "../models/ShipRocketSetting.js";
import Seller from "../models/Seller.js";
import asyncHandler from "../utils/asyncHandler.js";
import { distributeOrderProfit } from "../services/partnerPayoutService.js";
import { generateShiprocketDocuments } from "../services/shiprocketService.js";
import { ensureOrderInvoice } from "../services/invoiceService.js";

export const listOrders = asyncHandler(async (req, res) => {
  const { status, from, to, q, seller: sellerId, ownership } = req.query;
  const page = Math.max(1, Number.parseInt(req.query.page, 10) || 1);
  const limit = Math.min(100, Math.max(1, Number.parseInt(req.query.limit, 10) || 10));
  const filter = {};

  if (status) filter.status = status;
  if (sellerId) filter["items.seller"] = sellerId;
  if (ownership === "seller") filter["items.seller"] = { $ne: null };
  if (ownership === "admin") filter["items.seller"] = null;
  if (from || to) {
    filter.createdAt = {};
    if (from) filter.createdAt.$gte = new Date(from);
    if (to) filter.createdAt.$lte = new Date(to);
  }

  if (q) {
    const escaped = String(q).trim().replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const matchingSellerIds = await Seller.find({ $or: [{ companyName: new RegExp(escaped, "i") }, { sellerNumber: new RegExp(escaped, "i") }, { email: new RegExp(escaped, "i") }] }).distinct("_id");
    const matchingProductIds = matchingSellerIds.length ? await Product.find({ seller: { $in: matchingSellerIds } }).distinct("_id") : [];
    filter.$or = [
      { orderNumber: new RegExp(escaped, "i") },
      { invoiceNumber: new RegExp(escaped, "i") },
      { "address.name": new RegExp(escaped, "i") },
      { "address.email": new RegExp(escaped, "i") },
      { "items.seller": { $in: matchingSellerIds } },
      { "items.product": { $in: matchingProductIds } }
    ];
  }
  const [orders, total] = await Promise.all([
    Order.find(filter)
      .populate("customer", "name email")
      .populate("items.seller", "companyName sellerNumber email mobile address city state pinCode")
      .populate("items.product", "name mainImage imageVariants")
      .sort({ _id: -1 })
      .skip((page - 1) * limit)
      .limit(limit),
    Order.countDocuments(filter)
  ]);
  res.json({ items: orders, pagination: { page, limit, total, pages: Math.max(1, Math.ceil(total / limit)) } });
});

export const getPendingItemSummary = asyncHandler(async (_req, res) => {
  const summary = await Order.aggregate([
    { $match: { status: { $nin: ["Delivered", "Cancelled", "Returned"] } } },
    { $unwind: "$items" },
    { $match: { "items.seller": null, "items.sellerStatus": { $nin: ["Delivered", "Completed", "Cancelled", "Returned"] } } },
    {
      $group: {
        _id: { sku: "$items.sku", name: "$items.name", seller: "$items.seller" },
        quantity: { $sum: "$items.quantity" },
        orderCount: { $sum: 1 },
        orderNumbers: { $addToSet: "$orderNumber" }
      }
    },
    { $lookup: { from: "sellers", localField: "_id.seller", foreignField: "_id", as: "seller" } },
    { $unwind: { path: "$seller", preserveNullAndEmptyArrays: true } },
    { $sort: { quantity: -1 } }
  ]);
  res.json(summary.map((item) => ({ sku: item._id.sku, name: item._id.name, seller: item.seller ? { _id: item.seller._id, companyName: item.seller.companyName, sellerNumber: item.seller.sellerNumber } : null, quantity: item.quantity, orderCount: item.orderCount, orderNumbers: item.orderNumbers })));
});

export const createOrder = asyncHandler(async (req, res) => {
  const order = await Order.create(req.body);

  await Promise.all(
    order.items.map((item) =>
      item.product ? Product.findByIdAndUpdate(item.product, { $inc: { stock: -item.quantity } }) : null
    )
  );

  res.status(201).json(order);
});

export const getOrder = asyncHandler(async (req, res) => {
  const order = await Order.findById(req.params.id).populate("customer").populate("refunds.processedBy", "name");
  if (!order) {
    res.status(404);
    throw new Error("Order not found");
  }
  res.json(order);
});

export const updateOrderStatus = asyncHandler(async (req, res) => {
  const { status, paymentStatus, fulfillment, timelineComment, timelineDetails } = req.body;
  const order = await Order.findById(req.params.id);
  if (!order) {
    res.status(404);
    throw new Error("Order not found");
  }

  if (status) {
    order.status = status;
    if (status === "Confirmed") await ensureOrderInvoice(order, { createdBy: req.user._id });
    if (status === "Delivered") {
      const deliveredAt = fulfillment?.deliveredAt ? new Date(fulfillment.deliveredAt) : new Date();
      order.fulfillment = { ...order.fulfillment, ...fulfillment, deliveredAt };
      order.items.forEach((item) => {
        if (["Cancelled", "Returned"].includes(item.sellerStatus)) return;
        item.sellerStatus = "Delivered";
        item.sellerStatusUpdatedAt = deliveredAt;
        item.deliveredAt = deliveredAt;
        item.returnWindowClosesAt = item.returnApplicable && item.returnDays > 0
          ? new Date(deliveredAt.getTime() + Number(item.returnDays) * 86400000)
          : deliveredAt;
      });
    }
  }
  if (paymentStatus) order.paymentStatus = paymentStatus;
  if (fulfillment && status !== "Delivered") order.fulfillment = fulfillment;
  if (status || timelineComment || timelineDetails) {
    order.timeline.push({
      status: status || order.status,
      title: status ? `Status changed to ${status}` : "Order note",
      comment: timelineComment,
      details: timelineDetails,
      createdBy: req.user._id
    });
  }
  await order.save();
  if (order.paymentStatus === "Paid") await distributeOrderProfit(order._id);
  await order.populate("customer", "name email");
  res.json(order);
});

export const updateOrderItems = asyncHandler(async (req, res) => {
  const order = await Order.findById(req.params.id);
  if (!order) {
    res.status(404);
    throw new Error("Order not found");
  }

  order.items = req.body.items;
  order.subtotal = Number(order.items.reduce((sum, item) => sum + Number(item.taxableValue ?? item.price) * Number(item.quantity), 0).toFixed(2));
  order.taxTotal = Number(order.items.reduce((sum, item) => sum + Number(item.gstAmount || 0) * Number(item.quantity), 0).toFixed(2));
  order.grandTotal = order.subtotal + order.shippingTotal + order.taxTotal - order.discountTotal;
  await order.save();
  res.json(order);
});

export const generateInvoice = asyncHandler(async (req, res) => {
  const order = await Order.findById(req.params.id).populate("customer", "name email");
  if (!order) {
    res.status(404);
    throw new Error("Order not found");
  }

  await ensureOrderInvoice(order, { createdBy: req.user._id });
  await order.save();
  await order.populate("customer", "name email");
  res.json(order);
});

export const updateTracking = asyncHandler(async (req, res) => {
  const order = await Order.findById(req.params.id);
  if (!order) {
    res.status(404);
    throw new Error("Order not found");
  }
  order.fulfillment = { ...order.fulfillment, ...req.body.fulfillment };
  order.shipping = { ...order.shipping, ...req.body.shipping };
  if (req.body.status) order.status = req.body.status;
  if (req.body.timelineComment || req.body.timelineDetails) {
    order.timeline.push({
      status: order.status,
      title: "Tracking updated",
      comment: req.body.timelineComment,
      details: req.body.timelineDetails,
      createdBy: req.user._id
    });
  }
  await order.save();
  await order.populate("customer", "name email");
  res.json(order);
});

export const syncShipRocketOrder = asyncHandler(async (req, res) => {
  const order = await Order.findById(req.params.id);
  if (!order) {
    res.status(404);
    throw new Error("Order not found");
  }
  const settings = await ShipRocketSetting.findOne({ singleton: "shiprocket", isActive: true });
  if (!settings) { res.status(503); throw new Error("ShipRocket is not configured or is inactive"); }
  if (!order.shipping?.syncPayload) { res.status(409); throw new Error("This order does not have a ShipRocket shipment payload"); }
  let syncStatus = "ShipRocket settings inactive";
  let shiprocketOrderId = order.shipping.shiprocketOrderId;
  let shipmentId = order.shipping.shipmentId;
  let awbCode = order.shipping.awbCode;
  let courierName = order.shipping.courierName;
  let labelUrl = order.shipping.labelUrl;
  let manifestUrl = order.shipping.manifestUrl;

  if (settings && order.shipping.syncPayload) {
    try {
      const authResponse = await fetch("https://apiv2.shiprocket.in/v1/external/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: settings.email, password: settings.password })
      });
      const authData = await authResponse.json();
      if (!authResponse.ok || !authData.token) throw new Error(authData.message || "ShipRocket auth failed");

      const orderResponse = await fetch("https://apiv2.shiprocket.in/v1/external/orders/create/adhoc", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${authData.token}` },
        body: JSON.stringify(order.shipping.syncPayload)
      });
      const orderData = await orderResponse.json();
      if (!orderResponse.ok) throw new Error(orderData.message || "ShipRocket order creation failed");

      syncStatus = "Synced with ShipRocket";
      shiprocketOrderId = orderData.order_id || shiprocketOrderId;
      shipmentId = orderData.shipment_id || shipmentId;
      awbCode = orderData.awb_code || awbCode;
      courierName = orderData.courier_name || courierName;
      if (!awbCode && shipmentId) {
        const awbResponse = await fetch("https://apiv2.shiprocket.in/v1/external/courier/assign/awb", { method: "POST", headers: { "Content-Type": "application/json", Authorization: `Bearer ${authData.token}` }, body: JSON.stringify({ shipment_id: shipmentId, ...(settings.preferredCourierId ? { courier_id: Number(settings.preferredCourierId) } : {}) }) });
        const awbData = await awbResponse.json().catch(() => ({}));
        if (!awbResponse.ok) throw new Error(awbData.message || "ShipRocket AWB assignment failed");
        awbCode = awbData.awb_code || awbData.response?.data?.awb_code || "";
        courierName = awbData.courier_name || awbData.response?.data?.courier_name || courierName;
      }
      if (!awbCode) throw new Error("ShipRocket did not assign a tracking/AWB number");
      const documents = await generateShiprocketDocuments({ token: authData.token, shipmentId });
      labelUrl = documents.labelUrl; manifestUrl = documents.manifestUrl;
    } catch (error) {
      res.status(502);
      throw new Error(`ShipRocket dispatch failed: ${error.message}`);
    }
  }

  order.shipping = {
    ...order.shipping,
    shiprocketOrderId,
    shipmentId,
    awbCode,
    courierName,
    trackingUrl: `https://shiprocket.co/tracking/${encodeURIComponent(awbCode)}`,
    labelUrl,
    manifestUrl,
    syncStatus,
    syncPayload: order.shipping.syncPayload
  };
  order.fulfillment = { ...order.fulfillment, carrier: courierName || "ShipRocket", trackingNumber: awbCode, shippingLabelUrl: labelUrl, packingSlipUrl: labelUrl, shippedAt: new Date() };
  order.timeline.push({
    status: order.status,
    title: "ShipRocket sync updated",
    comment: syncStatus,
    createdBy: req.user._id
  });
  await order.save();
  await order.populate("customer", "name email");
  res.json(order);
});

export const createRefund = asyncHandler(async (req, res) => {
  const { amount, reason } = req.body;
  const order = await Order.findById(req.params.id);

  if (!order) {
    res.status(404);
    throw new Error("Order not found");
  }

  order.refunds.push({ amount, reason, processedBy: req.user._id });
  const refundedTotal = order.refunds.reduce((sum, refund) => sum + refund.amount, 0);
  order.paymentStatus = refundedTotal >= order.grandTotal ? "Refunded" : "Partially Refunded";
  await order.save();

  res.status(201).json(order);
});

export const closeItemReturnWithRefund = asyncHandler(async (req, res) => {
  const order = await Order.findById(req.params.id);
  if (!order) { res.status(404); throw new Error("Order not found"); }
  const item = order.items.find((entry) => String(entry.product) === String(req.params.productId));
  if (!item?.returnRequest?.status) { res.status(409); throw new Error("Return request not found"); }
  const amount = Math.round(Number(req.body.amount ?? item.price * item.quantity) * 100) / 100;
  if (!Number.isFinite(amount) || amount <= 0) { res.status(400); throw new Error("Enter a valid refund amount"); }
  order.refunds.push({ amount, reason: String(req.body.reason || item.returnRequest.reason || "Returned item refund"), processedBy: req.user._id });
  item.returnRequest.status = "Closed"; item.returnRequest.reviewedAt = new Date(); item.returnRequest.reviewNote = String(req.body.note || "Refund processed and return closed by admin"); item.returnRequest.receivedAt ||= new Date();
  item.sellerStatus = "Returned"; item.sellerStatusUpdatedAt = new Date();
  const refundedTotal = order.refunds.reduce((sum, refund) => sum + refund.amount, 0);
  order.paymentStatus = refundedTotal >= order.grandTotal ? "Refunded" : "Partially Refunded";
  order.timeline.push({ status: "Returned", title: `${item.name} return closed`, comment: `Refund of ₹${amount.toFixed(2)} processed by admin`, createdBy: req.user._id });
  await order.save(); res.json(order);
});

export const updateRma = asyncHandler(async (req, res) => {
  const order = await Order.findByIdAndUpdate(req.params.id, { rma: req.body }, { new: true, runValidators: true });

  if (!order) {
    res.status(404);
    throw new Error("Order not found");
  }

  res.json(order);
});
