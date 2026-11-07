import mongoose from "mongoose";

const schema = new mongoose.Schema({
  entityType: { type: String, enum: ["seller", "reseller", "order", "staff"], required: true },
  entityId: { type: mongoose.Schema.Types.ObjectId, required: true },
  admin: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  codeHash: { type: String, required: true },
  expiresAt: { type: Date, required: true, expires: 0 },
  attempts: { type: Number, default: 0 }
}, { timestamps: true });

schema.index({ entityType: 1, entityId: 1, admin: 1 });

export default mongoose.model("AdminDeletionOtp", schema);