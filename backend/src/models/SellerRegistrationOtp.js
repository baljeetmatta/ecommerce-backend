import mongoose from "mongoose";

const sellerRegistrationOtpSchema = new mongoose.Schema({
  email: { type: String, required: true, lowercase: true, index: true },
  payload: { type: mongoose.Schema.Types.Mixed, required: true },
  codeHash: { type: String, required: true },
  attempts: { type: Number, default: 0 },
  expiresAt: { type: Date, required: true, index: { expires: 0 } }
}, { timestamps: true });

export default mongoose.model("SellerRegistrationOtp", sellerRegistrationOtpSchema);
