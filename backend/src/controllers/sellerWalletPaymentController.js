import crypto from "crypto";
import Reseller from "../models/Reseller.js";
import Seller from "../models/Seller.js";
import PaymentMethod from "../models/PaymentMethod.js";
import PayuTransaction from "../models/PayuTransaction.js";
import asyncHandler from "../utils/asyncHandler.js";
import { createPayuRequest, verifyPayuPayment } from "../utils/payu.js";

const gateway = async (code) => {
  const method = await PaymentMethod.findOne({ code, type: { $in: ["razorpay", "payu"] }, isActive: true });
  if (!method) throw new Error("Select an active online payment gateway");
  return method;
};
const razorpay = async (method, path, body) => {
  const response = await fetch(`https://api.razorpay.com/v1/${path}`, {
    method: body ? "POST" : "GET",
    headers: { Authorization: `Basic ${Buffer.from(`${method.razorpay.keyId}:${method.razorpay.keySecret}`).toString("base64")}`, "Content-Type": "application/json" },
    ...(body ? { body: JSON.stringify(body) } : {})
  });
  const result = await response.json();
  if (!response.ok) throw new Error("Unable to confirm payment with the gateway. Please retry.");
  return result;
};
export const walletPaymentMethods = asyncHandler(async (_req, res) => {
  const methods = await PaymentMethod.find({ isActive: true, type: { $in: ["razorpay", "payu"] } }).select("code name type");
  res.json(methods);
});
export const createWalletPayment = asyncHandler(async (req, res) => {
  const owner = req.reseller || req.seller;
  const role = req.reseller ? "reseller" : "seller";
  const kind = `${role}-wallet`;
  const amount = Number(req.body.amount);
  if (!Number.isSafeInteger(amount) || amount < 100 || amount > 1000000 || amount % 100 !== 0) { res.status(400); throw new Error("Add at least ₹100, in multiples of ₹100 (maximum ₹10,00,000)"); }
  const method = await gateway(req.body.paymentMethodCode);
  if (method.type === "payu") {
    const txnid = `wallet_${crypto.randomBytes(12).toString("hex")}`;
    await PayuTransaction.create({ txnid, kind, ownerId: owner._id, paymentMethodCode: method.code, amount });
    const callbackUrl = `${req.protocol}://${req.get("host")}/api/storefront/payu/callback?returnUrl=${encodeURIComponent(req.body.returnUrl || req.get("origin") || "")}`;
    return res.json(createPayuRequest({ config: method.payu, txnid, amount, productinfo: `${role === "seller" ? "Seller" : "Reseller"} wallet funding`, firstname: owner.name || owner.fullName || owner.companyName || "Account", email: owner.email, phone: owner.mobile, callbackUrl }));
  }
  const order = await razorpay(method, "orders", { amount: Math.round(amount * 100), currency: "INR", receipt: `wallet_${Date.now()}`, notes: { [`${role}Id`]: String(owner._id), purpose: kind } });
  res.json({ gateway: "razorpay", orderId: order.id, amount: order.amount, currency: order.currency, keyId: method.razorpay.keyId, merchantName: method.name });
});
export const verifyWalletPayment = asyncHandler(async (req, res) => {
  const owner = req.reseller || req.seller;
  const role = req.reseller ? "reseller" : "seller";
  const kind = `${role}-wallet`;
  const Model = req.reseller ? Reseller : Seller;
  let amount, reference, provider;
  if (req.body.payuTxnId) {
    const transaction = await PayuTransaction.findOne({ txnid: req.body.payuTxnId, kind, ownerId: owner._id });
    if (!transaction) { res.status(400); throw new Error("Wallet payment not found"); }
    const method = await gateway(transaction.paymentMethodCode);
    const payment = await verifyPayuPayment({ config: method.payu, txnid: transaction.txnid, expectedAmount: transaction.amount });
    if (payment.unmappedstatus !== "captured") throw new Error("Payment has not been captured. Please retry verification.");
    amount = transaction.amount; reference = transaction.txnid; provider = "payu";
  } else {
    const method = await gateway(req.body.paymentMethodCode);
    if (method.type !== "razorpay") throw new Error("Invalid payment gateway");
    const { razorpay_order_id: orderId, razorpay_payment_id: paymentId, razorpay_signature: signature } = req.body;
    const expected = crypto.createHmac("sha256", method.razorpay.keySecret).update(`${orderId}|${paymentId}`).digest("hex");
    if (typeof signature !== "string" || signature.length !== expected.length || !crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(signature))) throw new Error("Payment signature is invalid");
    const order = await razorpay(method, `orders/${encodeURIComponent(orderId)}`);
    const payment = await razorpay(method, `payments/${encodeURIComponent(paymentId)}`);
    if (order.notes?.[`${role}Id`] !== String(owner._id) || order.notes?.purpose !== kind || payment.order_id !== order.id || payment.status !== "captured" || payment.currency !== "INR" || payment.amount !== order.amount || order.status !== "paid") throw new Error("Wallet payment could not be verified");
    amount = order.amount / 100; reference = order.id; provider = "razorpay";
  }
  if (!Number.isFinite(amount) || amount <= 0) throw new Error("Invalid payment amount");
  // Recording the reference and credit in one atomic update makes retries safe.
  await Model.updateOne({ _id: owner._id, "walletRepayments.reference": { $ne: reference } }, { $inc: { walletBalance: amount }, $push: { walletRepayments: { reference, amount, provider, paidAt: new Date() } } });
  const seller = await Model.findById(owner._id);
  res.json({ walletBalance: seller.walletBalance, message: "Payment received and wallet updated" });
});
