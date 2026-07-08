import express from "express";
import { customerMe, login, loginCustomer, me, register, registerCustomer } from "../controllers/authController.js";
import { protect, protectCustomer } from "../middleware/authMiddleware.js";

const router = express.Router();

router.post("/register", register);
router.post("/login", login);
router.get("/me", protect, me);
router.post("/customer/register", registerCustomer);
router.post("/customer/login", loginCustomer);
router.get("/customer/me", protectCustomer, customerMe);

export default router;
