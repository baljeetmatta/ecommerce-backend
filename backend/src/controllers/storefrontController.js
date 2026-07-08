import Category from "../models/Category.js";
import Customer from "../models/Customer.js";
import Order from "../models/Order.js";
import PaymentMethod from "../models/PaymentMethod.js";
import Product from "../models/Product.js";
import Promotion from "../models/Promotion.js";
import ShippingRule from "../models/ShippingRule.js";
import ShipRocketSetting from "../models/ShipRocketSetting.js";
import StorefrontSetting from "../models/StorefrontSetting.js";
import { listStorefrontBlogPosts } from "./blogController.js";
import asyncHandler from "../utils/asyncHandler.js";

export const getStorefront = asyncHandler(async (_req, res) => {
  const now = new Date();
  const activePromotionQuery = {
    isActive: true,
    $and: [
      { $or: [{ startsAt: { $exists: false } }, { startsAt: null }, { startsAt: { $lte: now } }] },
      { $or: [{ endsAt: { $exists: false } }, { endsAt: null }, { endsAt: { $gte: now } }] }
    ]
  };
  const [products, categories, promotions, settings, paymentMethods, shippingRules, blogPosts] = await Promise.all([
    Product.find({ status: "active" })
      .populate("category", "name slug parent")
      .select(
        "name sku shortDescription detailedDescription price offerPrice category displayType isFeatured mainImage media videoUrl tags stock isStockManageable createdAt"
      )
      .sort({ createdAt: -1 }),
    Category.find({ isActive: true }).populate("parent", "name slug").sort({ name: 1 }),
    Promotion.find(activePromotionQuery).sort({ createdAt: -1 }).limit(6),
    StorefrontSetting.findOne({ singleton: "storefront" }).populate("featuredProductIds").populate("homeSections.category", "name slug parent imageUrl"),
    PaymentMethod.find({ isActive: true }).sort({ sortOrder: 1, name: 1 }),
    ShippingRule.find({ isActive: true }).sort({ sortOrder: 1, name: 1 }),
    listStorefrontBlogPosts()
  ]);

  const markedFeatured = products.filter((product) => product.isFeatured);
  const featuredProducts = settings?.featuredProductIds?.length ? settings.featuredProductIds : markedFeatured.length ? markedFeatured : products.slice(0, 6);
  const promotionBanner = promotions[0]?.featuredBanner?.title
    ? promotions[0].featuredBanner
    : {
        title: "Fresh arrivals for everyday living",
        imageUrl: "",
        linkUrl: "#products"
      };
  const banner = { ...promotionBanner, ...settings?.hero };

  res.json({
    products,
    featuredProducts,
    categories,
    banner,
    heroItems: settings?.heroItems?.filter((item) => item.isActive).sort((a, b) => a.sortOrder - b.sortOrder) || [banner],
    contentSections: settings?.contentSections?.filter((item) => item.isActive).sort((a, b) => a.sortOrder - b.sortOrder) || [],
    firstOrderDiscount: promotions.find((promotion) => promotion.audience === "first_order") || null,
    blogPosts: blogPosts.filter((post) => !post.category || post.category.isActive !== false),
    settings: settings
      ? {
          ...settings.toObject(),
          promoBanner: settings.promoBanner,
          benefitItems: settings.benefitItems
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

  const productIds = items.map((item) => item.productId).filter(Boolean);
  const products = await Product.find({ _id: { $in: productIds }, status: "active" });
  const productMap = new Map(products.map((product) => [String(product._id), product]));
  const orderItems = items.map((item) => {
    const product = productMap.get(String(item.productId));
    if (!product) throw new Error("One or more products are unavailable");
    const quantity = Math.max(1, Number(item.quantity) || 1);
    return {
      product: product._id,
      name: product.name,
      sku: product.sku,
      quantity,
      price: Number(product.offerPrice || product.price)
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

  let customer = await Customer.findOne({ email: checkout.email });
  if (!customer) {
    customer = await Customer.create({ name: checkout.name || "Guest Customer", email: checkout.email, phone: checkout.phone, status: "active" });
  }

  const subtotal = orderItems.reduce((sum, item) => sum + item.price * item.quantity, 0);
  const { discountTotal, promotion } = await calculateFirstOrderDiscount(customer, subtotal);
  const weightTotal = orderItems.reduce((sum, item) => sum + item.quantity * 0.5, 0);
  const { rule, shippingTotal } = calculateShipping(shippingRules, subtotal, weightTotal);
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
          billing_email: checkout.email,
          billing_phone: checkout.phone,
          shipping_address: checkout.shippingAddress,
          shipping_pincode: checkout.postalCode,
          order_items: orderItems.map((item) => ({ name: item.name, sku: item.sku, units: item.quantity, selling_price: item.price })),
          payment_method: isCod ? "COD" : "Prepaid",
          sub_total: subtotal,
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
      shippingAddress: checkout.shippingAddress,
      postalCode: checkout.postalCode
    },
    subtotal,
    discountTotal,
    shippingTotal,
    taxTotal: 0,
    grandTotal: subtotal + shippingTotal - discountTotal,
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

  await Promise.all(order.items.map((item) => Product.findByIdAndUpdate(item.product, { $inc: { stock: -item.quantity } })));
  res.status(201).json({ order, razorpay: paymentMethod.type === "razorpay" ? paymentMethod.razorpay : undefined });
});
