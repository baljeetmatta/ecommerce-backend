import mongoose from "mongoose";

const shipRocketSettingSchema = new mongoose.Schema(
  {
    singleton: { type: String, default: "shiprocket", unique: true },
    isActive: { type: Boolean, default: false },
    email: String,
    password: String,
    pickupLocation: String,
    channelId: String,
    defaultLengthCm: { type: Number, default: 10, min: 0 },
    defaultBreadthCm: { type: Number, default: 10, min: 0 },
    defaultHeightCm: { type: Number, default: 10, min: 0 },
    defaultWeightKg: { type: Number, default: 0.5, min: 0 },
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
