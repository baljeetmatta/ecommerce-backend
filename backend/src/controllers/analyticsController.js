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

  const [orderMetrics, customersCount, partnersCount, lowStockProducts] = await Promise.all([
    Order.aggregate([
      { $match: dateFilter },
      {
        $facet: {
          summary: [
            {
              $group: {
                _id: null,
                revenue: { $sum: "$grandTotal" },
                orderCount: { $sum: 1 },
                ecommerceSales: {
                  $sum: {
                    $cond: [
                      { $and: [{ $eq: ["$paymentStatus", "Paid"] }, { $not: [{ $in: ["$status", ["Cancelled", "Returned"]] }] }] },
                      {
                        $reduce: {
                          input: { $ifNull: ["$items", []] },
                          initialValue: 0,
                          in: { $add: ["$$value", { $multiply: [{ $ifNull: ["$$this.price", 0] }, { $ifNull: ["$$this.quantity", 0] }] }] }
                        }
                      },
                      0
                    ]
                  }
                },
                ecommerceProfit: {
                  $sum: {
                    $cond: [
                      { $and: [{ $eq: ["$paymentStatus", "Paid"] }, { $not: [{ $in: ["$status", ["Cancelled", "Returned"]] }] }] },
                      {
                        $reduce: {
                          input: { $ifNull: ["$items", []] },
                          initialValue: 0,
                          in: {
                            $add: [
                              "$$value",
                              {
                                $multiply: [
                                  { $subtract: [{ $ifNull: ["$$this.price", 0] }, { $ifNull: ["$$this.costPrice", 0] }] },
                                  { $ifNull: ["$$this.quantity", 0] }
                                ]
                              }
                            ]
                          }
                        }
                      },
                      0
                    ]
                  }
                }
              }
            }
          ],
          statuses: [
            { $group: { _id: "$status", count: { $sum: 1 } } }
          ],
          topProducts: [
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
          ]
        }
      }
    ]).allowDiskUse(true),
    Customer.countDocuments(),
    Partner.countDocuments(),
    Product.find({ $expr: { $lte: ["$stock", "$lowStockThreshold"] } })
      .select("name sku stock lowStockThreshold")
      .limit(8)
      .lean()
  ]);

  const aggregate = orderMetrics[0] || {};
  const summary = aggregate.summary?.[0] || {};
  const revenue = Number(summary.revenue || 0);
  const orderCount = Number(summary.orderCount || 0);
  const statusCounts = Object.fromEntries((aggregate.statuses || []).map((item) => [item._id, item.count]));

  res.json({
    revenue,
    averageOrderValue: orderCount ? revenue / orderCount : 0,
    conversionRate: 3.8,
    orderCount,
    customersCount,
    partnersCount,
    ecommerceSales: Number(summary.ecommerceSales || 0),
    ecommerceProfit: Number(summary.ecommerceProfit || 0),
    lowStockProducts,
    statusCounts,
    topProducts: aggregate.topProducts || []
  });
});
