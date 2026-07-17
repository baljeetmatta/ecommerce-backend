export const seed = {
  metrics: {
    revenue: 234.32,
    averageOrderValue: 117.16,
    conversionRate: 3.8,
    orderCount: 2,
    customersCount: 2,
    partnersCount: 0,
    ecommerceSales: 204,
    ecommerceProfit: 84,
    statusCounts: { Processing: 1, Shipped: 1 },
    topProducts: [
      { _id: "TEE-100", name: "Everyday Cotton Tee", quantity: 2, revenue: 48 },
      { _id: "BAG-330", name: "Trail Daypack 18L", quantity: 1, revenue: 88 },
      { _id: "HOME-210", name: "Ceramic Pour Over Set", quantity: 1, revenue: 68 }
    ],
    lowStockProducts: [{ _id: "2", name: "Ceramic Pour Over Set", sku: "HOME-210", stock: 8, lowStockThreshold: 10 }]
  },
  products: [
    {
      _id: "1",
      name: "Everyday Cotton Tee",
      sku: "TEE-100",
      category: { _id: "cat-1", name: "Apparel", slug: "apparel" },
      taxCategory: { _id: "tax-1", name: "Standard Goods", code: "STD", rate: 8 },
      price: 24,
      costPrice: 14,
      offerPrice: 24,
      displayType: "Product",
      mainImage: "/images/e-commerce/home/product1.png",
      media: [{ url: "/images/e-commerce/home/product1.png", type: "image", isMain: true }],
      shortDescription: "Soft everyday cotton tee.",
      detailedDescription: "A breathable cotton tee with a relaxed fit for daily wear.",
      stock: 46,
      isStockManageable: true,
      lowStockThreshold: 12,
      status: "active",
      tags: ["shirt", "cotton"],
      backOrderAllowed: false
    },
    {
      _id: "2",
      name: "Ceramic Pour Over Set",
      sku: "HOME-210",
      category: { _id: "cat-4", name: "Coffee Gear", slug: "coffee-gear", parent: { _id: "cat-2", name: "Home" } },
      taxCategory: { _id: "tax-2", name: "Reduced Essentials", code: "RED", rate: 5 },
      price: 68,
      costPrice: 40,
      offerPrice: 59,
      displayType: "Reel",
      mainImage: "/images/e-commerce/home/product2.png",
      media: [{ url: "/images/e-commerce/home/product2.png", type: "image", isMain: true }],
      shortDescription: "Manual coffee set with dripper and server.",
      detailedDescription: "A compact ceramic pour over set for clean coffee extraction at home.",
      stock: 8,
      isStockManageable: true,
      lowStockThreshold: 10,
      status: "active",
      tags: ["coffee", "kitchen"],
      backOrderAllowed: true
    },
    {
      _id: "3",
      name: "Trail Daypack 18L",
      sku: "BAG-330",
      category: { _id: "cat-3", name: "Bags", slug: "bags" },
      taxCategory: { _id: "tax-1", name: "Standard Goods", code: "STD", rate: 8 },
      price: 88,
      costPrice: 52,
      offerPrice: 88,
      displayType: "Product",
      mainImage: "/images/e-commerce/home/product3.png",
      media: [{ url: "/images/e-commerce/home/product3.png", type: "image", isMain: true }],
      shortDescription: "Lightweight daypack with weather resistant shell.",
      detailedDescription: "A durable 18L daypack with padded straps and weather resistant finish.",
      stock: 22,
      isStockManageable: true,
      lowStockThreshold: 7,
      status: "active",
      tags: ["outdoor", "travel"],
      backOrderAllowed: false
    }
  ],
  orders: [
    {
      _id: "o1",
      orderNumber: "ORD-10001",
      customer: { name: "Mina Patel", email: "mina@example.com" },
      status: "Processing",
      paymentStatus: "Paid",
      grandTotal: 154.88,
      createdAt: new Date().toISOString()
    },
    {
      _id: "o2",
      orderNumber: "ORD-10002",
      customer: { name: "Noah Chen", email: "noah@example.com" },
      status: "Shipped",
      paymentStatus: "Paid",
      grandTotal: 79.44,
      createdAt: new Date().toISOString()
    }
  ],
  customers: [
    { _id: "c1", name: "Mina Patel", email: "mina@example.com", phone: "+1 555 0101", status: "vip", storeCredit: 15 },
    { _id: "c2", name: "Noah Chen", email: "noah@example.com", phone: "+1 555 0119", status: "active", storeCredit: 0 }
  ],
  promotions: [
    { _id: "p1", code: "SUMMER15", name: "Summer Sale", type: "percentage", value: 15, minimumOrderValue: 50, isActive: true }
  ],
  categories: [
    { _id: "cat-1", name: "Apparel", slug: "apparel", parent: null, isActive: true },
    { _id: "cat-2", name: "Home", slug: "home", parent: null, isActive: true },
    { _id: "cat-3", name: "Bags", slug: "bags", parent: null, isActive: true },
    { _id: "cat-4", name: "Coffee Gear", slug: "coffee-gear", parent: { _id: "cat-2", name: "Home" }, isActive: true }
  ],
  taxCategories: [
    { _id: "tax-1", name: "Standard Goods", code: "STD", rate: 8, isActive: true },
    { _id: "tax-2", name: "Reduced Essentials", code: "RED", rate: 5, isActive: true }
  ],
  users: [
    { _id: "u1", name: "Avery Admin", email: "admin@example.com", role: "Super Admin", isActive: true },
    { _id: "u2", name: "Ira Inventory", email: "inventory@example.com", role: "Inventory Clerk", isActive: true },
    { _id: "u3", name: "Casey Support", email: "support@example.com", role: "Customer Support", isActive: true }
  ]
};
