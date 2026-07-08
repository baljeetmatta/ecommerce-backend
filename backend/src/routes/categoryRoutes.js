import express from "express";
import { createCategory, deleteCategory, listCategories, updateCategory } from "../controllers/categoryController.js";
import { authorize, protect } from "../middleware/authMiddleware.js";

const router = express.Router();

router.use(protect);
router
  .route("/")
  .get(listCategories)
  .post(authorize("Super Admin", "Inventory Clerk"), createCategory);
router.put("/:id", authorize("Super Admin", "Inventory Clerk"), updateCategory);
router.delete("/:id", authorize("Super Admin", "Inventory Clerk"), deleteCategory);

export default router;
