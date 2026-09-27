import Order from "../models/Order.js";
import Product from "../models/Product.js";
import ShipRocketSetting from "../models/ShipRocketSetting.js";
import asyncHandler from "../utils/asyncHandler.js";
import { shiprocketToken } from "../services/shiprocketService.js";
import { refreshShiprocketTracking, generateShiprocketDocument } from "../services/shiprocketTrackingService.js";

export const getAuthorizedShipment = async (req, res) => {
  const order = await Order.findById(req.params.id || req.params.orderId);
  if (!order) { res.status(404); throw new Error("Order not found"); }
  // One order-level shipment must never expose another seller's documents.
  if (req.seller) {
    const products = await Product.find({ _id: { $in: order.items.map(item => item.product) } }).select("seller");
    const owners = new Map(products.map(product => [String(product._id), String(product.seller || "")]));
    if (!order.items.length || order.items.some(item => String(item.seller || owners.get(String(item.product)) || "") !== String(req.seller._id))) {
      res.status(404); throw new Error("Seller shipment not found");
    }
  }
  if (!order.shipping?.shipmentId) { res.status(409); throw new Error("Send this order to ShipRocket first"); }
  return order;
};
const getToken = async (res) => {
  const settings = await ShipRocketSetting.findOne({ singleton: "shiprocket", isActive: true });
  if (!settings) { res.status(503); throw new Error("ShipRocket is not configured or is inactive"); }
  return shiprocketToken(settings);
};
export const syncShipmentStatus = asyncHandler(async (req, res) => {
  const order = await getAuthorizedShipment(req, res);
  try {
    const token = await getToken(res);
    order.shipping.trackingAttemptedAt = new Date();
    await refreshShiprocketTracking(order, token);
  } catch (error) { if (res.statusCode < 400) res.status(502); throw error; }
  res.json(order);
});

export const downloadShipmentDocument = asyncHandler(async (req, res) => {
  if (!["label", "invoice", "manifest"].includes(req.params.kind)) { res.status(400); throw new Error("Invalid shipping document"); }
  const order = await getAuthorizedShipment(req, res);
  try {
    const token = await getToken(res);
    const url = new URL(await generateShiprocketDocument(order, token, req.params.kind));
    const allowed = ["shiprocket.in", "shiprocket.co", "amazonaws.com", "cloudfront.net"].some(host => url.hostname === host || url.hostname.endsWith(`.${host}`));
    if (url.protocol !== "https:" || !allowed || url.username || url.password) throw new Error("ShipRocket returned an unsupported document URL");
    const response = await fetch(url, { signal: AbortSignal.timeout(30000), redirect: "error" });
    if (!response.ok) throw new Error("Unable to download the ShipRocket document. Please retry.");
    const chunks = [];
    let size = 0;
    for await (const chunk of response.body) {
      size += chunk.length;
      if (size > 20 * 1024 * 1024) throw new Error("Shipping document exceeds the download size limit");
      chunks.push(chunk);
    }
    const buffer = Buffer.concat(chunks);
    if (!buffer.subarray(0, 5).equals(Buffer.from("%PDF-"))) throw new Error("ShipRocket did not return a PDF document. Please retry.");
    res.set?.("Cache-Control", "no-store");
    res.json({ filename: `${String(order.orderNumber).replace(/[^a-zA-Z0-9_-]/g, "_")}-${req.params.kind}.pdf`, contentType: "application/pdf", data: buffer.toString("base64") });
  } catch (error) { if (res.statusCode < 400) res.status(502); throw error; }
});
