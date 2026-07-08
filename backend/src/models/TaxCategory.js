import mongoose from "mongoose";

const taxCategorySchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    code: { type: String, required: true, unique: true, uppercase: true, trim: true },
    rate: { type: Number, required: true, min: 0 },
    description: String,
    isActive: { type: Boolean, default: true }
  },
  { timestamps: true }
);

export default mongoose.model("TaxCategory", taxCategorySchema);
