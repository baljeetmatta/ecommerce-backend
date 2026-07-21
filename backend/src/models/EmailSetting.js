import mongoose from "mongoose";

const emailSettingSchema = new mongoose.Schema({
  singleton: { type: String, default: "email", unique: true },
  host: { type: String, default: "" },
  port: { type: Number, default: 587 },
  secure: { type: Boolean, default: false },
  username: { type: String, default: "" },
  password: { type: String, default: "", select: false },
  fromName: { type: String, default: "HRSBasket" },
  fromEmail: { type: String, default: "" }
}, { timestamps: true });

emailSettingSchema.methods.toSafeObject = function toSafeObject() {
  const value = this.toObject();
  value.password = value.password ? "********" : "";
  return value;
};

export default mongoose.model("EmailSetting", emailSettingSchema);
