import crypto from "crypto";
import Order from "../models/Order.js";
import Product from "../models/Product.js";
import Seller from "../models/Seller.js";
import SellerPayout from "../models/SellerPayout.js";
import Category from "../models/Category.js";
import TaxCategory from "../models/TaxCategory.js";
import asyncHandler from "../utils/asyncHandler.js";
import { createToken } from "../utils/token.js";
import { createPasswordReset, hashResetCode, resetCodeResponse, sendPasswordResetCode } from "../utils/passwordReset.js";

const publicSeller = (seller) => ({ id: seller._id, sellerNumber: seller.sellerNumber, companyName: seller.companyName, address: seller.address, city: seller.city, state: seller.state, pinCode: seller.pinCode, mobile: seller.mobile, email: seller.email, gstNumber: seller.gstNumber, status: seller.status, approvalStatus: seller.approvalStatus, approvalReason: seller.approvalReason, commissionRate: seller.commissionRate, walletBalance: seller.walletBalance, kyc: seller.kyc, bankDetails: seller.bankDetails, createdAt: seller.createdAt });
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
const productFields = ["name", "sku", "shortDescription", "detailedDescription", "description", "hsnCode", "volumetricWeight", "length", "height", "warranty", "manufacturerBrand", "price", "offerPrice", "category", "taxCategory", "priceIncludesTax", "displayType", "status", "tags", "relatedProducts", "isStockManageable", "stock", "lowStockThreshold", "backOrderAllowed", "variationOptions", "variants", "mainImage", "imageVariants", "media", "videoUrl", "seo"];
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

export const registerSeller = asyncHandler(async (req, res) => {
  const required = ["companyName", "address", "city", "state", "pinCode", "mobile", "email", "gstNumber"];
  if (required.some((field) => !String(req.body[field] || "").trim())) { res.status(400); throw new Error("Please complete all seller registration fields"); }
  const email = String(req.body.email).trim().toLowerCase();
  const mobile = normalizeMobile(req.body.mobile);
  const gstNumber = String(req.body.gstNumber).trim().toUpperCase();
  if (mobile.length < 10 || mobile.length > 15) { res.status(400); throw new Error("Enter a valid mobile number"); }
  if (await Seller.exists({ $or: [{ email }, { mobile }, { gstNumber }] })) { res.status(409); throw new Error("Email, mobile number, or GST number is already registered"); }
  const password = String(crypto.randomInt(1000, 10000));
  let seller;
  try {
    seller = await Seller.create({ ...req.body, email, mobile, gstNumber, sellerNumber: await nextSellerNumber(), password, passwordVault: encryptSellerPassword(password) });
  } catch (error) {
    if (error.code === 11000) { res.status(409); throw new Error("Email, mobile number, GST number, or Seller ID is already registered"); }
    throw error;
  }
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
  const productIds = await Product.find({ seller: req.seller._id }).distinct("_id");
  const [productsCount, pendingProducts, orders] = await Promise.all([
    Product.countDocuments({ seller: req.seller._id }),
    Product.countDocuments({ seller: req.seller._id, approvalStatus: { $in: ["pending_new", "pending_update"] } }),
    Order.find({ "items.product": { $in: productIds } })
  ]);
  const sellerItems = orders.flatMap((order) => order.items.filter((item) => productIds.some((id) => id.equals(item.product))));
  res.json({ productsCount, pendingProducts, ordersCount: orders.length, sales: sellerItems.reduce((sum, item) => sum + item.price * item.quantity, 0), walletBalance: req.seller.walletBalance, commissionRate: req.seller.commissionRate, approvalStatus: req.seller.approvalStatus });
});
export const updateSellerProfile = asyncHandler(async (req, res) => {
  if (req.seller.approvalStatus === "approved") { res.status(403); throw new Error("Approved seller information is locked"); }
  if (req.body.mobile !== undefined) {
    const mobile = normalizeMobile(req.body.mobile);
    if (mobile.length < 10 || mobile.length > 15) { res.status(400); throw new Error("Enter a valid mobile number"); }
    if (await Seller.exists({ _id: { $ne: req.seller._id }, mobile })) { res.status(409); throw new Error("Mobile number is already registered"); }
    req.body.mobile = mobile;
  }
  ["companyName", "address", "city", "state", "pinCode", "mobile"].forEach((field) => { if (req.body[field] !== undefined) req.seller[field] = req.body[field]; });
  try { await req.seller.save(); } catch (error) { if (error.code === 11000) { res.status(409); throw new Error("Mobile number is already registered"); } throw error; }
  res.json(publicSeller(req.seller));
});
export const updateSellerBank = asyncHandler(async (req, res) => { if (req.seller.approvalStatus === "approved") { res.status(403); throw new Error("Approved seller information is locked"); } const fields = ["accountNumber", "ifsc", "bankName", "accountHolderName"]; if (fields.some((field) => !req.body[field])) { res.status(400); throw new Error("All bank details are required"); } req.seller.bankDetails = Object.fromEntries(fields.map((field) => [field, req.body[field]])); await req.seller.save(); res.json(publicSeller(req.seller)); });
export const uploadSellerKyc = asyncHandler(async (req, res) => { if (req.seller.approvalStatus === "approved") { res.status(403); throw new Error("Approved seller KYC is locked"); } const allowed = ["gstCertificate", "pan", "addressProof"]; if (!allowed.includes(req.params.type)) { res.status(400); throw new Error("Invalid KYC document type"); } const current = req.seller.kyc[req.params.type]; if (["pending", "approved"].includes(current.status)) { res.status(409); throw new Error("Only rejected documents can be uploaded again"); } if (!req.body.file) { res.status(400); throw new Error("Document file is required"); } req.seller.kyc[req.params.type] = { file: req.body.file, status: "pending", rejectionReason: "" }; await req.seller.save(); res.json(publicSeller(req.seller)); });
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
    Seller.find(filter).sort({ createdAt: -1 }).skip((page - 1) * limit).limit(limit),
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
export const approveSeller = asyncHandler(async (req, res) => { const seller = await Seller.findById(req.params.id); if (!seller) { res.status(404); throw new Error("Seller not found"); } const docs = [seller.kyc.gstCertificate, seller.kyc.pan, seller.kyc.addressProof]; if (!docs.every((doc) => doc.status === "approved")) { res.status(409); throw new Error("All seller KYC documents must be approved first"); } seller.approvalStatus = "approved"; seller.approvalReason = ""; seller.approvedAt = new Date(); seller.approvedBy = req.user._id; await seller.save(); res.json(seller); });
export const rejectSeller = asyncHandler(async (req, res) => { const reason = String(req.body.reason || "").trim(); if (!reason) { res.status(400); throw new Error("A rejection reason is required"); } const seller = await Seller.findById(req.params.id); if (!seller) { res.status(404); throw new Error("Seller not found"); } seller.approvalStatus = "rejected"; seller.approvalReason = reason; await seller.save(); res.json(seller); });
