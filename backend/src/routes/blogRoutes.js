import express from "express";
import {
  createBlogCategory,
  createBlogPost,
  deleteBlogCategory,
  deleteBlogPost,
  listBlogCategories,
  listBlogPosts,
  updateBlogCategory,
  updateBlogPost
} from "../controllers/blogController.js";
import { authorize, protect } from "../middleware/authMiddleware.js";

const router = express.Router();

router.use(protect);
router
  .route("/categories")
  .get(authorize("Super Admin", "Marketing Manager"), listBlogCategories)
  .post(authorize("Super Admin", "Marketing Manager"), createBlogCategory);
router
  .route("/categories/:id")
  .put(authorize("Super Admin", "Marketing Manager"), updateBlogCategory)
  .delete(authorize("Super Admin", "Marketing Manager"), deleteBlogCategory);
router
  .route("/posts")
  .get(authorize("Super Admin", "Marketing Manager"), listBlogPosts)
  .post(authorize("Super Admin", "Marketing Manager"), createBlogPost);
router
  .route("/posts/:id")
  .put(authorize("Super Admin", "Marketing Manager"), updateBlogPost)
  .delete(authorize("Super Admin", "Marketing Manager"), deleteBlogPost);

export default router;
