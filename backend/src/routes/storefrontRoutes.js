import express from "express";
import { createContactMessage, createPayuCheckout, createRazorpayCheckoutOrder, createReelComment, createReview, createStorefrontOrder, getActivePaymentMethods, getPayuStatus, getProductReviews, getReelEngagement, getSellerReviews, getShippingQuote, getStorefront, getStorefrontCatalog, getStorefrontProduct, payuCallback, recordReelView, requestOrderOtp, subscribeNewsletter, toggleReelLike } from "../controllers/storefrontController.js";
import { optionalCustomer, protectCustomer } from "../middleware/authMiddleware.js";
import { getStorefrontBlogPost } from "../controllers/blogController.js";

const router = express.Router();

router.get("/", getStorefront);
router.get("/catalog", getStorefrontCatalog);
router.get("/catalog/:productId", getStorefrontProduct);
router.get("/blog/:slug", getStorefrontBlogPost);
router.get("/payment-methods", getActivePaymentMethods);
router.post("/shipping-quote", getShippingQuote);
router.post("/contact", createContactMessage);
router.post("/newsletter", subscribeNewsletter);
router.get("/reels/:productId/engagement", optionalCustomer, getReelEngagement);
router.post("/reels/:productId/view", optionalCustomer, recordReelView);
router.post("/reels/:productId/like", protectCustomer, toggleReelLike);
router.post("/reels/:productId/comments", protectCustomer, createReelComment);
router.post("/orders/otp", protectCustomer, requestOrderOtp);
router.post("/orders/razorpay", protectCustomer, createRazorpayCheckoutOrder);
router.post("/orders/payu", protectCustomer, createPayuCheckout);
router.post("/payu/callback", payuCallback);
router.get("/payu/status/:txnid", getPayuStatus);
router.post("/orders", protectCustomer, createStorefrontOrder);
router.get("/products/:productId/reviews", getProductReviews);
router.post("/products/:productId/reviews", protectCustomer, createReview);
router.get("/sellers/:sellerId/reviews", getSellerReviews);

export default router;
