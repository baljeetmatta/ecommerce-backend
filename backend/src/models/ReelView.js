import mongoose from "mongoose";

const reelViewSchema = new mongoose.Schema({
  product: { type: mongoose.Schema.Types.ObjectId, ref: "Product", required: true, index: true },
  viewerKey: { type: String, required: true },
  lastViewedAt: { type: Date, required: true, default: Date.now }
}, { timestamps: true });

reelViewSchema.index({ product: 1, viewerKey: 1 }, { unique: true });

export default mongoose.model("ReelView", reelViewSchema);
