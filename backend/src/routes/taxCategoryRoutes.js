import express from "express";
import { createTaxCategory, deleteTaxCategory, listTaxCategories, updateTaxCategory } from "../controllers/taxCategoryController.js";
import { authorize, protect } from "../middleware/authMiddleware.js";

const router = express.Router();

router.use(protect);
router
  .route("/")
  .get(listTaxCategories)
  .post(authorize("Super Admin", "Inventory Clerk"), createTaxCategory);
router.put("/:id", authorize("Super Admin", "Inventory Clerk"), updateTaxCategory);
router.delete("/:id", authorize("Super Admin", "Inventory Clerk"), deleteTaxCategory);

export default router;
