import "dotenv/config";
import mongoose from "mongoose";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";

if (!process.env.MONGO_URI) throw new Error("MONGO_URI is required");
const apply = process.argv.includes("--apply");
await mongoose.connect(process.env.MONGO_URI, { serverSelectionTimeoutMS: 15000 });
try {
  const db = mongoose.connection;
  const orders = db.collection("orders");
  const challenges = db.collection("orderotps");
  const sequences = db.collection("sequences");
  console.log(JSON.stringify({ orders: await orders.countDocuments(), otpChallenges: await challenges.countDocuments(), nextInvoice: "HRS-000001", apply }));
  if (apply) {
    const directory = path.resolve("backups", `orders-reset-${new Date().toISOString().replace(/[:.]/g, "-")}`);
    await mkdir(directory, { recursive: true, mode: 0o700 });
    // BSON Extended JSON retains IDs and dates for recovery.
    for (const [name, query] of [["orders", {}], ["orderotps", {}], ["sequences", { key: "invoice" }]]) {
      const rows = await db.collection(name).find(query).toArray();
      await writeFile(path.join(directory, `${name}.json`), mongoose.mongo.BSON.EJSON.stringify(rows), { mode: 0o600 });
    }
    console.log(`Backup saved: ${directory}`);
    const result = await orders.deleteMany({});
    await challenges.deleteMany({});
    await sequences.updateOne({ key: "invoice" }, { $set: { value: 0 } }, { upsert: true });
    console.log(JSON.stringify({ deletedOrders: result.deletedCount, remainingOrders: await orders.countDocuments(), invoiceCounter: (await sequences.findOne({ key: "invoice" })).value }));
  }
} finally { await mongoose.disconnect(); }
