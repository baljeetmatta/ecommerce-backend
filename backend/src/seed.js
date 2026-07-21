import dotenv from "dotenv";
import connectDB from "./config/db.js";
import Cart from "./models/Cart.js";
import Category from "./models/Category.js";
import Customer from "./models/Customer.js";
import Order from "./models/Order.js";
import PaymentMethod from "./models/PaymentMethod.js";
import Product from "./models/Product.js";
import Promotion from "./models/Promotion.js";
import ShippingRule from "./models/ShippingRule.js";
import ShipRocketSetting from "./models/ShipRocketSetting.js";
import StorefrontSetting from "./models/StorefrontSetting.js";
import TaxCategory from "./models/TaxCategory.js";
import User from "./models/User.js";
import Partner from "./models/Partner.js";
import PartnerPackage from "./models/PartnerPackage.js";
import PartnerPayout from "./models/PartnerPayout.js";
import Withdrawal from "./models/Withdrawal.js";
import Seller from "./models/Seller.js";
import SellerPayout from "./models/SellerPayout.js";

dotenv.config();

const seed = async () => {
  await connectDB();

  await Promise.all([
    User.deleteMany(),
    Category.deleteMany(),
    TaxCategory.deleteMany(),
    Product.deleteMany(),
    Customer.deleteMany(),
    Order.deleteMany(),
    Promotion.deleteMany(),
    Cart.deleteMany(),
    PaymentMethod.deleteMany(),
    ShippingRule.deleteMany(),
    StorefrontSetting.deleteMany(),
    ShipRocketSetting.deleteMany(),
    Partner.deleteMany(),
    PartnerPackage.deleteMany(),
    PartnerPayout.deleteMany(),
    Withdrawal.deleteMany(),
    Seller.deleteMany(),
    SellerPayout.deleteMany()
  ]);

  const admin = await User.create({
    name: "Avery Admin",
    email: "admin@example.com",
    password: "password123",
    role: "Super Admin",
    permissions: ["all"]
  });

  await PartnerPackage.create({ title: "Community Partner", price: 499, sharePercentage: 10, features: ["Partner dashboard", "Shared sale-profit payouts"], benefits: ["Wallet earnings", "Withdrawal requests"], isActive: true });

  await User.create([
    {
      name: "Ira Inventory",
      email: "inventory@example.com",
      password: "password123",
      role: "Inventory Clerk",
      permissions: ["products:write", "inventory:write"]
    },
    {
      name: "Casey Support",
      email: "support@example.com",
      password: "password123",
      role: "Customer Support",
      permissions: ["orders:write", "customers:write"]
    }
  ]);

  const [apparel, home, bags] = await Category.create([
    { name: "Apparel", slug: "apparel", description: "Clothing and wearable products", imageUrl: "/images/e-commerce/home/product1.png" },
    { name: "Home", slug: "home", description: "Home and kitchen products", imageUrl: "/images/e-commerce/home/product2.png" },
    { name: "Bags", slug: "bags", description: "Bags and travel carry products", imageUrl: "/images/e-commerce/home/product3.png" }
  ]);

  const coffee = await Category.create({
    name: "Coffee Gear",
    slug: "coffee-gear",
    parent: home._id,
    description: "Coffee brewing tools and accessories"
  });

  const [standardTax, reducedTax] = await TaxCategory.create([
    { name: "Standard Goods", code: "STD", rate: 8, description: "Default taxable merchandise" },
    { name: "Reduced Essentials", code: "RED", rate: 5, description: "Reduced rate essentials" }
  ]);

  const products = await Product.create([
    {
      name: "Everyday Cotton Tee",
      sku: "TEE-100",
      shortDescription: "Soft everyday cotton tee.",
      detailedDescription: "A breathable cotton tee with a relaxed fit for daily wear.",
      price: 24,
      costPrice: 14,
      offerPrice: 24,
      category: apparel._id,
      taxCategory: standardTax._id,
      displayType: "Product",
      isFeatured: true,
      tags: ["shirt", "cotton"],
      status: "active",
      isStockManageable: true,
      stock: 46,
      lowStockThreshold: 12,
      variants: [
        { sku: "TEE-100-BLK-M", attributes: { size: "M", color: "Black" }, price: 24, stock: 16 },
        { sku: "TEE-100-WHT-L", attributes: { size: "L", color: "White" }, price: 24, stock: 30 }
      ],
      mainImage: "https://images.unsplash.com/photo-1521572163474-6864f9cf17ab",
      media: [{ url: "https://images.unsplash.com/photo-1521572163474-6864f9cf17ab", alt: "Cotton tee", isMain: true }],
      seo: {
        slug: "everyday-cotton-tee",
        metaTitle: "Everyday Cotton Tee",
        metaDescription: "A soft cotton tee for daily wear."
      }
    },
    {
      name: "Ceramic Pour Over Set",
      sku: "HOME-210",
      shortDescription: "Manual coffee set with dripper and server.",
      detailedDescription: "A compact ceramic pour over set for clean coffee extraction at home.",
      price: 68,
      costPrice: 40,
      offerPrice: 59,
      category: coffee._id,
      taxCategory: reducedTax._id,
      displayType: "Reel",
      isFeatured: true,
      tags: ["coffee", "kitchen"],
      status: "active",
      isStockManageable: true,
      stock: 8,
      lowStockThreshold: 10,
      backOrderAllowed: true,
      videoUrl: "https://example.com/videos/pour-over-demo.mp4"
    },
    {
      name: "Trail Daypack 18L",
      sku: "BAG-330",
      shortDescription: "Lightweight daypack with weather resistant shell.",
      detailedDescription: "A durable 18L daypack with padded straps, quick access pockets, and a weather resistant finish.",
      price: 88,
      costPrice: 52,
      offerPrice: 88,
      category: bags._id,
      taxCategory: standardTax._id,
      displayType: "Product",
      isFeatured: true,
      tags: ["outdoor", "travel"],
      status: "active",
      isStockManageable: true,
      stock: 22,
      lowStockThreshold: 7
    }
  ]);

  const customers = await Customer.create([
    {
      name: "Mina Patel",
      email: "mina@example.com",
      gender: "female",
      phone: "+1 555 0101",
      status: "vip",
      storeCredit: 15,
      tags: ["repeat"]
    },
    {
      name: "Noah Chen",
      email: "noah@example.com",
      gender: "male",
      phone: "+1 555 0119",
      status: "active"
    }
  ]);

  await Order.create([
    {
      orderNumber: "ORD-10001",
      customer: customers[0]._id,
      items: [
        { product: products[0]._id, name: products[0].name, sku: products[0].sku, quantity: 2, price: 24, costPrice: 14 },
        { product: products[2]._id, name: products[2].name, sku: products[2].sku, quantity: 1, price: 88, costPrice: 52 }
      ],
      status: "Processing",
      paymentStatus: "Paid",
      subtotal: 136,
      shippingTotal: 8,
      taxTotal: 10.88,
      grandTotal: 154.88
    },
    {
      orderNumber: "ORD-10002",
      customer: customers[1]._id,
      items: [{ product: products[1]._id, name: products[1].name, sku: products[1].sku, quantity: 1, price: 68, costPrice: 40 }],
      status: "Shipped",
      paymentStatus: "Paid",
      fulfillment: {
        carrier: "UPS",
        trackingNumber: "1Z999AA10123456784",
        shippedAt: new Date()
      },
      subtotal: 68,
      shippingTotal: 6,
      taxTotal: 5.44,
      grandTotal: 79.44
    }
  ]);

  await Promotion.create({
    code: "SUMMER15",
    name: "Summer Sale",
    type: "percentage",
    value: 15,
    minimumOrderValue: 50,
    isActive: true,
    featuredBanner: {
      title: "Summer essentials are 15% off",
      linkUrl: "/sale"
    }
  });

  await PaymentMethod.create([
    {
      code: "cod",
      name: "Cash on Delivery",
      type: "cod",
      isActive: true,
      sortOrder: 1,
      instructions: "Pay in cash when your order is delivered."
    },
    {
      code: "razorpay",
      name: "Razorpay",
      type: "razorpay",
      isActive: true,
      sortOrder: 2,
      instructions: "Pay securely with Razorpay.",
      razorpay: {
        keyId: "rzp_test_replace_me",
        keySecret: "replace_me",
        merchantId: "merchant_demo",
        webhookSecret: "replace_me",
        environment: "test"
      }
    }
  ]);

  await ShippingRule.create([
    {
      name: "Standard Flat Rate",
      type: "flat_rate",
      isActive: true,
      sortOrder: 1,
      flatRate: 8,
      freeShippingAbove: 75,
      shiprocketEnabled: true
    },
    {
      name: "Weight Based Shipping",
      type: "weight_based",
      isActive: false,
      sortOrder: 2,
      weightUnit: "kg",
      weightBands: [
        { minWeight: 0, maxWeight: 1, rate: 6 },
        { minWeight: 1.01, maxWeight: 5, rate: 14 },
        { minWeight: 5.01, maxWeight: 20, rate: 28 }
      ],
      shiprocketEnabled: true
    }
  ]);

  await ShipRocketSetting.create({
    isActive: false,
    email: "shiprocket@example.com",
    password: "replace_me",
    pickupLocation: "Primary Warehouse",
    channelId: "demo-channel"
  });

  await StorefrontSetting.create({
    shopName: "HRSBasket",
    email: "support@example.com",
    phone: "+1 555 0100",
    address: "123 Market Street, New York, NY",
    hero: {
      title: "Fresh arrivals for everyday living",
      subtitle: "Thoughtfully selected products with clear delivery and trusted checkout.",
      imageUrl: "",
      linkUrl: "#/products"
    },
    heroItems: [
      {
        title: "Fresh arrivals for everyday living",
        subtitle: "Thoughtfully selected products with clear delivery and trusted checkout.",
        imageUrl: "/images/e-commerce/home/bg.png",
        linkUrl: "#/products",
        isActive: true,
        sortOrder: 1
      },
      {
        title: "Everyday products, ready to ship",
        subtitle: "Browse featured collections and fast fulfillment options.",
        imageUrl: "/images/e-commerce/home/bg-2.png",
        linkUrl: "#featured",
        isActive: true,
        sortOrder: 2
      }
    ],
    featuredProductIds: products.map((product) => product._id),
    productGridSize: 3,
    pages: [
      { title: "Shipping Policy", slug: "shipping-policy", menu: "footer", content: "Shipping timelines depend on the selected method." },
      { title: "About Us", slug: "about-us", menu: "header", content: "We curate practical products for everyday living." }
    ]
  });

  await Cart.create({
    customer: customers[1]._id,
    email: customers[1].email,
    status: "abandoned",
    items: [{ product: products[2]._id, name: products[2].name, sku: products[2].sku, quantity: 1, price: 88 }],
    lastActivityAt: new Date(Date.now() - 1000 * 60 * 60 * 30)
  });

  console.log("Seed complete");
  console.log("Admin login: admin@example.com / password123");
  console.log(`Created by ${admin.name}`);
  process.exit(0);
};

seed().catch((error) => {
  console.error(error);
  process.exit(1);
});
