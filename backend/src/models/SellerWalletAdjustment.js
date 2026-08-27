import mongoose from "mongoose";

const sellerWalletAdjustmentSchema = new mongoose.Schema({
  seller: { type: mongoose.Schema.Types.ObjectId, ref: "Seller", required: true, index: true },
  order: { type: mongoose.Schema.Types.ObjectId, ref: "Order", required: true, index: true },
  product: { type: mongoose.Schema.Types.ObjectId, ref: "Product", required: true },
  type: { type: String, enum: ["return_shiprocket", "rto_shiprocket", "balance_collection"], required: true },
  shippingCharge: { type: Number, min: 0, default: 0 },
  rtoCharge: { type: Number, min: 0, default: 0 },
  amount: { type: Number, required: true, min: 0 },
  description: String,
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" }
}, { timestamps: true });

sellerWalletAdjustmentSchema.index({ seller: 1, order: 1, product: 1, type: 1 }, { unique: true });
export default mongoose.model("SellerWalletAdjustment", sellerWalletAdjustmentSchema);
