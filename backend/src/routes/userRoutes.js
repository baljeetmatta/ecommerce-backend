import express from "express";
import { createUser, listUsers, updateUser } from "../controllers/userController.js";
import { authorize, protect } from "../middleware/authMiddleware.js";

const router = express.Router();

router.use(protect, authorize("Super Admin"));
router.route("/").get(listUsers).post(createUser);
router.put("/:id", updateUser);

export default router;
