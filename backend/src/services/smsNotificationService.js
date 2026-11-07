import Customer from "../models/Customer.js";
import Fast2SmsSetting from "../models/Fast2SmsSetting.js";
import Reseller from "../models/Reseller.js";
import Seller from "../models/Seller.js";
import { sendFast2Sms } from "./fast2SmsService.js";

const logSmsFailure = (event, error) => {
  console.error(`${event} SMS failed:`, error.message);
};

const getEnabledSmsEvent = async event => {
  const setting = await Fast2SmsSetting.findOne({ singleton: "fast2sms" }).select("isActive events");
  return Boolean(setting?.isActive && setting.events?.[event]);
};

export async function notifyRegistrationSms({ to, name, accountType }) {
  if (!to) return;
  const recipientName = String(name || "there").replace(/\s+/g, " ").trim().slice(0, 60);
  const message = accountType === "customer"
    ? `Hello ${recipientName}, your HRSBasket account was created. Verify your email to activate it.`
    : `Hello ${recipientName}, your HRSBasket ${accountType} registration is complete. Welcome to HRSBasket.`;
  try {
    if (!await getEnabledSmsEvent("registration")) return;
    await sendFast2Sms({
      to,
      message
    });
  } catch (error) {
    logSmsFailure(`${accountType} registration`, error);
  }
}

const id = value => String(value?._id || value || "");

export async function notifyOrderSms(order) {
  try {
    if (!await getEnabledSmsEvent("orders")) return;

    const customerId = id(order.customer);
    const sellerIds = [...new Set((order.items || []).map(item => id(item.seller)).filter(Boolean))];
    const [customer, sellers, reseller] = await Promise.all([
      order.customer?.phone ? order.customer : Customer.findById(customerId).select("name phone").lean(),
      sellerIds.length
        ? Seller.find({ _id: { $in: sellerIds } }).select("name companyName mobile").lean()
        : [],
      order.resellerAttribution?.reseller
        ? Reseller.findById(order.resellerAttribution.reseller).select("fullName mobile").lean()
        : null
    ]);

    const orderNumber = order.orderNumber || "your order";
    const amount = Number(order.grandTotal || 0).toFixed(2);
    const notifications = [];
    if (customer?.phone || order.address?.phone) {
      notifications.push({
        event: "Customer order",
        to: customer?.phone || order.address.phone,
        message: `HRSBasket: Your order ${orderNumber} is placed. Order total: Rs. ${amount}. Thank you for shopping with us.`
      });
    }

    const sellerById = new Map(sellers.map(seller => [id(seller), seller]));
    for (const sellerId of sellerIds) {
      const seller = sellerById.get(sellerId);
      if (!seller?.mobile) continue;
      const itemCount = order.items.filter(item => id(item.seller) === sellerId)
        .reduce((sum, item) => sum + Number(item.quantity || 0), 0);
      notifications.push({
        event: "Seller new order",
        to: seller.mobile,
        message: `HRSBasket: New order ${orderNumber} includes ${itemCount} item(s) for your store. Please review it in your seller account.`
      });
    }
    if (reseller?.mobile) {
      notifications.push({
        event: "Reseller new order",
        to: reseller.mobile,
        message: `HRSBasket: New order ${orderNumber} was placed through your reseller account. Please review it in your account.`
      });
    }

    const results = await Promise.allSettled(notifications.map(({ to, message }) => sendFast2Sms({ to, message })));
    results.forEach((result, index) => {
      if (result.status === "rejected") {
        logSmsFailure(`${notifications[index].event} for ${orderNumber}`, result.reason);
      }
    });
  } catch (error) {
    logSmsFailure(`New order ${order.orderNumber || ""}`, error);
  }
}

const isOrderComplete = order =>
  order.status === "Delivered" ||
  (order.items?.length > 0 && order.items.every(item => ["Delivered", "Completed"].includes(item.sellerStatus)));

const sendOrderCustomerSms = async (order, event, message) => {
  if (!await getEnabledSmsEvent(event)) return;
  const customer = order.customer?.phone
    ? order.customer
    : order.customer
      ? await Customer.findById(id(order.customer)).select("phone").lean()
      : null;
  const to = customer?.phone || order.address?.phone;
  if (!to) return;
  await sendFast2Sms({ to, message });
};

export async function notifyOrderStatusSms(order, previousStatus, newStatus) {
  if (!newStatus || previousStatus === newStatus) return;
  const orderNumber = order.orderNumber || "your order";
  try {
    if (isOrderComplete(order)) {
      if (await getEnabledSmsEvent("orderCompletion")) {
        await sendOrderCustomerSms(
          order,
          "orderCompletion",
          `HRSBasket: Order ${orderNumber} is complete. Thank you for shopping with us.`
        );
        return;
      }
    }
    await sendOrderCustomerSms(
      order,
      "orderStatusChange",
      `HRSBasket: Order ${orderNumber} status is now ${newStatus}.`
    );
  } catch (error) {
    logSmsFailure(`Order status change for ${orderNumber}`, error);
  }
}

export async function notifyWithdrawalSms({ to, name, accountType, amount }) {
  if (!to) return;
  try {
    if (!await getEnabledSmsEvent("sellerResellerWithdrawal")) return;
    const recipientName = String(name || "there").replace(/\s+/g, " ").trim().slice(0, 60);
    await sendFast2Sms({
      to,
      message: `Hello ${recipientName}, your ${accountType} withdrawal request for Rs. ${Number(amount).toFixed(2)} has been received by HRSBasket.`
    });
  } catch (error) {
    logSmsFailure(`${accountType} withdrawal`, error);
  }
}
