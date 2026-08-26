import mongoose from "mongoose";
const permissionMasterSchema = new mongoose.Schema({ code: { type: String, required: true, unique: true, uppercase: true, trim: true }, name: { type: String, required: true }, description: String, riskLevel: { type: String, enum: ["LOW", "MEDIUM", "HIGH"], default: "LOW" }, active: { type: Boolean, default: true } }, { timestamps: true });
export default mongoose.model("PermissionMaster", permissionMasterSchema);
