import "dotenv/config";
import mongoose from "mongoose";
import { mkdir, writeFile } from "node:fs/promises";
import { createHash } from "node:crypto";
import path from "node:path";

if (!process.env.MONGO_URI) throw new Error("MONGO_URI is required");
const apply = process.argv.includes("--apply");
const collections = ["orders", "orderotps", "payutransactions", "partnerpayouts", "sellerpayouts", "sellerwalletadjustments", "sellerbalancecollections", "resellerwallettransactions", "withdrawals", "sellerwithdrawals", "resellerwithdrawals", "partnerwithdrawalotps", "sellerwithdrawalotps", "sellerwithdrawalpayoutotps", "partnerregistrationotps"];
const updates = {
  sellers: { $set: { walletBalance: 0, walletRepayments: [], annualTurnover: 0 } },
  resellers: { $set: { walletBalance: 0, walletRepayments: [], totalWalletCredited: 0 } },
  // Preserve existing partner access without retaining historical payments.
  partners: { $set: { walletBalance: 0, registrationPayment: { provider: "no_payment", status: "approved", amount: 0 } } }
};
const projection = { _id: 1, walletBalance: 1, walletRepayments: 1, annualTurnover: 1, totalWalletCredited: 1, registrationPayment: 1 };
await mongoose.connect(process.env.MONGO_URI, { serverSelectionTimeoutMS: 15000 });
try {
  const db = mongoose.connection.db;
  const existing = new Set((await db.listCollections({}, { nameOnly: true }).toArray()).map(row => row.name));
  const targeted = collections.filter(name => existing.has(name));
  const filter = name => name === "partnerregistrationotps" ? { purpose: "payment" } : {};
  const counts = async () => Object.fromEntries(await Promise.all(targeted.map(async name => [name, await db.collection(name).countDocuments(filter(name))])));
  const fingerprint = async () => {
    const hash = createHash("sha256");
    let count = 0;
    for await (const row of db.collection("products").find().sort({ _id: 1 })) { hash.update(mongoose.mongo.BSON.EJSON.stringify(row)); count++; }
    return { count, sha256: hash.digest("hex") };
  };
  const productsBefore = await fingerprint();
  console.log(JSON.stringify({ apply, records: await counts(), products: productsBefore.count }));
  if (apply) {
    const directory = path.resolve("backups", `financial-reset-${new Date().toISOString().replace(/[:.]/g, "-")}`);
    await mkdir(directory, { recursive: true, mode: 0o700 });
    const session = mongoose.connection.getClient().startSession();
    const backup = async (filename, rows) => writeFile(path.join(directory, `${filename}.json`), mongoose.mongo.BSON.EJSON.stringify(rows), { mode: 0o600 });
    try {
      await session.withTransaction(async () => {
        // Save every affected record before making changes in this transaction.
        for (const name of targeted) await backup(name, await db.collection(name).find(filter(name), { session }).toArray());
        for (const name of Object.keys(updates)) await backup(`${name}-financial-fields`, await db.collection(name).find({}, { session, projection }).toArray());
        await backup("invoice-sequence", await db.collection("sequences").find({ key: "invoice" }, { session }).toArray());
        for (const name of targeted) await db.collection(name).deleteMany(filter(name), { session });
        for (const [name, update] of Object.entries(updates)) await db.collection(name).updateMany({}, update, { session });
        await db.collection("sequences").updateOne({ key: "invoice" }, { $set: { value: 0 } }, { session, upsert: true });
      });
    } finally { await session.endSession(); }
    console.log(`Backup saved: ${directory}`);
    const remaining = await counts();
    const nonzeroWallets = Object.fromEntries(await Promise.all(Object.keys(updates).map(async name => [name, await db.collection(name).countDocuments({ walletBalance: { $ne: 0 } })])));
    const productsAfter = await fingerprint();
    const productsUnchanged = JSON.stringify(productsBefore) === JSON.stringify(productsAfter);
    console.log(JSON.stringify({ remaining, nonzeroWallets, productsUnchanged, products: productsAfter.count, nextInvoice: "HRS-000001" }));
    if (!productsUnchanged || Object.values(remaining).some(Boolean) || Object.values(nonzeroWallets).some(Boolean)) throw new Error("Reset verification did not pass. See backup and output.");
  } else console.log("Dry run only. No changes made.");
} finally { await mongoose.disconnect(); }
