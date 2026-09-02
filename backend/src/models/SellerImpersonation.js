import mongoose from "mongoose";

const sellerImpersonationSchema = new mongoose.Schema({
  seller: { type: mongoose.Schema.Types.ObjectId, ref: "Seller", required: true, index: true },
  admin: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true },
  codeHash: { type: String, required: true, unique: true },
  expiresAt: { type: Date, required: true, index: { expires: 0 } }
}, { timestamps: true });

export default mongoose.model("SellerImpersonation", sellerImpersonationSchema);
