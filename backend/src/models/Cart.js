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

export default mongoose.model("Cart", cartSchema);
