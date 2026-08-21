import mongoose from "mongoose";

const resellerWithdrawalSchema = new mongoose.Schema({
  reseller: { type: mongoose.Schema.Types.ObjectId, ref: "Reseller", required: true, index: true },
  amount: { type: Number, required: true, min: 1 },
  status: { type: String, enum: ["requested", "processing", "paid", "rejected"], default: "requested", index: true },
  paymentReference: String,
  note: String,
  processedAt: Date,
  processedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  orders: [{ type: mongoose.Schema.Types.ObjectId, ref: "Order" }]
}, { timestamps: true });
export default mongoose.model("ResellerWithdrawal", resellerWithdrawalSchema);
