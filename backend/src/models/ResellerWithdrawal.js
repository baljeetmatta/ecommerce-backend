import mongoose from "mongoose";

const resellerWithdrawalSchema = new mongoose.Schema({
  reseller: { type: mongoose.Schema.Types.ObjectId, ref: "Reseller", required: true, index: true },
  amount: { type: Number, required: true, min: 1 },
  status: { type: String, enum: ["requested", "processing", "paid", "rejected"], default: "requested", index: true },
  paymentReference: String,
  transactionDate: Date,
  bankSnapshot: { accountHolder: String, accountNumber: String, ifsc: String, bankName: String, branch: String },
  note: String,
  processedAt: Date,
  processedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  payout: { provider: String, environment: String, payoutId: String, fundAccountId: String, status: String, utr: String, initiatedAt: Date, updatedAt: Date, failureReason: String },
  orders: [{ type: mongoose.Schema.Types.ObjectId, ref: "Order" }]
}, { timestamps: true });
export default mongoose.model("ResellerWithdrawal", resellerWithdrawalSchema);
