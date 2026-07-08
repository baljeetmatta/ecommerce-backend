import Product from "../models/Product.js";
import asyncHandler from "../utils/asyncHandler.js";

export const listProducts = asyncHandler(async (req, res) => {
  const { q, category, status, lowStock } = req.query;
  const filter = {};

  if (q) filter.$or = [{ name: new RegExp(q, "i") }, { sku: new RegExp(q, "i") }];
  if (category) filter.category = category;
  if (status) filter.status = status;
  if (lowStock === "true") filter.$expr = { $lte: ["$stock", "$lowStockThreshold"] };

  const products = await Product.find(filter)
    .populate("category", "name slug parent")
    .populate("taxCategory", "name code rate")
    .sort({ updatedAt: -1 });
  res.json(products);
});

export const createProduct = asyncHandler(async (req, res) => {
  const created = await Product.create(req.body);
  const product = await Product.findById(created._id)
    .populate("category", "name slug parent")
    .populate("taxCategory", "name code rate");
  res.status(201).json(product);
});

export const getProduct = asyncHandler(async (req, res) => {
  const product = await Product.findById(req.params.id)
    .populate("category", "name slug parent")
    .populate("taxCategory", "name code rate");
  if (!product) {
    res.status(404);
    throw new Error("Product not found");
  }
  res.json(product);
});

export const updateProduct = asyncHandler(async (req, res) => {
  const product = await Product.findByIdAndUpdate(req.params.id, req.body, {
    new: true,
    runValidators: true
  })
    .populate("category", "name slug parent")
    .populate("taxCategory", "name code rate");

  if (!product) {
    res.status(404);
    throw new Error("Product not found");
  }

  res.json(product);
});

export const deleteProduct = asyncHandler(async (req, res) => {
  const product = await Product.findByIdAndDelete(req.params.id);
  if (!product) {
    res.status(404);
    throw new Error("Product not found");
  }
  res.json({ message: "Product deleted" });
});

export const updateInventory = asyncHandler(async (req, res) => {
  const { stock, lowStockThreshold, backOrderAllowed } = req.body;
  const product = await Product.findByIdAndUpdate(
    req.params.id,
    { stock, lowStockThreshold, backOrderAllowed },
    { new: true, runValidators: true }
  );

  if (!product) {
    res.status(404);
    throw new Error("Product not found");
  }

  res.json(product);
});
