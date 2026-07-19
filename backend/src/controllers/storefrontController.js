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
import ReelEngagement from "../models/ReelEngagement.js";
import crypto from "crypto";
import { listStorefrontBlogPosts } from "./blogController.js";
import asyncHandler from "../utils/asyncHandler.js";
import { distributeOrderProfit } from "../services/partnerPayoutService.js";
import { gstBreakdown, storefrontProduct } from "../utils/gstPricing.js";

export const getStorefront = asyncHandler(async (_req, res) => {
  const now = new Date();
  const activePromotionQuery = {
    isActive: true,
    $and: [
      { $or: [{ startsAt: { $exists: false } }, { startsAt: null }, { startsAt: { $lte: now } }] },
      { $or: [{ endsAt: { $exists: false } }, { endsAt: null }, { endsAt: { $gte: now } }] }
    ]
  };
  const [allProducts, categories, promotions, settings, paymentMethods, shippingRules, blogPosts, reviewStats] = await Promise.all([
    Product.find({ status: "active", $or: [{ seller: { $exists: false } }, { seller: null }, { sellerEnabled: true, approvalStatus: { $in: ["approved", "pending_update", "rejected_update"] } }] })
      .populate({ path: "category", select: "name slug parent", populate: { path: "parent", select: "name slug" } })
      .populate("taxCategory", "name code rate")
      .populate("seller", "companyName sellerNumber approvalStatus commissionRate")
      .select(
        "name sku shortDescription detailedDescription hsnCode volumetricWeight length height warranty manufacturerBrand price offerPrice priceIncludesTax category taxCategory displayType isFeatured mainImage media videoUrl tags relatedProducts stock isStockManageable variationOptions variants createdAt seller"
      )
      .sort({ createdAt: -1 }),
    Category.find({ isActive: true }).populate("parent", "name slug").sort({ name: 1 }),
    Promotion.find(activePromotionQuery).sort({ createdAt: -1 }).limit(6),
    StorefrontSetting.findOne({ singleton: "storefront" }).populate("featuredProductIds").populate("homeSections.category", "name slug parent imageUrl").populate("productBanners.product", "name sku status sellerEnabled approvalStatus"),
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
    featuredProducts,
    categories,
    banner,
    heroItems: settings?.heroItems?.filter((item) => item.isActive).sort((a, b) => a.sortOrder - b.sortOrder) || [banner],
    contentSections: settings?.contentSections?.filter((item) => item.isActive).sort((a, b) => a.sortOrder - b.sortOrder) || [],
    productBanners,
    productBannerColumns: settings?.productBannerColumns || 2,
    firstOrderDiscount: promotions.find((promotion) => promotion.audience === "first_order") || null,
    blogPosts: blogPosts.filter((post) => !post.category || post.category.isActive !== false),
    settings: settings
      ? {
          ...settings.toObject(),
          promoBanner: settings.promoBanner,
          benefitItems: settings.benefitItems,
          productBanners
        }
      : {},
    paymentMethods: paymentMethods.map((method) => ({
      _id: method._id,
      code: method.code,
      name: method.name,
      type: method.type,
      instructions: method.instructions,
      razorpay: method.type === "razorpay" ? { keyId: method.razorpay?.keyId, merchantId: method.razorpay?.merchantId, environment: method.razorpay?.environment } : undefined
    })),
    shippingRules
  });
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
  await ContactMessage.create(payload);
  res.status(201).json({ message: "Thank you. Your message has been submitted successfully." });
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
      reference: req.body.paymentReference,
      razorpayOrderId: paymentMethod.type === "razorpay" ? `order_${orderNumber}` : undefined,
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
  if (process.env.EMAIL_WEBHOOK_URL) {
    const response = await fetch(process.env.EMAIL_WEBHOOK_URL, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ to: req.customer.email, subject: "Confirm your Cash on Delivery order", template: "order-confirmation-otp", data: { name: req.customer.name, otp: code, expiresInMinutes: 10 } }) });
    if (!response.ok) { await challenge.deleteOne(); res.status(502); throw new Error("Unable to send the confirmation OTP"); }
  } else {
    console.info(`[order-otp] ${req.customer.email}: ${code}`);
  }
  res.json({ challengeId: challenge._id, message: `OTP sent to ${req.customer.email}`, ...(process.env.NODE_ENV !== "production" && !process.env.EMAIL_WEBHOOK_URL ? { developmentOtp: code } : {}) });
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
