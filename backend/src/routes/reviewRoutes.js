import express from "express";
import { listReviewsForModeration, moderateReview } from "../controllers/reviewController.js";
import { protect } from "../middleware/authMiddleware.js";

const router = express.Router();
router.use(protect);
router.get("/", listReviewsForModeration);
router.patch("/:id", moderateReview);
export default router;
