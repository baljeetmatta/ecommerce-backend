import mongoose from "mongoose";
const moduleMasterSchema = new mongoose.Schema({ code: { type: String, required: true, unique: true, uppercase: true, trim: true }, name: { type: String, required: true, trim: true }, entityType: { type: String, enum: ["Customer", "Seller", "Reseller", "Partner"], required: true, index: true }, action: { type: String, required: true }, description: String, allowMultipleStaff: { type: Boolean, default: true }, active: { type: Boolean, default: true } }, { timestamps: true });
export default mongoose.model("ModuleMaster", moduleMasterSchema);
