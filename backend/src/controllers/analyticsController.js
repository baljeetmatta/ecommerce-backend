import Customer from "../models/Customer.js";
import Order from "../models/Order.js";
import Product from "../models/Product.js";
import Partner from "../models/Partner.js";
import asyncHandler from "../utils/asyncHandler.js";

export const getDashboardMetrics = asyncHandler(async (req, res) => {
  const { from, to } = req.query;
  const createdAt = {};
  if (from) createdAt.$gte = new Date(from);
  if (to) createdAt.$lte = new Date(to);

  const dateFilter = Object.keys(createdAt).length ? { createdAt } : {};

  const [orders, customersCount, partnersCount, lowStockProducts, topProducts] = await Promise.all([
    Order.find(dateFilter),
    Customer.countDocuments(),
    Partner.countDocuments(),
    Product.find({ $expr: { $lte: ["$stock", "$lowStockThreshold"] } }).limit(8),
    Order.aggregate([
      { $match: dateFilter },
      { $unwind: "$items" },
      {
        $group: {
          _id: "$items.sku",
          name: { $first: "$items.name" },
          quantity: { $sum: "$items.quantity" },
          revenue: { $sum: { $multiply: ["$items.price", "$items.quantity"] } }
        }
      },
      { $sort: { quantity: -1 } },
      { $limit: 5 }
    ])
  ]);

  const revenue = orders.reduce((sum, order) => sum + order.grandTotal, 0);
  const salesOrders = orders.filter((order) => order.paymentStatus === "Paid" && !["Cancelled", "Returned"].includes(order.status));
  const ecommerceSales = salesOrders.reduce((sum, order) => sum + order.items.reduce((itemSum, item) => itemSum + Number(item.price || 0) * Number(item.quantity || 0), 0), 0);
  const ecommerceProfit = salesOrders.reduce((sum, order) => sum + order.items.reduce((itemSum, item) => itemSum + (Number(item.price || 0) - Number(item.costPrice || 0)) * Number(item.quantity || 0), 0), 0);
  const averageOrderValue = orders.length ? revenue / orders.length : 0;
  const statusCounts = orders.reduce((counts, order) => {
    counts[order.status] = (counts[order.status] || 0) + 1;
    return counts;
  }, {});

  res.json({
    revenue,
    averageOrderValue,
    conversionRate: 3.8,
    orderCount: orders.length,
    customersCount,
    partnersCount,
    ecommerceSales,
    ecommerceProfit,
    lowStockProducts,
    statusCounts,
    topProducts
  });
});
