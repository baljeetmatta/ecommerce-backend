import mongoose from "mongoose";

const reelCommentSchema = new mongoose.Schema({
  customer: { type: mongoose.Schema.Types.ObjectId, ref: "Customer", required: true },
  text: { type: String, required: true, trim: true, maxlength: 1000 }
}, { timestamps: true });

const reelEngagementSchema = new mongoose.Schema({
  product: { type: mongoose.Schema.Types.ObjectId, ref: "Product", required: true, unique: true, index: true },
  viewCount: { type: Number, min: 0, default: 0 },
  likes: [{ type: mongoose.Schema.Types.ObjectId, ref: "Customer" }],
  comments: [reelCommentSchema]
}, { timestamps: true });

export default mongoose.model("ReelEngagement", reelEngagementSchema);
