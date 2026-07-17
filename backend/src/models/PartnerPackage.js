import mongoose from "mongoose";

const partnerPackageSchema = new mongoose.Schema(
  {
    title: { type: String, required: true, trim: true },
    price: { type: Number, required: true, min: 1 },
    sharePercentage: { type: Number, required: true, min: 0, max: 100, default: 1 },
    features: [{ type: String, trim: true }],
    benefits: [{ type: String, trim: true }],
    isActive: { type: Boolean, default: true }
  },
  { timestamps: true }
);

export default mongoose.model("PartnerPackage", partnerPackageSchema);
