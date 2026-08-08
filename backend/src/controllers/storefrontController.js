import Category from "../models/Category.js";
import Customer from "../models/Customer.js";
import Order from "../models/Order.js";
import PaymentMethod from "../models/PaymentMethod.js";
import Product from "../models/Product.js";
import Promotion from "../models/Promotion.js";
import ShippingRule from "../models/ShippingRule.js";
import ShipRocketSetting from "../models/ShipRocketSetting.js";
import StorefrontSetting from "../models/StorefrontSetting.js";
import Review from "../models/Review.js";
import OrderOtp from "../models/OrderOtp.js";
import ContactMessage from "../models/ContactMessage.js";
import NewsletterSubscriber from "../models/NewsletterSubscriber.js";
import ReelEngagement from "../models/ReelEngagement.js";
import ReelView from "../models/ReelView.js";
import crypto from "crypto";
import mongoose from "mongoose";
import { listStorefrontBlogPosts } from "./blogController.js";
import asyncHandler from "../utils/asyncHandler.js";
import { distributeOrderProfit } from "../services/partnerPayoutService.js";
import { gstBreakdown, storefrontProduct } from "../utils/gstPricing.js";
import { sendEmail } from "../utils/email.js";
import { createPayuRequest, payuCallbackHtml, validatePayuResponseHash, verifyPayuPayment } from "../utils/payu.js";
import PayuTransaction from "../models/PayuTransaction.js";
import { getShiprocketRate, shiprocketToken } from "../services/shiprocketService.js";

const productWeight = (product, quantity) => {
  const actualWeight = product.weightUnit === "g" ? Number(product.actualWeight) / 1000 : Number(product.actualWeight);
  const weight = Math.max(actualWeight || 0, Number(product.volumetricWeight) || 0);
  if (!Number.isFinite(weight) || weight <= 0) throw new Error(`${product.name} does not have a shipping weight configured`);
  return weight * quantity;
};
const sellerShippingGroups = (products, items) => {
  const productMap = new Map(products.map((product) => [String(product._id), product]));
  const groups = new Map();
  for (const item of items) {
    const product = productMap.get(String(item.productId));
    if (!product?.seller || product.seller.shippingMode === "self") continue;
    const key = String(product.seller._id);
    const group = groups.get(key) || { sellerId: key, sellerName: product.seller.companyName, pickupPostcode: product.seller.pickupPinCode || product.seller.pinCode, weight: 0 };
    group.weight += productWeight(product, Math.max(1, Number(item.quantity) || 1));
    groups.set(key, group);
  }
  return [...groups.values()];
};

const calculateSellerShiprocketRates = async ({ settings, products, items, deliveryPostcode, cod = false }) => {
  const groups = sellerShippingGroups(products, items);
  if (!groups.length) return { amount: 0, shipments: [] };
  const authToken = await shiprocketToken(settings);
  const shipments = await Promise.all(groups.map((group) => getShiprocketRate({ settings, authToken, pickupPostcode: group.pickupPostcode, deliveryPostcode, weight: group.weight, cod }).then((rate) => ({ ...rate, sellerId: group.sellerId, sellerName: group.sellerName, weight: group.weight }))));
  return { amount: Math.round(shipments.reduce((sum, shipment) => sum + shipment.amount, 0) * 100) / 100, shipments };
};

export const getShippingQuote = asyncHandler(async (req, res) => {
  const deliveryPostcode = String(req.body.pincode || "").trim();
  if (!/^\d{6}$/.test(deliveryPostcode)) { res.status(400); throw new Error("Enter a valid 6-digit delivery pincode"); }
  const settings = await ShipRocketSetting.findOne({ singleton: "shiprocket", isActive: true }).select("+password");
  if (!settings?.email || !settings?.password) { res.status(503); throw new Error("Shiprocket is not configured"); }
  const items = req.body.items || [];
  const productIds = items.map((item) => item.productId).filter((id) => mongoose.isObjectIdOrHexString(id));
  const products = await Product.find({ _id: { $in: productIds } }).populate("seller", "companyName pinCode shippingMode");
  res.json(await calculateSellerShiprocketRates({ settings, products, items, deliveryPostcode, cod: false }));
});

export const getStorefront = asyncHandler(async (req, res) => {
  res.set("Cache-Control", "private, no-store, max-age=0");
  const now = new Date();
  const activePromotionQuery = {
    isActive: true,
    $and: [
      { $or: [{ startsAt: { $exists: false } }, { startsAt: null }, { startsAt: { $lte: now } }] },
      { $or: [{ endsAt: { $exists: false } }, { endsAt: null }, { endsAt: { $gte: now } }] }
    ]
  };
  if (req.query.bootstrap === "1") {
    const [categories, promotions, settings, paymentMethods, shippingRules, blogPosts] = await Promise.all([
      Category.find({ isActive: true }).populate("parent", "name slug").sort({ name: 1 }).lean(),
      Promotion.find(activePromotionQuery).sort({ createdAt: -1 }).limit(6).lean(),
      StorefrontSetting.findOne({ singleton: "storefront" })
        .populate("homeSections.category", "name slug parent imageUrl")
        .populate("productBanners.product", "name sku status displayType sellerEnabled approvalStatus"),
      PaymentMethod.find({ isActive: true }).sort({ sortOrder: 1, name: 1 }).lean(),
      ShippingRule.find({ isActive: true }).sort({ sortOrder: 1, name: 1 }).lean(),
      listStorefrontBlogPosts()
    ]);
    const promotionBanner = promotions[0]?.featuredBanner?.title
      ? promotions[0].featuredBanner
      : { title: "Fresh arrivals for everyday living", imageUrl: "", linkUrl: "#products" };
    const publicSettings = settings?.toObject?.() || {};
    const banner = { ...promotionBanner, ...(publicSettings.hero || {}) };
    const featuredProductIds = (publicSettings.featuredProductIds || []).map(String);
    delete publicSettings.featuredProductIds;
    const productBanners = (publicSettings.productBanners || []).filter((item) => item.isActive && item.product?.displayType !== "Reel");
    return res.json({
      products: [],
      featuredProductIds,
      categories,
      banner,
      heroItems: (publicSettings.heroItems || []).filter((item) => item.isActive).sort((a, b) => a.sortOrder - b.sortOrder),
      contentSections: (publicSettings.contentSections || []).filter((item) => item.isActive).sort((a, b) => a.sortOrder - b.sortOrder),
      productBanners,
      productBannerColumns: publicSettings.productBannerColumns || 2,
      firstOrderDiscount: promotions.find((promotion) => promotion.audience === "first_order") || null,
      blogPosts: blogPosts.filter((post) => !post.category || post.category.isActive !== false),
      settings: { ...publicSettings, productBanners },
      paymentMethods: paymentMethods.map((method) => ({
        _id: method._id,
        code: method.code,
        name: method.name,
        type: method.type,
        instructions: method.instructions,
        razorpay: method.type === "razorpay" ? { keyId: method.razorpay?.keyId, merchantId: method.razorpay?.merchantId, environment: method.razorpay?.environment } : undefined,
        payu: method.type === "payu" ? { merchantId: method.payu?.merchantId, environment: method.payu?.environment } : undefined
      })),
      shippingRules
    });
  }
  const [allProducts, categories, promotions, settings, paymentMethods, shippingRules, blogPosts, reviewStats] = await Promise.all([
    Product.find({ status: "active", $or: [{ seller: { $exists: false } }, { seller: null }, { sellerEnabled: true, approvalStatus: { $in: ["approved", "pending_update", "rejected_update"] } }] })
      .populate({ path: "category", select: "name slug parent", populate: { path: "parent", select: "name slug" } })
      .populate("taxCategory", "name code rate")
      .populate("seller", "companyName sellerNumber approvalStatus city state createdAt")
      .select(
        "name sku shortDescription detailedDescription hsnCode volumetricWeight length height warranty manufacturerBrand price offerPrice priceIncludesTax shippingIncludedInPrice shippingCharge shippingCost shippingPaidBy shippingMode category taxCategory displayType isFeatured mainImage imageVariants media videoUrl tags relatedProducts stock isStockManageable variationOptions variants createdAt updatedAt seller"
      )
      .sort({ createdAt: -1 }),
    Category.find({ isActive: true }).populate("parent", "name slug").sort({ name: 1 }),
    Promotion.find(activePromotionQuery).sort({ createdAt: -1 }).limit(6),
    StorefrontSetting.findOne({ singleton: "storefront" }).populate("homeSections.category", "name slug parent imageUrl").populate("productBanners.product", "name sku status displayType sellerEnabled approvalStatus"),
    PaymentMethod.find({ isActive: true }).sort({ sortOrder: 1, name: 1 }),
    ShippingRule.find({ isActive: true }).sort({ sortOrder: 1, name: 1 }),
    listStorefrontBlogPosts(),
    Review.aggregate([{ $group: { _id: "$product", reviewCount: { $sum: 1 }, averageRating: { $avg: "$rating" } } }])
  ]);

  const statsByProduct = new Map(reviewStats.map((item) => [String(item._id), item]));
  const products = allProducts.filter((product) => !product.seller || product.seller.approvalStatus === "approved").map((product) => {
    const stats = statsByProduct.get(String(product._id));
    return { ...storefrontProduct(product), reviewCount: stats?.reviewCount || 0, averageRating: stats ? Number(stats.averageRating.toFixed(1)) : 0 };
  });
  const markedFeatured = products.filter((product) => product.isFeatured);
  const featuredProducts = markedFeatured;
  const featuredProductIds = featuredProducts.map((product) => String(product._id));
  const promotionBanner = promotions[0]?.featuredBanner?.title
    ? promotions[0].featuredBanner
    : {
        title: "Fresh arrivals for everyday living",
        imageUrl: "",
        linkUrl: "#products"
      };
  const banner = { ...promotionBanner, ...settings?.hero };
  const visibleProductIds = new Set(products.map((product) => String(product._id)));
  const productBanners = settings?.productBanners?.filter((item) => item.isActive && item.product && item.product.displayType !== "Reel" && visibleProductIds.has(String(item.product._id || item.product))).sort((a, b) => a.sortOrder - b.sortOrder) || [];

  res.json({
    products,
    featuredProductIds,
    categories,
    banner,
    heroItems: settings?.heroItems?.filter((item) => item.isActive).sort((a, b) => a.sortOrder - b.sortOrder) || [banner],
    contentSections: settings?.contentSections?.filter((item) => item.isActive).sort((a, b) => a.sortOrder - b.sortOrder) || [],
    productBanners,
    productBannerColumns: settings?.productBannerColumns || 2,
    firstOrderDiscount: promotions.find((promotion) => promotion.audience === "first_order") || null,
    blogPosts: blogPosts.filter((post) => !post.category || post.category.isActive !== false),
    settings: settings
      ? (() => {
          const publicSettings = settings.toObject();
          delete publicSettings.featuredProductIds;
          return {
          ...publicSettings,
          promoBanner: settings.promoBanner,
          benefitItems: settings.benefitItems,
          productBanners
        };
        })()
      : {},
    paymentMethods: paymentMethods.map((method) => ({
      _id: method._id,
      code: method.code,
      name: method.name,
      type: method.type,
      instructions: method.instructions,
      razorpay: method.type === "razorpay" ? { keyId: method.razorpay?.keyId, merchantId: method.razorpay?.merchantId, environment: method.razorpay?.environment } : undefined
      ,payu: method.type === "payu" ? { merchantId: method.payu?.merchantId, environment: method.payu?.environment } : undefined
    })),
    shippingRules
  });
});

export const getStorefrontCatalog = asyncHandler(async (_req, res) => {
  res.set("Cache-Control", "private, no-store, max-age=0");
  const [allProducts, reviewStats, settings] = await Promise.all([
    Product.find({ status: "active", $or: [{ seller: { $exists: false } }, { seller: null }, { sellerEnabled: true, approvalStatus: { $in: ["approved", "pending_update", "rejected_update"] } }] })
      .populate({ path: "category", select: "name slug parent", populate: { path: "parent", select: "name slug" } })
      .populate("taxCategory", "name code rate")
      .populate("seller", "companyName sellerNumber approvalStatus city state createdAt")
      .select("name sku shortDescription manufacturerBrand price offerPrice priceIncludesTax shippingIncludedInPrice shippingCharge shippingCost shippingPaidBy shippingMode category taxCategory displayType isFeatured mainImage imageVariants media videoUrl tags stock isStockManageable variationOptions variants createdAt updatedAt seller")
      .sort({ createdAt: -1 }),
    Review.aggregate([{ $group: { _id: "$product", reviewCount: { $sum: 1 }, averageRating: { $avg: "$rating" } } }]),
    StorefrontSetting.findOne({ singleton: "storefront" }).select("featuredProductIds")
  ]);
  const statsByProduct = new Map(reviewStats.map((item) => [String(item._id), item]));
  const products = allProducts
    .filter((product) => !product.seller || product.seller.approvalStatus === "approved")
    .map((product) => {
      const stats = statsByProduct.get(String(product._id));
      return { ...storefrontProduct(product), reviewCount: stats?.reviewCount || 0, averageRating: stats ? Number(stats.averageRating.toFixed(1)) : 0 };
    });
  const marked = products.filter((product) => product.isFeatured);
  const featured = marked;
  res.json({ products, featuredProductIds: featured.map((product) => String(product._id)) });
});

export const getStorefrontProduct = asyncHandler(async (req, res) => {
  const product = await Product.findOne({
    $or: [{ _id: mongoose.isValidObjectId(req.params.productId) ? req.params.productId : null }, { sku: req.params.productId }],
    status: "active"
  })
    .populate({ path: "category", select: "name slug parent", populate: { path: "parent", select: "name slug" } })
    .populate("taxCategory", "name code rate")
    .populate("seller", "companyName sellerNumber approvalStatus city state createdAt");
  if (!product || (product.seller && product.seller.approvalStatus !== "approved")) {
    res.status(404);
    throw new Error("Product not found");
  }
  res.set("Cache-Control", "private, no-store, max-age=0");
  res.json(storefrontProduct(product));
});

export const createContactMessage = asyncHandler(async (req, res) => {
  const payload = {
    name: String(req.body.name || "").trim(),
    email: String(req.body.email || "").trim().toLowerCase(),
    mobile: String(req.body.mobile || "").trim(),
    subject: String(req.body.subject || "").trim(),
    message: String(req.body.message || "").trim()
  };
  if (!payload.name || !/^\S+@\S+\.\S+$/.test(payload.email) || !payload.subject || !payload.message) { res.status(400); throw new Error("Name, valid email, subject, and message are required"); }
  const settings = await StorefrontSetting.findOne({ singleton: "storefront" }).select("shopName email contactDetails.email");
  const adminEmail = settings?.contactDetails?.email || settings?.email;
  if (!adminEmail) { res.status(503); throw new Error("The contact email is not configured by the administrator"); }
  const shopName = settings?.shopName || "HRSBasket";
  const safeSubject = payload.subject.replace(/[\r\n]+/g, " ");
  await Promise.all([
    sendEmail({
      to: adminEmail,
      subject: `New contact message: ${safeSubject}`,
      text: `A new storefront contact message was submitted.\n\nName: ${payload.name}\nEmail: ${payload.email}\nMobile: ${payload.mobile || "Not provided"}\nSubject: ${safeSubject}\n\nMessage:\n${payload.message}`
    }),
    sendEmail({
      to: payload.email,
      subject: `We received your message - ${shopName}`,
      text: `Hello ${payload.name},\n\nThank you for contacting ${shopName}. We received your message about “${safeSubject}” and will get back to you soon.\n\nRegards,\n${shopName}`
    })
  ]);
  await ContactMessage.create(payload);
  res.status(201).json({ message: "Thank you. Your message has been emailed to our team, and a confirmation was sent to you." });
});

export const subscribeNewsletter = asyncHandler(async (req, res) => {
  const email = String(req.body.email || "").trim().toLowerCase();
  if (!/^\S+@\S+\.\S+$/.test(email)) { res.status(400); throw new Error("Enter a valid email address"); }
  try {
    await NewsletterSubscriber.create({ email });
    res.status(201).json({ message: "Thank you for subscribing to our newsletter!" });
  } catch (error) {
    if (error.code === 11000) return res.json({ message: "Thank you! This email is already subscribed to our newsletter." });
    throw error;
  }
});

const reelResponse = async (productId, customerId) => {
  const engagement = await ReelEngagement.findOne({ product: productId }).populate("comments.customer", "name");
  if (!engagement) return { viewCount: 0, likeCount: 0, liked: false, comments: [] };
  return { viewCount: engagement.viewCount || 0, likeCount: engagement.likes.length, liked: engagement.likes.some((id) => String(id) === String(customerId)), comments: engagement.comments.slice(-100).reverse().map((comment) => ({ _id: comment._id, text: comment.text, createdAt: comment.createdAt, customer: { _id: comment.customer?._id, name: comment.customer?.name || "Customer" } })) };
};

export const getReelEngagement = asyncHandler(async (req, res) => res.json(await reelResponse(req.params.productId, req.customer?._id)));
export const recordReelView = asyncHandler(async (req, res) => {
  const visitorId = String(req.body.visitorId || "").trim().slice(0, 128);
  if (!req.customer && !visitorId) {
    res.status(400);
    throw new Error("A visitor identifier is required");
  }
  const identity = req.customer ? `customer:${req.customer._id}` : `visitor:${visitorId}`;
  const viewerKey = crypto.createHash("sha256").update(identity).digest("hex");
  const cutoff = new Date(Date.now() - 4 * 60 * 60 * 1000);
  let counted = false;
  const existing = await ReelView.findOne({ product: req.params.productId, viewerKey }).select("_id lastViewedAt");
  if (!existing) {
    try {
      await ReelView.create({ product: req.params.productId, viewerKey, lastViewedAt: new Date() });
      counted = true;
    } catch (error) {
      if (error.code !== 11000) throw error;
    }
  } else if (existing.lastViewedAt <= cutoff) {
    const updated = await ReelView.updateOne({ _id: existing._id, lastViewedAt: { $lte: cutoff } }, { $set: { lastViewedAt: new Date() } });
    counted = updated.modifiedCount === 1;
  }
  if (counted) await ReelEngagement.findOneAndUpdate({ product: req.params.productId }, { $inc: { viewCount: 1 } }, { upsert: true });
  res.json(await reelResponse(req.params.productId, req.customer?._id));
});
export const toggleReelLike = asyncHandler(async (req, res) => {
  const current = await ReelEngagement.findOne({ product: req.params.productId });
  const liked = current?.likes.some((id) => String(id) === String(req.customer._id));
  await ReelEngagement.findOneAndUpdate({ product: req.params.productId }, liked ? { $pull: { likes: req.customer._id } } : { $addToSet: { likes: req.customer._id } }, { upsert: true });
  res.json(await reelResponse(req.params.productId, req.customer._id));
});
export const createReelComment = asyncHandler(async (req, res) => {
  const text = String(req.body.text || "").trim();
  if (!text) { res.status(400); throw new Error("Comment is required"); }
  await ReelEngagement.findOneAndUpdate({ product: req.params.productId }, { $push: { comments: { customer: req.customer._id, text: text.slice(0, 1000) } } }, { upsert: true });
  res.status(201).json(await reelResponse(req.params.productId, req.customer._id));
});

const publicPaymentMethod = (method) => ({
  _id: method._id,
  code: method.code,
  name: method.name,
  type: method.type,
  instructions: method.instructions,
  razorpay: method.type === "razorpay" ? { keyId: method.razorpay?.keyId, merchantId: method.razorpay?.merchantId, environment: method.razorpay?.environment } : undefined
  ,payu: method.type === "payu" ? { merchantId: method.payu?.merchantId, environment: method.payu?.environment } : undefined
});

export const getActivePaymentMethods = asyncHandler(async (_req, res) => {
  const methods = await PaymentMethod.find({ isActive: true }).sort({ sortOrder: 1, name: 1 });
  res.json(methods.map(publicPaymentMethod));
});

const calculateShipping = (rules, subtotal, weightTotal) => {
  const rule = rules[0];
  if (!rule) return { shippingTotal: 0 };
  if (rule.freeShippingAbove && subtotal >= rule.freeShippingAbove) return { rule, shippingTotal: 0 };
  if (rule.type === "weight_based") {
    const band = rule.weightBands.find((item) => weightTotal >= item.minWeight && weightTotal <= item.maxWeight);
    return { rule, shippingTotal: band?.rate ?? rule.flatRate ?? 0 };
  }
  return { rule, shippingTotal: rule.flatRate || 0 };
};

const calculateProductShipping = (products, items) => {
  const productMap = new Map(products.map((product) => [String(product._id), product]));
  return Number(items.reduce((total, item) => {
    const product = productMap.get(String(item.productId));
    if (!product || product.shippingIncludedInPrice || product.shippingPaidBy !== "customer") return total;
    return total + Math.max(0, Number(product.shippingCharge) || 0) * Math.max(1, Number(item.quantity) || 1);
  }, 0).toFixed(2));
};

const calculateFirstOrderDiscount = async (customer, subtotal) => {
  if (!customer || subtotal <= 0) return { discountTotal: 0 };
  const now = new Date();
  const priorOrder = await Order.exists({ customer: customer._id });
  if (priorOrder) return { discountTotal: 0 };

  const promotion = await Promotion.findOne({
    audience: "first_order",
    isActive: true,
    minimumOrderValue: { $lte: subtotal },
    $and: [
      { $or: [{ startsAt: { $exists: false } }, { startsAt: null }, { startsAt: { $lte: now } }] },
      { $or: [{ endsAt: { $exists: false } }, { endsAt: null }, { endsAt: { $gte: now } }] }
    ]
  }).sort({ createdAt: -1 });

  if (!promotion) return { discountTotal: 0 };
  const rawDiscount =
    promotion.type === "percentage"
      ? subtotal * (promotion.value / 100)
      : promotion.type === "fixed"
        ? promotion.value
        : 0;
  const cappedDiscount = promotion.maxDiscountAmount > 0 ? Math.min(rawDiscount, promotion.maxDiscountAmount) : rawDiscount;
  return {
    discountTotal: Math.min(subtotal, Math.max(0, cappedDiscount)),
    promotion
  };
};

const normalizeState = (value) => String(value || "").trim().toLowerCase().replace(/[^a-z]/g, "");
const enforceSellerDeliveryPolicy = (products, deliveryState) => {
  for (const product of products) {
    const seller = product.seller;
    if (!seller || !seller.autoRestrictSales) continue;
    const turnoverRestricted = seller.turnoverAlertThreshold > 0 && seller.annualTurnover >= seller.turnoverAlertThreshold && seller.gstStatus !== "verified";
    if (seller.sellingPermission === "restricted" || turnoverRestricted) throw new Error(`${product.name} is temporarily unavailable while the seller's compliance is reviewed`);
    if (seller.sellingPermission === "same_state" && normalizeState(seller.businessState || seller.gstState || seller.state) !== normalizeState(deliveryState)) {
      throw new Error(`${product.name} can only be delivered within ${seller.businessState || seller.gstState || seller.state} because this seller is not GST registered`);
    }
  }
};

const calculateRazorpayQuote = async ({ items, shippingRuleId, customer, deliveryState, deliveryPostcode, cod = false }) => {
  if (!items?.length) throw new Error("Cart is empty");
  const productIds = items.map((item) => item.productId).filter(Boolean);
  if (!productIds.length || productIds.some((id) => !mongoose.isObjectIdOrHexString(id))) throw new Error("One or more cart products are unavailable. Remove them and add the products again.");
  const products = await Product.find({ _id: { $in: productIds }, status: "active", $or: [{ seller: { $exists: false } }, { seller: null }, { sellerEnabled: true, approvalStatus: { $in: ["approved", "pending_update", "rejected_update"] } }] }).populate("seller", "companyName pinCode pickupPinCode shippingMode approvalStatus isGstRegistered gstStatus sellingPermission businessState gstState state autoRestrictSales turnoverAlertThreshold annualTurnover").populate("taxCategory", "rate");
  enforceSellerDeliveryPolicy(products, deliveryState);
  const productMap = new Map(products.map((product) => [String(product._id), product]));
  let productTotal = 0;
  for (const item of items) {
    const product = productMap.get(String(item.productId));
    if (!product || (product.seller && product.seller.approvalStatus !== "approved")) throw new Error("One or more products are unavailable");
    const quantity = Math.max(1, Number(item.quantity) || 1);
    const variant = item.variantSku ? product.variants.find((entry) => entry.sku === item.variantSku) : null;
    if (product.variationOptions?.length && !variant) throw new Error(`Select an available variation for ${product.name}`);
    if (variant && variant.stock < quantity && !variant.backOrderAllowed) throw new Error(`${product.name} (${variant.sku}) does not have enough stock`);
    if (!variant && product.isStockManageable && product.stock < quantity) throw new Error(`${product.name} does not have enough stock`);
    productTotal += gstBreakdown(variant?.price ?? product.offerPrice ?? product.price, product.taxCategory?.rate, product.priceIncludesTax !== false).grossPrice * quantity;
  }
  let shippingTotal = calculateProductShipping(products, items);
  const realtimeCustomerProducts = products.filter((product) => product.shippingMode === "realtime_customer");
  if (realtimeCustomerProducts.length) {
    if (!/^\d{6}$/.test(String(deliveryPostcode || ""))) throw new Error("Enter a valid delivery pincode to calculate real-time shipping");
    const realtimeIds = new Set(realtimeCustomerProducts.map((product) => String(product._id)));
    const realtimeItems = items.filter((item) => realtimeIds.has(String(item.productId)));
    const shiprocket = await ShipRocketSetting.findOne({ singleton: "shiprocket", isActive: true }).select("+password");
    if (!shiprocket?.email || !shiprocket?.password) throw new Error("Real-time shipping is temporarily unavailable");
    shippingTotal += (await calculateSellerShiprocketRates({ settings: shiprocket, products: realtimeCustomerProducts, items: realtimeItems, deliveryPostcode, cod })).amount;
  }
  const { discountTotal } = await calculateFirstOrderDiscount(customer, productTotal);
  return Number((productTotal + shippingTotal - discountTotal).toFixed(2));
};

export const createRazorpayCheckoutOrder = asyncHandler(async (req, res) => {
  const productIds = (req.body.items || []).map((item) => item.productId).filter(Boolean);
  if (!productIds.length || productIds.some((id) => !mongoose.isObjectIdOrHexString(id))) { res.status(400); throw new Error("One or more cart products are unavailable. Remove them and add the products again."); }
  const method = await PaymentMethod.findOne({ code: req.body.paymentMethodCode, type: "razorpay", isActive: true });
  if (!method?.razorpay?.keyId || !method.razorpay?.keySecret) { res.status(503); throw new Error("Razorpay is not configured by the administrator"); }
  const amount = await calculateRazorpayQuote({ items: req.body.items, shippingRuleId: req.body.shippingRuleId, customer: req.customer, deliveryState: req.body.checkout?.state, deliveryPostcode: req.body.checkout?.postalCode });
  if (amount <= 0) { res.status(400); throw new Error("Order amount must be greater than zero"); }
  const response = await fetch("https://api.razorpay.com/v1/orders", {
    method: "POST",
    headers: { Authorization: `Basic ${Buffer.from(`${method.razorpay.keyId}:${method.razorpay.keySecret}`).toString("base64")}`, "Content-Type": "application/json" },
    body: JSON.stringify({ amount: Math.round(amount * 100), currency: "INR", receipt: `cart_${Date.now()}`, notes: { customerId: String(req.customer._id) } })
  });
  const order = await response.json();
  if (!response.ok) { res.status(502); throw new Error(order.error?.description || "Unable to start Razorpay payment"); }
  res.json({ orderId: order.id, amount: order.amount, currency: order.currency, keyId: method.razorpay.keyId, merchantName: method.name });
});

export const createPayuCheckout = asyncHandler(async (req, res) => {
  const method = await PaymentMethod.findOne({ code: req.body.paymentMethodCode, type: "payu", isActive: true });
  if (!method?.payu?.merchantKey || !method.payu?.salt) { res.status(503); throw new Error("PayU is not configured by the administrator"); }
  const amount = await calculateRazorpayQuote({ items: req.body.items, shippingRuleId: req.body.shippingRuleId, customer: req.customer, deliveryState: req.body.checkout?.state, deliveryPostcode: req.body.checkout?.postalCode });
  if (amount <= 0) { res.status(400); throw new Error("Order amount must be greater than zero"); }
  const txnid = `cart_${Date.now()}_${crypto.randomBytes(4).toString("hex")}`;
  const callbackUrl = `${req.protocol}://${req.get("host")}/api/storefront/payu/callback?returnUrl=${encodeURIComponent(req.body.returnUrl || req.get("origin") || "")}`;
  await PayuTransaction.create({ txnid, kind: "storefront", ownerId: req.customer._id, ownerEmail: req.customer.email, paymentMethodCode: method.code, amount });
  res.json({ ...createPayuRequest({ config: method.payu, txnid, amount, productinfo: "Store order payment", firstname: req.body.firstname || req.customer.name || "Customer", email: req.customer.email, phone: req.body.phone || req.customer.phone || "9999999999", callbackUrl, udf1: String(req.customer._id), udf2: method.code }), statusUrl: `${req.protocol}://${req.get("host")}/api/storefront/payu/status/${encodeURIComponent(txnid)}` });
});

export const payuCallback = asyncHandler(async (req, res) => {
  const method = await PaymentMethod.findOne({ type: "payu", "payu.merchantKey": req.body.key, isActive: true });
  const validHash = Boolean(method?.payu?.salt) && validatePayuResponseHash(req.body, method.payu.salt);
  const savedTransaction = await PayuTransaction.findOne({ txnid: req.body.txnid });
  let verifiedTransaction = null;
  if (method?.payu && savedTransaction) {
    try {
      verifiedTransaction = await verifyPayuPayment({ config: method.payu, txnid: req.body.txnid, expectedAmount: savedTransaction.amount });
    } catch (_error) {
      // The posted callback remains a valid fallback when PayU's verification API is temporarily unavailable.
    }
  }
  const callbackSuccessful = validHash && String(req.body.status || "").toLowerCase() === "success";
  const ok = Boolean(verifiedTransaction) || callbackSuccessful;
  const payload = { source: "hrbasket-payu", ok, txnid: req.body.txnid, status: ok ? "success" : req.body.status, error: ok ? "" : (validHash ? (req.body.error_Message || "Payment failed") : "PayU response validation failed") };
  await PayuTransaction.findOneAndUpdate({ txnid: req.body.txnid }, { status: payload.ok ? "success" : "failed", hashValid: validHash, mihpayid: req.body.mihpayid, bankReference: req.body.bank_ref_num, errorMessage: payload.ok ? "" : payload.error, callbackAt: new Date() });
  if (/^https?:\/\/[^\s]+$/i.test(String(req.query.returnUrl || ""))) {
    const target = new URL(req.query.returnUrl);
    target.searchParams.set("payu_txnid", String(req.body.txnid || ""));
    target.searchParams.set("payu_status", payload.ok ? "success" : "failed");
    return res.redirect(303, target.toString());
  }
  res.type("html").send(payuCallbackHtml(payload, req.query.origin));
});

export const getPayuStatus = asyncHandler(async (req, res) => {
  const transaction = await PayuTransaction.findOne({ txnid: req.params.txnid }).select("txnid status errorMessage");
  if (!transaction) { res.status(404); throw new Error("PayU transaction not found"); }
  res.json(transaction);
});

export const createStorefrontOrder = asyncHandler(async (req, res) => {
  const { items = [], checkout = {}, paymentMethodCode, shippingRuleId } = req.body;
  if (!items.length) {
    res.status(400);
    throw new Error("Cart is empty");
  }
  if (!checkout.name || !checkout.email || !checkout.phone || !checkout.billingAddress || !checkout.billingCity || !checkout.billingState || !checkout.billingPostalCode || !checkout.shippingAddress || !checkout.city || !checkout.state || !checkout.postalCode) {
    res.status(400);
    throw new Error("Name, email, phone, address, city, state, and pincode are required");
  }
  if (String(checkout.email).toLowerCase() !== String(req.customer.email).toLowerCase()) {
    res.status(403);
    throw new Error("Checkout email must match the signed-in account");
  }

  const productIds = items.map((item) => item.productId).filter(Boolean);
  if (!productIds.length || productIds.some((id) => !mongoose.isObjectIdOrHexString(id))) { res.status(400); throw new Error("One or more cart products are unavailable. Remove them and add the products again."); }
  const products = await Product.find({ _id: { $in: productIds }, status: "active", $or: [{ seller: { $exists: false } }, { seller: null }, { sellerEnabled: true, approvalStatus: { $in: ["approved", "pending_update", "rejected_update"] } }] }).populate("seller", "companyName pinCode approvalStatus commissionRate isGstRegistered gstStatus sellingPermission businessState gstState state autoRestrictSales turnoverAlertThreshold annualTurnover shippingMode").populate("taxCategory", "name code rate");
  enforceSellerDeliveryPolicy(products, checkout.state);
  const productMap = new Map(products.map((product) => [String(product._id), product]));
  const orderItems = items.map((item) => {
    const product = productMap.get(String(item.productId));
    if (!product || (product.seller && product.seller.approvalStatus !== "approved")) throw new Error("One or more products are unavailable");
    const quantity = Math.max(1, Number(item.quantity) || 1);
    const variant = item.variantSku ? product.variants.find((entry) => entry.sku === item.variantSku) : null;
    if (product.variationOptions?.length && !variant) throw new Error(`Select an available variation for ${product.name}`);
    if (variant && variant.stock < quantity && !variant.backOrderAllowed) throw new Error(`${product.name} (${variant.sku}) does not have enough stock`);
    const pricing = gstBreakdown(variant?.price ?? product.offerPrice ?? product.price, product.taxCategory?.rate, product.priceIncludesTax !== false);
    return {
      product: product._id,
      name: product.name,
      sku: variant?.sku || product.sku,
      variantAttributes: variant?.attributes,
      quantity,
      price: pricing.grossPrice,
      taxableValue: pricing.taxableValue,
      gstRate: pricing.gstRate,
      gstAmount: pricing.gstAmount,
      priceIncludesTax: pricing.priceIncludesTax,
      costPrice: Number(product.costPrice || 0),
      shippingCharge: product.shippingIncludedInPrice || product.shippingPaidBy !== "customer" ? 0 : Number(product.shippingCharge || 0),
      shippingCost: Number(product.shippingCost ?? product.sellerCosts?.shippingCharges ?? 0),
      shippingIncludedInPrice: product.shippingIncludedInPrice !== false,
      shippingPaidBy: product.shippingIncludedInPrice === false && product.shippingPaidBy === "customer" ? "customer" : "seller",
      shippingMode: product.shippingMode || (product.shippingIncludedInPrice === false ? "fixed_customer" : "free_included"),
      seller: product.seller,
      sellerCommissionRate: Number(product.seller?.commissionRate ?? 20),
      returnApplicable: product.isReturnable !== false,
      returnDays: product.isReturnable === false ? 0 : Math.max(0, Number(product.returnDays ?? 7))
    };
  });

  const [paymentMethod, shiprocket] = await Promise.all([
    PaymentMethod.findOne({ code: paymentMethodCode, isActive: true }),
    ShipRocketSetting.findOne({ singleton: "shiprocket", isActive: true }).select("+password")
  ]);
  if (!paymentMethod) {
    res.status(400);
    throw new Error("Selected payment method is not active");
  }
  const realtimeCustomerProducts = products.filter((product) => product.shippingMode === "realtime_customer");
  if (realtimeCustomerProducts.length) {
    if (!shiprocket?.email || !shiprocket?.password) { res.status(503); throw new Error("Real-time shipping is temporarily unavailable"); }
    const realtimeIds = new Set(realtimeCustomerProducts.map((product) => String(product._id)));
    const realtimeInputItems = items.filter((item) => realtimeIds.has(String(item.productId)));
    const quote = await calculateSellerShiprocketRates({ settings: shiprocket, products: realtimeCustomerProducts, items: realtimeInputItems, deliveryPostcode: checkout.postalCode, cod: paymentMethod.type === "cod" });
    const liveOrderItems = orderItems.filter((item) => realtimeIds.has(String(item.product)));
    const units = liveOrderItems.reduce((sum, item) => sum + item.quantity, 0) || 1;
    liveOrderItems.forEach((item) => { const allocated = Number((quote.amount * item.quantity / units).toFixed(2)); item.shippingCharge = allocated / item.quantity; item.shippingCost = allocated / item.quantity; });
  }

  if (paymentMethod.type === "cod") {
    const challenge = await OrderOtp.findOne({ _id: req.body.otpChallengeId, customer: req.customer._id, verifiedAt: { $ne: null }, expiresAt: { $gt: new Date() } });
    if (!challenge) { res.status(400); throw new Error("Verify the email OTP before placing this order"); }
    await OrderOtp.deleteOne({ _id: challenge._id });
  }

  const customer = req.customer;
  customer.name = checkout.name;
  customer.phone = checkout.phone;
  await customer.save();

  const subtotal = Number(orderItems.reduce((sum, item) => sum + item.taxableValue * item.quantity, 0).toFixed(2));
  const taxTotal = Number(orderItems.reduce((sum, item) => sum + item.gstAmount * item.quantity, 0).toFixed(2));
  const grossProductTotal = subtotal + taxTotal;
  const { discountTotal, promotion } = await calculateFirstOrderDiscount(customer, grossProductTotal);
  const shippingTotal = Number(orderItems.reduce((sum, item) => sum + item.shippingCharge * item.quantity, 0).toFixed(2));
  if (paymentMethod.type === "razorpay") {
    const { razorpayOrderId, razorpayPaymentId, razorpaySignature } = req.body;
    if (!razorpayOrderId || !razorpayPaymentId || !razorpaySignature || !paymentMethod.razorpay?.keySecret) { res.status(400); throw new Error("Verified Razorpay payment is required"); }
    if (await Order.exists({ "payment.razorpayOrderId": razorpayOrderId })) { res.status(409); throw new Error("This Razorpay payment has already been used"); }
    const expected = crypto.createHmac("sha256", paymentMethod.razorpay.keySecret).update(`${razorpayOrderId}|${razorpayPaymentId}`).digest("hex");
    if (expected.length !== razorpaySignature.length || !crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(razorpaySignature))) { res.status(400); throw new Error("Razorpay payment verification failed"); }
    const response = await fetch(`https://api.razorpay.com/v1/orders/${razorpayOrderId}`, { headers: { Authorization: `Basic ${Buffer.from(`${paymentMethod.razorpay.keyId}:${paymentMethod.razorpay.keySecret}`).toString("base64")}` } });
    const razorpayOrder = await response.json();
    const expectedAmount = Math.round((grossProductTotal + shippingTotal - discountTotal) * 100);
    if (!response.ok || razorpayOrder.amount !== expectedAmount || razorpayOrder.amount_paid !== expectedAmount || razorpayOrder.status !== "paid" || String(razorpayOrder.notes?.customerId) !== String(req.customer._id)) { res.status(400); throw new Error("Razorpay payment amount or status could not be verified"); }
  }
  if (paymentMethod.type === "payu") {
    const txnid = String(req.body.payuTxnId || "");
    if (!txnid || !paymentMethod.payu?.merchantKey || !paymentMethod.payu?.salt) { res.status(400); throw new Error("Verified PayU payment is required"); }
    if (await Order.exists({ "payment.reference": txnid })) { res.status(409); throw new Error("This PayU payment has already been used"); }
    const expectedAmount = Number((grossProductTotal + shippingTotal - discountTotal).toFixed(2));
    await verifyPayuPayment({ config: paymentMethod.payu, txnid, expectedAmount });
  }
  const isCod = paymentMethod.type === "cod";
  const groups = [...orderItems.reduce((map, item) => { const key = String(item.seller?._id || item.seller || "admin"); if (!map.has(key)) map.set(key, []); map.get(key).push(item); return map; }, new Map()).entries()];
  const baseNumber = `ORD-${Date.now().toString().slice(-8)}`;
  const commonAddress = { name: checkout.name, email: checkout.email, phone: checkout.phone, billingAddress: checkout.billingAddress, billingCity: checkout.billingCity, billingState: checkout.billingState, billingPostalCode: checkout.billingPostalCode, shippingAddress: checkout.shippingAddress, city: checkout.city, state: checkout.state, postalCode: checkout.postalCode };
  const orders = [];
  let allocatedShipping = 0; let allocatedDiscount = 0;
  for (let index = 0; index < groups.length; index += 1) {
    const [, groupItems] = groups[index];
    const groupSubtotal = Number(groupItems.reduce((sum, item) => sum + item.taxableValue * item.quantity, 0).toFixed(2));
    const groupTax = Number(groupItems.reduce((sum, item) => sum + item.gstAmount * item.quantity, 0).toFixed(2));
    const groupGross = groupSubtotal + groupTax;
    const last = index === groups.length - 1;
    const itemShipping = Number(groupItems.reduce((sum, item) => sum + item.shippingCharge * item.quantity, 0).toFixed(2));
    const groupShipping = last ? Number((shippingTotal - allocatedShipping).toFixed(2)) : itemShipping;
    const groupDiscount = last ? Number((discountTotal - allocatedDiscount).toFixed(2)) : Number((discountTotal * groupGross / grossProductTotal).toFixed(2));
    allocatedShipping += groupShipping; allocatedDiscount += groupDiscount;
    const orderNumber = groups.length === 1 ? baseNumber : `${baseNumber}-${index + 1}`;
    const groupSeller = groupItems[0].seller;
    const syncPayload = shiprocket && groupSeller?.shippingMode === "shiprocket" ? { order_id: orderNumber, order_date: new Date().toISOString(), channel_id: shiprocket.channelId, billing_customer_name: checkout.name, billing_address: checkout.billingAddress, billing_city: checkout.billingCity, billing_state: checkout.billingState, billing_pincode: checkout.billingPostalCode, billing_email: checkout.email, billing_phone: checkout.phone, shipping_address: checkout.shippingAddress, shipping_city: checkout.city, shipping_state: checkout.state, shipping_pincode: checkout.postalCode, order_items: groupItems.map((item) => ({ name: item.name, sku: item.sku, units: item.quantity, selling_price: item.price })), payment_method: isCod ? "COD" : "Prepaid", sub_total: groupGross } : undefined;
    const internalShippingCost = Number(groupItems.reduce((sum, item) => sum + item.shippingCost * item.quantity, 0).toFixed(2));
    const order = await Order.create({ orderNumber, customer: customer._id, items: groupItems, status: "Pending", paymentStatus: isCod ? "Pending" : "Paid", payment: { methodCode: paymentMethod.code, methodName: paymentMethod.name, provider: paymentMethod.type, reference: paymentMethod.type === "payu" ? req.body.payuTxnId : req.body.razorpayPaymentId, razorpayOrderId: index === 0 ? req.body.razorpayOrderId : undefined, razorpayPaymentId: req.body.razorpayPaymentId }, shipping: { amount: groupShipping, actualCost: internalShippingCost, ruleName: "Product shipping", ruleType: "product", weightTotal: groupItems.reduce((sum, item) => sum + item.quantity * 0.5, 0), syncStatus: syncPayload ? "Ready for ShipRocket sync" : "Not synced", syncPayload }, address: commonAddress, subtotal: groupSubtotal, discountTotal: groupDiscount, shippingTotal: groupShipping, taxTotal: groupTax, grandTotal: groupGross + groupShipping - groupDiscount, partnerProfit: Math.max(0, groupItems.reduce((sum, item) => sum + (item.seller ? 0 : (item.price - item.costPrice - item.shippingCost) * item.quantity), 0) - groupDiscount), timeline: promotion ? [{ title: "Discount applied", comment: `${promotion.name} (${promotion.code})`, details: `Allocated discount of ${groupDiscount}` }] : [] });
    orders.push(order);
  }
  await Promise.all(orderItems.map((item) => item.variantAttributes?.size ? Product.updateOne({ _id: item.product, "variants.sku": item.sku }, { $inc: { "variants.$.stock": -item.quantity } }) : Product.findByIdAndUpdate(item.product, { $inc: { stock: -item.quantity } })));
  await Promise.all(orders.filter((order) => order.paymentStatus === "Paid").map((order) => distributeOrderProfit(order._id)));
  res.status(201).json({ order: orders[0], orders, razorpay: paymentMethod.type === "razorpay" ? paymentMethod.razorpay : undefined });
});

const otpHash = (code) => crypto.createHash("sha256").update(String(code)).digest("hex");

export const requestOrderOtp = asyncHandler(async (req, res) => {
  const { challengeId, otp } = req.body;
  if (challengeId && otp) {
    const challenge = await OrderOtp.findOne({ _id: challengeId, customer: req.customer._id, expiresAt: { $gt: new Date() }, verifiedAt: null });
    if (!challenge || challenge.attempts >= 5 || challenge.codeHash !== otpHash(otp)) {
      if (challenge) { challenge.attempts += 1; await challenge.save(); }
      res.status(400); throw new Error("The OTP is invalid or expired");
    }
    challenge.verifiedAt = new Date();
    await challenge.save();
    return res.json({ challengeId: challenge._id, verified: true });
  }

  const code = String(crypto.randomInt(100000, 1000000));
  const challenge = await OrderOtp.create({ customer: req.customer._id, email: req.customer.email, codeHash: otpHash(code), expiresAt: new Date(Date.now() + 10 * 60 * 1000) });
  try {
    await sendEmail({
      to: req.customer.email,
      subject: "Confirm your Cash on Delivery order",
      text: `Hello ${req.customer.name || "Customer"},\n\nYour HRSBasket Cash on Delivery order confirmation OTP is ${code}. It expires in 10 minutes.\n\nDo not share this code with anyone.`
    });
  } catch (_error) {
    await challenge.deleteOne();
    res.status(502);
    throw new Error("Unable to send the confirmation OTP. Please contact the administrator.");
  }
  res.json({ challengeId: challenge._id, message: `OTP sent to ${req.customer.email}` });
});

export const getProductReviews = asyncHandler(async (req, res) => {
  const reviews = await Review.find({ product: req.params.productId }).populate("customer", "name").sort({ createdAt: -1 });
  res.json(reviews.map((review) => ({ _id: review._id, name: review.customer?.name || "Verified customer", rating: review.rating, comment: review.comment, createdAt: review.createdAt, verifiedPurchase: true })));
});

export const createReview = asyncHandler(async (req, res) => {
  const { rating, sellerRating, comment } = req.body;
  const order = await Order.findOne({ customer: req.customer._id, "items.product": req.params.productId }).sort({ createdAt: -1 });
  if (!order) { res.status(403); throw new Error("Buy this product before writing a review"); }
  const item = order.items.find((entry) => String(entry.product) === String(req.params.productId));
  if (!["Delivered", "Completed"].includes(item?.sellerStatus)) { res.status(403); throw new Error("You can review this product after it is delivered"); }
  const returnWindowClosesAt = new Date(new Date(item.deliveredAt || order.fulfillment?.deliveredAt || order.updatedAt).getTime() + Number(item.returnDays || 0) * 86400000);
  if (returnWindowClosesAt > new Date()) { res.status(403); throw new Error(`You can leave a review after the return window closes on ${returnWindowClosesAt.toLocaleDateString("en-IN")}`); }
  if (!Number.isInteger(Number(rating)) || Number(rating) < 1 || Number(rating) > 5 || !String(comment || "").trim()) { res.status(400); throw new Error("A rating from 1 to 5 and review are required"); }
  if (item.seller && (!Number.isInteger(Number(sellerRating)) || Number(sellerRating) < 1 || Number(sellerRating) > 5)) { res.status(400); throw new Error("A seller-store rating from 1 to 5 is required"); }
  try {
    const review = await Review.create({ product: req.params.productId, seller: item.seller, customer: req.customer._id, order: order._id, rating: Number(rating), sellerRating: item.seller ? Number(sellerRating) : undefined, comment: String(comment).trim() });
    res.status(201).json({ _id: review._id, name: req.customer.name, rating: review.rating, comment: review.comment, createdAt: review.createdAt, verifiedPurchase: true });
  } catch (error) {
    if (error.code === 11000) { res.status(409); throw new Error("You have already reviewed this product"); }
    throw error;
  }
});

export const getSellerReviews = asyncHandler(async (req, res) => {
  const reviews = await Review.find({ seller: req.params.sellerId, sellerRating: { $exists: true } }).populate("customer", "name").populate("product", "name").sort({ createdAt: -1 });
  const averageRating = reviews.length ? Number((reviews.reduce((sum, review) => sum + review.sellerRating, 0) / reviews.length).toFixed(1)) : 0;
  res.json({ averageRating, reviewCount: reviews.length, items: reviews.map((review) => ({ _id: review._id, name: review.customer?.name || "Verified customer", productName: review.product?.name, rating: review.sellerRating, comment: review.comment, createdAt: review.createdAt })) });
});
