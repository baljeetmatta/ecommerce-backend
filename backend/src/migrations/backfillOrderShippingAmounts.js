import "dotenv/config";
import mongoose from "mongoose";
import connectDB from "../config/db.js";

const apply = process.argv.includes("--apply");

await connectDB();
const orders = mongoose.connection.collection("orders");
const filter = {
  shippingTotal: { $gt: 0 },
  $or: [{ "shipping.amount": { $exists: false } }, { "shipping.amount": null }]
};
const pending = await orders.countDocuments(filter);

if (apply && pending) {
  const result = await orders.updateMany(filter, [{ $set: { "shipping.amount": "$shippingTotal" } }]);
  console.log(`Stored shipping amounts on ${result.modifiedCount} existing orders.`);
} else {
  console.log(`${pending} existing orders need a shipping amount snapshot.${apply ? "" : " Run with --apply to update them."}`);
}

const requestedOrder = await orders.findOne(
  { orderNumber: "ORD-25929911" },
  { projection: { orderNumber: 1, subtotal: 1, discountTotal: 1, taxTotal: 1, grandTotal: 1, shippingTotal: 1, shipping: 1, "items.settlement.shippingCharge": 1 } }
);
if (requestedOrder) console.log("ORD-25929911 shipping evidence:", JSON.stringify(requestedOrder, null, 2));

await mongoose.disconnect();
