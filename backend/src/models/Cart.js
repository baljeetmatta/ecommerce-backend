import mongoose from "mongoose";

const cartSchema = new mongoose.Schema(
  {
    customer: { type: mongoose.Schema.Types.ObjectId, ref: "Customer" },
    email: { type: String, lowercase: true, trim: true },
    items: [
      {
        product: { type: mongoose.Schema.Types.ObjectId, ref: "Product" },
        name: String,
        sku: String,
        variantSku: String,
        variantAttributes: { type: Map, of: String },
        quantity: Number,
        price: Number
      }
    ],
    status: { type: String, enum: ["active", "abandoned", "recovered"], default: "active" },
    reminderSentAt: Date,
    lastActivityAt: { type: Date, default: Date.now }
  },
  { timestamps: true }
);

cartSchema.index({ customer: 1, status: 1 }, { unique: true, partialFilterExpression: { customer: { $type: "objectId" }, status: "active" } });

export default mongoose.model("Cart", cartSchema);
