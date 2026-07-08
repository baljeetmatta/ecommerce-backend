import express from "express";
import { createStorefrontOrder, getStorefront } from "../controllers/storefrontController.js";

const router = express.Router();

router.get("/", getStorefront);
router.post("/orders", createStorefrontOrder);

export default router;
