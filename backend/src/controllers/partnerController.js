import crypto from "crypto";
import Partner from "../models/Partner.js";
import PartnerPackage from "../models/PartnerPackage.js";
import PartnerPayout from "../models/PartnerPayout.js";
import Withdrawal from "../models/Withdrawal.js";
import PaymentMethod from "../models/PaymentMethod.js";
import Order from "../models/Order.js";
import StorefrontSetting from "../models/StorefrontSetting.js";
import PartnerRegistrationOtp from "../models/PartnerRegistrationOtp.js";
import PartnerWithdrawalOtp from "../models/PartnerWithdrawalOtp.js";
import PartnerBankOtp from "../models/PartnerBankOtp.js";
import { sendEmail } from "../utils/email.js";
import asyncHandler from "../utils/asyncHandler.js";
import { createToken } from "../utils/token.js";
import { createPasswordReset, hashResetCode, resetCodeResponse, sendPasswordResetCode } from "../utils/passwordReset.js";
import { createPayuRequest, verifyPayuPayment } from "../utils/payu.js";
import PayuTransaction from "../models/PayuTransaction.js";

const publicPartner = (partner) => ({ id: partner._id, registrationNumber: partner.registrationNumber, name: partner.name, fatherName: partner.fatherName, gender: partner.gender, email: partner.email, mobile: partner.mobile, address: partner.address, package: partner.package, profileImage: partner.profileImage, kyc: partner.kyc, bankDetails: partner.bankDetails, walletBalance: partner.walletBalance, status: partner.status, registrationPayment: partner.registrationPayment, referredBy: partner.referredBy || null });
const minimumWithdrawalAmount = async () => {
  const settings = await StorefrontSetting.findOne({ singleton: "storefront" }).select("minimumPartnerWithdrawalAmount");
  return Math.max(0, Number(settings?.minimumPartnerWithdrawalAmount) || 0);
};
const onboarding = (partner) => {
  const paymentComplete = ["paid", "approved"].includes(partner.registrationPayment?.status);
  const documents = ["aadhar", "pan", "cancelledCheque"];
  const kycComplete = documents.every((type) => partner.kyc?.[type]?.status === "approved");
  return [
    { key: "account", label: "Account Creation", status: "completed" },
    { key: "payment", label: "Payment Success", status: paymentComplete ? "completed" : "pending" },
    { key: "kyc", label: "KYC Approved", status: kycComplete ? "completed" : "pending" }
  ];
};
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
export const getPublicRegistrationSettings = asyncHandler(async (_req, res) => {
  const settings = await StorefrontSetting.findOne({ singleton: "storefront" }).select("partnerPaymentBypassEnabled");
  res.json({ partnerPaymentBypassEnabled: Boolean(settings?.partnerPaymentBypassEnabled) });
});
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
const getPartnerPaymentMethod = async () => {
  const method = await PaymentMethod.findOne({ type: { $in: ["payu", "razorpay"] }, isActive: true }).sort({ sortOrder: 1, type: 1 });
  if (!method) throw new Error("No online payment gateway is active in admin payment methods");
  if (method.type === "payu" && (!method.payu?.merchantKey || !method.payu?.salt)) throw new Error("PayU is not configured in admin payment methods");
  if (method.type === "razorpay" && (!method.razorpay?.keyId || !method.razorpay?.keySecret)) throw new Error("Razorpay is not configured in admin payment methods");
  return method;
};
const findReferringPartner = async (referralId) => {
  const normalizedId = String(referralId || "").trim();
  if (!normalizedId) return null;
  const partner = await Partner.findOne({ registrationNumber: normalizedId, status: "active" });
  if (!partner) throw new Error("Referral ID is not a valid active partner registration ID");
  return partner;
};
const ensurePartnerEmailAvailable = async (email, res) => {
  const normalizedEmail = String(email || "").trim().toLowerCase();
  if (!normalizedEmail) { res.status(400); throw new Error("Email is required"); }
  if (await Partner.exists({ email: normalizedEmail })) {
    res.status(409);
    throw new Error("Email is already registered as a partner. Please sign in instead.");
  }
  return normalizedEmail;
};
export const createRegistrationOrder = asyncHandler(async (req, res) => {
  req.body.email = await ensurePartnerEmailAvailable(req.body.email, res);
  const partnerPackage = await PartnerPackage.findOne({ _id: req.body.package, isActive: true });
  if (!partnerPackage) { res.status(400); throw new Error("Selected partner package is unavailable"); }
  try { await findReferringPartner(req.body.referralId); } catch (error) { res.status(400); throw error; }
  const method = await getPartnerPaymentMethod();
  if (method.type === "payu") {
    const txnid = `partner_${Date.now()}_${crypto.randomBytes(4).toString("hex")}`;
    const callbackUrl = `${req.protocol}://${req.get("host")}/api/storefront/payu/callback?returnUrl=${encodeURIComponent(req.body.returnUrl || req.get("origin") || "")}`;
    await PayuTransaction.create({ txnid, kind: "partner-registration", ownerEmail: req.body.email, paymentMethodCode: method.code, amount: partnerPackage.price });
    return res.json({ ...createPayuRequest({ config: method.payu, txnid, amount: partnerPackage.price, productinfo: `${partnerPackage.title} partner registration`, firstname: req.body.name || "Partner", email: req.body.email, phone: req.body.mobile, callbackUrl, udf1: String(partnerPackage._id), udf2: "partner-registration" }), statusUrl: `${req.protocol}://${req.get("host")}/api/storefront/payu/status/${encodeURIComponent(txnid)}`, package: partnerPackage, merchantName: method.name });
  }
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
  req.body.email = await ensurePartnerEmailAvailable(req.body.email, res);
  const partnerPackage = await PartnerPackage.findOne({ _id: req.body.package, isActive: true });
  if (!partnerPackage) { res.status(400); throw new Error("Selected partner package is unavailable"); }
  let referredBy;
  try { referredBy = await findReferringPartner(req.body.referralId); } catch (error) { res.status(400); throw error; }
  const bypassPayment = req.body.skipPaymentForTesting === true;
  const deferPayment = req.body.deferPayment === true;
  const settings = bypassPayment ? await StorefrontSetting.findOne({ singleton: "storefront" }).select("partnerPaymentBypassEnabled") : null;
  const bypassAllowed = Boolean(settings?.partnerPaymentBypassEnabled);
  if (bypassPayment && !bypassAllowed) { res.status(403); throw new Error("Payment bypass is disabled"); }

  let registrationPayment;
  if (deferPayment) {
    registrationPayment = { provider: "pending", status: "pending", amount: partnerPackage.price };
  } else
  if (bypassPayment) {
    const testId = `test_${crypto.randomUUID()}`;
    registrationPayment = { provider: "test", status: "paid", orderId: testId, paymentId: testId, amount: 0, paidAt: new Date() };
  } else {
    const payment = req.body.payment || {};
    if (payment.payuTxnId) {
      const method = await PaymentMethod.findOne({ type: "payu", isActive: true }).sort({ sortOrder: 1 });
      if (!method?.payu?.merchantKey || !method.payu?.salt) { res.status(503); throw new Error("PayU is not configured"); }
      if (await Partner.exists({ "registrationPayment.orderId": payment.payuTxnId })) { res.status(409); throw new Error("This payment has already been used for registration"); }
      const transaction = await verifyPayuPayment({ config: method.payu, txnid: payment.payuTxnId, expectedAmount: partnerPackage.price });
      registrationPayment = { provider: "payu", status: "paid", orderId: payment.payuTxnId, paymentId: transaction.mihpayid || transaction.bank_ref_num, amount: partnerPackage.price, paidAt: new Date() };
    } else {
      const { razorpayOrderId, razorpayPaymentId, razorpaySignature } = payment;
      if (!razorpayOrderId || !razorpayPaymentId || !razorpaySignature) { res.status(400); throw new Error("Confirmed online payment is required"); }
      if (await Partner.exists({ "registrationPayment.orderId": razorpayOrderId })) { res.status(409); throw new Error("This payment has already been used for registration"); }
      const method = await getRazorpay();
      const expectedSignature = crypto.createHmac("sha256", method.razorpay.keySecret).update(`${razorpayOrderId}|${razorpayPaymentId}`).digest("hex");
      const validSignature = expectedSignature.length === razorpaySignature.length && crypto.timingSafeEqual(Buffer.from(expectedSignature), Buffer.from(razorpaySignature));
      if (!validSignature) { res.status(400); throw new Error("Razorpay payment verification failed"); }
      const orderResponse = await fetch(`https://api.razorpay.com/v1/orders/${razorpayOrderId}`, { headers: { Authorization: `Basic ${Buffer.from(`${method.razorpay.keyId}:${method.razorpay.keySecret}`).toString("base64")}` } });
      const paidOrder = await orderResponse.json();
      if (!orderResponse.ok || paidOrder.status !== "paid" || paidOrder.amount !== Math.round(partnerPackage.price * 100) || paidOrder.notes?.packageId !== String(partnerPackage._id)) { res.status(400); throw new Error("Payment does not match the selected package or is not captured"); }
      registrationPayment = { provider: "razorpay", status: "paid", orderId: razorpayOrderId, paymentId: razorpayPaymentId, amount: partnerPackage.price, paidAt: new Date() };
    }
  }
  const password = String(crypto.randomInt(1000, 10000));
  const registrationNumber = await nextRegistrationNumber();
  const { referralId: _referralId, payment: _payment, skipPaymentForTesting: _skipPaymentForTesting, deferPayment: _deferPayment, ...registrationData } = req.body;
  const partner = await Partner.create({ ...registrationData, referredBy: referredBy?._id || null, registrationNumber, password, passwordVault: encryptPartnerPassword(password), registrationPayment });
  await partner.populate(["package", { path: "referredBy", select: "name registrationNumber" }]);
  const emailSent = await sendCredentials(partner, password).catch(() => false);
  const registrationMessage = deferPayment ? "Registration successful. Complete your payment after signing in." : bypassPayment ? "Test registration successful without payment." : "Registration and payment successful.";
  res.status(201).json({ message: emailSent ? `${registrationMessage} Login credentials were emailed to you.` : `${registrationMessage} Save the credentials shown below.`, emailSent, registrationNumber, temporaryPassword: password, partner: publicPartner(partner) });
});
export const requestPartnerRegistrationOtp = asyncHandler(async (req, res) => {
  const required = ["name", "fatherName", "gender", "email", "mobile", "package"];
  if (required.some((field) => !req.body[field]) || !req.body.address?.line || !req.body.address?.state || !req.body.address?.city) { res.status(400); throw new Error("Please complete all required registration fields"); }
  req.body.email = await ensurePartnerEmailAvailable(req.body.email, res);
  if (!(await PartnerPackage.exists({ _id: req.body.package, isActive: true }))) { res.status(400); throw new Error("Selected partner package is unavailable"); }
  await findReferringPartner(req.body.referralId);
  const code = String(crypto.randomInt(100000, 1000000));
  await PartnerRegistrationOtp.deleteMany({ email: String(req.body.email).toLowerCase() });
  const challenge = await PartnerRegistrationOtp.create({ email: String(req.body.email).toLowerCase(), payload: req.body, codeHash: hashResetCode(code), expiresAt: new Date(Date.now() + 10 * 60 * 1000) });
  await sendEmail({ to: challenge.email, subject: "Verify your partner registration", text: `Your HRSBasket partner registration OTP is ${code}. It expires in 10 minutes.` });
  res.status(201).json({ challengeId: challenge._id, message: "An OTP has been sent to your email address." });
});
export const verifyPartnerRegistrationOtp = asyncHandler(async (req, res) => {
  const challenge = await PartnerRegistrationOtp.findOne({ _id: req.body.challengeId, codeHash: hashResetCode(req.body.code), expiresAt: { $gt: new Date() } });
  if (!challenge) { res.status(400); throw new Error("OTP is invalid or has expired"); }
  if (await Partner.exists({ email: challenge.email })) { res.status(409); throw new Error("Email is already registered as a partner"); }
  const referredBy = await findReferringPartner(challenge.payload.referralId);
  const password = String(crypto.randomInt(1000, 10000)); const registrationNumber = await nextRegistrationNumber();
  const { referralId: _referralId, deferPayment: _deferPayment, ...data } = challenge.payload;
  const id = `otp_${crypto.randomUUID()}`;
  const payment = challenge.payload.deferPayment === true
    ? { provider: "pending", status: "pending", amount: (await PartnerPackage.findById(data.package))?.price || 0 }
    : { provider: "no_payment", status: "paid", orderId: id, paymentId: id, amount: 0, paidAt: new Date() };
  const partner = await Partner.create({ ...data, referredBy: referredBy?._id || null, registrationNumber, password, passwordVault: encryptPartnerPassword(password), registrationPayment: payment });
  await challenge.deleteOne(); await partner.populate("package");
  res.status(201).json({ message: challenge.payload.deferPayment ? "Email verified. Your account was created with payment pending." : "Registration verified. You can now sign in.", registrationNumber, temporaryPassword: password, partner: publicPartner(partner) });
});
export const loginPartner = asyncHandler(async (req, res) => {
  const partner = await Partner.findOne({ registrationNumber: req.body.registrationNumber }).select("+password").populate("package");
  if (!partner || !(await partner.matchPassword(req.body.password))) { res.status(401); throw new Error("Invalid registration number or password"); }
  if (partner.status !== "active") { res.status(403); throw new Error("Partner account is suspended"); }
  res.json({ partner: publicPartner(partner), token: createToken({ _id: partner._id, role: "Partner" }) });
});
export const forgotPartnerPassword = asyncHandler(async (req, res) => {
  const identifier = String(req.body.identifier || "").trim();
  const partner = await Partner.findOne({ $or: [{ registrationNumber: identifier }, { email: identifier.toLowerCase() }] });
  if (!partner) return res.json({ message: "If that account exists, a password reset code has been sent." });
  const reset = createPasswordReset();
  partner.passwordResetToken = reset.hash; partner.passwordResetExpires = reset.expiresAt;
  await partner.save({ validateModifiedOnly: true });
  const emailSent = await sendPasswordResetCode({ email: partner.email, name: partner.name, code: reset.code, accountType: "Partner" }).catch(() => false);
  res.json(resetCodeResponse(emailSent, reset.code));
});
export const resetPartnerForgottenPassword = asyncHandler(async (req, res) => {
  const password = String(req.body.password || "");
  if (!/^\d{4}$/.test(password)) { res.status(400); throw new Error("Password must be exactly 4 digits"); }
  const identifier = String(req.body.identifier || "").trim();
  const partner = await Partner.findOne({ $and: [{ $or: [{ registrationNumber: identifier }, { email: identifier.toLowerCase() }] }, { passwordResetToken: hashResetCode(req.body.code) }, { passwordResetExpires: { $gt: new Date() } }] }).select("+passwordResetToken +passwordResetExpires");
  if (!partner) { res.status(400); throw new Error("Reset code is invalid or has expired"); }
  partner.password = password; partner.passwordVault = encryptPartnerPassword(password); partner.passwordResetToken = undefined; partner.passwordResetExpires = undefined;
  await partner.save();
  res.json({ message: "Password reset successfully. You can now sign in." });
});
export const partnerMe = asyncHandler(async (req, res) => { await req.partner.populate(["package", { path: "referredBy", select: "name registrationNumber" }]); res.json({ partner: publicPartner(req.partner) }); });
export const changePendingPackage = asyncHandler(async (req, res) => {
  if (req.partner.registrationPayment?.status !== "pending") { res.status(409); throw new Error("The package can only be changed while registration payment is pending"); }
  const partnerPackage = await PartnerPackage.findOne({ _id: req.body.package, isActive: true }).catch(() => null);
  if (!partnerPackage) { res.status(400); throw new Error("Selected partner package is unavailable"); }
  req.partner.package = partnerPackage._id;
  req.partner.registrationPayment = { provider: "pending", status: "pending", amount: partnerPackage.price };
  await req.partner.save();
  await req.partner.populate("package");
  res.json({ message: `Package changed to ${partnerPackage.title}.`, partner: publicPartner(req.partner) });
});
export const createMyRegistrationOrder = asyncHandler(async (req, res) => {
  await req.partner.populate("package");
  if (["paid", "approved"].includes(req.partner.registrationPayment?.status)) { res.status(409); throw new Error("Registration payment is already complete"); }
  const method = await getPartnerPaymentMethod(); const packagePrice = req.partner.package.price;
  if (req.partner.registrationPayment.amount !== packagePrice) { req.partner.registrationPayment.amount = packagePrice; await req.partner.save(); }
  if (method.type === "payu") {
    const txnid = `partner_${req.partner.registrationNumber}_${Date.now()}_${crypto.randomBytes(3).toString("hex")}`;
    const callbackUrl = `${req.protocol}://${req.get("host")}/api/storefront/payu/callback?returnUrl=${encodeURIComponent(req.body.returnUrl || req.get("origin") || "")}`;
    await PayuTransaction.create({ txnid, kind: "partner-payment", ownerId: req.partner._id, ownerEmail: req.partner.email, paymentMethodCode: method.code, amount: packagePrice });
    return res.json({ ...createPayuRequest({ config: method.payu, txnid, amount: packagePrice, productinfo: `${req.partner.package.title} partner registration`, firstname: req.partner.name, email: req.partner.email, phone: req.partner.mobile, callbackUrl, udf1: String(req.partner._id), udf2: "partner-payment" }), statusUrl: `${req.protocol}://${req.get("host")}/api/storefront/payu/status/${encodeURIComponent(txnid)}`, package: req.partner.package, merchantName: method.name });
  }
  const response = await fetch("https://api.razorpay.com/v1/orders", { method: "POST", headers: { Authorization: `Basic ${Buffer.from(`${method.razorpay.keyId}:${method.razorpay.keySecret}`).toString("base64")}`, "Content-Type": "application/json" }, body: JSON.stringify({ amount: Math.round(packagePrice * 100), currency: "INR", receipt: `partner_${req.partner.registrationNumber}_${Date.now()}`, notes: { partnerId: String(req.partner._id), packageId: String(req.partner.package._id) } }) });
  const order = await response.json(); if (!response.ok) { res.status(502); throw new Error(order.error?.description || "Unable to start Razorpay payment"); }
  res.json({ orderId: order.id, amount: order.amount, currency: order.currency, keyId: method.razorpay.keyId, merchantName: method.name, package: req.partner.package });
});
export const verifyMyRegistrationPayment = asyncHandler(async (req, res) => {
  await req.partner.populate("package");
  if (req.body.payuTxnId) {
    const method = await PaymentMethod.findOne({ type: "payu", isActive: true }).sort({ sortOrder: 1 });
    if (!method?.payu?.merchantKey || !method.payu?.salt) { res.status(503); throw new Error("PayU is not configured"); }
    if (await Partner.exists({ _id: { $ne: req.partner._id }, "registrationPayment.orderId": req.body.payuTxnId })) { res.status(409); throw new Error("This PayU payment has already been used"); }
    const transaction = await verifyPayuPayment({ config: method.payu, txnid: req.body.payuTxnId, expectedAmount: req.partner.package.price });
    req.partner.registrationPayment = { provider: "payu", status: "paid", orderId: req.body.payuTxnId, paymentId: transaction.mihpayid || transaction.bank_ref_num, amount: Number(req.partner.package.price), paidAt: new Date() };
    await req.partner.save();
    return res.json({ message: "PayU payment completed successfully.", partner: publicPartner(req.partner) });
  }
  const { razorpayOrderId, razorpayPaymentId, razorpaySignature } = req.body;
  if (!razorpayOrderId || !razorpayPaymentId || !razorpaySignature) { res.status(400); throw new Error("Razorpay payment confirmation is required"); }
  const method = await getRazorpay(); const expected = crypto.createHmac("sha256", method.razorpay.keySecret).update(`${razorpayOrderId}|${razorpayPaymentId}`).digest("hex");
  if (expected.length !== razorpaySignature.length || !crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(razorpaySignature))) { res.status(400); throw new Error("Razorpay payment verification failed"); }
  const response = await fetch(`https://api.razorpay.com/v1/orders/${razorpayOrderId}`, { headers: { Authorization: `Basic ${Buffer.from(`${method.razorpay.keyId}:${method.razorpay.keySecret}`).toString("base64")}` } }); const order = await response.json();
  if (!response.ok || order.status !== "paid" || order.notes?.partnerId !== String(req.partner._id) || order.notes?.packageId !== String(req.partner.package?._id) || order.amount !== Math.round(Number(req.partner.package?.price || 0) * 100)) { res.status(400); throw new Error("Payment is not valid for the currently selected package"); }
  req.partner.registrationPayment = { provider: "razorpay", status: "paid", orderId: razorpayOrderId, paymentId: razorpayPaymentId, amount: order.amount / 100, paidAt: new Date() }; await req.partner.save();
  res.json({ message: "Payment completed successfully.", partner: publicPartner(req.partner) });
});
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
  await req.partner.populate("package");
  const [totalPayout, payoutCount, pendingWithdrawals, recentPayouts, referralCount, recentReferrals, partnersCount, salesTotals, configuredMinimumWithdrawal] = await Promise.all([
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
    ]),
    minimumWithdrawalAmount()
  ]);
  const registrationPayment = req.partner.registrationPayment?.toObject?.() || req.partner.registrationPayment;
  if (registrationPayment?.status === "pending") registrationPayment.amount = Number(req.partner.package?.price || 0);
  res.json({ walletBalance: req.partner.walletBalance, minimumWithdrawalAmount: configuredMinimumWithdrawal, totalPayout: totalPayout[0]?.total || 0, payoutCount, pendingWithdrawal: pendingWithdrawals[0]?.total || 0, recentPayouts, referralCount, recentReferrals, partnersCount, ecommerceSales: salesTotals[0]?.sales || 0, ecommerceProfit: salesTotals[0]?.profit || 0, onboarding: onboarding(req.partner), registrationPayment });
});
export const updateProfile = asyncHandler(async (req, res) => { req.partner.address = { ...req.partner.address.toObject(), ...(req.body.address || {}) }; if (req.body.profileImage !== undefined) req.partner.profileImage = req.body.profileImage; await req.partner.save(); res.json(publicPartner(req.partner)); });
const hasSavedBankDetails = (partner) => ["accountNumber", "ifsc", "bankName", "accountHolderName"].every((field) => Boolean(partner.bankDetails?.[field]));
export const lookupIfsc = asyncHandler(async (req, res) => {
  const ifsc = String(req.params.ifsc || "").trim().toUpperCase();
  if (!/^[A-Z]{4}0[A-Z0-9]{6}$/.test(ifsc)) { res.status(400); throw new Error("Enter a valid 11-character IFSC code"); }
  const response = await fetch(`https://ifsc.razorpay.com/${encodeURIComponent(ifsc)}`);
  if (!response.ok) { res.status(404); throw new Error("Bank branch was not found for this IFSC code"); }
  const details = await response.json();
  res.json({ ifsc: details.IFSC, bankName: details.BANK, branch: details.BRANCH, address: details.ADDRESS, city: details.CITY, state: details.STATE });
});
export const requestBankOtp = asyncHandler(async (req, res) => {
  if (hasSavedBankDetails(req.partner)) { res.status(409); throw new Error("Bank details have already been verified and cannot be changed"); }
  const fields = ["accountNumber", "ifsc", "bankName", "branch", "accountHolderName"];
  if (fields.some((field) => !String(req.body[field] || "").trim())) { res.status(400); throw new Error("Complete all bank details before requesting OTP"); }
  const ifsc = String(req.body.ifsc).trim().toUpperCase();
  const lookup = await fetch(`https://ifsc.razorpay.com/${encodeURIComponent(ifsc)}`);
  if (!lookup.ok) { res.status(400); throw new Error("The IFSC code could not be verified"); }
  const bank = await lookup.json();
  const bankDetails = { accountHolderName: String(req.body.accountHolderName).trim(), accountNumber: String(req.body.accountNumber).trim(), ifsc, bankName: bank.BANK, branch: bank.BRANCH };
  const code = String(crypto.randomInt(100000, 1000000));
  await PartnerBankOtp.deleteMany({ partner: req.partner._id });
  const challenge = await PartnerBankOtp.create({ partner: req.partner._id, email: req.partner.email, bankDetails, codeHash: hashResetCode(code), expiresAt: new Date(Date.now() + 10 * 60 * 1000) });
  try { await sendEmail({ to: req.partner.email, subject: "Verify your bank details", text: `Hello ${req.partner.name},\n\nYour HRSBasket bank verification OTP is ${code}. It expires in 10 minutes.\n\nDo not share this code with anyone.` }); }
  catch (_error) { await challenge.deleteOne(); res.status(502); throw new Error("Unable to send the verification OTP. Please try again later."); }
  res.json({ challengeId: challenge._id, message: `Verification OTP sent to ${req.partner.email}` });
});
export const updateBank = asyncHandler(async (req, res) => {
  if (hasSavedBankDetails(req.partner)) { res.status(409); throw new Error("Bank details have already been verified and cannot be changed"); }
  const challenge = await PartnerBankOtp.findOne({ _id: req.body.challengeId, partner: req.partner._id, expiresAt: { $gt: new Date() } });
  if (!challenge || challenge.attempts >= 5 || challenge.codeHash !== hashResetCode(req.body.otp)) { if (challenge) { challenge.attempts += 1; await challenge.save(); } res.status(400); throw new Error("The bank verification OTP is invalid or expired"); }
  req.partner.bankDetails = { ...challenge.bankDetails.toObject(), verifiedAt: new Date() };
  await req.partner.save(); await challenge.deleteOne();
  res.json(publicPartner(req.partner));
});
export const uploadKyc = asyncHandler(async (req, res) => { const map = { aadhar: ["front", "back"], pan: ["file"], cancelledCheque: ["file"] }; const fields = map[req.params.type]; if (!fields) { res.status(400); throw new Error("Invalid KYC document type"); } const current = req.partner.kyc[req.params.type]; if (current.status === "approved" || current.status === "pending") { res.status(409); throw new Error("Only rejected documents can be uploaded again"); } if (fields.some((f) => !req.body[f])) { res.status(400); throw new Error("All document files are required"); } req.partner.kyc[req.params.type] = { ...req.body, status: "pending", rejectionReason: "", reviewHistory: current.reviewHistory || [] }; await req.partner.save(); res.json(publicPartner(req.partner)); });
export const listMyPayouts = asyncHandler(async (req, res) => res.json(await PartnerPayout.find({ partner: req.partner._id }).populate("order", "orderNumber").sort({ date: -1 })));
export const listMyWithdrawals = asyncHandler(async (req, res) => res.json(await Withdrawal.find({ partner: req.partner._id }).sort({ createdAt: -1 })));
export const requestWithdrawalOtp = asyncHandler(async (req, res) => {
  const amount = Math.round(Number(req.body.amount) * 100) / 100;
  if (!Number.isFinite(amount) || amount <= 0 || amount > req.partner.walletBalance) { res.status(400); throw new Error("Enter an amount within your available wallet balance"); }
  const configuredMinimum = await minimumWithdrawalAmount();
  if (amount < configuredMinimum) { res.status(400); throw new Error(`Minimum withdrawal amount is ${configuredMinimum.toFixed(2)}`); }
  if (req.body.challengeId && req.body.otp) {
    const challenge = await PartnerWithdrawalOtp.findOne({ _id: req.body.challengeId, partner: req.partner._id, amount, expiresAt: { $gt: new Date() }, verifiedAt: null });
    if (!challenge || challenge.attempts >= 5 || challenge.codeHash !== hashResetCode(req.body.otp)) {
      if (challenge) { challenge.attempts += 1; await challenge.save(); }
      res.status(400); throw new Error("The withdrawal OTP is invalid or expired");
    }
    challenge.verifiedAt = new Date(); await challenge.save();
    return res.json({ challengeId: challenge._id, verified: true, message: "Email OTP verified successfully." });
  }
  const code = String(crypto.randomInt(100000, 1000000));
  const challenge = await PartnerWithdrawalOtp.create({ partner: req.partner._id, email: req.partner.email, amount, codeHash: hashResetCode(code), expiresAt: new Date(Date.now() + 10 * 60 * 1000) });
  try { await sendEmail({ to: req.partner.email, subject: "Confirm your withdrawal request", text: `Hello ${req.partner.name},\n\nYour HRSBasket withdrawal OTP for ${amount.toFixed(2)} is ${code}. It expires in 10 minutes.\n\nDo not share this code with anyone.` }); }
  catch (_error) { await challenge.deleteOne(); res.status(502); throw new Error("Unable to send the withdrawal OTP. Please try again later."); }
  res.json({ challengeId: challenge._id, message: `OTP sent to ${req.partner.email}` });
});
export const requestWithdrawal = asyncHandler(async (req, res) => { const amount = Math.round(Number(req.body.amount) * 100) / 100; if (!Number.isFinite(amount) || amount <= 0) { res.status(400); throw new Error("Enter a valid withdrawal amount"); } const configuredMinimum = await minimumWithdrawalAmount(); if (amount < configuredMinimum) { res.status(400); throw new Error(`Minimum withdrawal amount is ${configuredMinimum.toFixed(2)}`); } const challenge = await PartnerWithdrawalOtp.findOne({ _id: req.body.otpChallengeId, partner: req.partner._id, amount, verifiedAt: { $ne: null }, expiresAt: { $gt: new Date() } }); if (!challenge) { res.status(400); throw new Error("Verify the email OTP before submitting this withdrawal"); } const bank = req.partner.bankDetails || {}; if (![bank.accountNumber, bank.ifsc, bank.bankName, bank.accountHolderName].every(Boolean)) { res.status(400); throw new Error("Complete bank details before requesting withdrawal"); } const updated = await Partner.findOneAndUpdate({ _id: req.partner._id, walletBalance: { $gte: amount } }, { $inc: { walletBalance: -amount } }, { new: true }); if (!updated) { res.status(409); throw new Error("Insufficient wallet balance"); } try { const withdrawal = await Withdrawal.create({ partner: req.partner._id, amount, bankSnapshot: bank }); await challenge.deleteOne(); res.status(201).json(withdrawal); } catch (error) { await Partner.updateOne({ _id: req.partner._id }, { $inc: { walletBalance: amount } }); throw error; } });

export const listPackages = asyncHandler(async (_req, res) => res.json(await PartnerPackage.find().sort({ createdAt: -1 })));
export const createPackage = asyncHandler(async (req, res) => res.status(201).json(await PartnerPackage.create(req.body)));
export const updatePackage = asyncHandler(async (req, res) => res.json(await PartnerPackage.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true })));
export const deletePackage = asyncHandler(async (req, res) => {
  if (await Partner.exists({ package: req.params.id })) {
    res.status(409);
    throw new Error("This package is assigned to a partner. Deactivate it instead of deleting it.");
  }
  const partnerPackage = await PartnerPackage.findByIdAndDelete(req.params.id);
  if (!partnerPackage) { res.status(404); throw new Error("Partner package not found"); }
  res.json({ message: "Partner package deleted" });
});
export const listPartners = asyncHandler(async (_req, res) => res.json(await Partner.find().populate("package").populate("referredBy", "name registrationNumber").sort({ createdAt: -1 })));
export const deletePartner = asyncHandler(async (req, res) => {
  const existing = await Partner.findById(req.params.id);
  if (existing && ["paid", "approved"].includes(existing.registrationPayment?.status)) { res.status(409); throw new Error("A partner with completed payment cannot be deleted"); }
  const partner = existing ? await Partner.findByIdAndDelete(req.params.id) : null;
  if (!partner) { res.status(404); throw new Error("Partner not found"); }
  res.json({ message: "Partner deleted successfully.", id: req.params.id });
});
export const adminChangePendingPackage = asyncHandler(async (req, res) => {
  const partner = await Partner.findById(req.params.id);
  if (!partner) { res.status(404); throw new Error("Partner not found"); }
  if (partner.registrationPayment?.status !== "pending") { res.status(409); throw new Error("The package can only be changed while payment is pending"); }
  const partnerPackage = await PartnerPackage.findOne({ _id: req.body.package, isActive: true }).catch(() => null);
  if (!partnerPackage) { res.status(400); throw new Error("Selected partner package is unavailable"); }
  partner.package = partnerPackage._id;
  partner.registrationPayment = { provider: "pending", status: "pending", amount: partnerPackage.price };
  await partner.save(); await partner.populate("package");
  res.json({ message: `Package changed to ${partnerPackage.title}.`, partner });
});
export const approvePartnerPayment = asyncHandler(async (req, res) => {
  const partner = await Partner.findById(req.params.id).populate("package");
  if (!partner) { res.status(404); throw new Error("Partner not found"); }
  if (["paid", "approved"].includes(partner.registrationPayment?.status)) { res.status(409); throw new Error("Partner payment is already complete"); }
  const reference = String(req.body.reference || "").trim(); const note = String(req.body.note || "").trim();
  if (!reference && !note) { res.status(400); throw new Error("Enter an approval reference or note"); }
  partner.registrationPayment = { provider: "admin", status: "approved", orderId: `admin_${crypto.randomUUID()}`, paymentId: reference || `admin_${crypto.randomUUID()}`, amount: Number(req.body.amount || partner.package.price), paidAt: new Date(), approvedAt: new Date(), approvedBy: req.user._id, adminReference: reference, adminNote: note };
  await partner.save(); res.json({ message: "Partner payment approved.", partner });
});
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
export const reviewKyc = asyncHandler(async (req, res) => { const partner = await Partner.findById(req.params.id); if (!partner || !partner.kyc[req.params.type]) { res.status(404); throw new Error("Partner or document not found"); } if (!["approved", "rejected"].includes(req.body.status)) { res.status(400); throw new Error("KYC status must be approved or rejected"); } const reason = req.body.status === "rejected" ? String(req.body.rejectionReason || "").trim() : ""; if (req.body.status === "rejected" && !reason) { res.status(400); throw new Error("A rejection reason is required"); } const reviewedAt = new Date(); partner.kyc[req.params.type].status = req.body.status; partner.kyc[req.params.type].rejectionReason = reason; partner.kyc[req.params.type].reviewedAt = reviewedAt; partner.kyc[req.params.type].reviewedBy = req.user._id; partner.kyc[req.params.type].reviewHistory.push({ status: req.body.status, reason, reviewedAt, reviewedBy: req.user._id }); await partner.save(); res.json(partner); });
export const listWithdrawals = asyncHandler(async (_req, res) => res.json(await Withdrawal.find().populate("partner", "name email mobile").sort({ createdAt: -1 })));
export const processWithdrawal = asyncHandler(async (req, res) => { const allowedFrom = req.body.status === "paid" ? "approved" : "pending"; const withdrawal = await Withdrawal.findOne({ _id: req.params.id, status: allowedFrom }); if (!withdrawal) { res.status(404); throw new Error(`Withdrawal must be ${allowedFrom} for this action`); } if (!["approved", "rejected", "paid"].includes(req.body.status)) { res.status(400); throw new Error("Invalid withdrawal status"); } withdrawal.status = req.body.status; withdrawal.adminNote = req.body.adminNote; withdrawal.processedAt = new Date(); withdrawal.processedBy = req.user._id; if (req.body.status === "rejected") await Partner.updateOne({ _id: withdrawal.partner }, { $inc: { walletBalance: withdrawal.amount } }); await withdrawal.save(); res.json(withdrawal); });
