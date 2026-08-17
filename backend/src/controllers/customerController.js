import Customer from "../models/Customer.js";
import Order from "../models/Order.js";
import asyncHandler from "../utils/asyncHandler.js";
import WorkAssignment from "../models/WorkAssignment.js";

export const listCustomers = asyncHandler(async (req, res) => {
  const { q, status } = req.query;
  const page = Math.max(1, Number.parseInt(req.query.page, 10) || 1);
  const limit = Math.min(100, Math.max(1, Number.parseInt(req.query.limit, 10) || 10));
  const filter = {};
  if (["Staff", "Team Leader"].includes(req.user.role)) { const ids = await WorkAssignment.find({ ...req.staffScope, entityType: "Customer", active: true }).distinct("entity"); filter._id = { $in: ids }; }

  if (q) {
    const escaped = String(q).trim().replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    filter.$or = [{ name: new RegExp(escaped, "i") }, { email: new RegExp(escaped, "i") }, { phone: new RegExp(escaped, "i") }];
  }
  if (status) filter.status = status;

  const [customers, total] = await Promise.all([
    Customer.find(filter)
      .select("name email phone profileImage status storeCredit createdAt updatedAt")
      .sort({ _id: -1 })
      .skip((page - 1) * limit)
      .limit(limit),
    Customer.countDocuments(filter)
  ]);
  res.json({ items: customers, pagination: { page, limit, total, pages: Math.max(1, Math.ceil(total / limit)) } });
});

export const createCustomer = asyncHandler(async (req, res) => {
  const customer = await Customer.create(req.body);
  res.status(201).json(customer);
});

export const getCustomer = asyncHandler(async (req, res) => {
  const customer = await Customer.findById(req.params.id);
  if (!customer) {
    res.status(404);
    throw new Error("Customer not found");
  }

  const orders = await Order.find({ customer: customer._id }).sort({ createdAt: -1 });
  res.json({ customer, orders });
});

export const updateCustomer = asyncHandler(async (req, res) => {
  const customer = await Customer.findByIdAndUpdate(req.params.id, req.body, {
    new: true,
    runValidators: true
  });

  if (!customer) {
    res.status(404);
    throw new Error("Customer not found");
  }

  res.json(customer);
});

export const issueStoreCredit = asyncHandler(async (req, res) => {
  const { amount, note } = req.body;
  const customer = await Customer.findByIdAndUpdate(
    req.params.id,
    {
      $inc: { storeCredit: amount },
      $set: { notes: note }
    },
    { new: true, runValidators: true }
  );

  if (!customer) {
    res.status(404);
    throw new Error("Customer not found");
  }

  res.json(customer);
});
