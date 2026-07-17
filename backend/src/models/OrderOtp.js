import mongoose from "mongoose";

const orderOtpSchema = new mongoose.Schema(
  {
    customer: { type: mongoose.Schema.Types.ObjectId, ref: "Customer", required: true },
    email: { type: String, required: true, lowercase: true, trim: true },
    codeHash: { type: String, required: true },
    expiresAt: { type: Date, required: true, expires: 0 },
    attempts: { type: Number, default: 0 },
    verifiedAt: Date
  },
  { timestamps: true }
);

export default mongoose.model("OrderOtp", orderOtpSchema);
