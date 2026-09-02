import mongoose from "mongoose";

const sellerPayoutSchema = new mongoose.Schema(
  {
    seller: { type: mongoose.Schema.Types.ObjectId, ref: "Seller", required: true, index: true },
    order: { type: mongoose.Schema.Types.ObjectId, ref: "Order", required: true, index: true },
    product: { type: mongoose.Schema.Types.ObjectId, ref: "Product", required: true },
    type: { type: String, enum: ["order_settlement", "referral_commission"], default: "order_settlement" },
    grossAmount: { type: Number, required: true, min: 0 },
    commissionRate: { type: Number, required: true, min: 0, max: 100 },
    commissionAmount: { type: Number, required: true, min: 0 },
    paymentGatewayFeeRate: { type: Number, min: 0, max: 100, default: 2 },
    paymentGatewayFee: { type: Number, min: 0, default: 0 },
    paymentGatewayGst: { type: Number, min: 0, default: 0 },
    shippingCharge: { type: Number, min: 0, default: 0 },
    shippingDeduction: { type: Number, min: 0, default: 0 },
    customerPaidShipping: { type: Number, min: 0, default: 0 },
    codCharge: { type: Number, min: 0, default: 0 },
    shippingPaidBy: { type: String, enum: ["customer", "seller", "admin"], default: "customer" },
    gstOnCommission: { type: Number, min: 0, default: 0 },
    returnRtoCharge: { type: Number, min: 0, default: 0 },
    otherCharges: { type: Number, min: 0, default: 0 },
    returnWindowClosesAt: Date,
    settledAt: Date,
    netAmount: { type: Number, required: true, min: 0 },
    description: String
  },
  { timestamps: true }
);

sellerPayoutSchema.index({ seller: 1, order: 1, product: 1 }, { unique: true });
export default mongoose.model("SellerPayout", sellerPayoutSchema);
