import mongoose from "mongoose";

const paymentMethodSchema = new mongoose.Schema(
  {
    code: { type: String, required: true, unique: true, trim: true },
    name: { type: String, required: true, trim: true },
    type: { type: String, enum: ["cod", "razorpay", "payu"], required: true },
    isActive: { type: Boolean, default: true },
    sortOrder: { type: Number, default: 0 },
    instructions: String,
    razorpay: {
      keyId: String,
      keySecret: String,
      merchantId: String,
      webhookSecret: String,
      payoutAccountNumber: String,
      payoutOtpEmail: { type: String, trim: true, lowercase: true },
      environment: { type: String, enum: ["test", "live"], default: "test" }
    },
    payu: {
      merchantKey: String,
      salt: String,
      merchantId: String,
      environment: { type: String, enum: ["test", "live"], default: "test" }
    }
  },
  { timestamps: true }
);

paymentMethodSchema.methods.toSafeObject = function toSafeObject() {
  const value = this.toObject();
  if (value.razorpay?.keySecret) value.razorpay.keySecret = "********";
  if (value.razorpay?.webhookSecret) value.razorpay.webhookSecret = "********";
  if (value.payu?.salt) value.payu.salt = "********";
  return value;
};

export default mongoose.model("PaymentMethod", paymentMethodSchema);
