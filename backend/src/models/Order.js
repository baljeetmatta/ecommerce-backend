import mongoose from "mongoose";

const orderItemSchema = new mongoose.Schema(
  {
    product: { type: mongoose.Schema.Types.ObjectId, ref: "Product" },
    name: { type: String, required: true },
    sku: { type: String, required: true },
    quantity: { type: Number, required: true, min: 1 },
    price: { type: Number, required: true, min: 0 }
  },
  { _id: false }
);

const addressSchema = new mongoose.Schema(
  {
    name: String,
    email: String,
    phone: String,
    billingAddress: String,
    shippingAddress: String,
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
      enum: ["Pending", "Processing", "Packed", "Shipped", "Delivered", "Cancelled", "Returned"],
      default: "Pending"
    },
    paymentStatus: {
      type: String,
      enum: ["Pending", "Paid", "Partially Refunded", "Refunded", "Failed"],
      default: "Pending"
    },
    payment: {
      methodCode: String,
      methodName: String,
      provider: { type: String, enum: ["cod", "razorpay", "manual"], default: "manual" },
      reference: String,
      razorpayOrderId: String,
      razorpayPaymentId: String
    },
    shipping: {
      rule: { type: mongoose.Schema.Types.ObjectId, ref: "ShippingRule" },
      ruleName: String,
      ruleType: String,
      weightTotal: { type: Number, default: 0 },
      shiprocketOrderId: String,
      shipmentId: String,
      awbCode: String,
      courierName: String,
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
    invoiceNumber: String,
    invoiceGeneratedAt: Date,
    invoiceStore: {
      shopName: String,
      logoUrl: String,
      address: String,
      email: String,
      phone: String
    },
    timeline: [timelineSchema],
    refunds: [refundSchema]
  },
  { timestamps: true }
);

export default mongoose.model("Order", orderSchema);
