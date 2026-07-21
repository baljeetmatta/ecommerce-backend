import express from "express";
import {
  getShipRocketSettings,
  getStorefrontSettings,
  deletePaymentMethod,
  getEmailSettings,
  deleteShippingRule,
  listPaymentMethods,
  listShippingRules,
  savePaymentMethod,
  saveShippingRule,
  sendTestEmail,
  updateShipRocketSettings,
  updateStorefrontSettings,
  updateEmailSettings
} from "../controllers/settingsController.js";
import { authorize, protect } from "../middleware/authMiddleware.js";

const router = express.Router();

router.use(protect, authorize("Super Admin"));
router.route("/payment-methods").get(listPaymentMethods).post(savePaymentMethod);
router.route("/payment-methods/:id").put(savePaymentMethod).delete(deletePaymentMethod);
router.route("/shipping-rules").get(listShippingRules).post(saveShippingRule);
router.route("/shipping-rules/:id").put(saveShippingRule).delete(deleteShippingRule);
router.route("/storefront").get(getStorefrontSettings).put(updateStorefrontSettings);
router.route("/shiprocket").get(getShipRocketSettings).put(updateShipRocketSettings);
router.route("/email").get(getEmailSettings).put(updateEmailSettings);
router.post("/email/test", sendTestEmail);

export default router;
