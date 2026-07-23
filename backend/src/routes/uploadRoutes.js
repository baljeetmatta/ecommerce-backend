import express from "express";
import multer from "multer";
import { uploadImage } from "../controllers/uploadController.js";
import { protectUploader } from "../middleware/authMiddleware.js";

const router = express.Router();
const imageUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 15 * 1024 * 1024 },
  fileFilter: (_req, file, callback) => callback(file.mimetype.startsWith("image/") ? null : new Error("Only image files are allowed"), file.mimetype.startsWith("image/"))
});

router.post("/image", protectUploader, imageUpload.single("image"), uploadImage);

export default router;
