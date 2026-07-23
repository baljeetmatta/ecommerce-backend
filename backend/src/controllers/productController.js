import Product from "../models/Product.js";
import asyncHandler from "../utils/asyncHandler.js";

const ensureSku = (payload) => {
  if (String(payload.sku || "").trim()) return payload;
  const prefix = String(payload.name || "PRD").toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 5) || "PRD";
  return { ...payload, sku: `${prefix}-${Date.now().toString(36).toUpperCase()}-${Math.random().toString(36).slice(2, 6).toUpperCase()}` };
};

export const listProducts = asyncHandler(async (req, res) => {
  const { q, category, status, lowStock, page: pageValue, limit: limitValue } = req.query;
  const filter = {};

  if (q) filter.$or = [{ name: new RegExp(q, "i") }, { sku: new RegExp(q, "i") }];
  if (category) filter.category = category;
  if (status) filter.status = status;
  if (lowStock === "true") filter.$expr = { $lte: ["$stock", "$lowStockThreshold"] };

  const page = Math.max(1, Number.parseInt(pageValue, 10) || 1);
  const limit = Math.min(100, Math.max(1, Number.parseInt(limitValue, 10) || 25));
  const paginated = pageValue !== undefined || limitValue !== undefined;
  const query = Product.find(filter)
    .populate("category", "name slug parent")
    .populate("taxCategory", "name code rate")
    .populate("seller", "companyName sellerNumber")
    .sort({ updatedAt: -1 });
  if (!paginated) {
    res.json(await query);
    return;
  }
  const [products, total] = await Promise.all([
    query.skip((page - 1) * limit).limit(limit),
    Product.countDocuments(filter)
  ]);
  res.json({ items: products, pagination: { page, limit, total, pages: Math.max(1, Math.ceil(total / limit)) } });
});

export const createProduct = asyncHandler(async (req, res) => {
  const created = await Product.create(ensureSku(req.body));
  const product = await Product.findById(created._id)
    .populate("category", "name slug parent")
    .populate("taxCategory", "name code rate");
  await product.populate("seller", "companyName sellerNumber");
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
  await product.populate("seller", "companyName sellerNumber");
  res.json(product);
});

export const updateProduct = asyncHandler(async (req, res) => {
  const product = await Product.findByIdAndUpdate(req.params.id, ensureSku(req.body), {
    new: true,
    runValidators: true
  })
    .populate("category", "name slug parent")
    .populate("taxCategory", "name code rate");
  if (product) await product.populate("seller", "companyName sellerNumber");

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
