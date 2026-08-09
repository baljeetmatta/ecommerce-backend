import mongoose from "mongoose";
const schema = new mongoose.Schema({ seller: { type: mongoose.Schema.Types.ObjectId, ref: "Seller", required: true, index: true }, email: { type: String, required: true, lowercase: true }, amount: { type: Number, required: true, min: .01 }, codeHash: { type: String, required: true }, expiresAt: { type: Date, required: true, expires: 0 }, attempts: { type: Number, default: 0 }, verifiedAt: Date }, { timestamps: true });
export default mongoose.model("SellerWithdrawalOtp", schema);
