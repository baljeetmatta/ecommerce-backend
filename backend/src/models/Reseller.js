import mongoose from "mongoose";

const resellerSchema = new mongoose.Schema({
  customer: { type: mongoose.Schema.Types.ObjectId, ref: "Customer", required: true, unique: true, index: true },
  resellerId: { type: String, required: true, unique: true, index: true },
  fullName: { type: String, required: true, trim: true },
  mobile: { type: String, required: true, trim: true },
  email: { type: String, required: true, lowercase: true, trim: true },
  address: { type: String, required: true, trim: true },
  pan: { type: String, required: true, uppercase: true, trim: true },
  gstStatus: { type: String, enum: ["gst", "non-gst"], required: true },
  gstin: { type: String, uppercase: true, trim: true },
  paymentDetails: {
    method: { type: String, enum: ["bank", "upi"], required: true },
    accountHolder: String, accountNumber: String, ifsc: String, bankName: String, upiId: String
  },
  kyc: { panDocument: String, addressDocument: String, status: { type: String, enum: ["pending", "approved", "rejected"], default: "pending" }, note: String },
  termsAcceptedAt: { type: Date, required: true },
  status: { type: String, enum: ["pending", "active", "suspended", "rejected"], default: "active", index: true }
}, { timestamps: true });

resellerSchema.pre("validate", function validateGst(next) {
  if (this.gstStatus === "gst" && !String(this.gstin || "").trim()) this.invalidate("gstin", "GSTIN is required for GST-registered resellers.");
  next();
});

export default mongoose.model("Reseller", resellerSchema);
