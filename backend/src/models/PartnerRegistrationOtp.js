import mongoose from "mongoose";

const partnerRegistrationOtpSchema = new mongoose.Schema({
  email: { type: String, required: true, lowercase: true, index: true },
  purpose: { type: String, enum: ["account", "payment"], default: "account", index: true },
  payload: { type: mongoose.Schema.Types.Mixed, required: true },
  codeHash: { type: String, required: true },
  attempts: { type: Number, default: 0 },
  verifiedAt: Date,
  verificationTokenHash: { type: String, select: false },
  consumedAt: Date,
  expiresAt: { type: Date, required: true, index: { expires: 0 } }
}, { timestamps: true });

export default mongoose.model("PartnerRegistrationOtp", partnerRegistrationOtpSchema);
