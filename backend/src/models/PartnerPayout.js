import mongoose from "mongoose";

const partnerPayoutSchema = new mongoose.Schema(
  {
    partner: { type: mongoose.Schema.Types.ObjectId, ref: "Partner", required: true, index: true },
    order: { type: mongoose.Schema.Types.ObjectId, ref: "Order", index: true },
    date: { type: Date, default: Date.now },
    amount: { type: Number, required: true, min: 0 },
    payoutType: { type: String, enum: ["sale_profit", "adjustment"], default: "sale_profit" },
    description: String
  },
  { timestamps: true }
);
partnerPayoutSchema.index({ partner: 1, order: 1, payoutType: 1 }, { unique: true, sparse: true });
export default mongoose.model("PartnerPayout", partnerPayoutSchema);
