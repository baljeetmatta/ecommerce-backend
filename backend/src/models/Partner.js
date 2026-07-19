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
    reviewedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" }
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
      provider: { type: String, default: "razorpay" },
      orderId: { type: String, required: true, unique: true },
      paymentId: { type: String, required: true, unique: true },
      amount: { type: Number, required: true, min: 0 },
      paidAt: { type: Date, default: Date.now }
    },
    profileImage: String,
    status: { type: String, enum: ["active", "suspended"], default: "active" },
    kyc: {
      aadhar: { type: documentSchema, default: () => ({}) },
      pan: { type: documentSchema, default: () => ({}) },
      cancelledCheque: { type: documentSchema, default: () => ({}) }
    },
    bankDetails: { accountNumber: String, ifsc: String, bankName: String, accountHolderName: String },
    walletBalance: { type: Number, min: 0, default: 0 }
  },
  { timestamps: true }
);

partnerSchema.pre("save", async function hashPassword(next) {
  if (!this.isModified("password")) return next();
  this.password = await bcrypt.hash(this.password, 12);
  next();
});
partnerSchema.methods.matchPassword = function matchPassword(password) { return bcrypt.compare(password, this.password); };

export default mongoose.model("Partner", partnerSchema);
