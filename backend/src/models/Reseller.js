import mongoose from "mongoose";

const resellerSchema = new mongoose.Schema({
  customer: { type: mongoose.Schema.Types.ObjectId, ref: "Customer", required: true, unique: true, index: true },
  resellerId: { type: String, required: true, unique: true, index: true },
  fullName: { type: String, required: true, trim: true },
  businessName: { type: String, trim: true },
  mobile: { type: String, required: true, trim: true },
  email: { type: String, required: true, lowercase: true, trim: true },
  address: { type: String, trim: true },
  pan: { type: String, uppercase: true, trim: true },
  gstStatus: { type: String, enum: ["gst", "non-gst"], required: true },
  gstin: { type: String, uppercase: true, trim: true },
  gstLegalName: { type: String, trim: true },
  gstState: { type: String, trim: true },
  gstCertificate: { type: String, trim: true },
  gstVerificationStatus: { type: String, enum: ["pending", "verified", "rejected", "not_registered"], default: "pending" },
  paymentDetails: {
    method: { type: String, enum: ["bank", "upi"], required: true },
    accountHolder: String, accountNumber: String, ifsc: String, bankName: String, upiId: String
  },
  kyc: { panDocument: String, addressDocument: String, status: { type: String, enum: ["pending", "approved", "rejected"], default: "pending" }, note: String },
  termsAcceptedAt: { type: Date, required: true },
  status: { type: String, enum: ["pending", "active", "suspended", "rejected"], default: "active", index: true }
}, { timestamps: true });

export default mongoose.model("Reseller", resellerSchema);
