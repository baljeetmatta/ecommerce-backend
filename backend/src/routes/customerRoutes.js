import express from "express";
import {
  createCustomer,
  getCustomer,
  issueStoreCredit,
  listCustomers,
  updateCustomer
} from "../controllers/customerController.js";
import { authorize, protect } from "../middleware/authMiddleware.js";

const router = express.Router();

router.use(protect);
router.route("/").get(authorize("Super Admin", "Customer Support"), listCustomers).post(authorize("Super Admin", "Customer Support"), createCustomer);
router
  .route("/:id")
  .get(authorize("Super Admin", "Customer Support"), getCustomer)
  .put(authorize("Super Admin", "Customer Support"), updateCustomer);
router.post("/:id/store-credit", authorize("Super Admin", "Customer Support"), issueStoreCredit);

export default router;
