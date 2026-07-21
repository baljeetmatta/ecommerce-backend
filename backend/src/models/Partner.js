import bcrypt from "bcryptjs";
import mongoose from "mongoose";

const documentSchema = new mongoose.Schema(
  {
    front: String,
    back: String,
    file: String,
    status: { type: String, enum: ["not_submitted", "pending", "approved", "rejected"], default: "not_submitted" },
    rejectionReason: String,
    reviewedAt: Date,
    reviewedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    reviewHistory: [{ status: { type: String, enum: ["approved", "rejected"] }, reason: String, reviewedAt: Date, reviewedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" } }]
  },
  { _id: false }
);

const partnerSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    fatherName: { type: String, required: true, trim: true },
    gender: { type: String, enum: ["Male", "Female", "Other", "Prefer not to say"], required: true },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    mobile: { type: String, required: true, trim: true },
    registrationNumber: { type: String, required: true, unique: true, sparse: true, match: /^\d{6}$/, index: true },
    referredBy: { type: mongoose.Schema.Types.ObjectId, ref: "Partner", default: null, index: true },
    password: { type: String, required: true, minlength: 4, select: false },
    passwordVault: { type: String, select: false },
    passwordResetToken: { type: String, select: false },
    passwordResetExpires: { type: Date, select: false },
    address: { line: { type: String, required: true }, state: { type: String, required: true }, city: { type: String, required: true }, postalCode: String },
    package: { type: mongoose.Schema.Types.ObjectId, ref: "PartnerPackage", required: true },
    registrationPayment: {
      provider: { type: String, enum: ["razorpay", "admin", "pending", "test", "no_payment"], default: "pending" },
      status: { type: String, enum: ["pending", "paid", "approved"], default: "pending" },
      orderId: String,
      paymentId: String,
      amount: { type: Number, required: true, min: 0 },
      paidAt: Date,
      approvedAt: Date,
      approvedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
      adminReference: String,
      adminNote: String
    },
    profileImage: String,
    status: { type: String, enum: ["active", "suspended"], default: "active" },
    kyc: {
      aadhar: { type: documentSchema, default: () => ({}) },
      pan: { type: documentSchema, default: () => ({}) },
      cancelledCheque: { type: documentSchema, default: () => ({}) }
    },
    bankDetails: { accountNumber: String, ifsc: String, bankName: String, branch: String, accountHolderName: String, verifiedAt: Date },
    walletBalance: { type: Number, min: 0, default: 0 }
  },
  { timestamps: true }
);

// Unpaid partners have no gateway IDs. Partial indexes avoid treating their
// missing values as duplicate `null` entries while preserving ID uniqueness.
partnerSchema.index({ "registrationPayment.orderId": 1 }, { unique: true, partialFilterExpression: { "registrationPayment.orderId": { $type: "string" } } });
partnerSchema.index({ "registrationPayment.paymentId": 1 }, { unique: true, partialFilterExpression: { "registrationPayment.paymentId": { $type: "string" } } });

partnerSchema.pre("save", async function hashPassword(next) {
  if (!this.isModified("password")) return next();
  this.password = await bcrypt.hash(this.password, 12);
  next();
});
partnerSchema.methods.matchPassword = function matchPassword(password) { return bcrypt.compare(password, this.password); };

export default mongoose.model("Partner", partnerSchema);
