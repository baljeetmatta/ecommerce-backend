import mongoose from "mongoose";

const schema = new mongoose.Schema({
  withdrawal: { type: mongoose.Schema.Types.ObjectId, ref: "SellerWithdrawal", required: true, index: true },
  approver: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true },
  email: { type: String, required: true, lowercase: true },
  codeHash: { type: String, required: true },
  expiresAt: { type: Date, required: true, expires: 0 },
  attempts: { type: Number, default: 0 },
  verifiedAt: Date
}, { timestamps: true });

export default mongoose.model("SellerWithdrawalPayoutOtp", schema);
