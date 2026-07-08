import mongoose from "mongoose";

const weightBandSchema = new mongoose.Schema(
  {
    minWeight: { type: Number, default: 0, min: 0 },
    maxWeight: { type: Number, required: true, min: 0 },
    rate: { type: Number, required: true, min: 0 }
  },
  { _id: false }
);

const shippingRuleSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    type: { type: String, enum: ["flat_rate", "weight_based"], required: true },
    isActive: { type: Boolean, default: true },
    sortOrder: { type: Number, default: 0 },
    flatRate: { type: Number, default: 0, min: 0 },
    freeShippingAbove: { type: Number, default: 0, min: 0 },
    weightUnit: { type: String, enum: ["kg", "g", "lb"], default: "kg" },
    weightBands: [weightBandSchema],
    shiprocketEnabled: { type: Boolean, default: false }
  },
  { timestamps: true }
);

export default mongoose.model("ShippingRule", shippingRuleSchema);
