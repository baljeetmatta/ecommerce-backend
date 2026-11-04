import crypto from "crypto";
import AdminDeletionOtp from "../models/AdminDeletionOtp.js";
import Order from "../models/Order.js";
import Product from "../models/Product.js";
import Reseller from "../models/Reseller.js";
import ResellerLink from "../models/ResellerLink.js";
import Seller from "../models/Seller.js";
import SellerImpersonation from "../models/SellerImpersonation.js";
import WorkAssignment from "../models/WorkAssignment.js";
import User from "../models/User.js";
import { sendEmail } from "../utils/email.js";
import asyncHandler from "../utils/asyncHandler.js";

const entityModels = { seller: Seller, reseller: Reseller, order: Order };
const entityLabels = { seller: "seller account", reseller: "reseller account", order: "order" };
const hashCode = (code) => crypto.createHash("sha256").update(String(code)).digest("hex");
const validOtp = (expected, supplied) => {
  const left = Buffer.from(expected || "");
  const right = Buffer.from(hashCode(supplied));
  return left.length === right.length && crypto.timingSafeEqual(left, right);
};
const maskEmail = (email) => {
  const [name, domain] = String(email).split("@");
  return `${name.slice(0, 1)}${"*".repeat(Math.min(Math.max(name.length - 1, 3), 8))}@${domain}`;
};

const findEntity = async (type, id) => entityModels[type].findById(id);

const removeEntity = async (type, id) => {
  if (type === "seller") {
    const seller = await Seller.findById(id);
    if (!seller) return null;
    await Promise.all([
      Product.updateMany({ seller: id }, { $set: { status: "archived", sellerEnabled: false } }),
      WorkAssignment.deleteMany({ entityType: "Seller", entity: id }),
      SellerImpersonation.deleteMany({ seller: id })
    ]);
    await seller.deleteOne();
    return { id, message: "Seller deleted. Their products were archived; order and settlement history was retained." };
  }
  if (type === "reseller") {
    const reseller = await Reseller.findById(id);
    if (!reseller) return null;
    await Promise.all([
      ResellerLink.deleteMany({ reseller: id }),
      WorkAssignment.deleteMany({ entityType: "Reseller", entity: id })
    ]);
    await reseller.deleteOne();
    return { id, message: "Reseller deleted. Order and withdrawal history was retained." };
  }
  const order = await Order.findByIdAndDelete(id);
  return order ? { id, message: "Order deleted." } : null;
};

export const requestAdminDeletionOtp = asyncHandler(async (req, res) => {
  const { entityType, id } = req.params;
  if (!entityModels[entityType] || !/^[a-f\d]{24}$/i.test(id)) {
    res.status(400);
    throw new Error("Invalid deletion target");
  }
  const [entity, admin] = await Promise.all([
    findEntity(entityType, id),
    User.findById(req.user._id).select("name email")
  ]);
  if (!entity) { res.status(404); throw new Error("Record not found"); }
  if (!admin?.email) { res.status(409); throw new Error("Your admin account needs an email address before deletion can be confirmed"); }

  const code = crypto.randomInt(0, 1_000_000).toString().padStart(6, "0");
  await AdminDeletionOtp.deleteMany({ entityType, entityId: id, admin: admin._id });
  const challenge = await AdminDeletionOtp.create({
    entityType,
    entityId: id,
    admin: admin._id,
    codeHash: hashCode(code),
    expiresAt: new Date(Date.now() + 10 * 60 * 1000)
  });
  try {
    await sendEmail({
      to: admin.email,
      subject: "Admin deletion confirmation code",
      text: `Hello ${admin.name || "Admin"},\n\nYour confirmation code to delete ${entityLabels[entityType]} ${entity.orderNumber || entity.companyName || entity.fullName || ""} is ${code}. The code expires in 10 minutes and can be used once.\n\nIf you did not request this, ignore this email.`
    });
  } catch (error) {
    await challenge.deleteOne();
    res.status(502);
    throw new Error(`Could not send the confirmation email: ${error.message}`);
  }
  res.json({ challengeId: challenge._id, email: maskEmail(admin.email), expiresInSeconds: 600 });
});

export const deleteAdminRecord = asyncHandler(async (req, res) => {
  const { entityType, id } = req.params;
  const otp = String(req.body.otp || "");
  const challengeId = String(req.body.challengeId || "");
  if (!entityModels[entityType] || !/^[a-f\d]{24}$/i.test(id) || !/^[a-f\d]{24}$/i.test(challengeId) || !/^\d{6}$/.test(otp)) {
    res.status(400);
    throw new Error("Enter the 6-digit email code");
  }
  const filter = { _id: challengeId, entityType, entityId: id, admin: req.user._id, expiresAt: { $gt: new Date() } };
  const challenge = await AdminDeletionOtp.findOne(filter);
  if (!challenge || challenge.attempts >= 5) { res.status(400); throw new Error("Confirmation code is invalid or expired"); }
  if (!validOtp(challenge.codeHash, otp)) {
    challenge.attempts += 1;
    if (challenge.attempts >= 5) await challenge.deleteOne();
    else await challenge.save();
    res.status(400);
    throw new Error("Confirmation code is invalid or expired");
  }
  const consumed = await AdminDeletionOtp.findOneAndDelete({ ...filter, codeHash: challenge.codeHash, attempts: { $lt: 5 } });
  if (!consumed) { res.status(400); throw new Error("Confirmation code is invalid or expired"); }
  const result = await removeEntity(entityType, id);
  if (!result) { res.status(404); throw new Error("Record not found"); }
  res.json(result);
});