import mongoose from "mongoose";

const shipRocketSettingSchema = new mongoose.Schema(
  {
    singleton: { type: String, default: "shiprocket", unique: true },
    isActive: { type: Boolean, default: false },
    email: String,
    password: String,
    channelId: String,
    preferredCourierId: String,
    lastSyncStatus: String,
    lastSyncAt: Date
  },
  { timestamps: true }
);

shipRocketSettingSchema.methods.toSafeObject = function toSafeObject() {
  const value = this.toObject();
  if (value.password) value.password = "********";
  return value;
};

export default mongoose.model("ShipRocketSetting", shipRocketSettingSchema);
