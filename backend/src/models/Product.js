import mongoose from "mongoose";

const variantSchema = new mongoose.Schema(
  {
    sku: { type: String, required: true },
    attributes: { type: Map, of: String, default: {} },
    price: { type: Number, required: true, min: 0 },
    costPrice: { type: Number, min: 0, default: 0 },
    stock: { type: Number, required: true, min: 0 },
    backOrderAllowed: { type: Boolean, default: false }
  },
  { _id: true }
);

const mediaSchema = new mongoose.Schema(
  {
    url: { type: String, required: true },
    type: { type: String, enum: ["image", "video"], default: "image" },
    isMain: { type: Boolean, default: false },
    alt: String
  },
  { _id: false }
);

const productSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    sku: { type: String, required: true, unique: true, trim: true },
    shortDescription: { type: String, trim: true },
    detailedDescription: String,
    description: String,
    hsnCode: { type: String, trim: true },
    actualWeight: { type: Number, min: 0 },
    weightUnit: { type: String, enum: ["kg", "g"], default: "kg" },
    volumetricWeight: { type: Number, min: 0 },
    length: { type: Number, min: 0 },
    breadth: { type: Number, min: 0 },
    height: { type: Number, min: 0 },
    dimensionUnit: { type: String, enum: ["cm", "in"], default: "cm" },
    warranty: { type: String, trim: true },
    isReturnable: { type: Boolean, default: true },
    returnDays: { type: Number, min: 0, max: 365, default: 7 },
    manufacturerBrand: { type: String, trim: true },
    price: { type: Number, required: true, min: 0 },
    costPrice: { type: Number, required: true, min: 0 },
    sellerCosts: {
      productCost: { type: Number, min: 0, default: 0 },
      shippingCharges: { type: Number, min: 0, default: 0 },
      packaging: { type: Number, min: 0, default: 0 },
      platformFee: { type: Number, min: 0, default: 0 },
      paymentGatewayFee: { type: Number, min: 0, default: 0 },
      desiredProfitRate: { type: Number, min: 0, max: 1000, default: 0 },
      otherCharges: { type: Number, min: 0, default: 0 },
      marketing: { type: Number, min: 0, default: 0 },
      gst: { type: Number, min: 0, default: 0 }
    },
    shippingIncludedInPrice: { type: Boolean, default: true },
    shippingCharge: { type: Number, min: 0, default: 0 },
    shippingCost: { type: Number, min: 0, default: 0 },
    shippingPaidBy: { type: String, enum: ["customer", "seller"], default: "seller" },
    shippingMode: { type: String, enum: ["free_included", "fixed_customer", "estimated_seller", "free_realtime", "realtime_customer"], default: "free_included" },
    offerPrice: { type: Number, min: 0 },
    category: { type: mongoose.Schema.Types.ObjectId, ref: "Category", required: true },
    taxCategory: { type: mongoose.Schema.Types.ObjectId, ref: "TaxCategory" },
    priceIncludesTax: { type: Boolean, default: true },
    displayType: { type: String, enum: ["Product", "Reel"], default: "Product" },
    isFeatured: { type: Boolean, default: false },
    tags: [{ type: String, trim: true }],
    relatedProducts: [{ type: mongoose.Schema.Types.ObjectId, ref: "Product" }],
    status: { type: String, enum: ["draft", "active", "archived"], default: "draft" },
    isStockManageable: { type: Boolean, default: true },
    stock: { type: Number, min: 0, default: 0 },
    lowStockThreshold: { type: Number, default: 10 },
    backOrderAllowed: { type: Boolean, default: false },
    variants: [variantSchema],
    variationOptions: [
      {
        name: { type: String, required: true, trim: true },
        values: [{ type: String, trim: true }]
      }
    ],
    mainImage: String,
    imageVariants: {
      admin: String,
      storefront: String,
      detail: String
    },
    media: [mediaSchema],
    videoUrl: {
      type: String,
      validate: {
        validator(value) {
          return this.displayType !== "Reel" || Boolean(String(value || "").trim());
        },
        message: "A Reel video must be uploaded before saving the product."
      }
    },
    seo: {
      slug: { type: String, trim: true },
      metaTitle: String,
      metaDescription: String
    },
    seller: { type: mongoose.Schema.Types.ObjectId, ref: "Seller", index: true },
    sellerEnabled: { type: Boolean, default: true },
    approvalStatus: { type: String, enum: ["approved", "pending_new", "pending_update", "rejected_new", "rejected_update"], default: "approved", index: true },
    pendingChanges: mongoose.Schema.Types.Mixed,
    approvalNote: String,
    reviewedAt: Date,
    reviewedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" }
  },
  { timestamps: true }
);

productSchema.pre("validate", function setOfferPrice(next) {
  if (!String(this.sku || "").trim()) {
    const prefix = String(this.name || "PRD").toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 5) || "PRD";
    this.sku = `${prefix}-${Date.now().toString(36).toUpperCase()}-${Math.random().toString(36).slice(2, 6).toUpperCase()}`;
  }
  if (this.offerPrice === undefined || this.offerPrice === null) {
    this.offerPrice = this.price;
  }
  if (!Number.isFinite(Number(this.shippingCost)) || Number(this.shippingCost) < 0) this.invalidate("shippingCost", "Enter the actual shipping cost for profit calculation.");
  if (this.shippingMode === "fixed_customer" && !(Number(this.shippingCharge) > 0)) this.invalidate("shippingCharge", "Enter the fixed shipping charge payable by the customer.");
  if (this.shippingIncludedInPrice) { this.shippingCharge = 0; this.shippingPaidBy = "seller"; }

  if (!this.isStockManageable) {
    this.stock = 0;
  }

  const dimensionFactor = this.dimensionUnit === "in" ? 2.54 : 1;
  const dimensions = [this.length, this.breadth, this.height].map((value) => Number(value) * dimensionFactor);
  this.volumetricWeight = dimensions.every((value) => Number.isFinite(value) && value > 0)
    ? Math.round((dimensions[0] * dimensions[1] * dimensions[2] / 5000) * 1000) / 1000
    : undefined;

  next();
});

productSchema.pre("validate", function rejectEmbeddedMedia(next) {
  const containsDataUrl = (value) => {
    if (typeof value === "string") return value.startsWith("data:");
    if (Array.isArray(value)) return value.some(containsDataUrl);
    if (value && typeof value === "object") return Object.values(value instanceof Map ? Object.fromEntries(value) : value).some(containsDataUrl);
    return false;
  };
  const mediaPayload = [
    this.mainImage,
    this.imageVariants?.admin,
    this.imageVariants?.storefront,
    this.imageVariants?.detail,
    ...(this.media || []).map((item) => item.url),
    this.videoUrl,
    this.pendingChanges?.mainImage,
    ...Object.values(this.pendingChanges?.imageVariants || {}),
    ...(this.pendingChanges?.media || []).map((item) => item.url),
    this.pendingChanges?.videoUrl
  ];
  if (containsDataUrl(mediaPayload)) {
    this.invalidate("media", "Product images and videos must be uploaded as server files, not embedded Base64 data.");
  }
  next();
});

productSchema.virtual("isLowStock").get(function isLowStock() {
  return this.isStockManageable && this.stock <= this.lowStockThreshold;
});

productSchema.index({ updatedAt: -1 });
productSchema.index({ status: 1, _id: -1 });
productSchema.index({ category: 1, _id: -1 });

productSchema.set("toJSON", { virtuals: true });
productSchema.set("toObject", { virtuals: true });

export default mongoose.model("Product", productSchema);
