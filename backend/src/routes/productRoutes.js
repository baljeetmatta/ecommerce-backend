import express from "express";
import {
  createProduct,
  deleteProduct,
  getProduct,
  listProducts,
  updateInventory,
  updateProduct
} from "../controllers/productController.js";
import { authorize, protect } from "../middleware/authMiddleware.js";

const router = express.Router();

router.use(protect);
router.route("/").get(listProducts).post(authorize("Super Admin", "Inventory Clerk"), createProduct);
router
  .route("/:id")
  .get(getProduct)
  .put(authorize("Super Admin", "Inventory Clerk"), updateProduct)
  .delete(authorize("Super Admin"), deleteProduct);
router.patch("/:id/inventory", authorize("Super Admin", "Inventory Clerk"), updateInventory);

export default router;
