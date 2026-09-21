import mongoose from "mongoose";
import { rejectEmbeddedMedia } from "../utils/modelMediaValidation.js";

const kycDocumentSchema = new mongoose.Schema({ file: String, status: { type: String, enum: ["not_submitted", "pending", "approved", "rejected"], default: "not_submitted" }, rejectionReason: String, reviewedAt: Date, reviewedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" } }, { _id: false });

const resellerSchema = new mongoose.Schema({
  customer: { type: mongoose.Schema.Types.ObjectId, ref: "Customer", required: true, unique: true, index: true },
  resellerId: { type: String, required: true, unique: true, index: true, match: /^HRR\d{6}$/ },
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
    method: { type: String, enum: ["bank", "upi"], default: undefined, set: (value) => value || undefined },
    accountHolder: String, accountNumber: String, ifsc: String, bankName: String, branch: String, upiId: String, upiDisplayName: String, verifiedAt: Date
  },
  walletBalance: { type: Number, default: 0, min: 0 },
  totalWalletCredited: { type: Number, default: 0, min: 0 },
  kyc: { panDocument: String, addressDocument: String, status: { type: String, enum: ["pending", "approved", "rejected"], default: "pending" }, note: String,
    pan: { type: kycDocumentSchema, default: () => ({}) }, addressProof: { type: kycDocumentSchema, default: () => ({}) }, aadharFront: { type: kycDocumentSchema, default: () => ({}) }, aadharBack: { type: kycDocumentSchema, default: () => ({}) }, cancelledCheque: { type: kycDocumentSchema, default: () => ({}) }, gstCertificate: { type: kycDocumentSchema, default: () => ({}) } },
  termsAcceptedAt: { type: Date, required: true },
  status: { type: String, enum: ["pending", "active", "suspended", "rejected"], default: "active", index: true }
}, { timestamps: true });

rejectEmbeddedMedia(resellerSchema, ["kyc", "gstCertificate"]);
export default mongoose.model("Reseller", resellerSchema);
