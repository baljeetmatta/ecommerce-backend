import mongoose from "mongoose";

const payuTransactionSchema = new mongoose.Schema({
  txnid: { type: String, required: true, unique: true, index: true },
  kind: { type: String, enum: ["storefront", "partner-registration", "partner-payment"], required: true },
  ownerId: { type: mongoose.Schema.Types.ObjectId },
  ownerEmail: String,
  paymentMethodCode: String,
  amount: { type: Number, required: true },
  status: { type: String, enum: ["initiated", "success", "failed"], default: "initiated", index: true },
  hashValid: { type: Boolean, default: false },
  mihpayid: String,
  bankReference: String,
  errorMessage: String,
  callbackAt: Date
}, { timestamps: true });

payuTransactionSchema.index({ createdAt: 1 }, { expireAfterSeconds: 86400 });
export default mongoose.model("PayuTransaction", payuTransactionSchema);
