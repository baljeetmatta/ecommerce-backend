import Product from "../models/Product.js";
import asyncHandler from "../utils/asyncHandler.js";
import { deleteUploadedFiles } from "../utils/uploadFiles.js";

const ensureSku = (payload) => {
  if (String(payload.sku || "").trim()) return payload;
  const prefix = String(payload.name || "PRD").toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 5) || "PRD";
  return { ...payload, sku: `${prefix}-${Date.now().toString(36).toUpperCase()}-${Math.random().toString(36).slice(2, 6).toUpperCase()}` };
};

const requireReelVideo = (payload, existingProduct = null) => {
  const displayType = payload.displayType ?? existingProduct?.displayType;
  const videoUrl = payload.videoUrl ?? existingProduct?.videoUrl;
  return displayType !== "Reel" || Boolean(String(videoUrl || "").trim());
};

export const listProducts = asyncHandler(async (req, res) => {
  const { q, category, status, lowStock, fields, page: pageValue, limit: limitValue } = req.query;
  const filter = {};

  if (q) filter.$or = [{ name: new RegExp(q, "i") }, { sku: new RegExp(q, "i") }];
  if (category) filter.category = category;
  if (status) filter.status = status;
  if (lowStock === "true") filter.$expr = { $lte: ["$stock", "$lowStockThreshold"] };

  const page = Math.max(1, Number.parseInt(pageValue, 10) || 1);
  const limit = Math.min(100, Math.max(1, Number.parseInt(limitValue, 10) || 25));
  const paginated = pageValue !== undefined || limitValue !== undefined;
  const query = Product.find(filter)
    .populate("category", "name parent")
    .populate("taxCategory", "name rate")
    // `_id` is always indexed and preserves newest-created-first ordering.
    // Sorting a large collection by an unindexed `updatedAt` exceeded MongoDB's
    // 32 MB in-memory sort limit before pagination could be applied.
    .sort({ _id: -1 });
  if (paginated) {
    query.select(fields === "table"
      ? "name sku category taxCategory price offerPrice status isFeatured imageVariants mainImage"
      : "name sku category taxCategory seller displayType price offerPrice status isFeatured imageVariants mainImage stock lowStockThreshold isStockManageable updatedAt");
    if (fields !== "table") query.populate("seller", "companyName sellerNumber");
  }
  if (!paginated) {
    res.json(await query);
    return;
  }
  const [products, total] = await Promise.all([
    query.skip((page - 1) * limit).limit(limit).lean(),
    Product.countDocuments(filter)
  ]);
  res.json({ items: products, pagination: { page, limit, total, pages: Math.max(1, Math.ceil(total / limit)) } });
});

export const createProduct = asyncHandler(async (req, res) => {
  if (!requireReelVideo(req.body)) {
    res.status(400);
    throw new Error("Upload the Reel video before saving the product.");
  }
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
  const existingProduct = await Product.findById(req.params.id).select("displayType videoUrl").lean();
  if (!existingProduct) {
    res.status(404);
    throw new Error("Product not found");
  }
  if (!requireReelVideo(req.body, existingProduct)) {
    res.status(400);
    throw new Error("Upload the Reel video before saving the product.");
  }
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
  const product = await Product.findOneAndDelete({ _id: req.params.id })
    .select("mainImage imageVariants media videoUrl pendingChanges.mainImage pendingChanges.imageVariants pendingChanges.media pendingChanges.videoUrl")
    .lean();
  if (!product) {
    res.status(404);
    throw new Error("Product not found");
  }
  res.json({ message: "Product deleted; media cleanup started" });

  const mediaUrls = [
    product.mainImage,
    ...Object.values(product.imageVariants || {}),
    ...(product.media || []).map((item) => item.url),
    product.videoUrl,
    product.pendingChanges?.mainImage,
    ...Object.values(product.pendingChanges?.imageVariants || {}),
    ...(product.pendingChanges?.media || []).map((item) => item.url),
    product.pendingChanges?.videoUrl
  ];
  deleteUploadedFiles(mediaUrls).catch((error) => {
    console.error(`Unable to clean media for deleted product ${product._id}:`, error.message);
  });
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
