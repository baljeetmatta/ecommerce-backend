import Customer from "../models/Customer.js";
import Order from "../models/Order.js";
import asyncHandler from "../utils/asyncHandler.js";

export const listCustomers = asyncHandler(async (req, res) => {
  const { q, status } = req.query;
  const filter = {};

  if (q) filter.$or = [{ name: new RegExp(q, "i") }, { email: new RegExp(q, "i") }];
  if (status) filter.status = status;

  const customers = await Customer.find(filter).sort({ updatedAt: -1 });
  res.json(customers);
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
