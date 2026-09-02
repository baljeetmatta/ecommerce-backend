import crypto from "crypto";
import Order from "../models/Order.js";
import Product from "../models/Product.js";
import Seller from "../models/Seller.js";
import SellerRegistrationOtp from "../models/SellerRegistrationOtp.js";
import SellerPayout from "../models/SellerPayout.js";
import SellerWalletAdjustment from "../models/SellerWalletAdjustment.js";
import SellerBalanceCollection from "../models/SellerBalanceCollection.js";
import SellerWithdrawal from "../models/SellerWithdrawal.js";
import SellerWithdrawalOtp from "../models/SellerWithdrawalOtp.js";
import SellerWithdrawalPayoutOtp from "../models/SellerWithdrawalPayoutOtp.js";
import SellerBankOtp from "../models/SellerBankOtp.js";
import SellerImpersonation from "../models/SellerImpersonation.js";
import ShipRocketSetting from "../models/ShipRocketSetting.js";
import { generateShiprocketDocuments, shiprocketErrorMessage, shiprocketPhone, shiprocketToken } from "../services/shiprocketService.js";
import { ensureOrderInvoice } from "../services/invoiceService.js";
import { debitShiprocketReturn } from "../services/sellerWalletService.js";
import StorefrontSetting from "../models/StorefrontSetting.js";
import Category from "../models/Category.js";
import TaxCategory from "../models/TaxCategory.js";
import asyncHandler from "../utils/asyncHandler.js";
import { createToken } from "../utils/token.js";
import { createPasswordReset, hashResetCode, resetCodeResponse, sendPasswordResetCode } from "../utils/passwordReset.js";
import { sendEmail } from "../utils/email.js";
import PaymentMethod from "../models/PaymentMethod.js";
import { sendBankPayout } from "../services/razorpayPayoutService.js";
import WorkAssignment from "../models/WorkAssignment.js";
import User from "../models/User.js";
import Review from "../models/Review.js";
import { issueTaxVerificationToken, readTaxVerificationToken, verifyTaxIdentifier } from "../services/gstVerificationService.js";
import { recordStaffAction } from "../utils/staffAudit.js";

const publicSeller = (seller) => ({ id: seller._id, sellerNumber: seller.sellerNumber, name: seller.name, companyName: seller.companyName, businessName: seller.businessName, address: seller.address, city: seller.city, state: seller.state, gstState: seller.gstState, businessState: seller.businessState, pinCode: seller.pinCode, pickupSameAsBusiness: seller.pickupSameAsBusiness !== false, pickupAddress: seller.pickupAddress || seller.address, pickupCity: seller.pickupCity || seller.city, pickupState: seller.pickupState || seller.state, pickupPinCode: seller.pickupPinCode || seller.pinCode, mobile: seller.mobile, email: seller.email, isGstRegistered: seller.isGstRegistered, gstNumber: seller.gstNumber, gstVerificationStatus: seller.gstVerificationStatus, gstLegalName: seller.gstLegalName, declarationAccepted: seller.declarationAccepted, gstStatus: seller.gstStatus, sellingPermission: seller.sellingPermission, turnoverAlertThreshold: seller.turnoverAlertThreshold, annualTurnover: seller.annualTurnover, autoRestrictSales: seller.autoRestrictSales, shippingMode: seller.shippingMode, profileImage: seller.profileImage, status: seller.status, approvalStatus: seller.approvalStatus, approvalReason: seller.approvalReason, commissionRate: seller.commissionRate, walletBalance: seller.walletBalance, referredBy: seller.referredBy || null, referralSellerId: seller.referralSellerId || "", registeredAt: seller.registeredAt || seller.createdAt, kyc: seller.kyc, bankDetails: seller.bankDetails, createdAt: seller.createdAt });
const passwordVaultKey = () => crypto.scryptSync(process.env.SELLER_PASSWORD_ENCRYPTION_KEY || process.env.JWT_SECRET || "development-seller-password-key", "seller-password-vault", 32);
const encryptSellerPassword = (password) => {
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv("aes-256-gcm", passwordVaultKey(), iv);
  const encrypted = Buffer.concat([cipher.update(String(password), "utf8"), cipher.final()]);
  return [iv.toString("base64url"), cipher.getAuthTag().toString("base64url"), encrypted.toString("base64url")].join(".");
};
const decryptSellerPassword = (value) => {
  const [iv, tag, encrypted] = String(value || "").split(".");
  if (!iv || !tag || !encrypted) return null;
  const decipher = crypto.createDecipheriv("aes-256-gcm", passwordVaultKey(), Buffer.from(iv, "base64url"));
  decipher.setAuthTag(Buffer.from(tag, "base64url"));
  return Buffer.concat([decipher.update(Buffer.from(encrypted, "base64url")), decipher.final()]).toString("utf8");
};
const productFields = ["name", "sku", "shortDescription", "detailedDescription", "description", "hsnCode", "actualWeight", "weightUnit", "volumetricWeight", "length", "breadth", "height", "dimensionUnit", "warranty", "prepaidAvailable", "codAvailable", "codChargePaidBy", "rtoApplicable", "isReturnable", "returnDays", "manufacturerBrand", "countryOfOrigin", "price", "offerPrice", "sellerCosts", "shippingIncludedInPrice", "shippingCharge", "shippingCost", "shippingPaidBy", "shippingMode", "category", "taxCategory", "priceIncludesTax", "displayType", "status", "tags", "relatedProducts", "isStockManageable", "stock", "lowStockThreshold", "backOrderAllowed", "variationOptions", "variants", "mainImage", "imageVariants", "media", "videoUrl", "seo"];
const productPayload = (body) => {
  const payload = Object.fromEntries(productFields.filter((field) => body[field] !== undefined).map((field) => [field, body[field]]));
  payload.prepaidAvailable = payload.prepaidAvailable !== false && payload.prepaidAvailable !== "false";
  payload.codAvailable = payload.codAvailable === true || payload.codAvailable === "true";
  payload.codChargePaidBy = payload.codAvailable && payload.codChargePaidBy === "customer" ? "customer" : "seller";
  payload.rtoApplicable = payload.rtoApplicable !== false && payload.rtoApplicable !== "false";
  if (!payload.prepaidAvailable && !payload.codAvailable) throw new Error("Enable Prepaid or Cash on Delivery for this product");
  payload.isReturnable = payload.isReturnable !== false && payload.isReturnable !== "false";
  payload.returnDays = payload.isReturnable && Number(payload.returnDays) === 10 ? 10 : payload.isReturnable ? 7 : 0;
  payload.shippingMode ||= payload.shippingIncludedInPrice === false ? "fixed_customer" : "free_included";
  const customerPaysShipping = ["fixed_customer", "realtime_customer"].includes(payload.shippingMode);
  payload.shippingIncludedInPrice = !customerPaysShipping;
  payload.shippingPaidBy = customerPaysShipping ? "customer" : "seller";
  if (Array.isArray(payload.variants)) payload.variants = payload.variants.map(({ costPrice: _costPrice, ...variant }) => variant);
  if (payload.shippingIncludedInPrice !== undefined) payload.shippingIncludedInPrice = payload.shippingIncludedInPrice === true || payload.shippingIncludedInPrice === "true";
  if (payload.shippingIncludedInPrice) {
    payload.shippingCharge = 0;
    payload.shippingPaidBy = "seller";
  } else if (payload.shippingIncludedInPrice === false) {
    payload.shippingCharge = Number(payload.shippingCharge || 0);
    payload.shippingPaidBy = "customer";
    if (payload.shippingMode === "fixed_customer" && !(payload.shippingCharge > 0)) throw new Error("Enter the fixed shipping charge payable by the customer");
    if (["free_realtime", "realtime_customer"].includes(payload.shippingMode)) payload.shippingCharge = 0;
  }
  if (payload.shippingCost !== undefined) {
    payload.shippingCost = Number(payload.shippingCost);
    if (!Number.isFinite(payload.shippingCost) || payload.shippingCost < 0) throw new Error("Enter a valid actual shipping cost");
  }
  return payload;
};
const comparableProductValue = (value) => {
  if (value === undefined) return null;
  if (value === null || typeof value !== "object") return value;
  if (value instanceof Date) return value.toISOString();
  if (value instanceof Map) return comparableProductValue(Object.fromEntries(value));
  if (value?._bsontype === "ObjectId") return String(value);
  if (Array.isArray(value)) return value.map(comparableProductValue);
  return Object.fromEntries(Object.entries(value).filter(([key]) => key !== "_id").map(([key, entry]) => [key, comparableProductValue(entry)]));
};
const sellerProductChangeLog = (product, payload) => {
  const current = product.toObject({ depopulate: true });
  return productFields.flatMap((field) => {
    if (payload[field] === undefined) return [];
    const before = comparableProductValue(current[field]);
    const after = comparableProductValue(payload[field]);
    return JSON.stringify(before) === JSON.stringify(after) ? [] : [{ field, before, after }];
  });
};
const normalizeMobile = (value) => String(value || "").replace(/\D/g, "");
const nextSellerNumber = async () => {
  for (let attempt = 0; attempt < 20; attempt += 1) {
    const value = `HRS${crypto.randomInt(100000, 1000000)}`;
    if (!(await Seller.exists({ sellerNumber: value }))) return value;
  }
  throw new Error("Unable to allocate a seller ID. Please try again.");
};

const normalizeSellerRegistration = async (body, res) => {
  const required = ["name", "companyName", "address", "city", "state", "pinCode", "mobile", "email"];
  if (required.some((field) => !String(body[field] || "").trim())) { res.status(400); throw new Error("Please complete all seller registration fields"); }
  const email = String(body.email).trim().toLowerCase();
  const mobile = normalizeMobile(body.mobile);
  const isGstRegistered = body.isGstRegistered === true || body.isGstRegistered === "true";
  const gstNumber = isGstRegistered ? String(body.gstNumber || "").trim().toUpperCase() : undefined;
  const businessName = String(body.businessName || body.companyName || "").trim();
  const gstState = isGstRegistered ? String(body.gstState || body.state || "").trim() : undefined;
  const businessState = !isGstRegistered ? String(body.businessState || body.state || "").trim() : undefined;
  const pickupSameAsBusiness = body.pickupSameAsBusiness !== false && body.pickupSameAsBusiness !== "false";
  const pickupAddress = pickupSameAsBusiness ? String(body.address).trim() : String(body.pickupAddress || "").trim();
  const pickupCity = pickupSameAsBusiness ? String(body.city).trim() : String(body.pickupCity || "").trim();
  const pickupState = pickupSameAsBusiness ? String(body.state).trim() : String(body.pickupState || "").trim();
  const pickupPinCode = pickupSameAsBusiness ? String(body.pinCode).trim() : String(body.pickupPinCode || "").trim();
  if (![pickupAddress, pickupCity, pickupState, pickupPinCode].every(Boolean)) { res.status(400); throw new Error("Please complete all pickup address fields"); }
  if (mobile.length < 10 || mobile.length > 15) { res.status(400); throw new Error("Enter a valid mobile number"); }
  if (isGstRegistered && !gstNumber) { res.status(400); throw new Error("GST number is required for a GST-registered business"); }
  if (isGstRegistered && (!businessName || !gstState)) { res.status(400); throw new Error("Business name and GST state are required"); }
  if (isGstRegistered && !String(body.gstCertificate || "").trim()) { res.status(400); throw new Error("GST certificate is required"); }
  if (!isGstRegistered && !businessState) { res.status(400); throw new Error("Business state is required for a Non-GST business"); }
  if (!isGstRegistered && body.declarationAccepted !== true && body.declarationAccepted !== "true") { res.status(400); throw new Error("Accept the Non-GST declaration to continue"); }
  const verification = isGstRegistered ? readTaxVerificationToken(body.taxVerificationToken, "gstin", gstNumber) : null;
  if (isGstRegistered && !verification) { res.status(400); throw new Error("Verify the GSTIN before registration"); }
  const duplicateChecks = [{ email }, { mobile }];
  if (gstNumber) duplicateChecks.push({ gstNumber });
  if (await Seller.exists({ $or: duplicateChecks })) { res.status(409); throw new Error("Email, mobile number, or GSTIN is already registered"); }
  const enteredReferralSellerId = String(body.referralSellerId || "").trim().toUpperCase();
  const referralSellerId = /^\d{6}$/.test(enteredReferralSellerId) ? `HRS${enteredReferralSellerId}` : enteredReferralSellerId;
  if (referralSellerId && !/^HRS\d{6}$/.test(referralSellerId)) { res.status(400); throw new Error("Referral Seller ID must be a 6-digit number or HRS followed by 6 digits"); }
  let referredBy = null;
  if (referralSellerId) {
    const referrer = await Seller.findOne({ sellerNumber: referralSellerId }).select("_id");
    if (!referrer) { res.status(400); throw new Error("Referral Seller ID was not found"); }
    referredBy = referrer._id;
  }
  const providerVerified = verification?.verificationMode === "provider";
  return { ...body, email, mobile, isGstRegistered, gstNumber, businessName: verification?.legalName || businessName, gstLegalName: isGstRegistered ? (verification?.legalName || businessName) : undefined, gstState: isGstRegistered ? (verification?.state || gstState) : undefined, businessState, pickupSameAsBusiness, pickupAddress, pickupCity, pickupState, pickupPinCode, referredBy, referralSellerId, declarationAccepted: body.declarationAccepted === true || body.declarationAccepted === "true", gstStatus: isGstRegistered ? (providerVerified ? "verified" : "pending") : "not_registered", gstVerificationStatus: isGstRegistered ? (providerVerified ? "verified" : "pending") : "pending", sellingPermission: isGstRegistered && providerVerified ? "all_india" : "same_state" };
};

export const verifySellerTaxIdentifier = asyncHandler(async (req, res) => {
  const kind = req.body.kind === "gstin" ? "gstin" : "";
  const value = String(req.body.value || "").trim().toUpperCase();
  if (!kind || !value) { res.status(400); throw new Error("Tax identifier and verification type are required"); }
  const result = await verifyTaxIdentifier({ kind, value });
  if (!result.valid) { res.status(422); throw new Error("Invalid GSTIN. Please enter a valid GSTIN."); }
  res.json({ ...result, verificationToken: issueTaxVerificationToken({ kind, value, legalName: result.legalName, tradeName: result.tradeName, state: result.state, verificationMode: result.verificationMode }) });
});

export const lookupSellerReferral = asyncHandler(async (req, res) => {
  const sellerNumber = String(req.params.sellerNumber || "").trim().toUpperCase();
  const seller = await Seller.findOne({ sellerNumber, status: "active" }).select("sellerNumber companyName");
  if (!seller) { res.status(404); throw new Error("Referral Seller ID was not found"); }
  res.json({ sellerNumber: seller.sellerNumber, companyName: seller.companyName });
});

export const requestSellerRegistrationOtp = asyncHandler(async (req, res) => {
  const payload = await normalizeSellerRegistration(req.body, res);
  const code = String(crypto.randomInt(100000, 1000000));
  await SellerRegistrationOtp.deleteMany({ email: payload.email });
  const challenge = await SellerRegistrationOtp.create({ email: payload.email, payload, codeHash: hashResetCode(code), expiresAt: new Date(Date.now() + 10 * 60 * 1000) });
  try {
    await sendEmail({ to: payload.email, subject: "Verify your seller registration", text: `Your HRSBasket seller registration OTP is ${code}. It expires in 10 minutes.` });
  } catch (_error) {
    await challenge.deleteOne();
    res.status(502);
    throw new Error("Unable to send the verification OTP. Please try again later.");
  }
  res.status(201).json({ challengeId: challenge._id, message: `Verification OTP sent to ${payload.email}` });
});

export const verifySellerRegistrationOtp = asyncHandler(async (req, res) => {
  const challenge = await SellerRegistrationOtp.findOne({ _id: req.body.challengeId, expiresAt: { $gt: new Date() } });
  if (!challenge || challenge.attempts >= 5 || challenge.codeHash !== hashResetCode(req.body.code)) {
    if (challenge) { challenge.attempts += 1; await challenge.save(); }
    res.status(400); throw new Error("The email OTP is invalid or has expired");
  }
  const payload = await normalizeSellerRegistration(challenge.payload, res);
  const password = String(crypto.randomInt(1000, 10000));
  let seller;
  try {
    seller = await Seller.create({ ...payload, sellerNumber: await nextSellerNumber(), password, passwordVault: encryptSellerPassword(password), kyc: { gstCertificate: payload.gstCertificate ? { file: payload.gstCertificate, status: "pending" } : {}, pan: {}, addressProof: {} } });
  } catch (error) {
    if (error.code === 11000) { res.status(409); throw new Error("Email, mobile number, GST number, or Seller ID is already registered"); }
    throw error;
  }
  await challenge.deleteOne();
  res.status(201).json({ message: "Seller registration completed. Save your login credentials.", seller: publicSeller(seller), temporaryPassword: password });
});

export const loginSeller = asyncHandler(async (req, res) => {
  const identifier = String(req.body.identifier || req.body.email || "").trim();
  const sellerIdentifier = /^\d{6}$/.test(identifier) ? `HRS${identifier}` : identifier.toUpperCase();
  if (!identifier) { res.status(400); throw new Error("Seller ID or email is required"); }
  const seller = await Seller.findOne({ $or: [{ sellerNumber: { $in: [sellerIdentifier, identifier] } }, { email: identifier.toLowerCase() }] }).select("+password");
  if (!seller || !(await seller.matchPassword(req.body.password))) { res.status(401); throw new Error("Invalid Seller ID/email or password"); }
  if (seller.status !== "active") { res.status(403); throw new Error("Seller account is suspended"); }
  res.json({ seller: publicSeller(seller), token: createToken({ _id: seller._id, role: "Seller" }) });
});

export const forgotSellerPassword = asyncHandler(async (req, res) => {
  const identifier = String(req.body.identifier || "").trim();
  const seller = await Seller.findOne({ $or: [{ sellerNumber: identifier }, { email: identifier.toLowerCase() }] });
  if (!seller) return res.json({ message: "If that account exists, a password reset code has been sent." });
  const reset = createPasswordReset();
  seller.passwordResetToken = reset.hash; seller.passwordResetExpires = reset.expiresAt;
  await seller.save({ validateModifiedOnly: true });
  const emailSent = await sendPasswordResetCode({ email: seller.email, name: seller.companyName, code: reset.code, accountType: "Seller" }).catch(() => false);
  res.json(resetCodeResponse(emailSent, reset.code));
});
export const resetSellerForgottenPassword = asyncHandler(async (req, res) => {
  const password = String(req.body.password || "");
  if (!/^\d{4}$/.test(password)) { res.status(400); throw new Error("Password must be exactly 4 digits"); }
  const identifier = String(req.body.identifier || "").trim();
  const seller = await Seller.findOne({ $and: [{ $or: [{ sellerNumber: identifier }, { email: identifier.toLowerCase() }] }, { passwordResetToken: hashResetCode(req.body.code) }, { passwordResetExpires: { $gt: new Date() } }] }).select("+passwordResetToken +passwordResetExpires");
  if (!seller) { res.status(400); throw new Error("Reset code is invalid or has expired"); }
  seller.password = password; seller.passwordVault = encryptSellerPassword(password); seller.passwordResetToken = undefined; seller.passwordResetExpires = undefined;
  await seller.save();
  res.json({ message: "Password reset successfully. You can now sign in." });
});

export const sellerMe = asyncHandler(async (req, res) => res.json({ seller: publicSeller(req.seller) }));
export const listSellerReferrals = asyncHandler(async (req, res) => {
  const referrals = await Seller.find({ referredBy: req.seller._id })
    .select("sellerNumber name companyName email mobile city state approvalStatus status registeredAt createdAt")
    .sort({ createdAt: -1 })
    .lean();
  res.json({
    referralLink: `#/seller/register?ref=${encodeURIComponent(req.seller.sellerNumber)}`,
    referralCount: referrals.length,
    referrals,
  });
});
const sellerHasVerifiedGst = (seller) => seller?.isGstRegistered === true && Boolean(seller?.gstNumber) && (seller?.gstStatus === "verified" || seller?.gstVerificationStatus === "verified");
export const sellerCatalogOptions = asyncHandler(async (req, res) => { const gstEnabled = sellerHasVerifiedGst(req.seller); const [categories, taxCategories, store] = await Promise.all([Category.find({ isActive: true }).sort({ name: 1 }), gstEnabled ? TaxCategory.find({ isActive: true }).sort({ name: 1 }) : [], StorefrontSetting.findOne({ singleton: "storefront" }).select("sellerSettlement")]); res.json({ categories, taxCategories, isGstRegistered: gstEnabled, gstDetails: gstEnabled ? { gstNumber: req.seller.gstNumber, legalName: req.seller.gstLegalName || req.seller.businessName || req.seller.companyName, state: req.seller.gstState || req.seller.state, verificationStatus: req.seller.gstVerificationStatus || req.seller.gstStatus } : null, sellerSettlement: { ...(store?.sellerSettlement?.toObject?.() || store?.sellerSettlement || {}), platformFeeRate: Number(req.seller.commissionRate || 0) } }); });
export const sellerDashboard = asyncHandler(async (req, res) => {
  const sellerProducts = await Product.find({ seller: req.seller._id }).select("name sku mainImage status approvalStatus stock lowStockThreshold isStockManageable price offerPrice sellerEnabled").lean();
  const productIds = sellerProducts.map((product) => product._id);
  const [productsCount, pendingProducts, orders, referralCount, payoutTotals, pendingWithdrawal] = await Promise.all([
    Product.countDocuments({ seller: req.seller._id }),
    Product.countDocuments({ seller: req.seller._id, approvalStatus: { $in: ["pending_new", "pending_update"] } }),
    Order.find({ "items.product": { $in: productIds } }).populate("customer", "name email profileImage createdAt"),
    Seller.countDocuments({ referredBy: req.seller._id }),
    SellerPayout.aggregate([{ $match: { seller: req.seller._id } }, { $group: { _id: null, earnings: { $sum: "$netAmount" }, commission: { $sum: "$commissionAmount" }, count: { $sum: 1 } } }]),
    SellerWithdrawal.aggregate([{ $match: { seller: req.seller._id, status: { $in: ["pending", "approved"] } } }, { $group: { _id: null, total: { $sum: "$amount" }, count: { $sum: 1 } } }])
  ]);
  const sellerItems = orders.flatMap((order) => order.items.filter((item) => productIds.some((id) => id.equals(item.product))));
  const orderStatus = {};
  const productPerformance = new Map();
  sellerItems.forEach((item) => {
    const rawStatus = item.sellerStatus || "Pending";
    const status = ["Accepted", "Packed"].includes(rawStatus) ? "Processing" : rawStatus;
    orderStatus[status] = (orderStatus[status] || 0) + 1;
    const key = String(item.product);
    const current = productPerformance.get(key) || { orders: 0, units: 0, sales: 0 };
    current.orders += 1; current.units += Number(item.quantity || 0); current.sales += Number(item.price || 0) * Number(item.quantity || 0);
    productPerformance.set(key, current);
  });
  orderStatus.Returned = orders.filter((order) => ["Returned", "Refunded"].includes(order.status) || order.items.some((item) => ["Returned", "Refunded"].includes(item.sellerStatus))).length;
  const topProducts = sellerProducts.map((product) => ({ ...product, ...(productPerformance.get(String(product._id)) || { orders: 0, units: 0, sales: 0 }) })).sort((a, b) => b.sales - a.sales || b.units - a.units).slice(0, 5);
  const salesByDay = new Map();
  orders.forEach((order) => {
    const key = new Date(order.createdAt).toISOString().slice(0, 10);
    const total = order.items.filter((item) => productIds.some((id) => id.equals(item.product))).reduce((sum, item) => sum + Number(item.price || 0) * Number(item.quantity || 0), 0);
    const current = salesByDay.get(key) || { sales: 0, orders: 0 };
    salesByDay.set(key, { sales: current.sales + total, orders: current.orders + (total > 0 ? 1 : 0) });
  });
  const salesSeries = Array.from({ length: 30 }, (_, offset) => {
    const date = new Date();
    date.setHours(0, 0, 0, 0);
    date.setDate(date.getDate() - (29 - offset));
    const key = date.toISOString().slice(0, 10);
    return { date: key, sales: salesByDay.get(key)?.sales || 0, orders: salesByDay.get(key)?.orders || 0 };
  });
  const ratingStats = await Review.aggregate([{ $match: { seller: req.seller._id, sellerRating: { $exists: true }, status: "approved" } }, { $group: { _id: null, averageRating: { $avg: "$sellerRating" }, totalRatings: { $sum: 1 } } }]);
  const recentCustomers = [...new Map(orders.sort((a, b) => b.createdAt - a.createdAt).filter((order) => order.customer).map((order) => [String(order.customer._id), { _id: order.customer._id, name: order.customer.name, email: order.customer.email, joinedAt: order.customer.createdAt, latestOrderAt: order.createdAt }])).values()].slice(0, 5);
  res.json({
    productsCount,
    pendingProducts,
    ordersCount: orders.length,
    sales: sellerItems.reduce((sum, item) => sum + item.price * item.quantity, 0),
    walletBalance: req.seller.walletBalance,
    totalEarnings: payoutTotals[0]?.earnings || 0,
    totalCommission: payoutTotals[0]?.commission || 0,
    payoutsCount: payoutTotals[0]?.count || 0,
    pendingWithdrawal: pendingWithdrawal[0]?.total || 0,
    pendingWithdrawalCount: pendingWithdrawal[0]?.count || 0,
    commissionRate: req.seller.commissionRate,
    approvalStatus: req.seller.approvalStatus,
    referralCount,
    referralLink: `#/seller/register?ref=${encodeURIComponent(req.seller.sellerNumber)}`,
    averageRating: Number((ratingStats[0]?.averageRating || 0).toFixed(1)),
    totalRatings: ratingStats[0]?.totalRatings || 0,
    recentCustomers,
    seller: { id: req.seller._id, sellerNumber: req.seller.sellerNumber, name: req.seller.name, companyName: req.seller.companyName, approvalStatus: req.seller.approvalStatus, kyc: req.seller.kyc, bankDetails: req.seller.bankDetails, shippingMode: req.seller.shippingMode, referralSellerId: req.seller.referralSellerId, registeredAt: req.seller.registeredAt || req.seller.createdAt },
    products: sellerProducts,
    topProducts,
    salesSeries,
    orderStatus,
    recentOrders: orders.sort((a, b) => b.createdAt - a.createdAt).slice(0, 8).map((order) => ({ ...order.toObject(), items: order.items.filter((item) => productIds.some((id) => id.equals(item.product))) }))
  });
});
export const updateSellerProfile = asyncHandler(async (req, res) => {
  const editableAfterApproval = Object.keys(req.body).every((field) => ["shippingMode", "profileImage"].includes(field));
  if (req.seller.approvalStatus === "approved" && !editableAfterApproval) { res.status(403); throw new Error("Approved seller information is locked"); }
  if (req.body.mobile !== undefined) {
    const mobile = normalizeMobile(req.body.mobile);
    if (mobile.length < 10 || mobile.length > 15) { res.status(400); throw new Error("Enter a valid mobile number"); }
    if (await Seller.exists({ _id: { $ne: req.seller._id }, mobile })) { res.status(409); throw new Error("Mobile number is already registered"); }
    req.body.mobile = mobile;
  }
  ["name", "companyName", "address", "city", "state", "pinCode", "pickupSameAsBusiness", "pickupAddress", "pickupCity", "pickupState", "pickupPinCode", "mobile", "profileImage", "shippingMode"].forEach((field) => { if (req.body[field] !== undefined) req.seller[field] = req.body[field]; });
  if (req.seller.pickupSameAsBusiness) {
    req.seller.pickupAddress = req.seller.address; req.seller.pickupCity = req.seller.city; req.seller.pickupState = req.seller.state; req.seller.pickupPinCode = req.seller.pinCode;
  } else if (![req.seller.pickupAddress, req.seller.pickupCity, req.seller.pickupState, req.seller.pickupPinCode].every(Boolean)) { res.status(400); throw new Error("Please complete all pickup address fields"); }
  try { await req.seller.save(); } catch (error) { if (error.code === 11000) { res.status(409); throw new Error("Mobile number is already registered"); } throw error; }
  res.json(publicSeller(req.seller));
});
export const lookupSellerIfsc = asyncHandler(async (req, res) => {
  const ifsc = String(req.params.ifsc || "").trim().toUpperCase();
  if (!/^[A-Z]{4}0[A-Z0-9]{6}$/.test(ifsc)) { res.status(400); throw new Error("Enter a valid 11-character IFSC code"); }
  const response = await fetch(`https://ifsc.razorpay.com/${encodeURIComponent(ifsc)}`);
  if (!response.ok) { res.status(404); throw new Error("Bank branch was not found for this IFSC code"); }
  const details = await response.json();
  res.json({ ifsc: details.IFSC, bankName: details.BANK, branch: details.BRANCH });
});
export const updateSellerBank = asyncHandler(async (req, res) => {
  if (req.seller.bankDetails?.verifiedAt) { res.status(409); throw new Error("Bank details have already been verified and are locked"); }
  const challenge = await SellerBankOtp.findOne({ _id: req.body.challengeId, seller: req.seller._id, expiresAt: { $gt: new Date() } });
  if (!challenge || challenge.attempts >= 5 || challenge.codeHash !== hashResetCode(req.body.otp)) { if (challenge) { challenge.attempts += 1; await challenge.save(); } res.status(400); throw new Error("The bank verification OTP is invalid or expired"); }
  req.seller.bankDetails = { ...challenge.bankDetails.toObject(), verifiedAt: new Date() };
  await req.seller.save(); await challenge.deleteOne();
  res.json(publicSeller(req.seller));
});
export const requestSellerBankOtp = asyncHandler(async (req, res) => {
  if (req.seller.bankDetails?.verifiedAt) { res.status(409); throw new Error("Bank details have already been verified and are locked"); }
  const requiredKyc = ["pan", "addressProof", "aadharFront", "aadharBack", "cancelledCheque", ...(req.seller.isGstRegistered ? ["gstCertificate"] : [])];
  if (requiredKyc.some((type) => req.seller.kyc?.[type]?.status !== "approved")) { res.status(409); throw new Error("Complete KYC approval before verifying bank details"); }
  const accountNumber = String(req.body.accountNumber || "").trim();
  const accountType = String(req.body.accountType || "").trim().toLowerCase();
  if (!["current", "savings"].includes(accountType)) { res.status(400); throw new Error("Select current or savings account"); }
  if (!accountNumber || accountNumber !== String(req.body.confirmAccountNumber || "").trim()) { res.status(400); throw new Error("Account numbers do not match"); }
  const ifsc = String(req.body.ifsc || "").trim().toUpperCase();
  if (!/^[A-Z]{4}0[A-Z0-9]{6}$/.test(ifsc)) { res.status(400); throw new Error("Enter a valid IFSC code"); }
  const response = await fetch(`https://ifsc.razorpay.com/${encodeURIComponent(ifsc)}`);
  if (!response.ok) { res.status(400); throw new Error("The IFSC code could not be verified"); }
  const bank = await response.json();
  if (!String(req.body.accountHolderName || "").trim()) { res.status(400); throw new Error("Account holder name is required"); }
  const bankDetails = { accountType, accountHolderName: String(req.body.accountHolderName).trim(), accountNumber, ifsc, bankName: bank.BANK, branch: bank.BRANCH };
  const code = String(crypto.randomInt(100000, 1000000));
  await SellerBankOtp.deleteMany({ seller: req.seller._id });
  const challenge = await SellerBankOtp.create({ seller: req.seller._id, email: req.seller.email, bankDetails, codeHash: hashResetCode(code), expiresAt: new Date(Date.now() + 10 * 60 * 1000) });
  try { await sendEmail({ to: req.seller.email, subject: "Verify your seller bank details", text: `Hello ${req.seller.companyName},\n\nYour HRSBasket bank verification OTP is ${code}. It expires in 10 minutes.\n\nDo not share this code.` }); } catch (_error) { await challenge.deleteOne(); res.status(502); throw new Error("Unable to send the bank verification OTP. Please try again."); }
  res.json({ challengeId: challenge._id, message: `Verification OTP sent to ${req.seller.email}` });
});
export const uploadSellerKyc = asyncHandler(async (req, res) => { if (req.seller.approvalStatus === "approved") { res.status(403); throw new Error("Approved seller KYC is locked"); } const allowed = ["gstCertificate", "pan", "addressProof", "aadharFront", "aadharBack", "cancelledCheque"]; if (!allowed.includes(req.params.type)) { res.status(400); throw new Error("Invalid KYC document type"); } const current = req.seller.kyc[req.params.type]; if (["pending", "approved"].includes(current.status)) { res.status(409); throw new Error("Only rejected documents can be uploaded again"); } if (!req.body.file) { res.status(400); throw new Error("Document file is required"); } req.seller.kyc[req.params.type] = { file: req.body.file, status: "pending", rejectionReason: "" }; await req.seller.save(); res.json(publicSeller(req.seller)); });
export const changeSellerPassword = asyncHandler(async (req, res) => { const next = String(req.body.newPassword || ""); if (!/^\d{4}$/.test(next)) { res.status(400); throw new Error("New password must be exactly 4 digits"); } const seller = await Seller.findById(req.seller._id).select("+password"); if (!(await seller.matchPassword(String(req.body.currentPassword || "")))) { res.status(401); throw new Error("Current password is incorrect"); } seller.password = next; seller.passwordVault = encryptSellerPassword(next); await seller.save(); res.json({ message: "Password changed successfully" }); });

export const listMyProducts = asyncHandler(async (req, res) => { const products = await Product.find({ seller: req.seller._id }).select("-costPrice").populate({ path: "category", select: "name parent", populate: { path: "parent", select: "name" } }).populate("taxCategory", "name rate").sort({ updatedAt: -1 }); res.json(products.map((product) => { const value = product.toObject(); if (value.pendingChanges) delete value.pendingChanges.costPrice; return value; })); });
export const createSellerProduct = asyncHandler(async (req, res) => { const payload = productPayload(req.body); if (!sellerHasVerifiedGst(req.seller)) { payload.taxCategory = undefined; payload.priceIncludesTax = true; } else if (!payload.taxCategory) { res.status(400); throw new Error("Select a GST slab for this product"); } const product = await Product.create({ ...payload, costPrice: 0, seller: req.seller._id, status: "draft", approvalStatus: "pending_new", sellerEnabled: true }); res.status(201).json(await product.populate(["category", "taxCategory"])); });
export const updateSellerProduct = asyncHandler(async (req, res) => {
  const product = await Product.findOne({ _id: req.params.id, seller: req.seller._id });
  if (!product) { res.status(404); throw new Error("Product not found"); }
  const payload = productPayload(req.body);
  if (!sellerHasVerifiedGst(req.seller)) { payload.taxCategory = undefined; payload.priceIncludesTax = true; }
  else if (!payload.taxCategory) { res.status(400); throw new Error("Select a GST slab for this product"); }
  const hasPublishedVersion = ["approved", "pending_update", "rejected_update"].includes(product.approvalStatus);
  if (hasPublishedVersion) { product.pendingChanges = payload; product.pendingChangeLog = { submittedAt: new Date(), changes: sellerProductChangeLog(product, payload) }; product.approvalStatus = "pending_update"; product.approvalNote = ""; }
  else { product.set(payload); product.approvalStatus = "pending_new"; product.approvalNote = ""; }
  await product.save();
  res.json(await product.populate(["category", "taxCategory"]));
});
export const toggleSellerProduct = asyncHandler(async (req, res) => { const product = await Product.findOne({ _id: req.params.id, seller: req.seller._id }); if (!product) { res.status(404); throw new Error("Product not found"); } product.sellerEnabled = Boolean(req.body.enabled); await product.save(); res.json(product); });

export const updateSellerOrderItem = asyncHandler(async (req, res) => { const allowed = req.seller.shippingMode === "shiprocket" ? ["Pending", "Accepted", "Processing", "Packed", "Ready to Dispatch", "Shipped", "Delivered", "Cancelled"] : ["Pending", "Accepted", "Processing", "Packed", "Ready to Dispatch", "Shipped", "Delivered", "Cancelled"]; if (!allowed.includes(req.body.status)) { res.status(400); throw new Error("Invalid item status"); } const note = String(req.body.note || "").trim(); const statusDate = req.body.statusDate ? new Date(req.body.statusDate) : new Date(); if (Number.isNaN(statusDate.getTime())) { res.status(400); throw new Error("Enter a valid status date"); } if (req.seller.shippingMode === "self" && !req.body.statusDate) { res.status(400); throw new Error("Status date is required for self delivery"); } if (!note) { res.status(400); throw new Error("Add a verification note for this status update"); } const product = await Product.findOne({ _id: req.params.productId, seller: req.seller._id }); if (!product) { res.status(404); throw new Error("Seller product not found"); } const order = await Order.findOne({ _id: req.params.orderId, "items.product": product._id }); if (!order) { res.status(404); throw new Error("Order not found"); } if (req.seller.shippingMode !== "shiprocket" && req.body.status === "Shipped" && !order.shipping?.awbCode) { res.status(409); throw new Error("Use Add courier details to enter the courier name, tracking ID, and URL before marking this order shipped"); } const item = order.items.find((entry) => String(entry.product) === String(product._id)); item.sellerStatus = req.body.status; item.sellerStatusUpdatedAt = statusDate; if (req.body.status === "Processing") await ensureOrderInvoice(order, { seller: req.seller }); if (req.body.status === "Delivered") { if (product.isReturnable === false || Number(product.returnDays) === 0) { item.returnApplicable = false; item.returnDays = 0; } item.deliveredAt = statusDate; item.returnWindowClosesAt = item.returnApplicable && item.returnDays > 0 ? new Date(statusDate.getTime() + Number(item.returnDays) * 86400000) : statusDate; } order.timeline.push({ status: req.body.status, title: `${item.name} changed to ${req.body.status}`, comment: note, details: `Updated by seller ${req.seller.sellerNumber} on ${statusDate.toISOString()}` }); await order.save(); if (req.body.status === "Delivered" && !item.returnApplicable) { const settings = await StorefrontSetting.findOne({ singleton: "storefront" }).select("sellerSettlement"); await completeSellerItem({ order, item, seller: req.seller, config: settings?.sellerSettlement || {} }); await order.save(); } res.json(order); });

const roundMoney = (value) => Math.round((Number(value) || 0) * 100) / 100;
export const sellerSettlementBreakdown = (order, item, seller, config = {}) => {
  const grossAmount = roundMoney(item.price * item.quantity);
  const orderProductTotal = order.items.reduce((sum, entry) => sum + Number(entry.price) * Number(entry.quantity), 0);
  const configuredShippingCost = Number(item.shippingCost || 0) * Number(item.quantity || 1);
  const actualShippingCost = Number(order.shipping?.actualCost || 0) * (grossAmount / Math.max(0.01, orderProductTotal));
  const codCharge = order.payment?.provider === "cod" && order.codChargePaidBy !== "customer" ? roundMoney(Number(order.codCharge || 0) * (grossAmount / Math.max(0.01, orderProductTotal))) : 0;
  const shippingCharge = roundMoney(Math.max(0, actualShippingCost || configuredShippingCost));
  const shippingPaidBy = item.shippingPaidBy || (item.shippingIncludedInPrice ? "seller" : "customer");
  const commissionRate = Number(item.sellerCommissionRate ?? seller.commissionRate ?? 20);
  const commissionAmount = roundMoney(grossAmount * commissionRate / 100);
  const paymentGatewayFeeRate = order.payment?.provider === "cod" ? 0 : Number(config.paymentGatewayFeeRate ?? 2);
  const customerPaidShipping = shippingPaidBy === "customer" ? Number(item.shippingCharge || 0) * Number(item.quantity || 1) : 0;
  const paymentGatewayFee = roundMoney(grossAmount * paymentGatewayFeeRate / 100);
  const paymentGatewayGst = roundMoney(paymentGatewayFee * 18 / 100);
  const gstOnCommission = roundMoney(commissionAmount * 18 / 100);
  const returnRtoCharge = item.rtoApplicable === false ? 0 : roundMoney(item.returnRtoCharge || 0);
  const usesShipRocket = Boolean(order.shipping?.shipmentId || order.shipping?.shiprocketOrderId || order.shipping?.syncPayload);
  const shippingDeduction = roundMoney(shippingPaidBy === "seller"
    ? shippingCharge
    : usesShipRocket && item.shippingMode === "fixed_customer"
      ? Math.max(0, shippingCharge - customerPaidShipping)
      : 0);
  const netAmount = roundMoney(Math.max(0, grossAmount - commissionAmount - paymentGatewayFee - paymentGatewayGst - shippingDeduction - codCharge - gstOnCommission - returnRtoCharge));
  const returnWindowClosesAt = item.returnWindowClosesAt || new Date(new Date(item.deliveredAt || order.fulfillment?.deliveredAt || order.updatedAt).getTime() + Number(item.returnDays || 0) * 86400000);
  return { grossAmount, commissionRate, commissionAmount, paymentGatewayFeeRate, paymentGatewayFee, paymentGatewayGst, shippingCharge, shippingDeduction, customerPaidShipping, shippingPaidBy, codCharge, gstOnCommission, returnRtoCharge, otherCharges: 0, netAmount, returnWindowClosesAt };
};

export const completeSellerItem = async ({ order, item, seller, config }) => {
  const breakdown = sellerSettlementBreakdown(order, item, seller, config);
  if (item.sellerStatus === "Completed") return { payout: await SellerPayout.findOne({ seller: seller._id, order: order._id, product: item.product?._id || item.product }), breakdown };
  if (item.sellerStatus !== "Delivered" || breakdown.returnWindowClosesAt > new Date() || (item.returnRequest?.status && item.returnRequest.status !== "Rejected")) return { payout: null, breakdown };
  const productId = item.product?._id || item.product;
  let payout = await SellerPayout.findOne({ seller: seller._id, order: order._id, product: productId });
  if (!payout) {
    payout = await SellerPayout.create({ seller: seller._id, order: order._id, product: productId, type: "order_settlement", ...breakdown, settledAt: new Date(), description: `Settlement for ${order.orderNumber}` });
    await Seller.updateOne({ _id: seller._id }, { $inc: { walletBalance: breakdown.netAmount } });
    const referralRate = Number(config.referralCommissionRate || 0);
    if (seller.referredBy && referralRate > 0 && breakdown.commissionAmount > 0) {
      const referralAmount = roundMoney(breakdown.commissionAmount * referralRate / 100);
      try {
        await SellerPayout.create({ seller: seller.referredBy, order: order._id, product: productId, type: "referral_commission", grossAmount: breakdown.commissionAmount, commissionRate: referralRate, commissionAmount: 0, paymentGatewayFeeRate: 0, netAmount: referralAmount, settledAt: new Date(), description: `Referral commission from ${seller.sellerNumber} · ${order.orderNumber}` });
        await Seller.updateOne({ _id: seller.referredBy }, { $inc: { walletBalance: referralAmount } });
      } catch (error) { if (error.code !== 11000) throw error; }
    }
  }
  item.sellerStatus = "Completed";
  item.sellerStatusUpdatedAt = payout.settledAt || new Date();
  item.sellerPayoutAmount = breakdown.netAmount;
  item.sellerPayoutCredited = true;
  item.settlement = { ...breakdown, platformFee: breakdown.commissionAmount, settledAt: payout.settledAt };
  if (!order.timeline.some((entry) => entry.status === "Completed" && entry.title === `${item.name} completed`)) order.timeline.push({ status: "Completed", title: `${item.name} completed`, comment: `${item.returnApplicable && item.returnDays > 0 ? "Return window closed" : "No-return item delivered"}. ₹${breakdown.netAmount.toFixed(2)} credited to seller wallet.` });
  return { payout, breakdown };
};

export const listSellerOrders = asyncHandler(async (req, res) => {
  const productIds = await Product.find({ seller: req.seller._id }).distinct("_id");
  let orders = await Order.find({ "items.product": { $in: productIds } }).sort({ createdAt: -1 });
  const settings = await StorefrontSetting.findOne({ singleton: "storefront" }).select("sellerSettlement");
  for (const order of orders) {
    let changed = false;
    for (const item of order.items.filter((entry) => productIds.some((id) => id.equals(entry.product?._id || entry.product)))) {
      const previousStatus = item.sellerStatus;
      await completeSellerItem({ order, item, seller: req.seller, config: settings?.sellerSettlement || {} });
      if (item.sellerStatus !== previousStatus) changed = true;
    }
    if (changed) await order.save();
  }
  orders = await Order.populate(orders, [{ path: "customer", select: "name email phone profileImage" }, { path: "items.product", select: "name mainImage imageVariants" }, { path: "items.seller", select: "companyName sellerNumber email mobile address city state pinCode isGstRegistered gstStatus gstVerificationStatus gstNumber" }]);
  res.json(orders.map((order) => ({ ...order.toObject(), items: order.items.filter((item) => productIds.some((id) => id.equals(item.product?._id || item.product))).map((item) => ({ ...item.toObject(), product: item.product?._id || item.product, productDetails: item.product || null })) })));
});

export const settleSellerOrderItem = asyncHandler(async (req, res) => {
  const product = await Product.findOne({ _id: req.params.productId, seller: req.seller._id });
  const order = product && await Order.findOne({ _id: req.params.orderId, "items.product": product._id });
  if (!order) { res.status(404); throw new Error("Seller order item not found"); }
  const item = order.items.find((entry) => String(entry.product) === String(product._id));
  if (!["Delivered", "Completed"].includes(item.sellerStatus)) { res.status(409); throw new Error("Commission is available after delivery"); }
  if (item.returnRequest?.status && !["Rejected"].includes(item.returnRequest.status)) { res.status(409); throw new Error("This item has an active or completed return and cannot be settled"); }
  const settings = await StorefrontSetting.findOne({ singleton: "storefront" }).select("sellerSettlement");
  const result = await completeSellerItem({ order, item, seller: req.seller, config: settings?.sellerSettlement || {} });
  if (result.payout) await order.save();
  res.json({ order, payout: result.payout || { ...result.breakdown, commissionAmount: result.breakdown.commissionAmount }, pending: !result.payout, returnWindowClosesAt: result.breakdown.returnWindowClosesAt });
});

export const reviewAdminSellerSettlement = asyncHandler(async (req, res) => {
  const order = await Order.findById(req.params.orderId);
  if (!order) { res.status(404); throw new Error("Order not found"); }
  const item = order.items.find((entry) => String(entry.product?._id || entry.product) === String(req.params.productId));
  if (!item?.seller) { res.status(404); throw new Error("Seller order item not found"); }
  if (!["Delivered", "Completed"].includes(item.sellerStatus)) { res.status(409); throw new Error("Settlement review is available after delivery"); }
  const seller = await Seller.findById(item.seller);
  if (!seller) { res.status(404); throw new Error("Seller not found"); }
  const settings = await StorefrontSetting.findOne({ singleton: "storefront" }).select("sellerSettlement");
  const result = await completeSellerItem({ order, item, seller, config: settings?.sellerSettlement || {} });
  if (result.payout) await order.save();
  res.json({ order, payout: result.payout || { ...result.breakdown }, pending: !result.payout, returnWindowClosesAt: result.breakdown.returnWindowClosesAt });
});

export const updateSellerItemReturn = asyncHandler(async (req, res) => {
  const product = await Product.findOne({ _id: req.params.productId, seller: req.seller._id });
  const order = product && await Order.findOne({ _id: req.params.orderId, "items.product": product._id });
  if (!order) { res.status(404); throw new Error("Seller return request was not found"); }
  const item = order.items.find((entry) => String(entry.product) === String(product._id));
  if (!item.returnRequest?.status) { res.status(409); throw new Error("The customer has not requested a return for this item"); }
  const status = String(req.body.status || "");
  if (!["Approved", "Rejected", "Pickup Arranged", "Received", "Closed"].includes(status)) { res.status(400); throw new Error("Invalid return status"); }
  const note = String(req.body.note || "").trim();
  if (!note) { res.status(400); throw new Error("Add return processing notes"); }
  const statusDate = req.body.statusDate ? new Date(req.body.statusDate) : new Date();
  if (Number.isNaN(statusDate.getTime())) { res.status(400); throw new Error("Enter a valid return status date"); }
  item.returnRequest.status = status; item.returnRequest.reviewNote = note; item.returnRequest.reviewedAt = statusDate;
  if (status === "Pickup Arranged") item.returnRequest.pickupDate = statusDate;
  if (["Received", "Closed"].includes(status)) { item.returnRequest.receivedAt = statusDate; item.sellerStatus = "Returned"; item.sellerStatusUpdatedAt = statusDate; }
  else item.sellerStatus = status === "Approved" ? "Return Approved" : status === "Rejected" ? "Return Rejected" : "Return Requested";
  order.timeline.push({ status: `Return ${status}`, title: `${item.name} return ${status.toLowerCase()}`, comment: note, details: `Updated by seller ${req.seller.sellerNumber}` });
  if (["Received", "Closed"].includes(status) && order.items.every((entry) => entry.sellerStatus === "Returned")) order.status = "Returned";
  await order.save();
  if (["Received", "Closed"].includes(status)) await debitShiprocketReturn({ order, item });
  res.json(order);
});

export const sellerWallet = asyncHandler(async (req, res) => res.json({ walletBalance: req.seller.walletBalance, commissionRate: req.seller.commissionRate, bankDetails: req.seller.bankDetails, payouts: await SellerPayout.find({ seller: req.seller._id }).populate("order", "orderNumber").populate("product", "name sku").sort({ createdAt: -1 }), adjustments: await SellerWalletAdjustment.find({ seller: req.seller._id }).populate("order", "orderNumber").populate("product", "name sku").sort({ createdAt: -1 }) }));

const transactionDateRange = (period, from, to) => {
  const now = new Date();
  const start = new Date(now); start.setHours(0, 0, 0, 0);
  const end = new Date(now); end.setHours(23, 59, 59, 999);
  if (period === "yesterday") { start.setDate(start.getDate() - 1); end.setDate(end.getDate() - 1); }
  else if (period === "week") start.setDate(start.getDate() - 6);
  else if (period === "month") start.setDate(1);
  else if (period === "last_month") { start.setMonth(start.getMonth() - 1, 1); end.setDate(0); }
  else if (period === "custom") {
    const customStart = from ? new Date(`${from}T00:00:00`) : null;
    const customEnd = to ? new Date(`${to}T23:59:59.999`) : null;
    return { start: customStart && !Number.isNaN(customStart.getTime()) ? customStart : null, end: customEnd && !Number.isNaN(customEnd.getTime()) ? customEnd : null };
  } else if (period !== "today") return { start: null, end: null };
  return { start, end };
};

const sellerTransactionData = async (sellerId, query = {}) => {
  const [seller, payouts, withdrawals, adjustments] = await Promise.all([
    Seller.findById(sellerId).select("sellerNumber name companyName walletBalance"),
    SellerPayout.find({ seller: sellerId }).populate("order", "orderNumber customer payment").populate("product", "name sku").lean(),
    SellerWithdrawal.find({ seller: sellerId }).lean(),
    SellerWalletAdjustment.find({ seller: sellerId }).populate("order", "orderNumber customer payment").populate("product", "name sku").lean()
  ]);
  if (!seller) throw new Error("Seller not found");
  let items = [
    ...payouts.map((item) => ({
      _id: `payout-${item._id}`, transactionId: `TXN-${String(item._id).slice(-10).toUpperCase()}`, sourceId: item._id,
      sellerId: seller.sellerNumber, orderId: item.order?.orderNumber || "—", customerName: item.order?.customer?.name || "—",
      paymentMethod: item.order?.payment?.provider || "—", description: item.description || `${item.order?.orderNumber || "Order"} Settlement`,
      type: "Credit", amount: Number(item.netAmount || 0), settlementAmount: Number(item.grossAmount || 0), platformFee: Number(item.commissionAmount || 0),
      paymentGatewayCharge: Number(item.paymentGatewayFee || 0), shippingCharge: Number(item.shippingDeduction ?? (item.shippingPaidBy === "seller" ? item.shippingCharge : 0)),
      codCharge: Number(item.codCharge || 0),
      tax: Number(item.gstOnCommission || 0), netAmount: Number(item.netAmount || 0), status: "Completed", remarks: item.description || "Wallet settlement credited", adminNotes: "", date: item.settledAt || item.createdAt
    })),
    ...adjustments.map((item) => ({
      _id: `adjustment-${item._id}`, transactionId: `TXN-${String(item._id).slice(-10).toUpperCase()}`, sourceId: item._id,
      sellerId: seller.sellerNumber, orderId: item.order?.orderNumber || "—", customerName: item.order?.customer?.name || "—", paymentMethod: item.order?.payment?.provider || "—",
      description: item.description, type: "Debit", amount: Number(item.amount || 0), settlementAmount: 0, platformFee: 0, paymentGatewayCharge: 0,
      shippingCharge: Number(item.shippingCharge || 0), codCharge: 0, tax: 0, netAmount: -Number(item.amount || 0), status: "Completed", remarks: item.description, adminNotes: "", date: item.createdAt
    })),
    ...withdrawals.map((item) => ({
      _id: `withdrawal-${item._id}`, transactionId: `TXN-${String(item._id).slice(-10).toUpperCase()}`, sourceId: item._id,
      sellerId: seller.sellerNumber, orderId: "—", customerName: "—", paymentMethod: `${item.bankSnapshot?.bankName || "Bank"} ••••${String(item.bankSnapshot?.accountNumber || "").slice(-4)}`,
      description: "Withdrawal to Bank A/c", type: "Debit", amount: Number(item.amount || 0), settlementAmount: 0, platformFee: 0, paymentGatewayCharge: 0,
      shippingCharge: 0, codCharge: 0, tax: 0, netAmount: Number(item.amount || 0), status: ({ paid: "Success", approved: "Processing", pending: "Pending", rejected: "Rejected" })[item.status] || item.status,
      remarks: "Seller wallet withdrawal", adminNotes: item.adminNote || "", date: item.paidAt || item.createdAt
    }))
  ].sort((a, b) => new Date(b.date) - new Date(a.date));
  const allItems = items;
  const { start, end } = transactionDateRange(query.period, query.from, query.to);
  if (start) items = items.filter((item) => new Date(item.date) >= start);
  if (end) items = items.filter((item) => new Date(item.date) <= end);
  if (["Credit", "Debit"].includes(query.type)) items = items.filter((item) => item.type === query.type);
  if (query.status && query.status !== "All") items = items.filter((item) => item.status.toLowerCase() === String(query.status).toLowerCase());
  const search = String(query.q || "").trim().toLowerCase();
  if (search) items = items.filter((item) => [item.orderId, item.transactionId, item.customerName, item.description, item.amount].some((value) => String(value).toLowerCase().includes(search)));
  const page = Math.max(1, Number(query.page) || 1); const limit = [10, 25, 50, 100].includes(Number(query.limit)) ? Number(query.limit) : 10;
  const today = new Date(); today.setHours(0, 0, 0, 0);
  const credits = allItems.filter((item) => item.type === "Credit"); const debits = allItems.filter((item) => item.type === "Debit" && !["Rejected", "Failed", "Cancelled"].includes(item.status));
  return { items: items.slice((page - 1) * limit, page * limit), pagination: { page, limit, total: items.length, pages: Math.max(1, Math.ceil(items.length / limit)) }, summary: {
    availableBalance: Number(seller.walletBalance || 0), pendingSettlement: allItems.filter((item) => item.type === "Credit" && ["Pending", "Processing"].includes(item.status)).reduce((sum, item) => sum + item.amount, 0),
    totalCredit: credits.reduce((sum, item) => sum + item.amount, 0), totalDebit: debits.reduce((sum, item) => sum + item.amount, 0),
    todayCredit: credits.filter((item) => new Date(item.date) >= today).reduce((sum, item) => sum + item.amount, 0), todayDebit: debits.filter((item) => new Date(item.date) >= today).reduce((sum, item) => sum + item.amount, 0)
  } };
};

export const listSellerTransactions = asyncHandler(async (req, res) => res.json(await sellerTransactionData(req.seller._id, req.query)));
export const listAdminSellerTransactions = asyncHandler(async (req, res) => res.json(await sellerTransactionData(req.params.id, req.query)));

export const listSellerWithdrawals = asyncHandler(async (req, res) => res.json(await SellerWithdrawal.find({ seller: req.seller._id }).sort({ createdAt: -1 })));
export const requestSellerWithdrawalOtp = asyncHandler(async (req, res) => {
  const amount = Math.round(Number(req.body.amount) * 100) / 100;
  if (!Number.isFinite(amount) || amount <= 0 || amount > Number(req.seller.walletBalance || 0)) { res.status(400); throw new Error("Enter a valid withdrawal amount within your available balance"); }
  if (req.body.challengeId) { const challenge = await SellerWithdrawalOtp.findOne({ _id: req.body.challengeId, seller: req.seller._id, amount, expiresAt: { $gt: new Date() }, verifiedAt: null }); if (!challenge || challenge.attempts >= 5 || challenge.codeHash !== hashResetCode(req.body.otp)) { if (challenge) { challenge.attempts += 1; await challenge.save(); } res.status(400); throw new Error("Withdrawal OTP is invalid or expired"); } challenge.verifiedAt = new Date(); await challenge.save(); return res.json({ challengeId: challenge._id, message: "Email OTP verified" }); }
  const code = String(crypto.randomInt(100000, 1000000)); await SellerWithdrawalOtp.deleteMany({ seller: req.seller._id });
  const challenge = await SellerWithdrawalOtp.create({ seller: req.seller._id, email: req.seller.email, amount, codeHash: hashResetCode(code), expiresAt: new Date(Date.now() + 10 * 60 * 1000) });
  try { await sendEmail({ to: req.seller.email, subject: "Confirm your seller withdrawal", text: `Hello ${req.seller.companyName},\n\nYour withdrawal OTP is ${code}. It expires in 10 minutes.\n\nDo not share this code.` }); } catch (_error) { await challenge.deleteOne(); res.status(502); throw new Error("Unable to send the withdrawal OTP. Please try again."); }
  res.json({ challengeId: challenge._id, message: `Withdrawal OTP sent to ${req.seller.email}` });
});
export const requestSellerWithdrawal = asyncHandler(async (req, res) => {
  const amount = Math.round(Number(req.body.amount) * 100) / 100;
  if (!Number.isFinite(amount) || amount <= 0) { res.status(400); throw new Error("Enter a valid withdrawal amount"); }
  const bank = req.seller.bankDetails || {};
  if (![bank.accountType, bank.accountNumber, bank.ifsc, bank.bankName, bank.accountHolderName, bank.verifiedAt].every(Boolean)) { res.status(400); throw new Error("Verify your bank details before requesting a withdrawal"); }
  const challenge = await SellerWithdrawalOtp.findOne({ _id: req.body.otpChallengeId, seller: req.seller._id, amount, verifiedAt: { $ne: null }, expiresAt: { $gt: new Date() } });
  if (!challenge) { res.status(400); throw new Error("Verify the email OTP before submitting this withdrawal"); }
  const updated = await Seller.findOneAndUpdate({ _id: req.seller._id, walletBalance: { $gte: amount } }, { $inc: { walletBalance: -amount } }, { new: true });
  if (!updated) { res.status(409); throw new Error("Insufficient wallet balance"); }
  try {
    const withdrawal = await SellerWithdrawal.create({ seller: req.seller._id, amount, bankSnapshot: bank });
    await challenge.deleteOne();
    const [assignment, admins] = await Promise.all([
      WorkAssignment.findOne({ entityType: "Seller", entity: req.seller._id, action: "payouts", active: true }).populate("teamLeader staff", "name email"),
      User.find({ role: "Super Admin", isActive: true }).select("name email")
    ]);
    const recipients = [...new Set([...admins, assignment?.teamLeader, assignment?.staff].filter(Boolean).map((user) => user.email))];
    if (recipients.length) sendEmail({ to: recipients.join(","), subject: `Seller withdrawal request · ${req.seller.sellerNumber}`, text: `${req.seller.companyName} requested a withdrawal of INR ${amount.toFixed(2)}. Review it in Seller Withdrawals.` }).catch(() => {});
    res.status(201).json(withdrawal);
  }
  catch (error) { await Seller.updateOne({ _id: req.seller._id }, { $inc: { walletBalance: amount } }); throw error; }
});

const findSellerOrder = async (seller, orderId) => {
  const productIds = await Product.find({ seller: seller._id }).distinct("_id");
  return Order.findOne({ _id: orderId, "items.product": { $in: productIds } }).populate("customer", "name email");
};
export const generateSellerInvoice = asyncHandler(async (req, res) => {
  const order = await findSellerOrder(req.seller, req.params.orderId);
  if (!order) { res.status(404); throw new Error("Order not found"); }
  const sellerProductIds = await Product.find({ seller: req.seller._id }).distinct("_id");
  const sellerItems = order.items.filter((item) => sellerProductIds.some((id) => id.equals(item.product)));
  if (!sellerItems.length || sellerItems.some((item) => item.sellerStatus !== "Ready to Dispatch")) { res.status(409); throw new Error("Mark every seller item Ready to Dispatch before sending the packet to ShipRocket"); }
  const store = await StorefrontSetting.findOne({ singleton: "storefront" });
  order.invoiceNumber ||= `INV-${order.orderNumber.replace(/\D/g, "") || Date.now()}`;
  order.invoiceGeneratedAt = new Date();
  order.invoiceStore = { shopName: store?.shopName || "Store", logoUrl: store?.logoUrl || store?.footerLogoUrl, address: store?.address, email: store?.email, sellerName: req.seller.companyName, sellerAddress: [req.seller.address, req.seller.city, req.seller.state, req.seller.pinCode].filter(Boolean).join(", "), sellerGstNumber: sellerHasVerifiedGst(req.seller) ? req.seller.gstNumber : undefined };
  order.fulfillment = { ...order.fulfillment, invoiceUrl: `/api/orders/${order._id}/invoice` };
  await order.save();
  res.json(order);
});
export const syncSellerShipRocket = asyncHandler(async (req, res) => {
  if (req.seller.shippingMode !== "shiprocket") { res.status(409); throw new Error("Select ShipRocket as your shipping mode first"); }
  const order = await findSellerOrder(req.seller, req.params.orderId);
  if (!order) { res.status(404); throw new Error("Order not found"); }
  if (order.shipping?.awbCode) return res.json(order);
  const settings = await ShipRocketSetting.findOne({ singleton: "shiprocket", isActive: true });
  if (!settings) { res.status(503); throw new Error("ShipRocket is not active. Ask the administrator to configure and enable ShipRocket settings."); }
  if (!settings.email || !settings.password) { res.status(503); throw new Error("ShipRocket API credentials are incomplete. Ask the administrator to save the API-user email and password."); }
  if (!order.shipping?.syncPayload) { res.status(409); throw new Error("Shipping details are missing for this order, so a ShipRocket packet cannot be created. Ask the administrator to review this order."); }
  const pickup = req.seller.pickupSameAsBusiness === false ? { address: req.seller.pickupAddress, city: req.seller.pickupCity, state: req.seller.pickupState, pinCode: req.seller.pickupPinCode } : { address: req.seller.address, city: req.seller.city, state: req.seller.state, pinCode: req.seller.pinCode };
  if (![pickup.address, pickup.city, pickup.state].every((value) => String(value || "").trim())) { res.status(409); throw new Error("Complete your pickup address, city, and state in Seller Profile before sending this packet."); }
  if (!/^\d{6}$/.test(String(pickup.pinCode || ""))) { res.status(409); throw new Error("Add a valid 6-digit pincode to your pickup address before using ShipRocket."); }
  const sellerProducts = await Product.find({ seller: req.seller._id }).select("length breadth height dimensionUnit actualWeight weightUnit volumetricWeight");
  const productMap = new Map(sellerProducts.map((product) => [String(product._id), product]));
  const sellerItems = order.items.filter((item) => productMap.has(String(item.product)));
  if (!sellerItems.length || sellerItems.some((item) => item.sellerStatus !== "Ready to Dispatch")) { res.status(409); throw new Error("Mark every seller item Ready to Dispatch before sending the packet to ShipRocket"); }
  const invalidParcelProduct = sellerItems.map((item) => productMap.get(String(item.product))).find((product) => !(Number(product?.length) > 0 && Number(product?.breadth) > 0 && Number(product?.height) > 0 && Number(product?.actualWeight) > 0));
  if (invalidParcelProduct) { res.status(409); throw new Error("One or more products are missing weight or package dimensions. Update Length, Width, Height, and Actual Weight in Product Data."); }
  let token;
  try { token = await shiprocketToken(settings); } catch (error) { res.status(502); throw new Error(error.message); }
  const pickupAlias = `SELLER-${req.seller.sellerNumber}`.slice(0, 36);
  const sellerPhone = shiprocketPhone(req.seller.mobile);
  const customerPhone = shiprocketPhone(order.address?.phone || order.shipping.syncPayload.billing_phone);
  if (!/^\d{10}$/.test(sellerPhone)) { res.status(409); throw new Error("Add a valid 10-digit mobile number to the Seller Profile before using ShipRocket."); }
  if (!/^\d{10}$/.test(customerPhone)) { res.status(409); throw new Error("The delivery address must have a valid 10-digit customer phone number before using ShipRocket."); }
  const pickupResponse = await fetch("https://apiv2.shiprocket.in/v1/external/settings/company/addpickup", { method: "POST", headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` }, body: JSON.stringify({ pickup_location: pickupAlias, name: req.seller.name || req.seller.companyName, email: req.seller.email, phone: sellerPhone, address: pickup.address, city: pickup.city, state: pickup.state, country: "India", pin_code: String(pickup.pinCode) }) });
  const pickupData = await pickupResponse.json().catch(() => ({}));
  const pickupExists = !pickupResponse.ok && /already|exist/i.test(String(pickupData.message || pickupData.error || ""));
  const pickupPermissionRestricted = [401, 403].includes(pickupResponse.status) || /unauthorized|permission/i.test(String(pickupData.message || pickupData.error || ""));
  if (!pickupResponse.ok && !pickupExists && !pickupPermissionRestricted) { res.status(502); throw new Error(shiprocketErrorMessage(pickupData, "ShipRocket could not register your pickup address. Check the address and try again.")); }
  const dimensions = sellerItems.map((item) => productMap.get(String(item.product)));
  const dimensionCm = (product, field) => (Number(product?.[field]) || 1) * (product?.dimensionUnit === "in" ? 2.54 : 1);
  const chargeableKg = (product) => Math.max(product?.weightUnit === "g" ? Number(product.actualWeight) / 1000 : Number(product?.actualWeight) || 0, Number(product?.volumetricWeight) || 0);
  const address = order.address || {};
  const shipmentPayload = { ...order.shipping.syncPayload, order_id: `${order.orderNumber}-${req.seller.sellerNumber}`.slice(0, 50), order_date: new Date().toISOString().replace("T", " ").slice(0, 16), pickup_location: pickupAlias, billing_customer_name: address.name || order.shipping.syncPayload.billing_customer_name, billing_last_name: "", billing_address: address.billingAddress || address.shippingAddress, billing_city: address.billingCity || address.city, billing_state: address.billingState || address.state, billing_country: "India", billing_pincode: String(address.billingPostalCode || address.postalCode || ""), billing_email: address.email || order.shipping.syncPayload.billing_email, billing_phone: customerPhone, shipping_is_billing: false, shipping_customer_name: address.name || order.shipping.syncPayload.billing_customer_name, shipping_last_name: "", shipping_address: address.shippingAddress || address.billingAddress, shipping_city: address.city || address.billingCity, shipping_state: address.state || address.billingState, shipping_country: "India", shipping_pincode: String(address.postalCode || address.billingPostalCode || ""), shipping_email: address.email || order.shipping.syncPayload.billing_email, shipping_phone: customerPhone, order_items: sellerItems.map((item) => ({ name: item.name, sku: item.sku, units: item.quantity, selling_price: item.price, discount: 0, tax: Number(item.gstAmount || 0) })), shipping_charges: Number(order.shipping?.amount || order.shippingTotal || 0), giftwrap_charges: 0, transaction_charges: 0, total_discount: Number(order.discountTotal || 0), sub_total: sellerItems.reduce((sum, item) => sum + item.price * item.quantity, 0), length: Math.max(1, ...dimensions.map((product) => dimensionCm(product, "length"))), breadth: Math.max(1, ...dimensions.map((product) => dimensionCm(product, "breadth"))), height: Math.max(1, ...dimensions.map((product) => dimensionCm(product, "height"))), weight: Math.max(0.1, sellerItems.reduce((sum, item) => sum + chargeableKg(productMap.get(String(item.product))) * item.quantity, 0)) };
  if (!String(shipmentPayload.channel_id || "").trim()) delete shipmentPayload.channel_id;
  if (!/^\d{6}$/.test(shipmentPayload.billing_pincode) || !/^\d{6}$/.test(shipmentPayload.shipping_pincode)) { res.status(409); throw new Error("Billing and delivery addresses must have valid 6-digit pincodes before using ShipRocket."); }
  let orderData = order.shipping?.shipmentId ? { order_id: order.shipping.shiprocketOrderId, shipment_id: order.shipping.shipmentId } : null;
  let orderResponse;
  if (!orderData) {
    orderResponse = await fetch("https://apiv2.shiprocket.in/v1/external/orders/create/adhoc", { method: "POST", headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` }, body: JSON.stringify(shipmentPayload) });
    orderData = await orderResponse.json().catch(() => ({}));
  }
  if (orderResponse && !orderResponse.ok) {
    const rawMessage = shiprocketErrorMessage(orderData, "ShipRocket could not create the shipment. Verify delivery serviceability and parcel information.");
    const pickupProblem = pickupPermissionRestricted && /pickup|location|warehouse|address/i.test(String(rawMessage || ""));
    res.status(502);
    throw new Error(pickupProblem
      ? `ShipRocket API access cannot create this seller pickup location. Add a pickup location named “${pickupAlias}” in the ShipRocket dashboard using the seller's pickup address, then retry.`
      : [401, 403].includes(orderResponse.status) || /unauthorized|permission/i.test(String(rawMessage || ""))
        ? "ShipRocket denied shipment creation for this API user. Enable order and courier permissions for the API user in ShipRocket Settings → API."
        : rawMessage || "ShipRocket could not create the shipment. Verify delivery serviceability and parcel information.");
  }
  const shipmentId = orderData.shipment_id;
  if (shipmentId && !order.shipping?.shipmentId) {
    order.shipping = { ...order.shipping, shiprocketOrderId: String(orderData.order_id || ""), shipmentId: String(shipmentId), syncStatus: "ShipRocket order created; assigning courier", syncPayload: order.shipping.syncPayload };
    await order.save();
  }
  let awbCode = orderData.awb_code || "";
  let courierName = orderData.courier_name || "";
  let courierId = settings.preferredCourierId || "";
  let actualShippingCost = Number(orderData.freight_charges || orderData.shipping_charges || orderData.shipping_amount || 0);
  let awbFailure = "";
  if (!awbCode && shipmentId) {
    const awbResponse = await fetch("https://apiv2.shiprocket.in/v1/external/courier/assign/awb", { method: "POST", headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` }, body: JSON.stringify({ shipment_id: shipmentId, ...(courierId ? { courier_id: Number(courierId) } : {}) }) });
    const awbData = await awbResponse.json().catch(() => ({}));
    if (awbResponse.ok) {
      awbCode = awbData.awb_code || awbData.response?.data?.awb_code || "";
      courierName = awbData.courier_name || awbData.response?.data?.courier_name || courierName;
      courierId = String(awbData.courier_company_id || awbData.response?.data?.courier_company_id || courierId || "");
      actualShippingCost = Number(awbData.freight_charges || awbData.response?.data?.freight_charges || awbData.response?.data?.shipping_charges || actualShippingCost || 0);
    } else awbFailure = [401, 403].includes(awbResponse.status) || /unauthorized|permission/i.test(String(awbData.message || awbData.error || "")) ? "ShipRocket created the shipment, but this API user is not permitted to assign a courier/AWB. Enable courier assignment permission in ShipRocket Settings → API." : String(awbData.message || awbData.error || "");
  }
  const trackingUrl = awbCode ? `https://shiprocket.co/tracking/${encodeURIComponent(awbCode)}` : "";
  if (!awbCode) { res.status(502); throw new Error(awbFailure || `ShipRocket created shipment ${shipmentId || "without an ID"}, but no courier/AWB was assigned. Check pickup and delivery pincode serviceability, preferred courier settings, and wallet balance, then retry.`); }
  let documents = { labelUrl: "", manifestUrl: "" };
  let documentWarning = "";
  try { documents = await generateShiprocketDocuments({ token, shipmentId }); }
  catch (error) { documentWarning = `Shipment and AWB created, but the label is not ready: ${error.message}`; }
  order.shipping = { ...order.shipping, actualCost: actualShippingCost || order.shipping.actualCost, shiprocketOrderId: String(orderData.order_id || ""), shipmentId: String(shipmentId || ""), awbCode, courierName, courierId, trackingUrl, labelUrl: documents.labelUrl, manifestUrl: documents.manifestUrl, shippedAt: new Date(), syncStatus: documentWarning || "Synced with ShipRocket", syncPayload: order.shipping.syncPayload };
  order.fulfillment = { ...order.fulfillment, carrier: courierName || "ShipRocket", trackingNumber: awbCode, shippingLabelUrl: documents.labelUrl, packingSlipUrl: documents.labelUrl, shippedAt: new Date() };
  sellerItems.forEach((item) => { item.sellerStatus = "Shipped"; item.sellerStatusUpdatedAt = new Date(); });
  order.timeline.push({ status: "Shipped", title: "Seller packet sent to ShipRocket", comment: awbCode ? `AWB ${awbCode}${courierName ? ` · ${courierName}` : ""}` : `Shipment ${shipmentId} created; AWB assignment pending`, details: `Sent by seller ${req.seller.sellerNumber}` });
  await order.save();
  res.json(order);
});

export const saveSellerManualCourier = asyncHandler(async (req, res) => {
  if (req.seller.shippingMode === "shiprocket") { res.status(409); throw new Error("ShipRocket sellers must use the ShipRocket dispatch action"); }
  const order = await findSellerOrder(req.seller, req.params.orderId);
  if (!order) { res.status(404); throw new Error("Order not found"); }
  const courierName = String(req.body.courierName || "").trim();
  const trackingId = String(req.body.trackingId || "").trim();
  const trackingUrl = String(req.body.trackingUrl || "").trim();
  if (!courierName || !trackingId || !trackingUrl) { res.status(400); throw new Error("Courier name, tracking ID, and tracking URL are required"); }
  if (!/^https?:\/\/[^\s]+$/i.test(trackingUrl)) { res.status(400); throw new Error("Enter a valid courier tracking URL beginning with http:// or https://"); }
  const sellerProductIds = await Product.find({ seller: req.seller._id }).distinct("_id");
  const sellerItems = order.items.filter((item) => sellerProductIds.some((id) => id.equals(item.product)));
  const isEditingShipment = Boolean(order.shipping?.awbCode && order.shipping?.syncStatus === "Manual courier details added");
  if (!isEditingShipment && (!sellerItems.length || sellerItems.some((item) => item.sellerStatus !== "Ready to Dispatch"))) { res.status(409); throw new Error("Mark every seller item Ready to Dispatch before adding courier details"); }
  const shippedAt = order.shipping?.shippedAt || new Date();
  order.shipping = { ...order.shipping, courierName, awbCode: trackingId, trackingUrl, shippedAt, syncStatus: "Manual courier details added" };
  order.fulfillment = { ...order.fulfillment, carrier: courierName, trackingNumber: trackingId, shippedAt };
  sellerItems.forEach((item) => { item.sellerStatus = "Shipped"; item.sellerStatusUpdatedAt = shippedAt; });
  order.status = "Shipped";
  order.timeline.push({ status: "Shipped", title: isEditingShipment ? "Courier tracking details updated" : "Order handed to courier", comment: `${courierName} · ${trackingId}`, details: trackingUrl });
  await order.save();
  res.json(order);
});

const payoutAssignment = (user, seller) => WorkAssignment.exists({ entityType: "Seller", entity: seller, action: "payouts", active: true, ...(user.role === "Team Leader" ? { teamLeader: user._id } : { staff: user._id }) });
const canApproveSellerPayout = async (user, seller) => user.role === "Super Admin" || user.role === "Team Leader" && await payoutAssignment(user, seller);

export const listAdminSellerWithdrawals = asyncHandler(async (req, res) => {
  let filter = {};
  if (req.user.role !== "Super Admin") {
    if (!["Team Leader", "Staff"].includes(req.user.role)) { res.status(403); throw new Error("Seller payout access is not available"); }
    const scope = req.user.role === "Team Leader" ? { teamLeader: req.user._id } : { staff: req.user._id };
    filter = { seller: { $in: await WorkAssignment.find({ ...scope, entityType: "Seller", action: "payouts", active: true }).distinct("entity") } };
  }
  res.json(await SellerWithdrawal.find(filter).populate("seller", "companyName sellerNumber email mobile").populate("processedBy", "name role").sort({ createdAt: -1 }));
});
export const processSellerWithdrawal = asyncHandler(async (req, res) => {
  if (!["approved", "rejected"].includes(req.body.status)) { res.status(400); throw new Error("Use Razorpay payout to mark an approved withdrawal paid"); }
  const withdrawal = await SellerWithdrawal.findOne({ _id: req.params.id, status: "pending" });
  if (!withdrawal) { res.status(404); throw new Error("Withdrawal must be pending for this action"); }
  if (!await canApproveSellerPayout(req.user, withdrawal.seller)) { res.status(403); throw new Error("Only the assigned Team Leader or Admin can approve this withdrawal"); }
  withdrawal.status = req.body.status; withdrawal.adminNote = String(req.body.adminNote || "").trim(); withdrawal.processedAt = new Date(); withdrawal.processedBy = req.user._id;
  if (req.body.status === "rejected") await Seller.updateOne({ _id: withdrawal.seller }, { $inc: { walletBalance: withdrawal.amount } });
  await withdrawal.save(); res.json(withdrawal);
});

export const requestSellerPayoutOtp = asyncHandler(async (req, res) => {
  const withdrawal = await SellerWithdrawal.findOne({ _id: req.params.id, status: "approved", "payout.payoutId": { $exists: false } });
  if (!withdrawal) { res.status(409); throw new Error("Withdrawal must be approved and not already sent"); }
  if (!await canApproveSellerPayout(req.user, withdrawal.seller)) { res.status(403); throw new Error("Only the assigned Team Leader or Admin can pay this withdrawal"); }
  const code = String(crypto.randomInt(100000, 1000000));
  await SellerWithdrawalPayoutOtp.deleteMany({ withdrawal: withdrawal._id, approver: req.user._id });
  const challenge = await SellerWithdrawalPayoutOtp.create({ withdrawal: withdrawal._id, approver: req.user._id, email: req.user.email, codeHash: hashResetCode(code), expiresAt: new Date(Date.now() + 10 * 60 * 1000) });
  try { await sendEmail({ to: req.user.email, subject: "Confirm Razorpay seller payout", text: `Hello ${req.user.name},\n\nYour OTP to pay INR ${withdrawal.amount.toFixed(2)} via Razorpay is ${code}. It expires in 10 minutes.\n\nDo not share this code.` }); }
  catch (_error) { await challenge.deleteOne(); res.status(502); throw new Error("Unable to send payout confirmation OTP. Please try again."); }
  res.json({ challengeId: challenge._id, message: `Payment OTP sent to ${req.user.email}` });
});

export const paySellerWithdrawal = asyncHandler(async (req, res) => {
  const withdrawal = await SellerWithdrawal.findOne({ _id: req.params.id, status: "approved", "payout.payoutId": { $exists: false } });
  if (!withdrawal) { res.status(409); throw new Error("Withdrawal must be approved and not already sent"); }
  if (!await canApproveSellerPayout(req.user, withdrawal.seller)) { res.status(403); throw new Error("Only the assigned Team Leader or Admin can pay this withdrawal"); }
  const challenge = await SellerWithdrawalPayoutOtp.findOne({ _id: req.body.challengeId, withdrawal: withdrawal._id, approver: req.user._id, expiresAt: { $gt: new Date() }, verifiedAt: null });
  if (!challenge || challenge.attempts >= 5 || challenge.codeHash !== hashResetCode(req.body.otp)) { if (challenge) { challenge.attempts += 1; await challenge.save(); } res.status(400); throw new Error("Payment OTP is invalid or expired"); }
  const [seller, method] = await Promise.all([Seller.findById(withdrawal.seller), PaymentMethod.findOne({ type: "razorpay", isActive: true }).select("+razorpay.keySecret")]);
  if (!seller || !method?.razorpay?.keyId || !method.razorpay.keySecret) { res.status(503); throw new Error("RazorpayX is not configured"); }
  const payout = await sendBankPayout({ credentials: method.razorpay, withdrawal, beneficiary: seller, idempotencyKey: `seller_withdrawal_${withdrawal._id}` });
  withdrawal.payout = payout;
  withdrawal.status = ["processed", "processed_with_fund_account", "paid"].includes(payout.status) ? "paid" : "approved";
  withdrawal.adminNote = `RazorpayX payout ${payout.payoutId} (${payout.status})`;
  withdrawal.processedAt = new Date(); withdrawal.processedBy = req.user._id;
  if (withdrawal.status === "paid") withdrawal.paidAt = new Date();
  challenge.verifiedAt = new Date();
  await Promise.all([withdrawal.save(), challenge.save()]);
  await challenge.deleteOne(); res.json(withdrawal);
});

export const listSellers = asyncHandler(async (req, res) => {
  const page = Math.max(1, Number.parseInt(req.query.page, 10) || 1);
  const limit = Math.min(100, Math.max(1, Number.parseInt(req.query.limit, 10) || 10));
  const search = String(req.query.q || "").trim();
  const escaped = search.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const filter = search ? { $or: [{ companyName: new RegExp(escaped, "i") }, { sellerNumber: new RegExp(escaped, "i") }, { email: new RegExp(escaped, "i") }] } : {};
  if (["Staff", "Team Leader"].includes(req.user.role)) { const ids = await WorkAssignment.find({ ...req.staffScope, entityType: "Seller", active: true }).distinct("entity"); filter._id = { $in: ids }; }
  const [sellers, total] = await Promise.all([
    Seller.find(filter).sort({ _id: -1 }).skip((page - 1) * limit).limit(limit),
    Seller.countDocuments(filter)
  ]);
  res.json({ items: sellers, pagination: { page, limit, total, pages: Math.max(1, Math.ceil(total / limit)) } });
});
export const createSellerImpersonation = asyncHandler(async (req, res) => {
  const seller = await Seller.findById(req.params.id);
  if (!seller) { res.status(404); throw new Error("Seller not found"); }
  if (seller.status !== "active") { res.status(409); throw new Error("Only an active seller account can be opened"); }
  const code = crypto.randomBytes(32).toString("base64url");
  const codeHash = crypto.createHash("sha256").update(code).digest("hex");
  await SellerImpersonation.create({ seller: seller._id, admin: req.user._id, codeHash, expiresAt: new Date(Date.now() + 2 * 60 * 1000) });
  await recordStaffAction(req, "Seller", seller._id, "seller_impersonation_created", `Admin opened the seller dashboard for ${seller.sellerNumber}`, { sellerNumber: seller.sellerNumber, expiresInSeconds: 120 });
  res.status(201).json({ code, expiresInSeconds: 120 });
});
export const exchangeSellerImpersonation = asyncHandler(async (req, res) => {
  const codeHash = crypto.createHash("sha256").update(String(req.body.code || "")).digest("hex");
  const grant = await SellerImpersonation.findOneAndDelete({ codeHash, expiresAt: { $gt: new Date() } });
  if (!grant) { res.status(401); throw new Error("This admin seller-login link is invalid, expired, or already used"); }
  const seller = await Seller.findOne({ _id: grant.seller, status: "active" });
  if (!seller) { res.status(401); throw new Error("Seller account is not available"); }
  const token = createToken({ _id: seller._id, role: "Seller" }, { expiresIn: "1h", claims: { impersonatedBy: String(grant.admin) } });
  res.json({ seller: publicSeller(seller), token, impersonated: true });
});
export const listSellerBalanceCollections = asyncHandler(async (req, res) => {
  const sellerFilter = { walletBalance: { $lte: -500 } };
  if (["Staff", "Team Leader"].includes(req.user.role)) {
    const ids = await WorkAssignment.find({ ...req.staffScope, entityType: "Seller", active: true }).distinct("entity");
    sellerFilter._id = { $in: ids };
  }
  const [sellers, history] = await Promise.all([
    Seller.find(sellerFilter).select("sellerNumber companyName name email mobile city state walletBalance").sort({ walletBalance: 1 }),
    SellerBalanceCollection.find().populate("seller", "sellerNumber companyName").populate("collectedBy", "name role").sort({ createdAt: -1 }).limit(100)
  ]);
  res.json({ sellers, history });
});

export const collectSellerBalance = asyncHandler(async (req, res) => {
  const amount = roundMoney(req.body.amount);
  if (!(amount > 0)) { res.status(400); throw new Error("Enter the amount received from the seller"); }
  const seller = await Seller.findById(req.params.id);
  if (!seller) { res.status(404); throw new Error("Seller not found"); }
  const before = Number(seller.walletBalance || 0);
  seller.walletBalance = roundMoney(before + amount);
  await seller.save();
  const collection = await SellerBalanceCollection.create({ seller: seller._id, amount, balanceBefore: before, balanceAfter: seller.walletBalance, paymentMethod: String(req.body.paymentMethod || "Cash"), reference: String(req.body.reference || ""), notes: String(req.body.notes || ""), collectedBy: req.user._id });
  res.status(201).json({ seller, collection, storefrontVisible: seller.walletBalance > -500 });
});
export const getAdminSellerReferrals = asyncHandler(async (req, res) => {
  const seller = await Seller.findById(req.params.id)
    .select("sellerNumber name companyName referralSellerId referredBy registeredAt createdAt")
    .populate("referredBy", "sellerNumber name companyName email mobile approvalStatus registeredAt createdAt")
    .lean();
  if (!seller) { res.status(404); throw new Error("Seller not found"); }
  const referrals = await Seller.find({ referredBy: seller._id })
    .select("sellerNumber name companyName email mobile city state approvalStatus status walletBalance registeredAt createdAt")
    .sort({ createdAt: -1 })
    .lean();
  res.json({ seller, referredBy: seller.referredBy || null, referralCount: referrals.length, referrals });
});
export const revealSellerPassword = asyncHandler(async (req, res) => {
  const seller = await Seller.findById(req.params.id).select("+passwordVault");
  if (!seller) { res.status(404); throw new Error("Seller not found"); }
  if (!seller.passwordVault) { res.status(409); throw new Error("Password is unavailable for this existing account. Reset it once to enable reveal."); }
  try { res.json({ password: decryptSellerPassword(seller.passwordVault) }); } catch (_error) { res.status(409); throw new Error("Password cannot be decrypted. Reset it to create a new password."); }
});
export const resetSellerPassword = asyncHandler(async (req, res) => {
  const seller = await Seller.findById(req.params.id).select("+password");
  if (!seller) { res.status(404); throw new Error("Seller not found"); }
  const password = String(crypto.randomInt(1000, 10000));
  seller.password = password;
  seller.passwordVault = encryptSellerPassword(password);
  await seller.save();
  res.json({ message: "Seller password reset", password });
});
export const listAdminSellerProducts = asyncHandler(async (req, res) => res.json(await Product.find({ seller: req.params.id }).populate("category", "name").populate("taxCategory", "name rate").sort({ updatedAt: -1 })));
export const listPendingSellerProducts = asyncHandler(async (_req, res) => res.json(await Product.find({ seller: { $ne: null }, approvalStatus: { $in: ["pending_new", "pending_update"] } }).populate("seller", "companyName sellerNumber email mobile gstNumber approvalStatus commissionRate").populate("category", "name").populate("taxCategory", "name rate").sort({ updatedAt: -1 })));
export const approveSellerProduct = asyncHandler(async (req, res) => {
  const seller = await Seller.findById(req.params.id);
  if (!seller || seller.approvalStatus !== "approved") { res.status(409); throw new Error("Approve the seller and all KYC documents before approving products"); }
  const product = await Product.findOne({ _id: req.params.productId, seller: req.params.id });
  if (!product) { res.status(404); throw new Error("Product not found"); }

  const approvedFields = product.approvalStatus === "pending_update" && product.pendingChanges
    ? productPayload(product.pendingChanges)
    : productPayload({
        shippingIncludedInPrice: product.shippingIncludedInPrice,
        shippingCharge: product.shippingCharge,
        shippingCost: product.shippingCost,
        shippingPaidBy: product.shippingPaidBy,
        prepaidAvailable: product.prepaidAvailable,
        codAvailable: product.codAvailable,
        rtoApplicable: product.rtoApplicable
      });
  const approved = await Product.findOneAndUpdate(
    { _id: product._id, seller: seller._id },
    {
      $set: { ...approvedFields, approvalStatus: "approved", approvalNote: "", status: "active", reviewedAt: new Date(), reviewedBy: req.user._id },
      $unset: { pendingChanges: 1, pendingChangeLog: 1 }
    },
    { new: true, runValidators: true }
  ).populate("category", "name").populate("taxCategory", "name rate");

  if (!approved) { res.status(409); throw new Error("Product approval could not be saved"); }
  await recordStaffAction(req, "Seller", seller._id, "product_approved", `${approved.name} approved`, { product: approved._id, approvalStatus: approved.approvalStatus });
  res.json(approved);
});
export const rejectSellerProduct = asyncHandler(async (req, res) => { const note = String(req.body.reason || "").trim(); if (!note) { res.status(400); throw new Error("A rejection reason is required"); } const product = await Product.findOne({ _id: req.params.productId, seller: req.params.id }); if (!product) { res.status(404); throw new Error("Product not found"); } product.approvalStatus = product.approvalStatus === "pending_update" ? "rejected_update" : "rejected_new"; product.approvalNote = note; product.reviewedAt = new Date(); product.reviewedBy = req.user._id; await product.save(); await recordStaffAction(req, "Seller", req.params.id, "product_rejected", `${product.name} rejected`, { product: product._id, reason: note }); res.json(product); });
export const reviewSellerKyc = asyncHandler(async (req, res) => { const seller = await Seller.findById(req.params.id); if (seller?.approvalStatus === "approved") { res.status(409); throw new Error("Approved seller KYC is locked"); } const doc = seller?.kyc?.[req.params.type]; if (!doc) { res.status(404); throw new Error("Seller document not found"); } if (!["approved", "rejected"].includes(req.body.status)) { res.status(400); throw new Error("Invalid KYC status"); } const reason = String(req.body.rejectionReason || "").trim(); if (req.body.status === "rejected" && !reason) { res.status(400); throw new Error("A rejection reason is required"); } doc.status = req.body.status; doc.rejectionReason = req.body.status === "rejected" ? reason : ""; doc.reviewedAt = new Date(); doc.reviewedBy = req.user._id; await seller.save(); await recordStaffAction(req, "Seller", seller._id, `kyc_${req.body.status}`, `${req.params.type} KYC ${req.body.status}`, { documentType: req.params.type, reason }); res.json(seller); });
export const updateSellerCommission = asyncHandler(async (req, res) => { const commissionRate = Number(req.body.commissionRate); if (!Number.isFinite(commissionRate) || commissionRate < 0 || commissionRate > 100) { res.status(400); throw new Error("Commission must be between 0 and 100"); } const seller = await Seller.findByIdAndUpdate(req.params.id, { commissionRate }, { new: true, runValidators: true }); if (!seller) { res.status(404); throw new Error("Seller not found"); } res.json(seller); });
export const updateSellerCompliance = asyncHandler(async (req, res) => {
  const allowed = ["gstStatus", "sellingPermission", "turnoverAlertThreshold", "annualTurnover", "autoRestrictSales"];
  const changes = Object.fromEntries(allowed.filter((field) => req.body[field] !== undefined).map((field) => [field, req.body[field]]));
  const seller = await Seller.findByIdAndUpdate(req.params.id, changes, { new: true, runValidators: true });
  if (!seller) { res.status(404); throw new Error("Seller not found"); }
  res.json(seller);
});
export const updateSellerByAdmin = asyncHandler(async (req, res) => {
  const seller = await Seller.findById(req.params.id);
  if (!seller) { res.status(404); throw new Error("Seller not found"); }
  const allowed = ["name", "companyName", "businessName", "email", "mobile", "address", "city", "state", "pinCode", "pickupSameAsBusiness", "pickupAddress", "pickupCity", "pickupState", "pickupPinCode", "profileImage", "shippingMode", "status", "isGstRegistered", "gstNumber", "gstLegalName", "gstState", "businessState", "gstStatus", "gstVerificationStatus", "sellingPermission", "declarationAccepted", "turnoverAlertThreshold", "annualTurnover", "autoRestrictSales", "commissionRate"];
  allowed.forEach((field) => { if (req.body[field] !== undefined) seller[field] = req.body[field]; });
  if (req.body.bankDetails) {
    const bankFields = ["accountType", "accountNumber", "ifsc", "bankName", "branch", "accountHolderName"];
    bankFields.forEach((field) => { if (req.body.bankDetails[field] !== undefined) seller.bankDetails[field] = req.body.bankDetails[field]; });
  }
  seller.email = String(seller.email || "").trim().toLowerCase();
  seller.mobile = String(seller.mobile || "").replace(/\D/g, "");
  if (!/^\S+@\S+\.\S+$/.test(seller.email)) { res.status(400); throw new Error("Enter a valid seller email address"); }
  if (seller.mobile.length < 10 || seller.mobile.length > 15) { res.status(400); throw new Error("Enter a valid seller mobile number"); }
  if (!/^\d{6}$/.test(String(seller.pinCode || ""))) { res.status(400); throw new Error("Business PIN code must be 6 digits"); }
  if (seller.pickupSameAsBusiness === false && ![seller.pickupAddress, seller.pickupCity, seller.pickupState, seller.pickupPinCode].every(Boolean)) { res.status(400); throw new Error("Complete all pickup-address fields"); }
  if (seller.isGstRegistered) {
    if (!seller.gstNumber) { res.status(400); throw new Error("GSTIN is required for a GST-registered seller"); }
    seller.gstStatus = req.body.gstStatus || seller.gstStatus || "verified";
  } else {
    seller.gstNumber = undefined; seller.gstLegalName = undefined; seller.gstState = undefined;
    seller.gstStatus = "not_registered"; seller.gstVerificationStatus = "pending"; seller.sellingPermission = "same_state";
  }
  try { await seller.save(); }
  catch (error) { if (error.code === 11000) { res.status(409); throw new Error("Email, mobile number, or GSTIN is already used by another seller"); } throw error; }
  res.json(seller);
});
export const approveSeller = asyncHandler(async (req, res) => { const seller = await Seller.findById(req.params.id); if (!seller) { res.status(404); throw new Error("Seller not found"); } if (!Number.isFinite(Number(seller.commissionRate)) || Number(seller.commissionRate) <= 0) { res.status(409); throw new Error("Set a seller commission greater than 0 before approval"); } const bank = seller.bankDetails || {}; if (![bank.accountType, bank.accountNumber, bank.ifsc, bank.bankName, bank.accountHolderName].every(Boolean)) { res.status(409); throw new Error("Complete seller bank details before approval"); } const docs = [seller.kyc.pan, seller.kyc.addressProof, seller.kyc.aadharFront, seller.kyc.aadharBack, seller.kyc.cancelledCheque, ...(seller.isGstRegistered ? [seller.kyc.gstCertificate] : [])]; if (!docs.every((doc) => doc.status === "approved")) { res.status(409); throw new Error("All required seller KYC documents must be approved first"); } seller.approvalStatus = "approved"; seller.approvalReason = ""; seller.approvedAt = new Date(); seller.approvedBy = req.user._id; await seller.save(); res.json(seller); });
export const rejectSeller = asyncHandler(async (req, res) => { const reason = String(req.body.reason || "").trim(); if (!reason) { res.status(400); throw new Error("A rejection reason is required"); } const seller = await Seller.findById(req.params.id); if (!seller) { res.status(404); throw new Error("Seller not found"); } seller.approvalStatus = "rejected"; seller.approvalReason = reason; await seller.save(); res.json(seller); });
