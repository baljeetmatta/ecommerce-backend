import express from "express";
import { createContactMessage, createRazorpayCheckoutOrder, createReelComment, createReview, createStorefrontOrder, getActivePaymentMethods, getProductReviews, getReelEngagement, getStorefront, requestOrderOtp, subscribeNewsletter, toggleReelLike } from "../controllers/storefrontController.js";
import { protectCustomer } from "../middleware/authMiddleware.js";

const router = express.Router();

router.get("/", getStorefront);
router.get("/payment-methods", getActivePaymentMethods);
router.post("/contact", createContactMessage);
router.post("/newsletter", subscribeNewsletter);
router.get("/reels/:productId/engagement", protectCustomer, getReelEngagement);
router.post("/reels/:productId/like", protectCustomer, toggleReelLike);
router.post("/reels/:productId/comments", protectCustomer, createReelComment);
router.post("/orders/otp", protectCustomer, requestOrderOtp);
router.post("/orders/razorpay", protectCustomer, createRazorpayCheckoutOrder);
router.post("/orders", protectCustomer, createStorefrontOrder);
router.get("/products/:productId/reviews", getProductReviews);
router.post("/products/:productId/reviews", protectCustomer, createReview);

export default router;
