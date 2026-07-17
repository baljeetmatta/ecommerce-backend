import mongoose from "mongoose";

const variantSchema = new mongoose.Schema(
  {
    sku: { type: String, required: true },
    attributes: {
      size: String,
      color: String,
      material: String
    },
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
    price: { type: Number, required: true, min: 0 },
    costPrice: { type: Number, required: true, min: 0 },
    offerPrice: { type: Number, min: 0 },
    category: { type: mongoose.Schema.Types.ObjectId, ref: "Category", required: true },
    taxCategory: { type: mongoose.Schema.Types.ObjectId, ref: "TaxCategory" },
    priceIncludesTax: { type: Boolean, default: true },
    displayType: { type: String, enum: ["Product", "Reel"], default: "Product" },
    isFeatured: { type: Boolean, default: false },
    tags: [{ type: String, trim: true }],
    status: { type: String, enum: ["draft", "active", "archived"], default: "draft" },
    isStockManageable: { type: Boolean, default: true },
    stock: { type: Number, min: 0, default: 0 },
    lowStockThreshold: { type: Number, default: 10 },
    backOrderAllowed: { type: Boolean, default: false },
    variants: [variantSchema],
    mainImage: String,
    media: [mediaSchema],
    videoUrl: String,
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
  if (this.offerPrice === undefined || this.offerPrice === null) {
    this.offerPrice = this.price;
  }

  if (!this.isStockManageable) {
    this.stock = 0;
  }

  next();
});

productSchema.virtual("isLowStock").get(function isLowStock() {
  return this.isStockManageable && this.stock <= this.lowStockThreshold;
});

productSchema.set("toJSON", { virtuals: true });
productSchema.set("toObject", { virtuals: true });

export default mongoose.model("Product", productSchema);
