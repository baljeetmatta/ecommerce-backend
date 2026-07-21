import mongoose from "mongoose";

const partnerBankOtpSchema = new mongoose.Schema(
  {
    partner: { type: mongoose.Schema.Types.ObjectId, ref: "Partner", required: true, index: true },
    email: { type: String, required: true, lowercase: true },
    bankDetails: {
      accountHolderName: String,
      accountNumber: String,
      ifsc: String,
      bankName: String,
      branch: String
    },
    codeHash: { type: String, required: true },
    attempts: { type: Number, default: 0 },
    expiresAt: { type: Date, required: true, index: { expires: 0 } }
  },
  { timestamps: true }
);

export default mongoose.model("PartnerBankOtp", partnerBankOtpSchema);
