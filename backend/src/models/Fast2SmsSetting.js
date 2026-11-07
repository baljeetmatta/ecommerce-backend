import mongoose from "mongoose";

const fast2SmsSettingSchema = new mongoose.Schema({
  singleton: { type: String, default: "fast2sms", unique: true },
  isActive: { type: Boolean, default: false },
  apiKey: { type: String, default: "", select: false },
  events: {
    registration: { type: Boolean, default: false },
    orders: { type: Boolean, default: false },
    orderCompletion: { type: Boolean, default: false },
    orderStatusChange: { type: Boolean, default: false },
    sellerResellerWithdrawal: { type: Boolean, default: false }
  }
}, { timestamps: true });

fast2SmsSettingSchema.methods.toSafeObject = function toSafeObject() {
  const value = this.toObject();
  value.apiKey = value.apiKey ? "********" : "";
  return value;
};

export default mongoose.model("Fast2SmsSetting", fast2SmsSettingSchema);
