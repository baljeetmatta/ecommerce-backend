import mongoose from "mongoose";

const withdrawalSchema = new mongoose.Schema(
  {
    partner: { type: mongoose.Schema.Types.ObjectId, ref: "Partner", required: true, index: true },
    amount: { type: Number, required: true, min: 0.01 },
    status: { type: String, enum: ["pending", "approved", "rejected", "paid"], default: "pending" },
    bankSnapshot: { accountNumber: String, ifsc: String, bankName: String, accountHolderName: String },
    adminNote: String,
    paidAt: Date,
    processedAt: Date,
    processedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    payout: { provider: String, payoutId: String, fundAccountId: String, status: String, utr: String, initiatedAt: Date, failureReason: String }
  },
  { timestamps: true }
);
export default mongoose.model("Withdrawal", withdrawalSchema);
