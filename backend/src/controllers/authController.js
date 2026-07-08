import Customer from "../models/Customer.js";
import User from "../models/User.js";
import asyncHandler from "../utils/asyncHandler.js";
import { createToken } from "../utils/token.js";

const publicUser = (user) => ({
  id: user._id,
  name: user.name,
  email: user.email,
  role: user.role,
  permissions: user.permissions
});

const publicCustomer = (customer) => ({
  id: customer._id,
  name: customer.name,
  email: customer.email,
  status: customer.status,
  storeCredit: customer.storeCredit
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
  const { email, password } = req.body;
  const user = await User.findOne({ email }).select("+password");

  if (!user || !(await user.matchPassword(password))) {
    res.status(401);
    throw new Error("Invalid email or password");
  }

  res.json({
    user: publicUser(user),
    token: createToken(user)
  });
});

export const me = asyncHandler(async (req, res) => {
  res.json({ user: publicUser(req.user) });
});

export const registerCustomer = asyncHandler(async (req, res) => {
  const { name, email, password } = req.body;

  if (!name || !email || !password) {
    res.status(400);
    throw new Error("Name, email, and password are required");
  }

  const existingCustomer = await Customer.findOne({ email });

  if (existingCustomer) {
    res.status(409);
    throw new Error("Email is already registered");
  }

  const customer = await Customer.create({ name, email, password });

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

export const customerMe = asyncHandler(async (req, res) => {
  res.json({ customer: publicCustomer(req.customer) });
});
