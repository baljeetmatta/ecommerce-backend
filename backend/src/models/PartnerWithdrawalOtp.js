import mongoose from "mongoose";

const partnerWithdrawalOtpSchema = new mongoose.Schema(
  {
    partner: { type: mongoose.Schema.Types.ObjectId, ref: "Partner", required: true, index: true },
    email: { type: String, required: true, lowercase: true, trim: true },
    amount: { type: Number, required: true, min: 0.01 },
    codeHash: { type: String, required: true },
    expiresAt: { type: Date, required: true, expires: 0 },
    attempts: { type: Number, default: 0 },
    verifiedAt: Date
  },
  { timestamps: true }
);

export default mongoose.model("PartnerWithdrawalOtp", partnerWithdrawalOtpSchema);
