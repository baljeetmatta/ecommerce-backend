import express from "express";
import { createReview, createStorefrontOrder, getActivePaymentMethods, getProductReviews, getStorefront, requestOrderOtp } from "../controllers/storefrontController.js";
import { protectCustomer } from "../middleware/authMiddleware.js";

const router = express.Router();

router.get("/", getStorefront);
router.get("/payment-methods", getActivePaymentMethods);
router.post("/orders/otp", protectCustomer, requestOrderOtp);
router.post("/orders", protectCustomer, createStorefrontOrder);
router.get("/products/:productId/reviews", getProductReviews);
router.post("/products/:productId/reviews", protectCustomer, createReview);

export default router;
