import mongoose from "mongoose";

const resellerLinkSchema = new mongoose.Schema({
  code: { type: String, required: true, unique: true, index: true },
  reseller: { type: mongoose.Schema.Types.ObjectId, ref: "Reseller", required: true, index: true },
  product: { type: mongoose.Schema.Types.ObjectId, ref: "Product", required: true, index: true },
  margin: { type: Number, required: true, min: 0 },
  customerPrice: { type: Number, required: true, min: 0 },
  isActive: { type: Boolean, default: true },
  clicks: { type: Number, default: 0, min: 0 }
}, { timestamps: true });

resellerLinkSchema.index({ reseller: 1, product: 1, margin: 1 }, { unique: true });
export default mongoose.model("ResellerLink", resellerLinkSchema);
