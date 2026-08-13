import express from "express";
import {
  createOrder,
  closeItemReturnWithRefund,
  createItemReturnShipment,
  createRefund,
  generateInvoice,
  getOrder,
  getPendingItemSummary,
  listOrders,
  syncShipRocketOrder,
  updateOrderItems,
  updateOrderStatus,
  updateItemReturnStatus,
  updateTracking,
  updateRma
} from "../controllers/orderController.js";
import { authorize, protect } from "../middleware/authMiddleware.js";

const router = express.Router();

router.use(protect);
router.route("/").get(listOrders).post(authorize("Super Admin", "Customer Support"), createOrder);
router.get("/reports/pending-items", getPendingItemSummary);
router.get("/:id", getOrder);
router.patch("/:id/status", authorize("Super Admin", "Customer Support"), updateOrderStatus);
router.patch("/:id/items", authorize("Super Admin", "Customer Support"), updateOrderItems);
router.post("/:id/invoice", authorize("Super Admin", "Customer Support"), generateInvoice);
router.patch("/:id/tracking", authorize("Super Admin", "Customer Support"), updateTracking);
router.post("/:id/shiprocket", authorize("Super Admin", "Customer Support"), syncShipRocketOrder);
router.post("/:id/refunds", authorize("Super Admin", "Customer Support"), createRefund);
router.post("/:id/items/:productId/return-refund", authorize("Super Admin", "Customer Support"), closeItemReturnWithRefund);
router.patch("/:id/items/:productId/return", authorize("Super Admin", "Customer Support"), updateItemReturnStatus);
router.post("/:id/items/:productId/return-shipment", authorize("Super Admin", "Customer Support"), createItemReturnShipment);
router.patch("/:id/rma", authorize("Super Admin", "Customer Support"), updateRma);

export default router;
