import Cart from "../models/Cart.js";
import Customer from "../models/Customer.js";
import Order from "../models/Order.js";
import Product from "../models/Product.js";
import asyncHandler from "../utils/asyncHandler.js";
import { storefrontProduct } from "../utils/gstPricing.js";

const publicCustomer = (customer) => ({ id: customer._id, name: customer.name, email: customer.email, phone: customer.phone || "", gender: customer.gender, status: customer.status, storeCredit: customer.storeCredit, addresses: customer.addresses || [] });

export const getMyCart = asyncHandler(async (req, res) => {
  const cart = await Cart.findOne({ customer: req.customer._id, status: "active" }).populate({ path: "items.product", select: "name sku price offerPrice priceIncludesTax taxCategory mainImage media stock isStockManageable status variants variationOptions", populate: { path: "taxCategory", select: "name code rate" } });
  res.json({ items: cart?.items?.filter((item) => item.product?.status === "active").map((item) => ({ product: storefrontProduct(item.product), variant: item.variantSku ? item.product.variants.find((variant) => variant.sku === item.variantSku) : null, quantity: item.quantity })) || [] });
});

export const saveMyCart = asyncHandler(async (req, res) => {
  const requested = Array.isArray(req.body.items) ? req.body.items : [];
  const ids = requested.map((item) => item.productId).filter(Boolean);
  const products = await Product.find({ _id: { $in: ids }, status: "active" });
  const productMap = new Map(products.map((product) => [String(product._id), product]));
  const items = requested.flatMap((item) => {
    const product = productMap.get(String(item.productId));
    if (!product) return [];
    const variant = item.variantSku ? product.variants.find((entry) => entry.sku === item.variantSku) : null;
    return [{ product: product._id, name: product.name, sku: variant?.sku || product.sku, variantSku: variant?.sku, variantAttributes: variant?.attributes, quantity: Math.max(1, Number(item.quantity) || 1), price: Number(variant?.price ?? product.offerPrice ?? product.price) }];
  });
  const cart = await Cart.findOneAndUpdate(
    { customer: req.customer._id, status: "active" },
    { $set: { email: req.customer.email, items, lastActivityAt: new Date() } },
    { new: true, upsert: true, runValidators: true, setDefaultsOnInsert: true }
  );
  res.json({ itemCount: cart.items.reduce((sum, item) => sum + item.quantity, 0) });
});

export const getMyAccount = asyncHandler(async (req, res) => res.json({ customer: publicCustomer(req.customer) }));

export const updateMyProfile = asyncHandler(async (req, res) => {
  const { name, phone, gender } = req.body;
  if (!String(name || "").trim()) { res.status(400); throw new Error("Name is required"); }
  if (gender && !["male", "female", "other", "prefer_not_to_say"].includes(gender)) { res.status(400); throw new Error("Select a valid gender"); }
  req.customer.name = String(name).trim();
  req.customer.phone = String(phone || "").trim();
  if (gender) req.customer.gender = gender;
  await req.customer.save();
  res.json({ customer: publicCustomer(req.customer) });
});

export const saveMyAddresses = asyncHandler(async (req, res) => {
  const addresses = Array.isArray(req.body.addresses) ? req.body.addresses : [];
  for (const address of addresses) {
    if (!address.label || !address.line1 || !address.city || !address.state || !address.postalCode || !address.country) { res.status(400); throw new Error("Every address field is required"); }
  }
  req.customer.addresses = addresses.map(({ label, line1, city, state, postalCode, country }) => ({ label, line1, city, state, postalCode, country }));
  await req.customer.save();
  res.json({ customer: publicCustomer(req.customer) });
});

export const listMyOrders = asyncHandler(async (req, res) => {
  const orders = await Order.find({ customer: req.customer._id }).populate("items.product", "mainImage media name").sort({ createdAt: -1 });
  res.json(orders);
});
