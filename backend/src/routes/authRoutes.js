import express from "express";
import { changeAdminPassword, changeCustomerPassword, customerMe, forgotCustomerPassword, forgotPassword, login, loginCustomer, me, register, registerCustomer, resetCustomerPassword, resetPassword, updateLoginEmail, verifyCustomerEmail } from "../controllers/authController.js";
import { protect, protectCustomer } from "../middleware/authMiddleware.js";
import { cancelMyOrder, getMyAccount, getMyCart, getMyOrder, listMyOrders, requestItemReturn, saveMyAddresses, saveMyCart, trackMyOrder, updateMyProfile } from "../controllers/customerAccountController.js";

const router = express.Router();

router.post("/register", register);
router.post("/login", login);
router.post("/forgot-password", forgotPassword);
router.post("/reset-password", resetPassword);
router.get("/me", protect, me);
router.put("/me/password", protect, changeAdminPassword);
router.patch("/me/email", protect, updateLoginEmail);
router.post("/customer/register", registerCustomer);
router.post("/customer/login", loginCustomer);
router.get("/customer/verify-email", verifyCustomerEmail);
router.post("/customer/forgot-password", forgotCustomerPassword);
router.post("/customer/reset-password", resetCustomerPassword);
router.get("/customer/me", protectCustomer, customerMe);
router.put("/customer/password", protectCustomer, changeCustomerPassword);
router.get("/customer/account", protectCustomer, getMyAccount);
router.patch("/customer/account/profile", protectCustomer, updateMyProfile);
router.put("/customer/account/addresses", protectCustomer, saveMyAddresses);
router.get("/customer/account/orders", protectCustomer, listMyOrders);
router.get("/customer/mobile/orders/:orderId", protectCustomer, getMyOrder);
router.get("/customer/account/orders/:orderId", protectCustomer, getMyOrder);
router.post("/customer/account/orders/:orderId/cancel", protectCustomer, cancelMyOrder);
router.get("/customer/account/orders/:orderId/tracking", protectCustomer, trackMyOrder);
router.post("/customer/account/orders/:orderId/items/:productId/return", protectCustomer, requestItemReturn);
router.route("/customer/cart").get(protectCustomer, getMyCart).put(protectCustomer, saveMyCart);

export default router;
