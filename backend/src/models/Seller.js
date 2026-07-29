import bcrypt from "bcryptjs";
import mongoose from "mongoose";
import { rejectEmbeddedMedia } from "../utils/modelMediaValidation.js";

const kycDocumentSchema = new mongoose.Schema(
  {
    file: String,
    status: { type: String, enum: ["not_submitted", "pending", "approved", "rejected"], default: "not_submitted" },
    rejectionReason: String,
    reviewedAt: Date,
    reviewedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" }
  },
  { _id: false }
);

const sellerSchema = new mongoose.Schema(
  {
    sellerNumber: { type: String, required: true, unique: true, match: /^\d{6}$/, index: true },
    companyName: { type: String, required: true, trim: true },
    address: { type: String, required: true, trim: true },
    city: { type: String, required: true, trim: true },
    state: { type: String, required: true, trim: true },
    pinCode: { type: String, required: true, trim: true },
    mobile: { type: String, required: true, unique: true, trim: true, set: (value) => String(value || "").replace(/\D/g, "") },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    isGstRegistered: { type: Boolean, default: false },
    gstNumber: { type: String, unique: true, sparse: true, uppercase: true, trim: true },
    businessName: { type: String, trim: true },
    gstState: { type: String, trim: true },
    businessState: { type: String, trim: true },
    declarationAccepted: { type: Boolean, default: false },
    gstStatus: { type: String, enum: ["pending", "verified", "rejected", "not_registered"], default: "pending" },
    sellingPermission: { type: String, enum: ["same_state", "all_india", "restricted"], default: "same_state" },
    turnoverAlertThreshold: { type: Number, min: 0, default: 2000000 },
    annualTurnover: { type: Number, min: 0, default: 0 },
    autoRestrictSales: { type: Boolean, default: true },
    shippingMode: { type: String, enum: ["self", "shiprocket"], default: "shiprocket" },
    profileImage: String,
    password: { type: String, required: true, minlength: 4, select: false },
    passwordVault: { type: String, select: false },
    passwordResetToken: { type: String, select: false },
    passwordResetExpires: { type: Date, select: false },
    status: { type: String, enum: ["active", "suspended"], default: "active" },
    approvalStatus: { type: String, enum: ["pending", "approved", "rejected"], default: "pending", index: true },
    approvalReason: String,
    approvedAt: Date,
    approvedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    commissionRate: { type: Number, min: 0, max: 100, default: 20 },
    walletBalance: { type: Number, min: 0, default: 0 },
    kyc: {
      gstCertificate: { type: kycDocumentSchema, default: () => ({}) },
      pan: { type: kycDocumentSchema, default: () => ({}) },
      addressProof: { type: kycDocumentSchema, default: () => ({}) },
      aadharFront: { type: kycDocumentSchema, default: () => ({}) },
      aadharBack: { type: kycDocumentSchema, default: () => ({}) },
      cancelledCheque: { type: kycDocumentSchema, default: () => ({}) }
    },
    bankDetails: { accountNumber: String, ifsc: String, bankName: String, branch: String, accountHolderName: String }
  },
  { timestamps: true }
);

rejectEmbeddedMedia(sellerSchema, ["profileImage", "kyc"]);

sellerSchema.pre("save", async function hashPassword(next) {
  if (!this.isModified("password")) return next();
  this.password = await bcrypt.hash(this.password, 12);
  next();
});
sellerSchema.methods.matchPassword = function matchPassword(password) { return bcrypt.compare(password, this.password); };

export default mongoose.model("Seller", sellerSchema);
