import express from "express";
import rateLimit from "express-rate-limit";
import { protect, protectSeller, protectPartner, protectReseller, protectCustomer } from "../middleware/authMiddleware.js";
import ProfileSettings from "../models/ProfileSettings.js";
import Customer from "../models/Customer.js";
import asyncHandler from "../utils/asyncHandler.js";
const router = express.Router();
const guards = { admin: protect, seller: protectSeller, partner: protectPartner, reseller: protectReseller };
router.use("/:role", (req, res, next) => {
  const guard = Object.hasOwn(guards, req.params.role) ? guards[req.params.role] : null;
  if (!guard) return res.status(404).json({ message: "Unknown account type" });
  req.profileRole = req.params.role;
  if (req.profileRole === "reseller") return protectCustomer(req, res, () => guard(req, res, next));
  guard(req, res, next);
});
const owner = req => ({ admin: req.user, seller: req.seller, partner: req.partner, reseller: req.reseller })[req.profileRole];
const filter = req => ({ accountType: req.profileRole, account: owner(req)._id });
router.get("/:role", asyncHandler(async (req, res) => {
  res.set("Cache-Control", "no-store");
  const settings = await ProfileSettings.findOne(filter(req)) || new ProfileSettings(filter(req));
  res.json({ notifications: settings.notifications, privacy: settings.privacy });
}));
router.patch("/:role", asyncHandler(async (req, res) => {
  const fields = { notifications: ["orderUpdates", "offersDeals", "priceDropAlerts", "storeUpdates", "sms", "email", "whatsapp"], privacy: ["personalizedOffers", "activityPersonalization"] };
  const updates = {};
  if (!req.body || typeof req.body !== "object" || Array.isArray(req.body)) return res.status(400).json({ message: "Invalid settings" });
  for (const [section, values] of Object.entries(req.body)) {
    if (!Object.hasOwn(fields, section) || !values || typeof values !== "object" || Array.isArray(values)) return res.status(400).json({ message: "Invalid settings section" });
    for (const [key, value] of Object.entries(values)) {
      if (!fields[section].includes(key) || typeof value !== "boolean") return res.status(400).json({ message: "Settings must contain supported boolean values" });
      updates[`${section}.${key}`] = value;
    }
  }
  if (!Object.keys(updates).length) return res.status(400).json({ message: "No settings supplied" });
  const settings = await ProfileSettings.findOneAndUpdate(filter(req), { $set: updates }, { upsert: true, new: true, runValidators: true, setDefaultsOnInsert: true });
  res.json({ notifications: settings.notifications, privacy: settings.privacy });
}));
router.patch("/:role/personal", asyncHandler(async (req, res) => {
  if (req.profileRole !== "admin") return res.sendStatus(403);
  const user = req.user;
  for (const key of ["name", "phone", "address", "city", "state", "pinCode"]) {
    if (req.body[key] !== undefined) {
      if (typeof req.body[key] !== "string" || req.body[key].length > 500) return res.status(400).json({ message: "Invalid personal details" });
      user[key] = req.body[key].trim();
    }
  }
  await user.save();
  res.json({ name: user.name, email: user.email, phone: user.phone, address: user.address, city: user.city, state: user.state, pinCode: user.pinCode });
}));
router.get("/:role/personal", asyncHandler(async (req, res) => {
  if (req.profileRole !== "admin") return res.sendStatus(403);
  const { name, email, phone, address, city, state, pinCode } = req.user;
  res.json({ name, email, phone, address, city, state, pinCode });
}));
router.post("/:role/password", rateLimit({ windowMs: 15 * 60 * 1000, max: 10 }), asyncHandler(async (req, res) => {
  const { currentPassword, newPassword } = req.body;
  if (typeof currentPassword !== "string" || typeof newPassword !== "string" || newPassword.length < 8 || newPassword.length > 72) return res.status(400).json({ message: "Use a password between 8 and 72 characters" });
  const account = req.profileRole === "reseller" ? await Customer.findById(req.reseller.customer).select("+password") : await owner(req).constructor.findById(owner(req)._id).select("+password");
  if (!account || !await account.matchPassword(currentPassword)) return res.status(400).json({ message: "Current password is incorrect" });
  account.password = newPassword;
  account.passwordResetToken = undefined;
  account.passwordResetExpires = undefined;
  if ("passwordVault" in account.schema.paths) account.passwordVault = undefined;
  await account.save();
  res.json({ message: "Password updated successfully" });
}));
export default router;
