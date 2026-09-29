import Order from "../models/Order.js";
import ShipRocketSetting from "../models/ShipRocketSetting.js";
import { shiprocketToken, shiprocketErrorMessage } from "./shiprocketService.js";

const apiBase = "https://apiv2.shiprocket.in/v1/external";
export const shiprocketRequest = async (token, path, body) => {
  const response = await fetch(`${apiBase}/${path}`, {
    method: body ? "POST" : "GET", signal: AbortSignal.timeout(30000),
    headers: { Accept: "application/json", "Content-Type": "application/json", Authorization: `Bearer ${token}` },
    ...(body ? { body: JSON.stringify(body) } : {})
  });
  let data = await response.json().catch(() => ({}));
  if (typeof data === "string") { try { data = JSON.parse(data); } catch { throw new Error("ShipRocket returned an invalid response"); } }
  if (!data || typeof data !== "object") throw new Error("ShipRocket returned an invalid response");
  if (!response.ok || data.errors || data.status_code >= 400 || data.success === false || data.status === false) {
    const error = new Error(shiprocketErrorMessage(data, "ShipRocket request failed"));
    error.statusCode = Number(data.status_code) || response.status;
    error.shiprocketPath = path;
    throw error;
  }
  return data;
};

const localStatus = (status) => {
  const value = String(status || "").trim().toUpperCase();
  if (value.startsWith("RTO")) return "RTO";
  if (value === "DELIVERED") return "Delivered";
  if (value === "OUT FOR DELIVERY") return "Out for Delivery";
  if (["SHIPPED", "PICKED UP", "IN TRANSIT", "REACHED AT DESTINATION HUB"].includes(value)) return "Shipped";
  if (["CANCELED", "CANCELLED"].includes(value)) return "Cancelled";
  return null;
};
const carrierDate = value => {
  if (!value || String(value).startsWith("0000")) return null;
  const normalized = /^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}$/.test(value) ? value.replace(" ", "T") + "+05:30" : value;
  const date = new Date(normalized);
  return Number.isNaN(date.getTime()) ? null : date;
};

export const applyShiprocketTracking = (order, tracking, now = new Date()) => {
  const shipment = tracking.shipment_track?.[0];
  if (Number(tracking.track_status) === 0 || !shipment?.current_status) throw new Error(tracking.error || "ShipRocket tracking is not available yet. Try again after pickup is scheduled.");
  const status = localStatus(shipment.current_status);
  const previous = order.shipping?.carrierStatus;
  const deliveredAt = carrierDate(shipment.delivered_date);
  const events = (tracking.shipment_track_activities || []).slice(0, 100).map(event => ({ date: event.date, activity: event.activity, location: event.location, status: event["sr-status-label"] || event.status }));
  order.shipping = { ...order.shipping, carrierStatus: shipment.current_status, carrierStatusId: String(tracking.shipment_status ?? ""), trackingSyncedAt: now, trackingSyncError: "", trackingEvents: events, estimatedDelivery: carrierDate(tracking.etd || shipment.edd), trackingUrl: tracking.track_url || order.shipping?.trackingUrl };
  const protectedStatuses = ["Completed", "Return Requested", "Return Approved", "Return Rejected", "Returned", "Cancelled", "RTO"];
  for (const item of order.items || []) {
    if (!status || protectedStatuses.includes(item.sellerStatus) || (item.sellerStatus === "Delivered" && status !== "Delivered")) continue;
    if (item.sellerStatus === "Out for Delivery" && status === "Shipped") continue;
    if (item.sellerStatus !== status) { item.sellerStatus = status; item.sellerStatusUpdatedAt = now; }
    if (status === "Delivered" && !item.deliveredAt) {
      item.deliveredAt = deliveredAt || now;
      item.returnWindowClosesAt = new Date(new Date(item.deliveredAt).getTime() + (item.returnApplicable ? Number(item.returnDays || 0) : 0) * 86400000);
    }
  }
  if (status && !protectedStatuses.includes(order.status) && !(order.status === "Delivered" && status !== "Delivered") && !(order.status === "Out for Delivery" && status === "Shipped")) order.status = status;
  if (status === "Delivered" && !order.fulfillment?.deliveredAt) order.fulfillment = { ...order.fulfillment, deliveredAt: deliveredAt || now };
  if (previous !== shipment.current_status) {
    order.timeline ||= [];
    order.timeline.push({ status: status || order.status, title: `ShipRocket: ${shipment.current_status}`, comment: events[0]?.activity || shipment.current_status, details: events[0]?.location || "", createdAt: now });
  }
  return order;
};

export const refreshShiprocketTracking = async (order, token) => {
  if (!order.shipping?.shipmentId) throw new Error("Send this order to ShipRocket before syncing its status");
  const owners = new Set((order.items || []).map(item => String(item.seller || "admin")));
  if (owners.size > 1) throw new Error("This legacy shipment contains multiple pickup owners; review it before syncing item statuses");
  const data = await shiprocketRequest(token, `courier/track/shipment/${encodeURIComponent(order.shipping.shipmentId)}`);
  applyShiprocketTracking(order, data.tracking_data || data.data?.tracking_data || {});
  await order.save();
  return order;
};

let syncing = false;
export const synchronizeShiprocketOrders = async () => {
  if (syncing) return;
  syncing = true;
  try {
    const settings = await ShipRocketSetting.findOne({ singleton: "shiprocket", isActive: true });
    if (!settings) return;
    const orders = await Order.find({ "shipping.shipmentId": { $exists: true, $nin: [null, ""] }, "shipping.carrierStatus": { $nin: ["DELIVERED", "Delivered", "RTO DELIVERED", "RTO Delivered", "CANCELED", "CANCELLED"] }, $or: [{ "shipping.trackingAttemptedAt": { $exists: false } }, { "shipping.trackingAttemptedAt": { $lt: new Date(Date.now() - 15 * 60000) } }] }).sort({ "shipping.trackingAttemptedAt": 1 }).limit(100);
    if (!orders.length) return;
    const token = await shiprocketToken(settings);
    for (const order of orders) {
      try {
        order.shipping.trackingAttemptedAt = new Date();
        await refreshShiprocketTracking(order, token);
      } catch (error) {
        await Order.updateOne({ _id: order._id }, { $set: { "shipping.trackingAttemptedAt": new Date(), "shipping.trackingSyncError": error.message } });
      }
    }
  } finally { syncing = false; }
};

export const generateShiprocketDocument = async (order, token, kind) => {
  const config = {
    label: ["courier/generate/label", "label_url", "labelUrl", { shipment_id: [Number(order.shipping?.shipmentId)] }],
    invoice: ["orders/print/invoice", "invoice_url", "invoiceUrl", { ids: [Number(order.shipping?.shiprocketOrderId)] }],
    manifest: ["manifests/generate", "manifest_url", "manifestUrl", { shipment_id: [Number(order.shipping?.shipmentId)] }]
  }[kind];
  if (!config) throw new Error("Choose a shipping label, invoice, or manifest");
  if (!order.shipping?.shipmentId || (kind === "invoice" && !order.shipping?.shiprocketOrderId)) throw new Error("Create the ShipRocket shipment before downloading documents");
  const [path, responseKey, savedKey, body] = config;
  const data = await shiprocketRequest(token, path, body);
  const url = data[responseKey] || data.data?.[responseKey];
  if (!url) throw new Error(shiprocketErrorMessage(data, `ShipRocket has not made the ${kind} available yet. Try again shortly.`));
  order.shipping[savedKey] = url;
  await order.save();
  return url;
};
