import Order from "../models/Order.js";
import Product from "../models/Product.js";
import ShipRocketSetting from "../models/ShipRocketSetting.js";
import StorefrontSetting from "../models/StorefrontSetting.js";
import asyncHandler from "../utils/asyncHandler.js";
import { distributeOrderProfit } from "../services/partnerPayoutService.js";

export const listOrders = asyncHandler(async (req, res) => {
  const { status, from, to, q } = req.query;
  const page = Math.max(1, Number.parseInt(req.query.page, 10) || 1);
  const limit = Math.min(100, Math.max(1, Number.parseInt(req.query.limit, 10) || 10));
  const filter = {};

  if (status) filter.status = status;
  if (from || to) {
    filter.createdAt = {};
    if (from) filter.createdAt.$gte = new Date(from);
    if (to) filter.createdAt.$lte = new Date(to);
  }

  if (q) {
    const escaped = String(q).trim().replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    filter.$or = [
      { orderNumber: new RegExp(escaped, "i") },
      { invoiceNumber: new RegExp(escaped, "i") },
      { "address.name": new RegExp(escaped, "i") },
      { "address.email": new RegExp(escaped, "i") }
    ];
  }
  const [orders, total] = await Promise.all([
    Order.find(filter)
      .populate("customer", "name email")
      .sort({ _id: -1 })
      .skip((page - 1) * limit)
      .limit(limit),
    Order.countDocuments(filter)
  ]);
  res.json({ items: orders, pagination: { page, limit, total, pages: Math.max(1, Math.ceil(total / limit)) } });
});

export const getPendingItemSummary = asyncHandler(async (_req, res) => {
  const summary = await Order.aggregate([
    { $match: { status: { $in: ["Pending", "Processing"] } } },
    { $unwind: "$items" },
    {
      $group: {
        _id: { sku: "$items.sku", name: "$items.name" },
        quantity: { $sum: "$items.quantity" },
        orderCount: { $sum: 1 },
        orderNumbers: { $addToSet: "$orderNumber" }
      }
    },
    { $sort: { quantity: -1 } }
  ]);
  res.json(summary.map((item) => ({ sku: item._id.sku, name: item._id.name, quantity: item.quantity, orderCount: item.orderCount, orderNumbers: item.orderNumbers })));
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

  if (status) order.status = status;
  if (paymentStatus) order.paymentStatus = paymentStatus;
  if (fulfillment) order.fulfillment = fulfillment;
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

  const store = await StorefrontSetting.findOne({ singleton: "storefront" });
  const invoiceNumber = order.invoiceNumber || `INV-${order.orderNumber.replace(/\D/g, "") || Date.now()}`;
  order.invoiceNumber = invoiceNumber;
  order.invoiceGeneratedAt = new Date();
  order.invoiceStore = {
    shopName: store?.shopName || "Store",
    logoUrl: store?.logoUrl || store?.footerLogoUrl,
    address: store?.address,
    email: store?.email,
    phone: store?.phone
  };
  order.fulfillment = {
    ...order.fulfillment,
    invoiceUrl: `/api/orders/${order._id}/invoice`
  };
  order.timeline.push({
    status: order.status,
    title: "Invoice generated",
    comment: `Invoice ${invoiceNumber} generated.`,
    createdBy: req.user._id
  });
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
  let syncStatus = "ShipRocket settings inactive";
  let shiprocketOrderId = order.shipping.shiprocketOrderId;
  let shipmentId = order.shipping.shipmentId;
  let awbCode = order.shipping.awbCode;
  let courierName = order.shipping.courierName;

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
    } catch (error) {
      syncStatus = `ShipRocket sync failed: ${error.message}`;
    }
  }

  order.shipping = {
    ...order.shipping,
    shiprocketOrderId: shiprocketOrderId || `SR-${order.orderNumber}`,
    shipmentId: shipmentId || `SHP-${Date.now().toString().slice(-8)}`,
    awbCode,
    courierName,
    syncStatus,
    syncPayload: order.shipping.syncPayload
  };
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

export const updateRma = asyncHandler(async (req, res) => {
  const order = await Order.findByIdAndUpdate(req.params.id, { rma: req.body }, { new: true, runValidators: true });

  if (!order) {
    res.status(404);
    throw new Error("Order not found");
  }

  res.json(order);
});
