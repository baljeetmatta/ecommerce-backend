import mongoose from "mongoose";
const schema = new mongoose.Schema({
  accountType: { type: String, enum: ["seller", "admin", "reseller", "partner"], required: true },
  account: { type: mongoose.Schema.Types.ObjectId, required: true },
  notifications: {
    orderUpdates: { type: Boolean, default: true }, offersDeals: { type: Boolean, default: false },
    priceDropAlerts: { type: Boolean, default: false }, storeUpdates: { type: Boolean, default: false },
    sms: { type: Boolean, default: false }, email: { type: Boolean, default: true }, whatsapp: { type: Boolean, default: false }
  },
  privacy: { personalizedOffers: { type: Boolean, default: false }, activityPersonalization: { type: Boolean, default: false } }
}, { timestamps: true });
schema.index({ accountType: 1, account: 1 }, { unique: true });
export default mongoose.model("ProfileSettings", schema);
