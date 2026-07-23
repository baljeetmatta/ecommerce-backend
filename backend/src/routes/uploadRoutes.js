import express from "express";
import multer from "multer";
import { uploadImage, uploadVideo } from "../controllers/uploadController.js";
import { protectUploader } from "../middleware/authMiddleware.js";

const router = express.Router();
const imageUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 15 * 1024 * 1024 },
  fileFilter: (_req, file, callback) => callback(file.mimetype.startsWith("image/") ? null : new Error("Only image files are allowed"), file.mimetype.startsWith("image/"))
});

router.post("/image", protectUploader, imageUpload.single("image"), uploadImage);
const videoUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 50 * 1024 * 1024 },
  fileFilter: (_req, file, callback) => callback(file.mimetype.startsWith("video/") ? null : new Error("Only video files are allowed"), file.mimetype.startsWith("video/"))
});
router.post("/video", protectUploader, videoUpload.single("video"), uploadVideo);

export default router;
