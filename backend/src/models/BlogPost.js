import mongoose from "mongoose";
import { rejectEmbeddedMedia } from "../utils/modelMediaValidation.js";

const blogPostSchema = new mongoose.Schema(
  {
    title: { type: String, required: true, trim: true },
    slug: { type: String, required: true, unique: true, lowercase: true, trim: true },
    category: { type: mongoose.Schema.Types.ObjectId, ref: "BlogCategory" },
    excerpt: String,
    content: String,
    imageUrl: String,
    imageVariants: {
      home: String,
      detail: String
    },
    authorName: { type: String, default: "Store Team" },
    isActive: { type: Boolean, default: true },
    publishedAt: { type: Date, default: Date.now }
  },
  { timestamps: true }
);
rejectEmbeddedMedia(blogPostSchema, ["imageUrl", "imageVariants"]);

export default mongoose.model("BlogPost", blogPostSchema);
