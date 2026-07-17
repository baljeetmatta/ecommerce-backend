import crypto from "crypto";
import Partner from "../models/Partner.js";
import PartnerPackage from "../models/PartnerPackage.js";
import PartnerPayout from "../models/PartnerPayout.js";
import Withdrawal from "../models/Withdrawal.js";
import PaymentMethod from "../models/PaymentMethod.js";
import Order from "../models/Order.js";
import asyncHandler from "../utils/asyncHandler.js";
import { createToken } from "../utils/token.js";

const publicPartner = (partner) => ({ id: partner._id, registrationNumber: partner.registrationNumber, name: partner.name, fatherName: partner.fatherName, gender: partner.gender, email: partner.email, mobile: partner.mobile, address: partner.address, package: partner.package, profileImage: partner.profileImage, kyc: partner.kyc, bankDetails: partner.bankDetails, walletBalance: partner.walletBalance, status: partner.status, registrationPayment: partner.registrationPayment, referredBy: partner.referredBy || null });
const passwordVaultKey = () => crypto.scryptSync(process.env.PARTNER_PASSWORD_ENCRYPTION_KEY || process.env.JWT_SECRET || "development-partner-password-key", "partner-password-vault", 32);
const encryptPartnerPassword = (password) => {
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv("aes-256-gcm", passwordVaultKey(), iv);
  const encrypted = Buffer.concat([cipher.update(String(password), "utf8"), cipher.final()]);
  return [iv.toString("base64url"), cipher.getAuthTag().toString("base64url"), encrypted.toString("base64url")].join(".");
};
const decryptPartnerPassword = (value) => {
  const [iv, tag, encrypted] = String(value || "").split(".");
  if (!iv || !tag || !encrypted) return null;
  const decipher = crypto.createDecipheriv("aes-256-gcm", passwordVaultKey(), Buffer.from(iv, "base64url"));
  decipher.setAuthTag(Buffer.from(tag, "base64url"));
  return Buffer.concat([decipher.update(Buffer.from(encrypted, "base64url")), decipher.final()]).toString("utf8");
};
const sendCredentials = async (partner, password) => {
  if (!process.env.EMAIL_WEBHOOK_URL) {
    console.info(`[partner-registration] Credentials email pending for ${partner.registrationNumber}; configure EMAIL_WEBHOOK_URL`);
    return false;
  }
  const response = await fetch(process.env.EMAIL_WEBHOOK_URL, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ to: partner.email, subject: "Your partner account", template: "partner-welcome", data: { name: partner.name, registrationNumber: partner.registrationNumber, password } }) });
  if (!response.ok) throw new Error("Partner was registered, but the credentials email could not be sent");
  return true;
};

export const listPublicPackages = asyncHandler(async (_req, res) => res.json(await PartnerPackage.find({ isActive: true }).sort({ price: 1 })));
export const getReferralPartner = asyncHandler(async (req, res) => {
  const registrationNumber = String(req.params.registrationNumber || "").trim();
  if (!/^\d{6}$/.test(registrationNumber)) { res.status(400); throw new Error("Referral ID must be 6 digits"); }
  const partner = await Partner.findOne({ registrationNumber, status: "active" }).select("name registrationNumber");
  if (!partner) { res.status(404); throw new Error("No such partner"); }
  res.json({ id: partner._id, registrationNumber: partner.registrationNumber, name: partner.name });
});
const getRazorpay = async () => {
  const method = await PaymentMethod.findOne({ type: "razorpay", isActive: true });
  if (!method?.razorpay?.keyId || !method.razorpay?.keySecret) throw new Error("Razorpay is not configured in admin payment methods");
  return method;
};
const findReferringPartner = async (referralId) => {
  const normalizedId = String(referralId || "").trim();
  if (!normalizedId) return null;
  const partner = await Partner.findOne({ registrationNumber: normalizedId, status: "active" });
  if (!partner) throw new Error("Referral ID is not a valid active partner registration ID");
  return partner;
};
export const createRegistrationOrder = asyncHandler(async (req, res) => {
  const partnerPackage = await PartnerPackage.findOne({ _id: req.body.package, isActive: true });
  if (!partnerPackage) { res.status(400); throw new Error("Selected partner package is unavailable"); }
  try { await findReferringPartner(req.body.referralId); } catch (error) { res.status(400); throw error; }
  const method = await getRazorpay();
  const response = await fetch("https://api.razorpay.com/v1/orders", { method: "POST", headers: { Authorization: `Basic ${Buffer.from(`${method.razorpay.keyId}:${method.razorpay.keySecret}`).toString("base64")}`, "Content-Type": "application/json" }, body: JSON.stringify({ amount: Math.round(partnerPackage.price * 100), currency: "INR", receipt: `partner_${Date.now()}`, notes: { packageId: String(partnerPackage._id), packageTitle: partnerPackage.title } }) });
  const order = await response.json();
  if (!response.ok) { res.status(502); throw new Error(order.error?.description || "Unable to start Razorpay payment"); }
  res.json({ orderId: order.id, amount: order.amount, currency: order.currency, keyId: method.razorpay.keyId, merchantName: method.name, package: partnerPackage });
});

const nextRegistrationNumber = async () => {
  for (let attempt = 0; attempt < 20; attempt += 1) {
    const value = String(crypto.randomInt(100000, 1000000));
    if (!(await Partner.exists({ registrationNumber: value }))) return value;
  }
  throw new Error("Unable to allocate a registration number. Please try again.");
};
export const registerPartner = asyncHandler(async (req, res) => {
  const required = ["name", "fatherName", "gender", "email", "mobile", "package"];
  if (required.some((field) => !req.body[field]) || !req.body.address?.line || !req.body.address?.state || !req.body.address?.city) { res.status(400); throw new Error("Please complete all required registration fields"); }
  if (await Partner.exists({ email: req.body.email })) { res.status(409); throw new Error("Email is already registered as a partner"); }
  const partnerPackage = await PartnerPackage.findOne({ _id: req.body.package, isActive: true });
  if (!partnerPackage) { res.status(400); throw new Error("Selected partner package is unavailable"); }
  let referredBy;
  try { referredBy = await findReferringPartner(req.body.referralId); } catch (error) { res.status(400); throw error; }
  const bypassPayment = req.body.skipPaymentForTesting === true;
  const bypassAllowed = process.env.NODE_ENV !== "production" || process.env.ALLOW_PARTNER_PAYMENT_BYPASS === "true";
  if (bypassPayment && !bypassAllowed) { res.status(403); throw new Error("Payment bypass is disabled"); }

  let registrationPayment;
  if (bypassPayment) {
    const testId = `test_${crypto.randomUUID()}`;
    registrationPayment = { provider: "test", orderId: testId, paymentId: testId, amount: 0 };
  } else {
    const { razorpayOrderId, razorpayPaymentId, razorpaySignature } = req.body.payment || {};
    if (!razorpayOrderId || !razorpayPaymentId || !razorpaySignature) { res.status(400); throw new Error("Confirmed Razorpay payment is required"); }
    if (await Partner.exists({ "registrationPayment.orderId": razorpayOrderId })) { res.status(409); throw new Error("This payment has already been used for registration"); }
    const method = await getRazorpay();
    const expectedSignature = crypto.createHmac("sha256", method.razorpay.keySecret).update(`${razorpayOrderId}|${razorpayPaymentId}`).digest("hex");
    const validSignature = expectedSignature.length === razorpaySignature.length && crypto.timingSafeEqual(Buffer.from(expectedSignature), Buffer.from(razorpaySignature));
    if (!validSignature) { res.status(400); throw new Error("Razorpay payment verification failed"); }
    const orderResponse = await fetch(`https://api.razorpay.com/v1/orders/${razorpayOrderId}`, { headers: { Authorization: `Basic ${Buffer.from(`${method.razorpay.keyId}:${method.razorpay.keySecret}`).toString("base64")}` } });
    const paidOrder = await orderResponse.json();
    if (!orderResponse.ok || paidOrder.status !== "paid" || paidOrder.amount !== Math.round(partnerPackage.price * 100) || paidOrder.notes?.packageId !== String(partnerPackage._id)) { res.status(400); throw new Error("Payment does not match the selected package or is not captured"); }
    registrationPayment = { orderId: razorpayOrderId, paymentId: razorpayPaymentId, amount: partnerPackage.price };
  }
  const password = String(crypto.randomInt(1000, 10000));
  const registrationNumber = await nextRegistrationNumber();
  const { referralId: _referralId, payment: _payment, skipPaymentForTesting: _skipPaymentForTesting, ...registrationData } = req.body;
  const partner = await Partner.create({ ...registrationData, referredBy: referredBy?._id || null, registrationNumber, password, passwordVault: encryptPartnerPassword(password), registrationPayment });
  await partner.populate(["package", { path: "referredBy", select: "name registrationNumber" }]);
  const emailSent = await sendCredentials(partner, password).catch(() => false);
  const registrationMessage = bypassPayment ? "Test registration successful without payment." : "Registration and payment successful.";
  res.status(201).json({ message: emailSent ? `${registrationMessage} Login credentials were emailed to you.` : `${registrationMessage} Save the credentials shown below.`, emailSent, registrationNumber, temporaryPassword: password, partner: publicPartner(partner) });
});
export const loginPartner = asyncHandler(async (req, res) => {
  const partner = await Partner.findOne({ registrationNumber: req.body.registrationNumber }).select("+password").populate("package");
  if (!partner || !(await partner.matchPassword(req.body.password))) { res.status(401); throw new Error("Invalid registration number or password"); }
  if (partner.status !== "active") { res.status(403); throw new Error("Partner account is suspended"); }
  res.json({ partner: publicPartner(partner), token: createToken({ _id: partner._id, role: "Partner" }) });
});
export const partnerMe = asyncHandler(async (req, res) => { await req.partner.populate(["package", { path: "referredBy", select: "name registrationNumber" }]); res.json({ partner: publicPartner(req.partner) }); });
export const changePassword = asyncHandler(async (req, res) => {
  const currentPassword = String(req.body.currentPassword || "");
  const newPassword = String(req.body.newPassword || "");
  if (!/^\d{4}$/.test(newPassword)) { res.status(400); throw new Error("New password must be exactly 4 digits"); }
  const partner = await Partner.findById(req.partner._id).select("+password");
  if (!partner || !(await partner.matchPassword(currentPassword))) { res.status(401); throw new Error("Current password is incorrect"); }
  partner.password = newPassword;
  partner.passwordVault = encryptPartnerPassword(newPassword);
  await partner.save();
  res.json({ message: "Password changed successfully" });
});
export const dashboard = asyncHandler(async (req, res) => {
  const [totalPayout, payoutCount, pendingWithdrawals, recentPayouts, referralCount, recentReferrals, partnersCount, salesTotals] = await Promise.all([
    PartnerPayout.aggregate([{ $match: { partner: req.partner._id } }, { $group: { _id: null, total: { $sum: "$amount" } } }]),
    PartnerPayout.countDocuments({ partner: req.partner._id }),
    Withdrawal.aggregate([{ $match: { partner: req.partner._id, status: "pending" } }, { $group: { _id: null, total: { $sum: "$amount" } } }]),
    PartnerPayout.find({ partner: req.partner._id }).sort({ date: -1 }).limit(5),
    Partner.countDocuments({ referredBy: req.partner._id }),
    Partner.find({ referredBy: req.partner._id }).select("name registrationNumber email status createdAt").sort({ createdAt: -1 }).limit(10),
    Partner.countDocuments(),
    Order.aggregate([
      { $match: { paymentStatus: "Paid", status: { $nin: ["Cancelled", "Returned"] } } },
      { $unwind: "$items" },
      { $group: { _id: null, sales: { $sum: { $multiply: ["$items.price", "$items.quantity"] } }, profit: { $sum: { $multiply: [{ $subtract: ["$items.price", { $ifNull: ["$items.costPrice", 0] }] }, "$items.quantity"] } } } }
    ])
  ]);
  res.json({ walletBalance: req.partner.walletBalance, totalPayout: totalPayout[0]?.total || 0, payoutCount, pendingWithdrawal: pendingWithdrawals[0]?.total || 0, recentPayouts, referralCount, recentReferrals, partnersCount, ecommerceSales: salesTotals[0]?.sales || 0, ecommerceProfit: salesTotals[0]?.profit || 0 });
});
export const updateProfile = asyncHandler(async (req, res) => { req.partner.address = { ...req.partner.address.toObject(), ...(req.body.address || {}) }; if (req.body.profileImage !== undefined) req.partner.profileImage = req.body.profileImage; await req.partner.save(); res.json(publicPartner(req.partner)); });
export const updateBank = asyncHandler(async (req, res) => { const fields = ["accountNumber", "ifsc", "bankName", "accountHolderName"]; if (fields.some((f) => !req.body[f])) { res.status(400); throw new Error("All bank details are required"); } req.partner.bankDetails = req.body; await req.partner.save(); res.json(publicPartner(req.partner)); });
export const uploadKyc = asyncHandler(async (req, res) => { const map = { aadhar: ["front", "back"], pan: ["file"], cancelledCheque: ["file"] }; const fields = map[req.params.type]; if (!fields) { res.status(400); throw new Error("Invalid KYC document type"); } const current = req.partner.kyc[req.params.type]; if (current.status === "approved" || current.status === "pending") { res.status(409); throw new Error("Only rejected documents can be uploaded again"); } if (fields.some((f) => !req.body[f])) { res.status(400); throw new Error("All document files are required"); } req.partner.kyc[req.params.type] = { ...req.body, status: "pending", rejectionReason: "" }; await req.partner.save(); res.json(publicPartner(req.partner)); });
export const listMyPayouts = asyncHandler(async (req, res) => res.json(await PartnerPayout.find({ partner: req.partner._id }).populate("order", "orderNumber").sort({ date: -1 })));
export const listMyWithdrawals = asyncHandler(async (req, res) => res.json(await Withdrawal.find({ partner: req.partner._id }).sort({ createdAt: -1 })));
export const requestWithdrawal = asyncHandler(async (req, res) => { const amount = Math.round(Number(req.body.amount) * 100) / 100; if (!Number.isFinite(amount) || amount <= 0) { res.status(400); throw new Error("Enter a valid withdrawal amount"); } const bank = req.partner.bankDetails || {}; if (![bank.accountNumber, bank.ifsc, bank.bankName, bank.accountHolderName].every(Boolean)) { res.status(400); throw new Error("Complete bank details before requesting withdrawal"); } const updated = await Partner.findOneAndUpdate({ _id: req.partner._id, walletBalance: { $gte: amount } }, { $inc: { walletBalance: -amount } }, { new: true }); if (!updated) { res.status(409); throw new Error("Insufficient wallet balance"); } try { const withdrawal = await Withdrawal.create({ partner: req.partner._id, amount, bankSnapshot: bank }); res.status(201).json(withdrawal); } catch (error) { await Partner.updateOne({ _id: req.partner._id }, { $inc: { walletBalance: amount } }); throw error; } });

export const listPackages = asyncHandler(async (_req, res) => res.json(await PartnerPackage.find().sort({ createdAt: -1 })));
export const createPackage = asyncHandler(async (req, res) => res.status(201).json(await PartnerPackage.create(req.body)));
export const updatePackage = asyncHandler(async (req, res) => res.json(await PartnerPackage.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true })));
export const listPartners = asyncHandler(async (_req, res) => res.json(await Partner.find().populate("package").populate("referredBy", "name registrationNumber").sort({ createdAt: -1 })));
export const revealPartnerPassword = asyncHandler(async (req, res) => {
  const partner = await Partner.findById(req.params.id).select("+passwordVault");
  if (!partner) { res.status(404); throw new Error("Partner not found"); }
  if (!partner.passwordVault) { res.status(409); throw new Error("Password is unavailable for this existing account. Reset it once to enable reveal."); }
  try { res.json({ password: decryptPartnerPassword(partner.passwordVault) }); } catch (_error) { res.status(409); throw new Error("Password cannot be decrypted. Reset it to create a new password."); }
});
export const resetPartnerPassword = asyncHandler(async (req, res) => {
  const partner = await Partner.findById(req.params.id).select("+password");
  if (!partner) { res.status(404); throw new Error("Partner not found"); }
  const password = String(crypto.randomInt(1000, 10000));
  partner.password = password;
  partner.passwordVault = encryptPartnerPassword(password);
  await partner.save();
  res.json({ message: "Partner password reset", password });
});
export const reviewKyc = asyncHandler(async (req, res) => { const partner = await Partner.findById(req.params.id); if (!partner || !partner.kyc[req.params.type]) { res.status(404); throw new Error("Partner or document not found"); } if (!["approved", "rejected"].includes(req.body.status)) { res.status(400); throw new Error("KYC status must be approved or rejected"); } if (req.body.status === "rejected" && !String(req.body.rejectionReason || "").trim()) { res.status(400); throw new Error("A rejection reason is required"); } partner.kyc[req.params.type].status = req.body.status; partner.kyc[req.params.type].rejectionReason = req.body.status === "rejected" ? String(req.body.rejectionReason).trim() : ""; partner.kyc[req.params.type].reviewedAt = new Date(); partner.kyc[req.params.type].reviewedBy = req.user._id; await partner.save(); res.json(partner); });
export const listWithdrawals = asyncHandler(async (_req, res) => res.json(await Withdrawal.find().populate("partner", "name email mobile").sort({ createdAt: -1 })));
export const processWithdrawal = asyncHandler(async (req, res) => { const allowedFrom = req.body.status === "paid" ? "approved" : "pending"; const withdrawal = await Withdrawal.findOne({ _id: req.params.id, status: allowedFrom }); if (!withdrawal) { res.status(404); throw new Error(`Withdrawal must be ${allowedFrom} for this action`); } if (!["approved", "rejected", "paid"].includes(req.body.status)) { res.status(400); throw new Error("Invalid withdrawal status"); } withdrawal.status = req.body.status; withdrawal.adminNote = req.body.adminNote; withdrawal.processedAt = new Date(); withdrawal.processedBy = req.user._id; if (req.body.status === "rejected") await Partner.updateOne({ _id: withdrawal.partner }, { $inc: { walletBalance: withdrawal.amount } }); await withdrawal.save(); res.json(withdrawal); });
