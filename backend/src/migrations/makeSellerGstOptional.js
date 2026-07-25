import "dotenv/config";
import mongoose from "mongoose";
import connectDB from "../config/db.js";

await connectDB();
const collection = mongoose.connection.collection("sellers");
const indexes = await collection.indexes();
const gstIndex = indexes.find((index) => index.key?.gstNumber === 1);
if (gstIndex && !gstIndex.sparse) await collection.dropIndex(gstIndex.name);
if (!gstIndex?.sparse) await collection.createIndex({ gstNumber: 1 }, { name: "gstNumber_1", unique: true, sparse: true });
console.log("Seller GST index now permits businesses without a GST number.");
await mongoose.disconnect();
