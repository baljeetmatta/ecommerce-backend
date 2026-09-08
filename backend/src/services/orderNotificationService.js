import User from "../models/User.js";
import Seller from "../models/Seller.js";
import Reseller from "../models/Reseller.js";
import { sendEmail } from "../utils/email.js";

// Email failures must not turn a successfully placed order into a checkout error.
export async function notifyNewOrder(order) {
  try {
    const [admins, sellers, reseller] = await Promise.all([
      User.find({ role: "Super Admin", isActive: true }).select("email").lean(),
      Seller.find({ _id: { $in: order.items.map(item => item.seller?._id || item.seller).filter(Boolean) } }).select("email").lean(),
      order.resellerAttribution?.reseller ? Reseller.findById(order.resellerAttribution.reseller).select("email").lean() : null
    ]);
    const recipients = [...new Set([...admins, ...sellers, reseller].filter(Boolean).map(account => account.email?.trim().toLowerCase()).filter(Boolean))];
    const results = await Promise.allSettled(recipients.map(to => sendEmail({ to, subject: `New HRSBasket order ${order.orderNumber}`, text: `A new order has been placed.\n\nOrder: ${order.orderNumber}\nPayment: ${order.paymentStatus}\nItems: ${order.items.map(item => `${item.name} × ${item.quantity}`).join(", ")}\n\nSign in to your HRSBasket panel to review the order.` })));
    results.forEach(result => { if (result.status === "rejected") console.error(`New-order email failed for ${order.orderNumber}:`, result.reason?.message); });
  } catch (error) { console.error(`New-order notification failed for ${order.orderNumber}:`, error.message); }
}
