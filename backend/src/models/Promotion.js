import mongoose from "mongoose";

const promotionSchema = new mongoose.Schema(
  {
    code: { type: String, required: true, unique: true, uppercase: true, trim: true },
    name: { type: String, required: true },
    type: { type: String, enum: ["percentage", "fixed", "free_shipping"], required: true },
    audience: { type: String, enum: ["all", "first_order"], default: "all" },
    value: { type: Number, required: true, min: 0 },
    maxDiscountAmount: { type: Number, default: 0, min: 0 },
    minimumOrderValue: { type: Number, default: 0 },
    startsAt: Date,
    endsAt: Date,
    usageLimit: Number,
    usedCount: { type: Number, default: 0 },
    isActive: { type: Boolean, default: true },
    featuredBanner: {
      title: String,
      imageUrl: String,
      linkUrl: String
    }
  },
  { timestamps: true }
);

export default mongoose.model("Promotion", promotionSchema);
