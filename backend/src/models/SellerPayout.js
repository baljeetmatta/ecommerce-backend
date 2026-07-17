import mongoose from "mongoose";

const sellerPayoutSchema = new mongoose.Schema(
  {
    seller: { type: mongoose.Schema.Types.ObjectId, ref: "Seller", required: true, index: true },
    order: { type: mongoose.Schema.Types.ObjectId, ref: "Order", required: true, index: true },
    product: { type: mongoose.Schema.Types.ObjectId, ref: "Product", required: true },
    grossAmount: { type: Number, required: true, min: 0 },
    commissionRate: { type: Number, required: true, min: 0, max: 100 },
    commissionAmount: { type: Number, required: true, min: 0 },
    netAmount: { type: Number, required: true, min: 0 },
    description: String
  },
  { timestamps: true }
);

sellerPayoutSchema.index({ seller: 1, order: 1, product: 1 }, { unique: true });
export default mongoose.model("SellerPayout", sellerPayoutSchema);
