import express from "express";
import { getDashboardMetrics } from "../controllers/analyticsController.js";
import { authorize, protect } from "../middleware/authMiddleware.js";

const router = express.Router();

router.use(protect);
router.get("/", authorize("Super Admin", "Analyst"), getDashboardMetrics);

export default router;
