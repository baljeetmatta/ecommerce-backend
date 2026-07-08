import express from "express";
import {
  createPromotion,
  listAbandonedCarts,
  listPromotions,
  markReminderSent,
  updatePromotion
} from "../controllers/promotionController.js";
import { authorize, protect } from "../middleware/authMiddleware.js";

const router = express.Router();

router.use(protect);
router
  .route("/")
  .get(authorize("Super Admin", "Marketing Manager"), listPromotions)
  .post(authorize("Super Admin", "Marketing Manager"), createPromotion);
router.put("/:id", authorize("Super Admin", "Marketing Manager"), updatePromotion);
router.get("/abandoned-carts", authorize("Super Admin", "Marketing Manager"), listAbandonedCarts);
router.patch("/abandoned-carts/:id/reminder", authorize("Super Admin", "Marketing Manager"), markReminderSent);

export default router;
