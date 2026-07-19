import mongoose from "mongoose";

const customPageSchema = new mongoose.Schema(
  {
    title: { type: String, required: true },
    slug: { type: String, required: true },
    content: { type: String, default: "" },
    menu: { type: String, enum: ["header", "footer", "both", "hidden"], default: "footer" },
    isActive: { type: Boolean, default: true }
  },
  { _id: true }
);

const heroItemSchema = new mongoose.Schema(
  {
    title: { type: String, required: true },
    subtitle: String,
    imageUrl: String,
    linkUrl: { type: String, default: "#/products" },
    isActive: { type: Boolean, default: true },
    sortOrder: { type: Number, default: 0 }
  },
  { _id: true }
);

const productBannerSchema = new mongoose.Schema(
  {
    title: String,
    imageUrl: { type: String, required: true },
    product: { type: mongoose.Schema.Types.ObjectId, ref: "Product", required: true },
    isActive: { type: Boolean, default: true },
    sortOrder: { type: Number, default: 0 }
  },
  { _id: true }
);

const contentColumnSchema = new mongoose.Schema(
  {
    type: { type: String, enum: ["image", "text", "image_text"], default: "image_text" },
    title: String,
    text: String,
    imageUrl: String,
    linkUrl: String,
    linkLabel: String
  },
  { _id: true }
);

const contentSectionSchema = new mongoose.Schema(
  {
    title: { type: String, required: true },
    subtitle: String,
    locations: [
      {
        type: String,
        enum: ["home_before_new_arrivals", "home_after_blog", "product_detail_below_details", "products_top_right"]
      }
    ],
    columns: { type: Number, default: 2, min: 1, max: 4 },
    isActive: { type: Boolean, default: true },
    sortOrder: { type: Number, default: 0 },
    items: [contentColumnSchema]
  },
  { _id: true }
);

const homeSectionSchema = new mongoose.Schema(
  {
    type: {
      type: String,
      enum: [
        "shipping_info",
        "browse_collections",
        "seasonal_banner",
        "new_arrivals",
        "promo_banner",
        "blog",
        "instagram",
        "custom_content",
        "custom_banner",
        "category_products"
      ],
      default: "custom_content"
    },
    title: String,
    subtitle: String,
    isActive: { type: Boolean, default: true },
    sortOrder: { type: Number, default: 0 },
    category: { type: mongoose.Schema.Types.ObjectId, ref: "Category" },
    columns: { type: Number, default: 2, min: 1, max: 4 },
    items: [contentColumnSchema],
    banner: {
      title: String,
      line1: String,
      line2: String,
      buttonText: String,
      linkUrl: String,
      imageUrl: String
    }
  },
  { _id: true }
);

const storefrontSettingSchema = new mongoose.Schema(
  {
    singleton: { type: String, default: "storefront", unique: true },
    shopName: { type: String, default: "HS Cart" },
    logoUrl: String,
    footerLogoUrl: String,
    address: String,
    email: String,
    phone: String,
    contactDetails: {
      address: String,
      state: String,
      city: String,
      pincode: String,
      email: String,
      mobile: String,
      phone: String,
      googleMapUrl: String
    },
    productAssurances: {
      securePayment: { type: String, default: "Secure payment" },
      returns: { type: String, default: "30-day returns" },
      shipping: { type: String, default: "Ships in 24 hours" }
    },
    hero: {
      title: { type: String, default: "Fresh arrivals for everyday living" },
      subtitle: { type: String, default: "Shop thoughtfully selected products with trusted checkout." },
      imageUrl: String,
      linkUrl: { type: String, default: "#/products" }
    },
    promoBanner: {
      title: { type: String, default: "Spring sale" },
      line1: { type: String, default: "Premium comfort, template-polished storefront" },
      line2: { type: String, default: "Inspired by the imported ecommerce theme: sharper merchandising, richer imagery, and clear product paths." },
      buttonText: { type: String, default: "Explore Now" },
      linkUrl: { type: String, default: "#/products" },
      imageUrl: { type: String, default: "/images/e-commerce/home/promo.png" }
    },
    benefitItems: [
      {
        title: String,
        text: String,
        icon: String
      }
    ],
    heroItems: [heroItemSchema],
    productBanners: [productBannerSchema],
    productBannerColumns: { type: Number, enum: [1, 2], default: 2 },
    partnerPaymentBypassEnabled: { type: Boolean, default: false },
    showCodOtpOnScreen: { type: Boolean, default: false },
    featuredProductIds: [{ type: mongoose.Schema.Types.ObjectId, ref: "Product" }],
    productGridSize: { type: Number, enum: [2, 3, 4, 5], default: 3 },
    homeSections: [homeSectionSchema],
    contentSections: [contentSectionSchema],
    pages: [customPageSchema]
  },
  { timestamps: true }
);

export default mongoose.model("StorefrontSetting", storefrontSettingSchema);
