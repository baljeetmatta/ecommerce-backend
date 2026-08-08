import Customer from "../models/Customer.js";
import User from "../models/User.js";
import asyncHandler from "../utils/asyncHandler.js";
import { createToken } from "../utils/token.js";
import { createPasswordReset, hashResetCode, resetCodeResponse, sendPasswordResetCode } from "../utils/passwordReset.js";

const publicUser = (user) => ({
  id: user._id,
  name: user.name,
  email: user.email,
  role: user.role,
  permissions: user.permissions,
  employeeCode: user.employeeCode,
  mobile: user.mobile,
  designation: user.designation
});

const publicCustomer = (customer) => ({
  id: customer._id,
  name: customer.name,
  email: customer.email,
  status: customer.status,
  storeCredit: customer.storeCredit,
  gender: customer.gender,
  phone: customer.phone || "",
  addresses: customer.addresses || []
});

export const register = asyncHandler(async (req, res) => {
  const { name, email, password } = req.body;
  const userCount = await User.countDocuments();

  if (userCount > 0) {
    res.status(403);
    throw new Error("Registration is closed. Ask a Super Admin to create staff users.");
  }

  const existingUser = await User.findOne({ email });

  if (existingUser) {
    res.status(409);
    throw new Error("Email is already registered");
  }

  const user = await User.create({ name, email, password, role: "Super Admin" });
  res.status(201).json({
    user: publicUser(user),
    token: createToken(user)
  });
});

export const login = asyncHandler(async (req, res) => {
  const { password } = req.body; const identifier = String(req.body.email || req.body.identifier || "").trim();
  const user = await User.findOne({ $or: [{ email: identifier.toLowerCase() }, { employeeCode: identifier.toUpperCase() }] }).select("+password");

  if (!user || !user.isActive || !(await user.matchPassword(password))) {
    res.status(401);
    throw new Error("Invalid email or password");
  }

  res.json({
    user: publicUser(user),
    token: createToken(user)
  });
});

export const forgotPassword = asyncHandler(async (req, res) => {
  const user = await User.findOne({ email: String(req.body.email || "").trim().toLowerCase() });
  if (!user) return res.json({ message: "If that account exists, a password reset code has been sent." });
  const reset = createPasswordReset();
  user.passwordResetToken = reset.hash;
  user.passwordResetExpires = reset.expiresAt;
  await user.save({ validateModifiedOnly: true });
  const emailSent = await sendPasswordResetCode({ email: user.email, name: user.name, code: reset.code, accountType: "Admin user" }).catch(() => false);
  res.json(resetCodeResponse(emailSent, reset.code));
});

export const resetPassword = asyncHandler(async (req, res) => {
  const password = String(req.body.password || "");
  if (password.length < 8) { res.status(400); throw new Error("Password must be at least 8 characters"); }
  const user = await User.findOne({ email: String(req.body.email || "").trim().toLowerCase(), passwordResetToken: hashResetCode(req.body.code), passwordResetExpires: { $gt: new Date() } }).select("+passwordResetToken +passwordResetExpires");
  if (!user) { res.status(400); throw new Error("Reset code is invalid or has expired"); }
  user.password = password;
  user.passwordResetToken = undefined;
  user.passwordResetExpires = undefined;
  await user.save();
  res.json({ message: "Password reset successfully. You can now sign in." });
});

export const me = asyncHandler(async (req, res) => {
  res.json({ user: publicUser(req.user) });
});

export const registerCustomer = asyncHandler(async (req, res) => {
  const { name, email, password, confirmPassword, gender } = req.body;

  if (!name || !email || !password || !confirmPassword || !gender) {
    res.status(400);
    throw new Error("Name, email, password, confirm password, and gender are required");
  }
  if (password !== confirmPassword) { res.status(400); throw new Error("Passwords do not match"); }
  if (!["male", "female", "other", "prefer_not_to_say"].includes(gender)) { res.status(400); throw new Error("Select a valid gender"); }

  const existingCustomer = await Customer.findOne({ email });

  if (existingCustomer) {
    res.status(409);
    throw new Error("Email is already registered");
  }

  const customer = await Customer.create({ name, email, password, gender });

  res.status(201).json({
    customer: publicCustomer(customer),
    token: createToken({ _id: customer._id, role: "Customer" })
  });
});

export const loginCustomer = asyncHandler(async (req, res) => {
  const { email, password } = req.body;
  const customer = await Customer.findOne({ email }).select("+password");

  if (!customer || !(await customer.matchPassword(password))) {
    res.status(401);
    throw new Error("Invalid email or password");
  }

  res.json({
    customer: publicCustomer(customer),
    token: createToken({ _id: customer._id, role: "Customer" })
  });
});

export const forgotCustomerPassword = asyncHandler(async (req, res) => {
  const customer = await Customer.findOne({ email: String(req.body.email || "").trim().toLowerCase() });
  if (!customer) return res.json({ message: "If that account exists, a password reset code has been sent." });
  const reset = createPasswordReset();
  customer.passwordResetToken = reset.hash; customer.passwordResetExpires = reset.expiresAt;
  await customer.save({ validateModifiedOnly: true });
  const emailSent = await sendPasswordResetCode({ email: customer.email, name: customer.name, code: reset.code, accountType: "Customer" }).catch(() => false);
  res.json(resetCodeResponse(emailSent, reset.code));
});

export const resetCustomerPassword = asyncHandler(async (req, res) => {
  const password = String(req.body.password || "");
  if (password.length < 8) { res.status(400); throw new Error("Password must be at least 8 characters"); }
  const customer = await Customer.findOne({ email: String(req.body.email || "").trim().toLowerCase(), passwordResetToken: hashResetCode(req.body.code), passwordResetExpires: { $gt: new Date() } }).select("+passwordResetToken +passwordResetExpires");
  if (!customer) { res.status(400); throw new Error("Reset code is invalid or has expired"); }
  customer.password = password; customer.passwordResetToken = undefined; customer.passwordResetExpires = undefined;
  await customer.save();
  res.json({ message: "Password reset successfully. You can now sign in." });
});

export const customerMe = asyncHandler(async (req, res) => {
  res.json({ customer: publicCustomer(req.customer) });
});
