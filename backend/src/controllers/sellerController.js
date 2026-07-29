import crypto from "crypto";
import Order from "../models/Order.js";
import Product from "../models/Product.js";
import Seller from "../models/Seller.js";
import SellerRegistrationOtp from "../models/SellerRegistrationOtp.js";
import SellerPayout from "../models/SellerPayout.js";
import Category from "../models/Category.js";
import TaxCategory from "../models/TaxCategory.js";
import asyncHandler from "../utils/asyncHandler.js";
import { createToken } from "../utils/token.js";
import { createPasswordReset, hashResetCode, resetCodeResponse, sendPasswordResetCode } from "../utils/passwordReset.js";
import { sendEmail } from "../utils/email.js";

const publicSeller = (seller) => ({ id: seller._id, sellerNumber: seller.sellerNumber, companyName: seller.companyName, businessName: seller.businessName, address: seller.address, city: seller.city, state: seller.state, gstState: seller.gstState, businessState: seller.businessState, pinCode: seller.pinCode, mobile: seller.mobile, email: seller.email, isGstRegistered: seller.isGstRegistered, gstNumber: seller.gstNumber, declarationAccepted: seller.declarationAccepted, gstStatus: seller.gstStatus, sellingPermission: seller.sellingPermission, turnoverAlertThreshold: seller.turnoverAlertThreshold, annualTurnover: seller.annualTurnover, autoRestrictSales: seller.autoRestrictSales, shippingMode: seller.shippingMode, profileImage: seller.profileImage, status: seller.status, approvalStatus: seller.approvalStatus, approvalReason: seller.approvalReason, commissionRate: seller.commissionRate, walletBalance: seller.walletBalance, kyc: seller.kyc, bankDetails: seller.bankDetails, createdAt: seller.createdAt });
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
const productFields = ["name", "sku", "shortDescription", "detailedDescription", "description", "hsnCode", "volumetricWeight", "length", "height", "warranty", "manufacturerBrand", "price", "offerPrice", "sellerCosts", "category", "taxCategory", "priceIncludesTax", "displayType", "status", "tags", "relatedProducts", "isStockManageable", "stock", "lowStockThreshold", "backOrderAllowed", "variationOptions", "variants", "mainImage", "imageVariants", "media", "videoUrl", "seo"];
const productPayload = (body) => {
  const payload = Object.fromEntries(productFields.filter((field) => body[field] !== undefined).map((field) => [field, body[field]]));
  if (Array.isArray(payload.variants)) payload.variants = payload.variants.map(({ costPrice: _costPrice, ...variant }) => variant);
  return payload;
};
const normalizeMobile = (value) => String(value || "").replace(/\D/g, "");
const nextSellerNumber = async () => {
  for (let attempt = 0; attempt < 20; attempt += 1) {
    const value = String(crypto.randomInt(100000, 1000000));
    if (!(await Seller.exists({ sellerNumber: value }))) return value;
  }
  throw new Error("Unable to allocate a seller ID. Please try again.");
};

const normalizeSellerRegistration = async (body, res) => {
  const required = ["companyName", "address", "city", "state", "pinCode", "mobile", "email"];
  if (required.some((field) => !String(body[field] || "").trim())) { res.status(400); throw new Error("Please complete all seller registration fields"); }
  const email = String(body.email).trim().toLowerCase();
  const mobile = normalizeMobile(body.mobile);
  const isGstRegistered = body.isGstRegistered === true || body.isGstRegistered === "true";
  const gstNumber = isGstRegistered ? String(body.gstNumber || "").trim().toUpperCase() : undefined;
  const businessName = String(body.businessName || body.companyName || "").trim();
  const gstState = isGstRegistered ? String(body.gstState || body.state || "").trim() : undefined;
  const businessState = !isGstRegistered ? String(body.businessState || body.state || "").trim() : undefined;
  if (mobile.length < 10 || mobile.length > 15) { res.status(400); throw new Error("Enter a valid mobile number"); }
  if (isGstRegistered && !gstNumber) { res.status(400); throw new Error("GST number is required for a GST-registered business"); }
  if (isGstRegistered && (!businessName || !gstState)) { res.status(400); throw new Error("Business name and GST state are required"); }
  const duplicateChecks = [{ email }, { mobile }];
  if (gstNumber) duplicateChecks.push({ gstNumber });
  if (await Seller.exists({ $or: duplicateChecks })) { res.status(409); throw new Error("Email, mobile number, or GST number is already registered"); }
  return { ...body, email, mobile, isGstRegistered, gstNumber, businessName, gstState, businessState, declarationAccepted: !isGstRegistered || body.declarationAccepted === true || body.declarationAccepted === "true", gstStatus: isGstRegistered ? "pending" : "not_registered", sellingPermission: isGstRegistered ? "all_india" : "same_state" };
};

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
  if (!identifier) { res.status(400); throw new Error("Seller ID or email is required"); }
  const seller = await Seller.findOne({ $or: [{ sellerNumber: identifier }, { email: identifier.toLowerCase() }] }).select("+password");
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
export const sellerCatalogOptions = asyncHandler(async (_req, res) => { const [categories, taxCategories] = await Promise.all([Category.find({ isActive: true }).sort({ name: 1 }), TaxCategory.find({ isActive: true }).sort({ name: 1 })]); res.json({ categories, taxCategories }); });
export const sellerDashboard = asyncHandler(async (req, res) => {
  const sellerProducts = await Product.find({ seller: req.seller._id }).select("name sku mainImage status approvalStatus").lean();
  const productIds = sellerProducts.map((product) => product._id);
  const [productsCount, pendingProducts, orders] = await Promise.all([
    Product.countDocuments({ seller: req.seller._id }),
    Product.countDocuments({ seller: req.seller._id, approvalStatus: { $in: ["pending_new", "pending_update"] } }),
    Order.find({ "items.product": { $in: productIds } })
  ]);
  const sellerItems = orders.flatMap((order) => order.items.filter((item) => productIds.some((id) => id.equals(item.product))));
  res.json({
    productsCount,
    pendingProducts,
    ordersCount: orders.length,
    sales: sellerItems.reduce((sum, item) => sum + item.price * item.quantity, 0),
    walletBalance: req.seller.walletBalance,
    commissionRate: req.seller.commissionRate,
    approvalStatus: req.seller.approvalStatus,
    seller: { companyName: req.seller.companyName, approvalStatus: req.seller.approvalStatus, kyc: req.seller.kyc },
    products: sellerProducts,
    recentOrders: orders.sort((a, b) => b.createdAt - a.createdAt).slice(0, 8)
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
  ["companyName", "address", "city", "state", "pinCode", "mobile", "profileImage", "shippingMode"].forEach((field) => { if (req.body[field] !== undefined) req.seller[field] = req.body[field]; });
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
  if (req.seller.approvalStatus === "approved") { res.status(403); throw new Error("Approved seller information is locked"); }
  const accountNumber = String(req.body.accountNumber || "").trim();
  if (!accountNumber || accountNumber !== String(req.body.confirmAccountNumber || "").trim()) { res.status(400); throw new Error("Account numbers do not match"); }
  const ifsc = String(req.body.ifsc || "").trim().toUpperCase();
  if (!/^[A-Z]{4}0[A-Z0-9]{6}$/.test(ifsc)) { res.status(400); throw new Error("Enter a valid IFSC code"); }
  const response = await fetch(`https://ifsc.razorpay.com/${encodeURIComponent(ifsc)}`);
  if (!response.ok) { res.status(400); throw new Error("The IFSC code could not be verified"); }
  const bank = await response.json();
  if (!String(req.body.accountHolderName || "").trim()) { res.status(400); throw new Error("Account holder name is required"); }
  req.seller.bankDetails = { accountHolderName: String(req.body.accountHolderName).trim(), accountNumber, ifsc, bankName: bank.BANK, branch: bank.BRANCH };
  await req.seller.save();
  res.json(publicSeller(req.seller));
});
export const uploadSellerKyc = asyncHandler(async (req, res) => { if (req.seller.approvalStatus === "approved") { res.status(403); throw new Error("Approved seller KYC is locked"); } const allowed = ["gstCertificate", "pan", "addressProof", "aadharFront", "aadharBack", "cancelledCheque"]; if (!allowed.includes(req.params.type)) { res.status(400); throw new Error("Invalid KYC document type"); } const current = req.seller.kyc[req.params.type]; if (["pending", "approved"].includes(current.status)) { res.status(409); throw new Error("Only rejected documents can be uploaded again"); } if (!req.body.file) { res.status(400); throw new Error("Document file is required"); } req.seller.kyc[req.params.type] = { file: req.body.file, status: "pending", rejectionReason: "" }; await req.seller.save(); res.json(publicSeller(req.seller)); });
export const changeSellerPassword = asyncHandler(async (req, res) => { const next = String(req.body.newPassword || ""); if (!/^\d{4}$/.test(next)) { res.status(400); throw new Error("New password must be exactly 4 digits"); } const seller = await Seller.findById(req.seller._id).select("+password"); if (!(await seller.matchPassword(String(req.body.currentPassword || "")))) { res.status(401); throw new Error("Current password is incorrect"); } seller.password = next; seller.passwordVault = encryptSellerPassword(next); await seller.save(); res.json({ message: "Password changed successfully" }); });

export const listMyProducts = asyncHandler(async (req, res) => { const products = await Product.find({ seller: req.seller._id }).select("-costPrice").populate("category", "name parent").populate("taxCategory", "name rate").sort({ updatedAt: -1 }); res.json(products.map((product) => { const value = product.toObject(); if (value.pendingChanges) delete value.pendingChanges.costPrice; return value; })); });
export const createSellerProduct = asyncHandler(async (req, res) => { const payload = productPayload(req.body); const product = await Product.create({ ...payload, costPrice: 0, seller: req.seller._id, status: "draft", approvalStatus: "pending_new", sellerEnabled: true }); res.status(201).json(await product.populate(["category", "taxCategory"])); });
export const updateSellerProduct = asyncHandler(async (req, res) => {
  const product = await Product.findOne({ _id: req.params.id, seller: req.seller._id });
  if (!product) { res.status(404); throw new Error("Product not found"); }
  const payload = productPayload(req.body);
  const hasPublishedVersion = ["approved", "pending_update", "rejected_update"].includes(product.approvalStatus);
  if (hasPublishedVersion) { product.pendingChanges = payload; product.approvalStatus = "pending_update"; product.approvalNote = ""; }
  else { product.set(payload); product.approvalStatus = "pending_new"; product.approvalNote = ""; }
  await product.save();
  res.json(await product.populate(["category", "taxCategory"]));
});
export const toggleSellerProduct = asyncHandler(async (req, res) => { const product = await Product.findOne({ _id: req.params.id, seller: req.seller._id }); if (!product) { res.status(404); throw new Error("Product not found"); } product.sellerEnabled = Boolean(req.body.enabled); await product.save(); res.json(product); });

export const listSellerOrders = asyncHandler(async (req, res) => {
  const productIds = await Product.find({ seller: req.seller._id }).distinct("_id");
  const orders = await Order.find({ "items.product": { $in: productIds } }).populate("customer", "name email").sort({ createdAt: -1 });
  res.json(orders.map((order) => ({ ...order.toObject(), items: order.items.filter((item) => productIds.some((id) => id.equals(item.product))) })));
});
export const updateSellerOrderItem = asyncHandler(async (req, res) => { const allowed = ["Accepted", "Processing", "Packed", "Shipped", "Delivered", "Cancelled"]; if (!allowed.includes(req.body.status)) { res.status(400); throw new Error("Invalid item status"); } const product = await Product.findOne({ _id: req.params.productId, seller: req.seller._id }); if (!product) { res.status(404); throw new Error("Seller product not found"); } const order = await Order.findOne({ _id: req.params.orderId, "items.product": product._id }); if (!order) { res.status(404); throw new Error("Order not found"); } const item = order.items.find((entry) => String(entry.product) === String(product._id)); item.sellerStatus = req.body.status; if (req.body.status === "Delivered") { let payout = await SellerPayout.findOne({ seller: req.seller._id, order: order._id, product: product._id }); if (!payout) { const grossAmount = Math.round(item.price * item.quantity * 100) / 100; const commissionRate = Number(item.sellerCommissionRate ?? req.seller.commissionRate ?? 20); const commissionAmount = Math.round(grossAmount * commissionRate) / 100; const netAmount = Math.round((grossAmount - commissionAmount) * 100) / 100; try { payout = await SellerPayout.create({ seller: req.seller._id, order: order._id, product: product._id, grossAmount, commissionRate, commissionAmount, netAmount, description: `Net sale amount for ${order.orderNumber}` }); await Seller.updateOne({ _id: req.seller._id }, { $inc: { walletBalance: netAmount } }); } catch (error) { if (error.code !== 11000) throw error; payout = await SellerPayout.findOne({ seller: req.seller._id, order: order._id, product: product._id }); } } item.sellerPayoutAmount = payout.netAmount; item.sellerPayoutCredited = true; } await order.save(); res.json(order); });

export const sellerWallet = asyncHandler(async (req, res) => res.json({ walletBalance: req.seller.walletBalance, commissionRate: req.seller.commissionRate, payouts: await SellerPayout.find({ seller: req.seller._id }).populate("order", "orderNumber").populate("product", "name sku").sort({ createdAt: -1 }) }));

export const listSellers = asyncHandler(async (req, res) => {
  const page = Math.max(1, Number.parseInt(req.query.page, 10) || 1);
  const limit = Math.min(100, Math.max(1, Number.parseInt(req.query.limit, 10) || 10));
  const search = String(req.query.q || "").trim();
  const escaped = search.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const filter = search ? { $or: [{ companyName: new RegExp(escaped, "i") }, { sellerNumber: new RegExp(escaped, "i") }, { email: new RegExp(escaped, "i") }] } : {};
  const [sellers, total] = await Promise.all([
    Seller.find(filter).sort({ _id: -1 }).skip((page - 1) * limit).limit(limit),
    Seller.countDocuments(filter)
  ]);
  res.json({ items: sellers, pagination: { page, limit, total, pages: Math.max(1, Math.ceil(total / limit)) } });
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
export const approveSellerProduct = asyncHandler(async (req, res) => { const seller = await Seller.findById(req.params.id); if (!seller || seller.approvalStatus !== "approved") { res.status(409); throw new Error("Approve the seller and all KYC documents before approving products"); } const product = await Product.findOne({ _id: req.params.productId, seller: req.params.id }); if (!product) { res.status(404); throw new Error("Product not found"); } if (product.approvalStatus === "pending_update" && product.pendingChanges) product.set(product.pendingChanges); product.pendingChanges = undefined; product.approvalStatus = "approved"; product.approvalNote = ""; product.status = "active"; product.reviewedAt = new Date(); product.reviewedBy = req.user._id; await product.save(); res.json(product); });
export const rejectSellerProduct = asyncHandler(async (req, res) => { const note = String(req.body.reason || "").trim(); if (!note) { res.status(400); throw new Error("A rejection reason is required"); } const product = await Product.findOne({ _id: req.params.productId, seller: req.params.id }); if (!product) { res.status(404); throw new Error("Product not found"); } product.approvalStatus = product.approvalStatus === "pending_update" ? "rejected_update" : "rejected_new"; product.approvalNote = note; product.reviewedAt = new Date(); product.reviewedBy = req.user._id; await product.save(); res.json(product); });
export const reviewSellerKyc = asyncHandler(async (req, res) => { const seller = await Seller.findById(req.params.id); if (seller?.approvalStatus === "approved") { res.status(409); throw new Error("Approved seller KYC is locked"); } const doc = seller?.kyc?.[req.params.type]; if (!doc) { res.status(404); throw new Error("Seller document not found"); } if (!["approved", "rejected"].includes(req.body.status)) { res.status(400); throw new Error("Invalid KYC status"); } const reason = String(req.body.rejectionReason || "").trim(); if (req.body.status === "rejected" && !reason) { res.status(400); throw new Error("A rejection reason is required"); } doc.status = req.body.status; doc.rejectionReason = req.body.status === "rejected" ? reason : ""; doc.reviewedAt = new Date(); doc.reviewedBy = req.user._id; await seller.save(); res.json(seller); });
export const updateSellerCommission = asyncHandler(async (req, res) => { const commissionRate = Number(req.body.commissionRate); if (!Number.isFinite(commissionRate) || commissionRate < 0 || commissionRate > 100) { res.status(400); throw new Error("Commission must be between 0 and 100"); } const seller = await Seller.findByIdAndUpdate(req.params.id, { commissionRate }, { new: true, runValidators: true }); if (!seller) { res.status(404); throw new Error("Seller not found"); } res.json(seller); });
export const updateSellerCompliance = asyncHandler(async (req, res) => {
  const allowed = ["gstStatus", "sellingPermission", "turnoverAlertThreshold", "annualTurnover", "autoRestrictSales"];
  const changes = Object.fromEntries(allowed.filter((field) => req.body[field] !== undefined).map((field) => [field, req.body[field]]));
  const seller = await Seller.findByIdAndUpdate(req.params.id, changes, { new: true, runValidators: true });
  if (!seller) { res.status(404); throw new Error("Seller not found"); }
  res.json(seller);
});
export const approveSeller = asyncHandler(async (req, res) => { const seller = await Seller.findById(req.params.id); if (!seller) { res.status(404); throw new Error("Seller not found"); } const docs = [seller.kyc.pan, seller.kyc.addressProof, seller.kyc.aadharFront, seller.kyc.aadharBack, seller.kyc.cancelledCheque, ...(seller.isGstRegistered ? [seller.kyc.gstCertificate] : [])]; if (!docs.every((doc) => doc.status === "approved")) { res.status(409); throw new Error("All required seller KYC documents must be approved first"); } seller.approvalStatus = "approved"; seller.approvalReason = ""; seller.approvedAt = new Date(); seller.approvedBy = req.user._id; await seller.save(); res.json(seller); });
export const rejectSeller = asyncHandler(async (req, res) => { const reason = String(req.body.reason || "").trim(); if (!reason) { res.status(400); throw new Error("A rejection reason is required"); } const seller = await Seller.findById(req.params.id); if (!seller) { res.status(404); throw new Error("Seller not found"); } seller.approvalStatus = "rejected"; seller.approvalReason = reason; await seller.save(); res.json(seller); });
