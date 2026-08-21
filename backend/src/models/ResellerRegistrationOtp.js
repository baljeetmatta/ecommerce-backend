import mongoose from "mongoose";
const schema = new mongoose.Schema({ customer: { type: mongoose.Schema.Types.ObjectId, ref: "Customer", required: true, index: true }, email: { type: String, required: true, lowercase: true }, codeHash: { type: String, required: true }, expiresAt: { type: Date, required: true }, verifiedAt: Date, attempts: { type: Number, default: 0 } }, { timestamps: true });
schema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });
export default mongoose.model("ResellerRegistrationOtp", schema);
