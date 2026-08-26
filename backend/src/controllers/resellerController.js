import crypto from "crypto";
import asyncHandler from "../utils/asyncHandler.js";
import { sendEmail } from "../utils/email.js";
import Order from "../models/Order.js";
import Product from "../models/Product.js";
import Reseller from "../models/Reseller.js";
import ResellerLink from "../models/ResellerLink.js";
import ResellerRegistrationOtp from "../models/ResellerRegistrationOtp.js";
import ResellerWithdrawal from "../models/ResellerWithdrawal.js";
import Customer from "../models/Customer.js";
import { createToken } from "../utils/token.js";
import { readTaxVerificationToken } from "../services/gstVerificationService.js";
import WorkAssignment from "../models/WorkAssignment.js";

const otpHash = (value) => crypto.createHash("sha256").update(String(value)).digest("hex");
const money = (value) => Number(Number(value || 0).toFixed(2));
const publicProduct = (product) => ({ _id: product._id, name: product.name, shortDescription: product.shortDescription, mainImage: product.imageVariants?.detail || product.mainImage, resellerPricing: { enabled: product.resellerPricing?.enabled, basePrice: product.resellerPricing?.basePrice, minimumSellingPrice: product.resellerPricing?.minimumSellingPrice, maximumMargin: product.resellerPricing?.maximumMargin, maximumCustomerPrice: product.resellerPricing?.maximumCustomerPrice } });
const publicCustomer = (customer) => ({ id: customer._id, name: customer.name, email: customer.email, status: customer.status, gender: customer.gender, phone: customer.phone || "" });

export const quickRegister = asyncHandler(async (req, res) => {
  const fullName = String(req.body.fullName || "").trim();
  const businessName = String(req.body.businessName || "").trim();
  const mobile = String(req.body.mobile || "").replace(/\D/g, "");
  const email = String(req.body.email || "").trim().toLowerCase();
  const password = String(req.body.password || "");
  const confirmPassword = String(req.body.confirmPassword || "");
  const gstStatus = req.body.gstStatus === "gst" ? "gst" : "non-gst";
  const gstin = String(req.body.gstin || "").trim().toUpperCase();
  const gstVerification = gstStatus === "gst" ? readTaxVerificationToken(req.body.taxVerificationToken, "gstin", gstin) : null;
  if (!fullName || !businessName || !/^\d{10}$/.test(mobile) || !/^\S+@\S+\.\S+$/.test(email)) { res.status(400); throw new Error("Enter your name, business name, valid mobile number and email"); }
  if (!/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z0-9]).{8,}$/.test(password)) { res.status(400); throw new Error("Password must be at least 8 characters and include uppercase, lowercase, number, and special character"); }
  if (password !== confirmPassword) { res.status(400); throw new Error("Password and confirm password do not match"); }
  if (!req.body.termsAccepted) { res.status(400); throw new Error("Accept the terms and privacy policy"); }
  if (gstStatus === "gst" && !gstVerification) { res.status(400); throw new Error("Verify the GSTIN before registration"); }
  if (gstStatus === "gst" && !String(req.body.gstCertificate || "").trim()) { res.status(400); throw new Error("Upload the GST certificate before registration"); }
  if (await Customer.exists({ email })) { res.status(409); throw new Error("Email is already registered. Please login instead."); }
  const customer = await Customer.create({ name: fullName, email, password, phone: mobile, gender: "prefer_not_to_say" });
  try {
    const resellerId = `HRR${Date.now().toString().slice(-8)}${crypto.randomInt(10, 100)}`;
    const reseller = await Reseller.create({ customer: customer._id, resellerId, fullName, businessName: gstVerification?.tradeName || gstVerification?.legalName || businessName, mobile, email, gstStatus, gstin: gstStatus === "gst" ? gstin : undefined, gstLegalName: gstVerification?.legalName, gstState: gstVerification?.state || req.body.gstState, gstCertificate: gstStatus === "gst" ? req.body.gstCertificate : undefined, gstVerificationStatus: gstStatus === "gst" ? (gstVerification?.verificationMode === "provider" ? "verified" : "pending") : "not_registered", termsAcceptedAt: new Date(), status: "pending" });
    res.status(201).json({ reseller, customer: publicCustomer(customer), token: createToken({ _id: customer._id, role: "Customer" }) });
  } catch (error) { await Customer.deleteOne({ _id: customer._id }); throw error; }
});

const synchronizeEarnings = async (resellerId) => {
  const now = new Date();
  const orders = await Order.find({ "resellerAttribution.reseller": resellerId, "resellerAttribution.status": { $in: ["pending", "hold"] } });
  await Promise.all(orders.map(async (order) => {
    const returned = ["Returned", "RTO"].includes(order.status) || order.items.some((item) => ["Returned", "RTO", "Return Approved"].includes(item.sellerStatus));
    const cancelled = order.status === "Cancelled" || order.items.every((item) => item.sellerStatus === "Cancelled");
    const returnRequested = order.items.some((item) => item.sellerStatus === "Return Requested" || item.returnRequest?.status === "Requested");
    if (returned || cancelled) { order.resellerAttribution.status = "cancelled"; order.resellerAttribution.finalEarning = 0; }
    else if (returnRequested) order.resellerAttribution.status = "hold";
    else if (order.status === "Delivered") {
      const closeDates = order.items.map((item) => item.returnWindowClosesAt).filter(Boolean).map((date) => new Date(date));
      const availableAt = closeDates.length ? new Date(Math.max(...closeDates)) : order.resellerAttribution.availableAt;
      if (availableAt && availableAt <= now) { order.resellerAttribution.status = "available"; order.resellerAttribution.finalEarning = order.resellerAttribution.earning; }
    }
    return order.save();
  }));
};

export const requestRegistrationOtp = asyncHandler(async (req, res) => {
  if (await Reseller.exists({ customer: req.customer._id })) { res.status(409); throw new Error("This customer already has a reseller account"); }
  const recent = await ResellerRegistrationOtp.findOne({ customer: req.customer._id, createdAt: { $gt: new Date(Date.now() - 60000) } }).sort({ createdAt: -1 });
  if (recent) { res.status(429); throw new Error("Please wait before requesting another OTP"); }
  const code = String(crypto.randomInt(100000, 1000000));
  const challenge = await ResellerRegistrationOtp.create({ customer: req.customer._id, email: req.customer.email, codeHash: otpHash(code), expiresAt: new Date(Date.now() + 10 * 60000) });
  await sendEmail({ to: req.customer.email, subject: "Verify your HRSBasket reseller account", text: `Your HRSBasket reseller verification OTP is ${code}. It expires in 10 minutes.` });
  res.json({ challengeId: challenge._id, message: `OTP sent to ${req.customer.email}` });
});

export const register = asyncHandler(async (req, res) => {
  const challenge = await ResellerRegistrationOtp.findOne({ _id: req.body.challengeId, customer: req.customer._id, expiresAt: { $gt: new Date() }, verifiedAt: null });
  if (!challenge || challenge.attempts >= 5 || challenge.codeHash !== otpHash(req.body.otp)) {
    if (challenge) { challenge.attempts += 1; await challenge.save(); }
    res.status(400); throw new Error("The OTP is invalid or expired");
  }
  if (!req.body.termsAccepted) { res.status(400); throw new Error("Accept the reseller terms and conditions"); }
  const resellerId = `HRR${Date.now().toString().slice(-8)}${crypto.randomInt(10, 100)}`;
  const reseller = await Reseller.create({ customer: req.customer._id, resellerId, fullName: req.body.fullName || req.customer.name, mobile: req.body.mobile, email: req.customer.email, address: req.body.address, pan: req.body.pan, gstStatus: req.body.gstStatus, gstin: req.body.gstin, paymentDetails: req.body.paymentDetails, kyc: req.body.kyc, termsAcceptedAt: new Date() });
  challenge.verifiedAt = new Date(); await challenge.save();
  res.status(201).json(reseller);
});

export const me = asyncHandler(async (req, res) => res.json(req.reseller));
export const products = asyncHandler(async (_req, res) => res.json((await Product.find({ status: "active", "resellerPricing.enabled": true }).select("name shortDescription mainImage imageVariants resellerPricing")).map(publicProduct)));

export const createLink = asyncHandler(async (req, res) => {
  const product = await Product.findOne({ _id: req.body.productId, status: "active", "resellerPricing.enabled": true });
  if (!product) { res.status(404); throw new Error("This product is not available for reselling"); }
  const margin = money(req.body.margin);
  const config = product.resellerPricing;
  const customerPrice = money(Number(config.basePrice) + margin);
  if (margin < 0 || margin > Number(config.maximumMargin)) { res.status(400); throw new Error(`Maximum allowed margin is ₹${config.maximumMargin}`); }
  if (customerPrice < Number(config.minimumSellingPrice) || customerPrice > Number(config.maximumCustomerPrice)) { res.status(400); throw new Error("The resulting customer price is outside the administrator's allowed range"); }
  const existing = await ResellerLink.findOne({ reseller: req.reseller._id, product: product._id, margin });
  const link = existing || await ResellerLink.create({ code: crypto.randomBytes(8).toString("base64url"), reseller: req.reseller._id, product: product._id, margin, customerPrice });
  const origin = String(process.env.CLIENT_URL || "https://hrsbasket.com").split(",")[0].replace(/\/+$/, "");
  res.status(existing ? 200 : 201).json({ ...link.toObject(), url: `${origin}/#/resell/${link.code}` });
});

export const resolveLink = asyncHandler(async (req, res) => {
  const link = await ResellerLink.findOneAndUpdate({ code: req.params.code, isActive: true }, { $inc: { clicks: 1 } }, { new: true }).populate("product", "name shortDescription mainImage imageVariants status resellerPricing");
  if (!link || link.product?.status !== "active" || !link.product?.resellerPricing?.enabled) { res.status(404); throw new Error("This reseller link is unavailable"); }
  res.json({ code: link.code, product: { _id: link.product._id, name: link.product.name, shortDescription: link.product.shortDescription, mainImage: link.product.imageVariants?.detail || link.product.mainImage, price: link.customerPrice }, customerPrice: link.customerPrice });
});

export const links = asyncHandler(async (req, res) => res.json(await ResellerLink.find({ reseller: req.reseller._id }).populate("product", "name mainImage imageVariants").sort({ createdAt: -1 })));
export const orders = asyncHandler(async (req, res) => { await synchronizeEarnings(req.reseller._id); res.json(await Order.find({ "resellerAttribution.reseller": req.reseller._id }).select("orderNumber items.name items.quantity status grandTotal resellerAttribution createdAt").sort({ createdAt: -1 })); });
export const dashboard = asyncHandler(async (req, res) => {
  await synchronizeEarnings(req.reseller._id);
  const rows = await Order.find({ "resellerAttribution.reseller": req.reseller._id }).select("status resellerAttribution");
  const sum = (status) => money(rows.filter((row) => status.includes(row.resellerAttribution.status)).reduce((total, row) => total + Number(row.resellerAttribution.finalEarning || row.resellerAttribution.earning || 0), 0));
  res.json({ reseller: req.reseller, totalOrders: rows.length, deliveredOrders: rows.filter((row) => row.status === "Delivered").length, returnedRto: rows.filter((row) => ["Returned", "RTO", "Cancelled"].includes(row.status)).length, totalEarnings: sum(["pending", "hold", "available", "withdrawal_pending", "paid"]), pendingEarnings: sum(["pending", "hold", "withdrawal_pending"]), availableEarnings: sum(["available"]), paidEarnings: sum(["paid"]) });
});

export const withdrawals = asyncHandler(async (req, res) => { await synchronizeEarnings(req.reseller._id); res.json(await ResellerWithdrawal.find({ reseller: req.reseller._id }).sort({ createdAt: -1 })); });
export const requestWithdrawal = asyncHandler(async (req, res) => {
  await synchronizeEarnings(req.reseller._id);
  const available = await Order.find({ "resellerAttribution.reseller": req.reseller._id, "resellerAttribution.status": "available" });
  const balance = money(available.reduce((sum, order) => sum + Number(order.resellerAttribution.finalEarning || order.resellerAttribution.earning), 0));
  const amount = money(req.body.amount);
  if (amount <= 0 || amount > balance) { res.status(400); throw new Error(`Withdrawal amount cannot exceed available earnings of ₹${balance}`); }
  const selected = []; let allocated = 0;
  for (const order of available) { if (allocated >= amount) break; selected.push(order); allocated += Number(order.resellerAttribution.finalEarning || order.resellerAttribution.earning); }
  if (money(allocated) !== amount) { res.status(400); throw new Error("Withdraw the exact total of one or more available order earnings"); }
  const orderIds = selected.map((order) => order._id);
  const withdrawal = await ResellerWithdrawal.create({ reseller: req.reseller._id, amount, orders: orderIds });
  await Order.updateMany({ _id: { $in: orderIds } }, { $set: { "resellerAttribution.status": "withdrawal_pending" } });
  res.status(201).json(withdrawal);
});

export const adminList = asyncHandler(async (req, res) => { const filter = {}; if (["Staff", "Team Leader"].includes(req.user.role)) { const scope = req.user.role === "Team Leader" ? { teamLeader: req.user._id } : { staff: req.user._id }; filter._id = { $in: await WorkAssignment.find({ ...scope, entityType: "Reseller", active: true }).distinct("entity") }; } res.json(await Reseller.find(filter).populate("customer", "name email phone status").sort({ createdAt: -1 })); });
export const adminDetails = asyncHandler(async (req, res) => { if (["Staff", "Team Leader"].includes(req.user.role)) { const scope = req.user.role === "Team Leader" ? { teamLeader: req.user._id } : { staff: req.user._id }; if (!await WorkAssignment.exists({ ...scope, entityType: "Reseller", entity: req.params.id, active: true })) { res.status(403); throw new Error("This reseller is not assigned to you"); } } const reseller = await Reseller.findById(req.params.id).populate("customer", "name email phone status createdAt").lean(); if (!reseller) { res.status(404); throw new Error("Reseller not found"); } const [assignments, links, orders, withdrawals] = await Promise.all([WorkAssignment.find({ entityType: "Reseller", entity: reseller._id, active: true }).populate("team teamLeader staff", "name employeeCode role"), ResellerLink.find({ reseller: reseller._id }).populate("product", "name mainImage").sort({ createdAt: -1 }), Order.find({ "resellerAttribution.reseller": reseller._id }).select("orderNumber status grandTotal resellerAttribution createdAt").sort({ createdAt: -1 }), ResellerWithdrawal.find({ reseller: reseller._id }).sort({ createdAt: -1 })]); res.json({ reseller, assignments, links, orders, withdrawals }); });
export const adminReview = asyncHandler(async (req, res) => { if (["Staff", "Team Leader"].includes(req.user.role)) { const scope = req.user.role === "Team Leader" ? { teamLeader: req.user._id } : { staff: req.user._id }; if (!await WorkAssignment.exists({ ...scope, entityType: "Reseller", entity: req.params.id, action: { $in: ["kyc", "registration"] }, active: true })) { res.status(403); throw new Error("KYC or registration permission is required for this reseller"); } } const reseller = await Reseller.findByIdAndUpdate(req.params.id, { status: req.body.status, "kyc.status": req.body.kycStatus, "kyc.note": req.body.note }, { new: true, runValidators: true }); if (!reseller) { res.status(404); throw new Error("Reseller not found"); } res.json(reseller); });
export const adminWithdrawals = asyncHandler(async (_req, res) => res.json(await ResellerWithdrawal.find().populate("reseller", "resellerId fullName paymentDetails").sort({ createdAt: -1 })));
export const adminProcessWithdrawal = asyncHandler(async (req, res) => { const withdrawal = await ResellerWithdrawal.findByIdAndUpdate(req.params.id, { status: req.body.status, paymentReference: req.body.paymentReference, note: req.body.note, processedBy: req.user._id, processedAt: new Date() }, { new: true, runValidators: true }); if (!withdrawal) { res.status(404); throw new Error("Withdrawal not found"); } if (req.body.status === "paid") await Order.updateMany({ _id: { $in: withdrawal.orders } }, { $set: { "resellerAttribution.status": "paid" } }); if (req.body.status === "rejected") await Order.updateMany({ _id: { $in: withdrawal.orders } }, { $set: { "resellerAttribution.status": "available" } }); res.json(withdrawal); });
