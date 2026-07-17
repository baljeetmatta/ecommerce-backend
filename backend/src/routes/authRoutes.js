import express from "express";
import { customerMe, login, loginCustomer, me, register, registerCustomer } from "../controllers/authController.js";
import { protect, protectCustomer } from "../middleware/authMiddleware.js";
import { getMyAccount, getMyCart, listMyOrders, saveMyAddresses, saveMyCart, updateMyProfile } from "../controllers/customerAccountController.js";

const router = express.Router();

router.post("/register", register);
router.post("/login", login);
router.get("/me", protect, me);
router.post("/customer/register", registerCustomer);
router.post("/customer/login", loginCustomer);
router.get("/customer/me", protectCustomer, customerMe);
router.get("/customer/account", protectCustomer, getMyAccount);
router.patch("/customer/account/profile", protectCustomer, updateMyProfile);
router.put("/customer/account/addresses", protectCustomer, saveMyAddresses);
router.get("/customer/account/orders", protectCustomer, listMyOrders);
router.route("/customer/cart").get(protectCustomer, getMyCart).put(protectCustomer, saveMyCart);

export default router;
