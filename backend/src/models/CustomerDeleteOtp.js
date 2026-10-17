import mongoose from "mongoose";

const customerDeleteOtpSchema = new mongoose.Schema({
  customer: { type: mongoose.Schema.Types.ObjectId, ref: "Customer", required: true, index: true },
  admin: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true },
  codeHash: { type: String, required: true },
  expiresAt: { type: Date, required: true, expires: 0 },
  attempts: { type: Number, default: 0 }
}, { timestamps: true });

export default mongoose.model("CustomerDeleteOtp", customerDeleteOtpSchema);
