import Cart from "../models/Cart.js";
import Promotion from "../models/Promotion.js";
import asyncHandler from "../utils/asyncHandler.js";

export const listPromotions = asyncHandler(async (_req, res) => {
  const promotions = await Promotion.find().sort({ createdAt: -1 });
  res.json(promotions);
});

export const createPromotion = asyncHandler(async (req, res) => {
  const promotion = await Promotion.create(req.body);
  res.status(201).json(promotion);
});

export const updatePromotion = asyncHandler(async (req, res) => {
  const promotion = await Promotion.findByIdAndUpdate(req.params.id, req.body, {
    new: true,
    runValidators: true
  });

  if (!promotion) {
    res.status(404);
    throw new Error("Promotion not found");
  }

  res.json(promotion);
});

export const listAbandonedCarts = asyncHandler(async (_req, res) => {
  const carts = await Cart.find({ status: "abandoned" }).populate("customer", "name email").sort({ lastActivityAt: -1 });
  res.json(carts);
});

export const markReminderSent = asyncHandler(async (req, res) => {
  const cart = await Cart.findByIdAndUpdate(
    req.params.id,
    { reminderSentAt: new Date() },
    { new: true, runValidators: true }
  );

  if (!cart) {
    res.status(404);
    throw new Error("Cart not found");
  }

  res.json(cart);
});
