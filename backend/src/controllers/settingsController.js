import PaymentMethod from "../models/PaymentMethod.js";
import ShippingRule from "../models/ShippingRule.js";
import ShipRocketSetting from "../models/ShipRocketSetting.js";
import StorefrontSetting from "../models/StorefrontSetting.js";
import asyncHandler from "../utils/asyncHandler.js";

const preserveSecret = (current, next, field) => {
  if (next?.[field] === "********") next[field] = current?.[field];
};

export const listPaymentMethods = asyncHandler(async (_req, res) => {
  const methods = await PaymentMethod.find().sort({ sortOrder: 1, name: 1 });
  res.json(methods.map((method) => method.toSafeObject()));
});

export const savePaymentMethod = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const payload = req.body;
  const current = id ? await PaymentMethod.findById(id) : null;
  if (current?.razorpay && payload.razorpay) {
    preserveSecret(current.razorpay, payload.razorpay, "keySecret");
    preserveSecret(current.razorpay, payload.razorpay, "webhookSecret");
  }
  const method = id
    ? await PaymentMethod.findByIdAndUpdate(id, payload, { new: true, runValidators: true })
    : await PaymentMethod.create(payload);
  res.status(id ? 200 : 201).json(method.toSafeObject());
});

export const deletePaymentMethod = asyncHandler(async (req, res) => {
  const method = await PaymentMethod.findByIdAndDelete(req.params.id);
  if (!method) {
    res.status(404);
    throw new Error("Payment method not found");
  }
  res.json({ message: "Payment method deleted", id: req.params.id });
});

export const listShippingRules = asyncHandler(async (_req, res) => {
  const rules = await ShippingRule.find().sort({ sortOrder: 1, name: 1 });
  res.json(rules);
});

export const saveShippingRule = asyncHandler(async (req, res) => {
  const rule = req.params.id
    ? await ShippingRule.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true })
    : await ShippingRule.create(req.body);
  res.status(req.params.id ? 200 : 201).json(rule);
});

export const deleteShippingRule = asyncHandler(async (req, res) => {
  const rule = await ShippingRule.findByIdAndDelete(req.params.id);
  if (!rule) {
    res.status(404);
    throw new Error("Shipping rule not found");
  }
  res.json({ message: "Shipping rule deleted", id: req.params.id });
});

export const getStorefrontSettings = asyncHandler(async (_req, res) => {
  const settings = await StorefrontSetting.findOne({ singleton: "storefront" }).populate("featuredProductIds").populate("productBanners.product", "name sku mainImage");
  res.json(settings || (await StorefrontSetting.create({})));
});

export const updateStorefrontSettings = asyncHandler(async (req, res) => {
  const settings = await StorefrontSetting.findOneAndUpdate(
    { singleton: "storefront" },
    { ...req.body, singleton: "storefront" },
    { new: true, runValidators: true, upsert: true }
  ).populate("featuredProductIds").populate("productBanners.product", "name sku mainImage");
  res.json(settings);
});

export const getShipRocketSettings = asyncHandler(async (_req, res) => {
  const settings = await ShipRocketSetting.findOne({ singleton: "shiprocket" });
  res.json(settings ? settings.toSafeObject() : (await ShipRocketSetting.create({})).toSafeObject());
});

export const updateShipRocketSettings = asyncHandler(async (req, res) => {
  const current = await ShipRocketSetting.findOne({ singleton: "shiprocket" });
  const payload = { ...req.body, singleton: "shiprocket" };
  preserveSecret(current, payload, "password");
  const settings = await ShipRocketSetting.findOneAndUpdate({ singleton: "shiprocket" }, payload, {
    new: true,
    runValidators: true,
    upsert: true
  });
  res.json(settings.toSafeObject());
});
