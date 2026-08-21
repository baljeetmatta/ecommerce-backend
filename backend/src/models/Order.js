import mongoose from "mongoose";

const orderItemSchema = new mongoose.Schema(
  {
    product: { type: mongoose.Schema.Types.ObjectId, ref: "Product" },
    name: { type: String, required: true },
    sku: { type: String, required: true },
    variantAttributes: { type: Map, of: String },
    quantity: { type: Number, required: true, min: 1 },
    price: { type: Number, required: true, min: 0 },
    taxableValue: { type: Number, min: 0, default: 0 },
    gstRate: { type: Number, min: 0, default: 0 },
    gstAmount: { type: Number, min: 0, default: 0 },
    priceIncludesTax: { type: Boolean, default: true },
    costPrice: { type: Number, min: 0, default: 0 },
    shippingCharge: { type: Number, min: 0, default: 0 },
    shippingCost: { type: Number, min: 0, default: 0 },
    shippingIncludedInPrice: { type: Boolean, default: true },
    shippingPaidBy: { type: String, enum: ["customer", "seller"], default: "seller" },
    shippingMode: { type: String, enum: ["free_included", "fixed_customer", "estimated_seller", "free_realtime", "realtime_customer"], default: "free_included" },
    seller: { type: mongoose.Schema.Types.ObjectId, ref: "Seller" },
    sellerStatus: { type: String, enum: ["Placed", "Confirmed", "Packed", "Shipped", "Out for Delivery", "Delivered", "Cancelled", "RTO", "Pending", "Accepted", "Processing", "Ready to Dispatch", "Completed", "Return Requested", "Return Approved", "Return Rejected", "Returned"], default: "Placed" },
    sellerStatusUpdatedAt: Date,
    returnApplicable: { type: Boolean, default: true },
    returnDays: { type: Number, min: 0, default: 7 },
    rtoApplicable: { type: Boolean, default: true },
    deliveredAt: Date,
    returnWindowClosesAt: Date,
    returnRequest: {
      reason: String,
      comments: String,
      status: { type: String, enum: ["Requested", "Approved", "Rejected", "Pickup Arranged", "Received", "Closed"] },
      requestedAt: Date,
      reviewedAt: Date,
      reviewNote: String,
      pickupDate: Date,
      receivedAt: Date,
      returnShipment: {
        shiprocketOrderId: String,
        shipmentId: String,
        awbCode: String,
        courierName: String,
        trackingUrl: String,
        labelUrl: String,
        createdAt: Date
      }
    },
    sellerCommissionRate: { type: Number, min: 0, max: 100, default: 20 },
    sellerPayoutAmount: { type: Number, min: 0, default: 0 },
    sellerPayoutCredited: { type: Boolean, default: false },
    settlement: {
      grossAmount: { type: Number, min: 0, default: 0 },
      commissionRate: { type: Number, min: 0, max: 100, default: 20 },
      platformFee: { type: Number, min: 0, default: 0 },
      paymentGatewayFeeRate: { type: Number, min: 0, max: 100, default: 2 },
      paymentGatewayFee: { type: Number, min: 0, default: 0 },
      paymentGatewayGst: { type: Number, min: 0, default: 0 },
      shippingCharge: { type: Number, min: 0, default: 0 },
      codCharge: { type: Number, min: 0, default: 0 },
      shippingPaidBy: { type: String, enum: ["customer", "seller", "admin"], default: "customer" },
      gstOnCommission: { type: Number, min: 0, default: 0 },
      returnRtoCharge: { type: Number, min: 0, default: 0 },
      otherCharges: { type: Number, min: 0, default: 0 },
      netAmount: { type: Number, min: 0, default: 0 },
      returnWindowClosesAt: Date,
      settledAt: Date
    }
  },
  { _id: false }
);

const addressSchema = new mongoose.Schema(
  {
    name: String,
    email: String,
    phone: String,
    billingAddress: String,
    billingCity: String,
    billingState: String,
    billingPostalCode: String,
    shippingAddress: String,
    city: String,
    state: String,
    postalCode: String
  },
  { _id: false }
);

const refundSchema = new mongoose.Schema(
  {
    amount: { type: Number, required: true, min: 0 },
    reason: String,
    processedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    processedAt: { type: Date, default: Date.now }
  },
  { _id: true }
);

const timelineSchema = new mongoose.Schema(
  {
    status: String,
    title: { type: String, required: true },
    comment: String,
    details: String,
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    createdAt: { type: Date, default: Date.now }
  },
  { _id: true }
);

const orderSchema = new mongoose.Schema(
  {
    orderNumber: { type: String, required: true, unique: true },
    customer: { type: mongoose.Schema.Types.ObjectId, ref: "Customer", required: true },
    items: [orderItemSchema],
    status: {
      type: String,
      enum: ["Placed", "Confirmed", "Packed", "Shipped", "Out for Delivery", "Delivered", "Return Requested", "Returned", "RTO", "Cancelled", "Pending", "Processing"],
      default: "Placed"
    },
    paymentStatus: {
      type: String,
      enum: ["Pending", "Paid", "Partially Refunded", "Refunded", "Failed"],
      default: "Pending"
    },
    payment: {
      methodCode: String,
      methodName: String,
      provider: { type: String, enum: ["cod", "razorpay", "payu", "manual"], default: "manual" },
      reference: String,
      razorpayOrderId: String,
      razorpayPaymentId: String
    },
    codCharge: { type: Number, default: 0, min: 0 },
    codChargePaidBy: { type: String, enum: ["seller", "customer"], default: "seller" },
    shipping: {
      amount: { type: Number, default: 0, min: 0 },
      actualCost: { type: Number, default: 0, min: 0 },
      rule: { type: mongoose.Schema.Types.ObjectId, ref: "ShippingRule" },
      ruleName: String,
      ruleType: String,
      weightTotal: { type: Number, default: 0 },
      shiprocketOrderId: String,
      shipmentId: String,
      awbCode: String,
      courierName: String,
      courierId: String,
      trackingUrl: String,
      labelUrl: String,
      manifestUrl: String,
      shippedAt: Date,
      syncStatus: String,
      syncPayload: mongoose.Schema.Types.Mixed
    },
    address: addressSchema,
    fulfillment: {
      carrier: String,
      trackingNumber: String,
      shippingLabelUrl: String,
      packingSlipUrl: String,
      invoiceUrl: String,
      shippedAt: Date,
      deliveredAt: Date
    },
    rma: {
      number: String,
      reason: String,
      status: { type: String, enum: ["Requested", "Approved", "Rejected", "Received", "Closed"] }
    },
    subtotal: { type: Number, required: true, min: 0 },
    discountTotal: { type: Number, default: 0, min: 0 },
    shippingTotal: { type: Number, default: 0, min: 0 },
    taxTotal: { type: Number, default: 0, min: 0 },
    grandTotal: { type: Number, required: true, min: 0 },
    partnerProfit: { type: Number, default: 0, min: 0 },
    partnerPayoutDistributed: { type: Boolean, default: false },
    resellerAttribution: {
      reseller: { type: mongoose.Schema.Types.ObjectId, ref: "Reseller", index: true },
      resellerId: String,
      link: { type: mongoose.Schema.Types.ObjectId, ref: "ResellerLink" },
      margin: { type: Number, min: 0, default: 0 },
      earning: { type: Number, min: 0, default: 0 },
      status: { type: String, enum: ["pending", "hold", "available", "withdrawal_pending", "paid", "cancelled", "adjusted"], default: "pending" },
      availableAt: Date,
      finalEarning: { type: Number, min: 0, default: 0 }
    },
    invoiceNumber: String,
    invoiceGeneratedAt: Date,
    invoiceStore: {
      shopName: String,
      logoUrl: String,
      address: String,
      email: String,
      phone: String,
      sellerName: String,
      sellerAddress: String,
      sellerGstNumber: String
    },
    timeline: [timelineSchema],
    refunds: [refundSchema]
  },
  { timestamps: true }
);

orderSchema.index({ "payment.razorpayOrderId": 1 }, { unique: true, sparse: true });
orderSchema.index({ createdAt: -1 });
orderSchema.index({ status: 1, createdAt: -1 });
orderSchema.index({ paymentStatus: 1, createdAt: -1 });

export default mongoose.model("Order", orderSchema);
