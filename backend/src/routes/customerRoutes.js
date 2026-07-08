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
router.route("/").get(listCustomers).post(authorize("Super Admin", "Customer Support"), createCustomer);
router
  .route("/:id")
  .get(getCustomer)
  .put(authorize("Super Admin", "Customer Support"), updateCustomer);
router.post("/:id/store-credit", authorize("Super Admin", "Customer Support"), issueStoreCredit);

export default router;
