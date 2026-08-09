import mongoose from "mongoose";
const schema = new mongoose.Schema({ seller: { type: mongoose.Schema.Types.ObjectId, ref: "Seller", required: true, index: true }, email: { type: String, required: true, lowercase: true }, bankDetails: { accountType: String, accountHolderName: String, accountNumber: String, ifsc: String, bankName: String, branch: String }, codeHash: { type: String, required: true }, attempts: { type: Number, default: 0 }, expiresAt: { type: Date, required: true, expires: 0 } }, { timestamps: true });
export default mongoose.model("SellerBankOtp", schema);
