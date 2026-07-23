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
import crypto from "crypto";
import mongoose from "mongoose";
import { listStorefrontBlogPosts } from "./blogController.js";
import asyncHandler from "../utils/asyncHandler.js";
import { distributeOrderProfit } from "../services/partnerPayoutService.js";
import { gstBreakdown, storefrontProduct } from "../utils/gstPricing.js";
import { sendEmail } from "../utils/email.js";
import { createPayuRequest, payuCallbackHtml, validatePayuResponseHash, verifyPayuPayment } from "../utils/payu.js";
import PayuTransaction from "../models/PayuTransaction.js";

export const getStorefront = asyncHandler(async (req, res) => {
  res.set("Cache-Control", "public, max-age=30, stale-while-revalidate=120");
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
        .populate("productBanners.product", "name sku status sellerEnabled approvalStatus"),
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
    const productBanners = (publicSettings.productBanners || []).filter((item) => item.isActive);
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
        "name sku shortDescription detailedDescription hsnCode volumetricWeight length height warranty manufacturerBrand price offerPrice priceIncludesTax category taxCategory displayType isFeatured mainImage imageVariants media videoUrl tags relatedProducts stock isStockManageable variationOptions variants createdAt updatedAt seller"
      )
      .sort({ createdAt: -1 }),
    Category.find({ isActive: true }).populate("parent", "name slug").sort({ name: 1 }),
    Promotion.find(activePromotionQuery).sort({ createdAt: -1 }).limit(6),
    StorefrontSetting.findOne({ singleton: "storefront" }).populate("homeSections.category", "name slug parent imageUrl").populate("productBanners.product", "name sku status sellerEnabled approvalStatus"),
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
  const configuredFeaturedIds = new Set((settings?.featuredProductIds || []).map((product) => String(product._id)));
  const configuredFeatured = products.filter((product) => configuredFeaturedIds.has(String(product._id)));
  const featuredProducts = configuredFeatured.length ? configuredFeatured : markedFeatured.length ? markedFeatured : products.slice(0, 6);
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
  const productBanners = settings?.productBanners?.filter((item) => item.isActive && item.product && visibleProductIds.has(String(item.product._id || item.product))).sort((a, b) => a.sortOrder - b.sortOrder) || [];

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
  res.set("Cache-Control", "public, max-age=30, stale-while-revalidate=120");
  const [allProducts, reviewStats, settings] = await Promise.all([
    Product.find({ status: "active", $or: [{ seller: { $exists: false } }, { seller: null }, { sellerEnabled: true, approvalStatus: { $in: ["approved", "pending_update", "rejected_update"] } }] })
      .populate({ path: "category", select: "name slug parent", populate: { path: "parent", select: "name slug" } })
      .populate("taxCategory", "name code rate")
      .populate("seller", "companyName sellerNumber approvalStatus city state createdAt")
      .select("name sku shortDescription manufacturerBrand price offerPrice priceIncludesTax category taxCategory displayType isFeatured mainImage imageVariants tags stock isStockManageable variationOptions variants createdAt updatedAt seller")
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
  const configuredIds = new Set((settings?.featuredProductIds || []).map(String));
  const configured = products.filter((product) => configuredIds.has(String(product._id)));
  const marked = products.filter((product) => product.isFeatured);
  const featured = configured.length ? configured : marked.length ? marked : products.slice(0, 6);
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
  res.set("Cache-Control", "public, max-age=60, stale-while-revalidate=300");
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
  if (!engagement) return { likeCount: 0, liked: false, comments: [] };
  return { likeCount: engagement.likes.length, liked: engagement.likes.some((id) => String(id) === String(customerId)), comments: engagement.comments.slice(-100).reverse().map((comment) => ({ _id: comment._id, text: comment.text, createdAt: comment.createdAt, customer: { _id: comment.customer?._id, name: comment.customer?.name || "Customer" } })) };
};

export const getReelEngagement = asyncHandler(async (req, res) => res.json(await reelResponse(req.params.productId, req.customer._id)));
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

const calculateRazorpayQuote = async ({ items, shippingRuleId, customer }) => {
  if (!items?.length) throw new Error("Cart is empty");
  const productIds = items.map((item) => item.productId).filter(Boolean);
  if (!productIds.length || productIds.some((id) => !mongoose.isObjectIdOrHexString(id))) throw new Error("One or more cart products are unavailable. Remove them and add the products again.");
  const products = await Product.find({ _id: { $in: productIds }, status: "active", $or: [{ seller: { $exists: false } }, { seller: null }, { sellerEnabled: true, approvalStatus: { $in: ["approved", "pending_update", "rejected_update"] } }] }).populate("seller", "approvalStatus").populate("taxCategory", "rate");
  const productMap = new Map(products.map((product) => [String(product._id), product]));
  let productTotal = 0;
  let weightTotal = 0;
  for (const item of items) {
    const product = productMap.get(String(item.productId));
    if (!product || (product.seller && product.seller.approvalStatus !== "approved")) throw new Error("One or more products are unavailable");
    const quantity = Math.max(1, Number(item.quantity) || 1);
    const variant = item.variantSku ? product.variants.find((entry) => entry.sku === item.variantSku) : null;
    if (product.variationOptions?.length && !variant) throw new Error(`Select an available variation for ${product.name}`);
    if (variant && variant.stock < quantity && !variant.backOrderAllowed) throw new Error(`${product.name} (${variant.sku}) does not have enough stock`);
    if (!variant && product.isStockManageable && product.stock < quantity) throw new Error(`${product.name} does not have enough stock`);
    productTotal += gstBreakdown(variant?.price ?? product.offerPrice ?? product.price, product.taxCategory?.rate, product.priceIncludesTax !== false).grossPrice * quantity;
    weightTotal += quantity * 0.5;
  }
  const rules = await ShippingRule.find(shippingRuleId ? { _id: shippingRuleId, isActive: true } : { isActive: true }).sort({ sortOrder: 1, name: 1 });
  const { shippingTotal } = calculateShipping(rules, productTotal, weightTotal);
  const { discountTotal } = await calculateFirstOrderDiscount(customer, productTotal);
  return Number((productTotal + shippingTotal - discountTotal).toFixed(2));
};

export const createRazorpayCheckoutOrder = asyncHandler(async (req, res) => {
  const productIds = (req.body.items || []).map((item) => item.productId).filter(Boolean);
  if (!productIds.length || productIds.some((id) => !mongoose.isObjectIdOrHexString(id))) { res.status(400); throw new Error("One or more cart products are unavailable. Remove them and add the products again."); }
  const method = await PaymentMethod.findOne({ code: req.body.paymentMethodCode, type: "razorpay", isActive: true });
  if (!method?.razorpay?.keyId || !method.razorpay?.keySecret) { res.status(503); throw new Error("Razorpay is not configured by the administrator"); }
  const amount = await calculateRazorpayQuote({ items: req.body.items, shippingRuleId: req.body.shippingRuleId, customer: req.customer });
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
  const amount = await calculateRazorpayQuote({ items: req.body.items, shippingRuleId: req.body.shippingRuleId, customer: req.customer });
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
  const products = await Product.find({ _id: { $in: productIds }, status: "active", $or: [{ seller: { $exists: false } }, { seller: null }, { sellerEnabled: true, approvalStatus: { $in: ["approved", "pending_update", "rejected_update"] } }] }).populate("seller", "approvalStatus commissionRate").populate("taxCategory", "name code rate");
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
      seller: product.seller,
      sellerCommissionRate: Number(product.seller?.commissionRate ?? 20)
    };
  });

  const [paymentMethod, shippingRules, shiprocket] = await Promise.all([
    PaymentMethod.findOne({ code: paymentMethodCode, isActive: true }),
    ShippingRule.find(shippingRuleId ? { _id: shippingRuleId, isActive: true } : { isActive: true }).sort({ sortOrder: 1, name: 1 }),
    ShipRocketSetting.findOne({ singleton: "shiprocket", isActive: true })
  ]);
  if (!paymentMethod) {
    res.status(400);
    throw new Error("Selected payment method is not active");
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
  const weightTotal = orderItems.reduce((sum, item) => sum + item.quantity * 0.5, 0);
  const { rule, shippingTotal } = calculateShipping(shippingRules, grossProductTotal, weightTotal);
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
  const orderNumber = `ORD-${Date.now().toString().slice(-8)}`;
  const isCod = paymentMethod.type === "cod";
  const syncPayload =
    shiprocket && rule?.shiprocketEnabled
      ? {
          order_id: orderNumber,
          order_date: new Date().toISOString(),
          pickup_location: shiprocket.pickupLocation,
          channel_id: shiprocket.channelId,
          billing_customer_name: checkout.name,
          billing_address: checkout.billingAddress,
          billing_city: checkout.billingCity,
          billing_state: checkout.billingState,
          billing_pincode: checkout.billingPostalCode,
          billing_email: checkout.email,
          billing_phone: checkout.phone,
          shipping_address: checkout.shippingAddress,
          shipping_city: checkout.city,
          shipping_state: checkout.state,
          shipping_pincode: checkout.postalCode,
          order_items: orderItems.map((item) => ({ name: item.name, sku: item.sku, units: item.quantity, selling_price: item.price })),
          payment_method: isCod ? "COD" : "Prepaid",
          sub_total: grossProductTotal,
          length: shiprocket.defaultLengthCm,
          breadth: shiprocket.defaultBreadthCm,
          height: shiprocket.defaultHeightCm,
          weight: Math.max(weightTotal, shiprocket.defaultWeightKg)
        }
      : undefined;

  const order = await Order.create({
    orderNumber,
    customer: customer._id,
    items: orderItems,
    status: "Pending",
    paymentStatus: isCod ? "Pending" : "Paid",
    payment: {
      methodCode: paymentMethod.code,
      methodName: paymentMethod.name,
      provider: paymentMethod.type,
      reference: paymentMethod.type === "payu" ? req.body.payuTxnId : req.body.razorpayPaymentId,
      razorpayOrderId: req.body.razorpayOrderId,
      razorpayPaymentId: req.body.razorpayPaymentId
    },
    shipping: {
      rule: rule?._id,
      ruleName: rule?.name,
      ruleType: rule?.type,
      weightTotal,
      syncStatus: syncPayload ? "Ready for ShipRocket sync" : "Not synced",
      syncPayload
    },
    address: {
      name: checkout.name,
      email: checkout.email,
      phone: checkout.phone,
      billingAddress: checkout.billingAddress,
      billingCity: checkout.billingCity,
      billingState: checkout.billingState,
      billingPostalCode: checkout.billingPostalCode,
      shippingAddress: checkout.shippingAddress,
      city: checkout.city,
      state: checkout.state,
      postalCode: checkout.postalCode
    },
    subtotal,
    discountTotal,
    shippingTotal,
    taxTotal,
    grandTotal: subtotal + taxTotal + shippingTotal - discountTotal,
    partnerProfit: Math.max(0, orderItems.reduce((sum, item) => sum + (item.seller ? 0 : (item.price - item.costPrice) * item.quantity), 0) - discountTotal),
    timeline: promotion
      ? [
          {
            title: "Discount applied",
            comment: `${promotion.name} (${promotion.code})`,
            details: `First order discount of ${discountTotal}`
          }
        ]
      : []
  });

  await Promise.all(order.items.map((item) => item.variantAttributes?.size ? Product.updateOne({ _id: item.product, "variants.sku": item.sku }, { $inc: { "variants.$.stock": -item.quantity } }) : Product.findByIdAndUpdate(item.product, { $inc: { stock: -item.quantity } })));
  if (order.paymentStatus === "Paid") await distributeOrderProfit(order._id);
  res.status(201).json({ order, razorpay: paymentMethod.type === "razorpay" ? paymentMethod.razorpay : undefined });
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
  const { rating, comment } = req.body;
  const order = await Order.findOne({ customer: req.customer._id, "items.product": req.params.productId, status: { $nin: ["Cancelled", "Returned"] } }).sort({ createdAt: -1 });
  if (!order) { res.status(403); throw new Error("Buy this product before writing a review"); }
  if (!Number.isInteger(Number(rating)) || Number(rating) < 1 || Number(rating) > 5 || !String(comment || "").trim()) { res.status(400); throw new Error("A rating from 1 to 5 and review are required"); }
  try {
    const review = await Review.create({ product: req.params.productId, customer: req.customer._id, order: order._id, rating: Number(rating), comment: String(comment).trim() });
    res.status(201).json({ _id: review._id, name: req.customer.name, rating: review.rating, comment: review.comment, createdAt: review.createdAt, verifiedPurchase: true });
  } catch (error) {
    if (error.code === 11000) { res.status(409); throw new Error("You have already reviewed this product"); }
    throw error;
  }
});
