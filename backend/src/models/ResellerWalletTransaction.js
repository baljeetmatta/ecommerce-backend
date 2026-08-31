import mongoose from "mongoose";

const resellerWalletTransactionSchema = new mongoose.Schema({
  reseller: { type: mongoose.Schema.Types.ObjectId, ref: "Reseller", required: true, index: true },
  type: { type: String, enum: ["margin_credit", "withdrawal_debit", "withdrawal_refund"], required: true, index: true },
  amount: { type: Number, required: true, min: 0.01 },
  balanceAfter: { type: Number, required: true, min: 0 },
  order: { type: mongoose.Schema.Types.ObjectId, ref: "Order", index: true },
  withdrawal: { type: mongoose.Schema.Types.ObjectId, ref: "ResellerWithdrawal", index: true },
  description: { type: String, required: true, trim: true }
}, { timestamps: true });

resellerWalletTransactionSchema.index({ reseller: 1, order: 1, type: 1 }, { unique: true, partialFilterExpression: { order: { $type: "objectId" }, type: "margin_credit" } });
resellerWalletTransactionSchema.index({ reseller: 1, withdrawal: 1, type: 1 }, { unique: true, partialFilterExpression: { withdrawal: { $type: "objectId" } } });

export default mongoose.model("ResellerWalletTransaction", resellerWalletTransactionSchema);
