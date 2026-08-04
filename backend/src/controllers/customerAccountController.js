import Cart from "../models/Cart.js";
import Customer from "../models/Customer.js";
import Order from "../models/Order.js";
import Product from "../models/Product.js";
import ShipRocketSetting from "../models/ShipRocketSetting.js";
import asyncHandler from "../utils/asyncHandler.js";
import { storefrontProduct } from "../utils/gstPricing.js";
import { shiprocketToken } from "../services/shiprocketService.js";

const publicCustomer = (customer) => ({ id: customer._id, name: customer.name, email: customer.email, phone: customer.phone || "", gender: customer.gender, status: customer.status, storeCredit: customer.storeCredit, addresses: customer.addresses || [] });

export const getMyCart = asyncHandler(async (req, res) => {
  const cart = await Cart.findOne({ customer: req.customer._id, status: "active" }).populate({ path: "items.product", select: "name sku price offerPrice priceIncludesTax taxCategory mainImage media stock isStockManageable status variants variationOptions", populate: { path: "taxCategory", select: "name code rate" } });
  res.json({ items: cart?.items?.filter((item) => item.product?.status === "active").map((item) => ({ product: storefrontProduct(item.product), variant: item.variantSku ? item.product.variants.find((variant) => variant.sku === item.variantSku) : null, quantity: item.quantity })) || [] });
});

export const saveMyCart = asyncHandler(async (req, res) => {
  const requested = Array.isArray(req.body.items) ? req.body.items : [];
  const ids = requested.map((item) => item.productId).filter(Boolean);
  const products = await Product.find({ _id: { $in: ids }, status: "active" });
  const productMap = new Map(products.map((product) => [String(product._id), product]));
  const items = requested.flatMap((item) => {
    const product = productMap.get(String(item.productId));
    if (!product) return [];
    const variant = item.variantSku ? product.variants.find((entry) => entry.sku === item.variantSku) : null;
    return [{ product: product._id, name: product.name, sku: variant?.sku || product.sku, variantSku: variant?.sku, variantAttributes: variant?.attributes, quantity: Math.max(1, Number(item.quantity) || 1), price: Number(variant?.price ?? product.offerPrice ?? product.price) }];
  });
  const cart = await Cart.findOneAndUpdate(
    { customer: req.customer._id, status: "active" },
    { $set: { email: req.customer.email, items, lastActivityAt: new Date() } },
    { new: true, upsert: true, runValidators: true, setDefaultsOnInsert: true }
  );
  res.json({ itemCount: cart.items.reduce((sum, item) => sum + item.quantity, 0) });
});

export const getMyAccount = asyncHandler(async (req, res) => res.json({ customer: publicCustomer(req.customer) }));

export const updateMyProfile = asyncHandler(async (req, res) => {
  const { name, phone, gender } = req.body;
  if (!String(name || "").trim()) { res.status(400); throw new Error("Name is required"); }
  if (gender && !["male", "female", "other", "prefer_not_to_say"].includes(gender)) { res.status(400); throw new Error("Select a valid gender"); }
  req.customer.name = String(name).trim();
  req.customer.phone = String(phone || "").trim();
  if (gender) req.customer.gender = gender;
  await req.customer.save();
  res.json({ customer: publicCustomer(req.customer) });
});

export const saveMyAddresses = asyncHandler(async (req, res) => {
  const addresses = Array.isArray(req.body.addresses) ? req.body.addresses : [];
  for (const address of addresses) {
    if (!address.label || !address.line1 || !address.city || !address.state || !address.postalCode || !address.country) { res.status(400); throw new Error("Every address field is required"); }
  }
  let defaultAssigned = false;
  req.customer.addresses = addresses.map(({ label, line1, city, state, postalCode, country, isDefault }) => {
    const makeDefault = Boolean(isDefault) && !defaultAssigned;
    if (makeDefault) defaultAssigned = true;
    return { label, line1, city, state, postalCode, country, isDefault: makeDefault };
  });
  await req.customer.save();
  res.json({ customer: publicCustomer(req.customer) });
});

export const listMyOrders = asyncHandler(async (req, res) => {
  const page = Math.max(1, Number.parseInt(req.query.page, 10) || 1);
  const limit = Math.min(5, Math.max(1, Number.parseInt(req.query.limit, 10) || 5));
  const filter = { customer: req.customer._id };
  const [orders, total] = await Promise.all([
    Order.find(filter).populate("items.product", "mainImage media name").populate("items.seller", "companyName sellerNumber").sort({ createdAt: -1 }).skip((page - 1) * limit).limit(limit),
    Order.countDocuments(filter)
  ]);
  res.json({ items: orders, pagination: { page, limit, total, pages: Math.max(1, Math.ceil(total / limit)) } });
});

export const trackMyOrder = asyncHandler(async (req, res) => {
  const order = await Order.findOne({ _id: req.params.orderId, customer: req.customer._id });
  if (!order) { res.status(404); throw new Error("Order not found"); }
  const awb = order.shipping?.awbCode || order.fulfillment?.trackingNumber;
  if (!awb) return res.json({ awb: "", activities: order.timeline || [], source: "order" });
  const settings = await ShipRocketSetting.findOne({ singleton: "shiprocket", isActive: true });
  if (!settings) return res.json({ awb, activities: order.timeline || [], source: "order" });
  const token = await shiprocketToken(settings);
  const response = await fetch(`https://apiv2.shiprocket.in/v1/external/courier/track/awb/${encodeURIComponent(awb)}`, { headers: { Accept: "application/json", Authorization: `Bearer ${token}` } });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) { res.status(502); throw new Error(data.message || "Unable to fetch Shiprocket tracking"); }
  const tracking = data.tracking_data || data;
  res.json({ awb, currentStatus: tracking.shipment_status || tracking.track_status || order.status, activities: tracking.shipment_track_activities || tracking.shipment_track || order.timeline || [], source: "shiprocket" });
});

export const requestItemReturn = asyncHandler(async (req, res) => {
  const order = await Order.findOne({ _id: req.params.orderId, customer: req.customer._id, "items.product": req.params.productId });
  if (!order) { res.status(404); throw new Error("Ordered item was not found"); }
  const item = order.items.find((entry) => String(entry.product) === String(req.params.productId));
  if (!item.returnApplicable || !item.returnDays) { res.status(409); throw new Error("This product is not returnable"); }
  if (item.sellerStatus !== "Delivered" && order.status !== "Delivered") { res.status(409); throw new Error("A return can only be requested after delivery"); }
  const deliveredAt = item.deliveredAt || order.fulfillment?.deliveredAt || order.updatedAt;
  const deadline = new Date(deliveredAt.getTime() + Number(item.returnDays) * 24 * 60 * 60 * 1000);
  if (deadline < new Date()) { res.status(409); throw new Error(`The ${item.returnDays}-day return window has expired`); }
  if (["Requested", "Approved", "Pickup Arranged", "Received", "Closed"].includes(item.returnRequest?.status)) { res.status(409); throw new Error("A return request already exists for this item"); }
  const reason = String(req.body.reason || "").trim();
  if (!reason) { res.status(400); throw new Error("Select or enter a return reason"); }
  item.returnRequest = { reason, comments: String(req.body.comments || "").trim(), status: "Requested", requestedAt: new Date() };
  item.sellerStatus = "Return Requested";
  item.sellerStatusUpdatedAt = new Date();
  order.timeline.push({ status: "Return Requested", title: `Return requested for ${item.name}`, comment: reason, details: String(req.body.comments || "").trim() || "Customer return request" });
  await order.save();
  res.status(201).json(order);
});
