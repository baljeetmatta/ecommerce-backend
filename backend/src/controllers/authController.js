import crypto from "node:crypto";
import bcrypt from "bcryptjs";
import { sendEmail } from "../utils/email.js";
import { customerPasswordResetEmail } from "../services/customerPasswordResetEmail.js";
import Customer from "../models/Customer.js";
import User from "../models/User.js";
import asyncHandler from "../utils/asyncHandler.js";
import { createToken } from "../utils/token.js";
import { createPasswordResetLink, hashResetCode, sendPasswordResetLink } from "../utils/passwordReset.js";

const publicUser = (user) => ({
  id: user._id,
  name: user.name,
  email: user.email,
  role: user.role,
  permissions: user.permissions,
  employeeCode: user.employeeCode,
  mobile: user.mobile,
  designation: user.designation,
  staffStatus: user.staffStatus,
  currentTeamLeader: user.currentTeamLeader,
  department: user.department
});

const publicCustomer = (customer) => ({
  id: customer._id,
  name: customer.name,
  email: customer.email,
  status: customer.status,
  storeCredit: customer.storeCredit,
  gender: customer.gender,
  phone: customer.phone || "",
  profileImage: customer.profileImage || "",
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
  const genericMessage = "If an eligible staff account exists, a password reset link has been sent.";
  if (!user || !user.isActive || !["Staff", "Team Leader"].includes(user.role)) return res.json({ message: genericMessage });
  const reset = createPasswordResetLink({ email: user.email });
  user.passwordResetToken = reset.hash;
  user.passwordResetExpires = reset.expiresAt;
  await user.save({ validateModifiedOnly: true });
  await sendPasswordResetLink({ email: user.email, name: user.name, url: reset.url });
  res.json({ message: genericMessage });
});

export const resetPassword = asyncHandler(async (req, res) => {
  const password = String(req.body.password || "");
  if (password.length < 8) { res.status(400); throw new Error("Password must be at least 8 characters"); }
  const user = await User.findOne({ email: String(req.body.email || "").trim().toLowerCase(), role: { $in: ["Staff", "Team Leader"] }, isActive: true, passwordResetToken: hashResetCode(req.body.token || req.body.code), passwordResetExpires: { $gt: new Date() } }).select("+passwordResetToken +passwordResetExpires");
  if (!user) { res.status(400); throw new Error("Reset link is invalid or has expired"); }
  user.password = password;
  user.passwordResetToken = undefined;
  user.passwordResetExpires = undefined;
  await user.save();
  res.json({ message: "Password reset successfully. You can now sign in." });
});

export const me = asyncHandler(async (req, res) => {
  res.json({ user: publicUser(req.user) });
});

export const updateLoginEmail = asyncHandler(async (req, res) => {
  const email = String(req.body.email || "").trim().toLowerCase();
  const currentPassword = String(req.body.currentPassword || "");
  if (!/^\S+@\S+\.\S+$/.test(email)) { res.status(400); throw new Error("Enter a valid login email address"); }
  if (!currentPassword) { res.status(400); throw new Error("Current password is required"); }
  const user = await User.findById(req.user._id).select("+password");
  if (!user || !(await user.matchPassword(currentPassword))) { res.status(401); throw new Error("Current password is incorrect"); }
  const duplicate = await User.exists({ email, _id: { $ne: user._id } });
  if (duplicate) { res.status(409); throw new Error("This email is already used by another administrator"); }
  user.email = email;
  await user.save({ validateModifiedOnly: true });
  res.json({ user: publicUser(user), token: createToken(user), message: "Login email updated successfully" });
});

export const registerCustomer = asyncHandler(async (req, res) => {
  const { name, email: rawEmail, password, confirmPassword, gender } = req.body;
  const email = String(rawEmail || "").trim().toLowerCase();

  if (!name || !email || !password || !confirmPassword || !gender) {
    res.status(400);
    throw new Error("Name, email, password, confirm password, and gender are required");
  }
  if (!/^\S+@\S+\.\S+$/.test(email)) { res.status(400); throw new Error("Enter a valid email address"); }
  if (String(password).length < 8) { res.status(400); throw new Error("Password must be at least 8 characters"); }
  if (password !== confirmPassword) { res.status(400); throw new Error("Passwords do not match"); }
  if (!["male", "female", "other", "prefer_not_to_say"].includes(gender)) { res.status(400); throw new Error("Select a valid gender"); }

  // Compare case-insensitively so older records with mixed-case addresses are
  // treated as the same account as the normalized signup address.
  const existingCustomer = await Customer.findOne({ $expr: { $eq: [{ $toLower: "$email" }, email] } });

  if (existingCustomer) {
    res.status(409);
    throw new Error("Email is already registered");
  }

  const verificationToken = crypto.randomBytes(32).toString("hex");
  const tokenHash = hashResetCode(verificationToken);
  let customer;
  try {
    customer = await Customer.create({ name, email, password, gender, emailVerified: false, emailVerificationToken: tokenHash, emailVerificationExpires: new Date(Date.now() + 24 * 60 * 60 * 1000) });
  } catch (error) {
    // The unique email index is the final guard if two signup requests race.
    if (error?.code === 11000 && error?.keyPattern?.email) {
      res.status(409);
      throw new Error("Email is already registered");
    }
    throw error;
  }
  const apiBase = String(process.env.PUBLIC_API_URL || `${req.protocol}://${req.get("host")}`).replace(/\/+$/, "").replace(/\/api$/i, "");
  const verificationUrl = `${apiBase}/api/auth/customer/verify-email?token=${encodeURIComponent(verificationToken)}&email=${encodeURIComponent(email)}`;
  try {
    await sendEmail({
      to: email,
      subject: "Verify your HRSBasket email address",
      text: `Hello ${customer.name},\n\nPlease verify your email address to activate your HRSBasket account:\n\n${verificationUrl}\n\nThis link expires in 24 hours. If you did not create this account, you can ignore this email.`
    });
  } catch (_error) {
    await Customer.deleteOne({ _id: customer._id });
    res.status(502); throw new Error("We could not send the verification email. Please check the email address and try again.");
  }
  res.status(201).json({ message: "Account created. Check your email and verify your address before signing in." });
});

export const verifyCustomerEmail = asyncHandler(async (req, res) => {
  const token = String(req.query.token || "");
  const email = String(req.query.email || "").trim().toLowerCase();
  const html = (title, message, success) => `<!doctype html><html><head><meta name="viewport" content="width=device-width,initial-scale=1"><title>${title}</title><style>body{font:16px system-ui,sans-serif;background:#f5f7f5;color:#202820;display:grid;place-items:center;min-height:100vh;margin:0}.card{background:white;padding:28px;border-radius:18px;max-width:440px;margin:20px;box-shadow:0 8px 30px #0001}h1{font-size:24px;color:${success ? "#247a43" : "#9c3b2b"}}p{line-height:1.6}</style></head><body><main class="card"><h1>${title}</h1><p>${message}</p><p>You can return to the HRSBasket app and sign in.</p></main></body></html>`;
  if (!/^[a-f0-9]{64}$/.test(token) || !/^\S+@\S+\.\S+$/.test(email)) {
    res.status(400).type("html").send(html("Invalid verification link", "This email verification link is invalid or incomplete.", false)); return;
  }
  const customer = await Customer.findOneAndUpdate({ email, emailVerified: false, emailVerificationToken: hashResetCode(token), emailVerificationExpires: { $gt: new Date() } }, { $set: { emailVerified: true }, $unset: { emailVerificationToken: 1, emailVerificationExpires: 1 } }, { new: true });
  if (!customer) {
    const alreadyVerified = await Customer.exists({ email, emailVerified: true });
    res.status(alreadyVerified ? 200 : 400).type("html").send(html(alreadyVerified ? "Email already verified" : "Link expired", alreadyVerified ? "Your email address is already verified." : "This verification link is invalid or has expired. Please create your account again or contact support.", alreadyVerified)); return;
  }
  res.type("html").send(html("Email verified", "Your email address has been verified. Your account is ready.", true));
});

export const loginCustomer = asyncHandler(async (req, res) => {
  const email = String(req.body.email || "").trim().toLowerCase();
  const { password } = req.body;
  const customer = await Customer.findOne({ email }).select("+password");

  if (!customer || !(await customer.matchPassword(password))) {
    res.status(401);
    throw new Error("Invalid email or password");
  }
  if (!customer.emailVerified) { res.status(403); throw new Error("Verify your email before signing in. Check your inbox for the verification link."); }

  res.json({
    customer: publicCustomer(customer),
    token: createToken({ _id: customer._id, role: "Customer" })
  });
});

export const forgotCustomerPassword = asyncHandler(async (req, res) => {
  const email = String(req.body.email || "").trim().toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) { res.status(400); throw new Error("Enter a valid email address"); }
  const message = "If an account exists with this email, we’ve sent a password reset link. Please check your inbox and spam folder.";
  const customer = await Customer.findOne({ email });
  if (!customer || customer.status === "blocked") return res.json({ message });
  const token = crypto.randomBytes(32).toString("hex");
  const hash = hashResetCode(token);
  const base = String(process.env.STOREFRONT_APP_URL || process.env.CLIENT_URL || "https://hrsbasket.com").replace(/\/+$/, "");
  const url = `${base}/#/reset-password?token=${encodeURIComponent(token)}&email=${encodeURIComponent(email)}`;
  customer.passwordResetToken = hash;
  customer.passwordResetExpires = new Date(Date.now() + 30 * 60 * 1000);
  await customer.save({ validateModifiedOnly: true });
  try {
    await sendEmail({ to: email, ...customerPasswordResetEmail({ name: customer.name, url }) });
  } catch (error) {
    await Customer.updateOne({ _id: customer._id, passwordResetToken: hash }, { $unset: { passwordResetToken: 1, passwordResetExpires: 1 } });
    res.status(502); throw new Error("Unable to send the reset email. Please try again shortly.");
  }
  res.json({ message });
});

export const resetCustomerPassword = asyncHandler(async (req, res) => {
  const password = req.body.password;
  const token = String(req.body.token || "");
  if (typeof password !== "string" || password.length < 8 || Buffer.byteLength(password, "utf8") > 72) { res.status(400); throw new Error("Use at least 8 characters and no more than 72 bytes for your password"); }
  if (!/^[a-f0-9]{64}$/.test(token)) { res.status(400); throw new Error("Reset link is invalid or has expired. Request a new link."); }
  // Atomically consume the token, so concurrent requests cannot reuse the link.
  const customer = await Customer.findOneAndUpdate({ email: String(req.body.email || "").trim().toLowerCase(), status: { $ne: "blocked" }, passwordResetToken: hashResetCode(token), passwordResetExpires: { $gt: new Date() } }, {
    $set: { password: await bcrypt.hash(password, 12) },
    $unset: { passwordResetToken: 1, passwordResetExpires: 1, passwordVault: 1 }
  }, { new: true });
  if (!customer) { res.status(400); throw new Error("Reset link is invalid or has expired. Request a new link."); }
  res.json({ message: "Password reset successfully. You can now sign in." });
});

export const customerMe = asyncHandler(async (req, res) => {
  res.json({ customer: publicCustomer(req.customer) });
});

const changeAccountPassword = (Model, accountKey) => asyncHandler(async (req, res) => {
  const { currentPassword, newPassword } = req.body;
  if (typeof currentPassword !== "string" || !currentPassword || typeof newPassword !== "string" || newPassword.length < 8) {
    res.status(400); throw new Error("Enter your current password and a new password of at least 8 characters");
  }
  const account = await Model.findById(req[accountKey]._id).select("+password");
  if (!account || !(await account.matchPassword(currentPassword))) {
    res.status(401); throw new Error("Current password is incorrect");
  }
  account.password = newPassword;
  account.passwordResetToken = undefined;
  account.passwordResetExpires = undefined;
  if (Model === Customer) account.passwordVault = undefined;
  await account.save({ validateModifiedOnly: true });
  res.json({ message: "Password changed successfully." });
});
export const changeAdminPassword = changeAccountPassword(User, "user");
export const changeCustomerPassword = changeAccountPassword(Customer, "customer");
