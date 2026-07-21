import "dotenv/config";
import mongoose from "mongoose";

if (!process.env.MONGO_URI) throw new Error("MONGO_URI is required");

await mongoose.connect(process.env.MONGO_URI);
const collection = mongoose.connection.collection("partners");
const indexes = await collection.indexes();
for (const index of indexes) {
  if (index.name === "registrationPayment.orderId_1" || index.name === "registrationPayment.paymentId_1") {
    await collection.dropIndex(index.name);
  }
}
await collection.createIndex({ "registrationPayment.orderId": 1 }, { name: "registrationPayment.orderId_1", unique: true, partialFilterExpression: { "registrationPayment.orderId": { $type: "string" } } });
await collection.createIndex({ "registrationPayment.paymentId": 1 }, { name: "registrationPayment.paymentId_1", unique: true, partialFilterExpression: { "registrationPayment.paymentId": { $type: "string" } } });
console.info("Partner payment indexes migrated successfully.");
await mongoose.disconnect();
