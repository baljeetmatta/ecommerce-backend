import mongoose from "mongoose";

const sellerWithdrawalSchema = new mongoose.Schema(
  {
    seller: { type: mongoose.Schema.Types.ObjectId, ref: "Seller", required: true, index: true },
    amount: { type: Number, required: true, min: 0.01 },
    status: { type: String, enum: ["pending", "approved", "rejected", "paid"], default: "pending", index: true },
    bankSnapshot: { accountType: String, accountNumber: String, ifsc: String, bankName: String, branch: String, accountHolderName: String },
    adminNote: String,
    paidAt: Date,
    processedAt: Date,
    processedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    payout: { provider: String, environment: String, payoutId: String, fundAccountId: String, status: String, utr: String, initiatedAt: Date, updatedAt: Date, failureReason: String }
  },
  { timestamps: true }
);

export default mongoose.model("SellerWithdrawal", sellerWithdrawalSchema);
