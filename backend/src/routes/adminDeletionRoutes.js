import express from "express";
import rateLimit from "express-rate-limit";
import { deleteAdminRecord, requestAdminDeletionOtp } from "../controllers/adminDeletionController.js";
import { authorize, protect } from "../middleware/authMiddleware.js";

const router = express.Router();
const otpLimiter = rateLimit({ windowMs: 15 * 60 * 1000, limit: 5, standardHeaders: true, legacyHeaders: false });

router.use(protect, authorize("Super Admin"));
router.post("/:entityType/:id/otp", otpLimiter, requestAdminDeletionOtp);
router.delete("/:entityType/:id", deleteAdminRecord);

export default router;