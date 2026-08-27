import mongoose from "mongoose";

const schema = new mongoose.Schema({
  seller: { type: mongoose.Schema.Types.ObjectId, ref: "Seller", required: true, index: true },
  amount: { type: Number, required: true, min: 0.01 },
  balanceBefore: { type: Number, required: true },
  balanceAfter: { type: Number, required: true },
  paymentMethod: { type: String, required: true, trim: true },
  reference: { type: String, trim: true },
  notes: { type: String, trim: true },
  collectedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true }
}, { timestamps: true });

export default mongoose.model("SellerBalanceCollection", schema);
