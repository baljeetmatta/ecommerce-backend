import mongoose from "mongoose";
import { rejectEmbeddedMedia } from "../utils/modelMediaValidation.js";

const categorySchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    slug: { type: String, required: true, unique: true, lowercase: true, trim: true },
    parent: { type: mongoose.Schema.Types.ObjectId, ref: "Category", default: null },
    description: String,
    imageUrl: String,
    isActive: { type: Boolean, default: true }
  },
  { timestamps: true }
);
rejectEmbeddedMedia(categorySchema, ["imageUrl"]);

export default mongoose.model("Category", categorySchema);
