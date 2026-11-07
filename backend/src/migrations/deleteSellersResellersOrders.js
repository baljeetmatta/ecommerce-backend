import "dotenv/config";
import mongoose from "mongoose";

if (!process.env.MONGO_URI) throw new Error("MONGO_URI is required");

const apply = process.argv.includes("--apply");
const target = process.argv.find((argument) => argument.startsWith("--target="))?.slice("--target=".length);
const confirmed = process.argv.includes("--confirm=DELETE-SELLERS-RESELLERS-ORDERS");
const noBackupConfirmed = process.argv.includes("--confirm-no-backup");
const confirmedDatabase = process.argv.find((argument) => argument.startsWith("--confirm-db="))?.slice("--confirm-db=".length);
const collectionsToDelete = ["sellers", "resellers", "orders"];

if (apply && target !== "production") throw new Error("Applying this reset requires --target=production.");
if (apply && !confirmed) throw new Error("Refusing to delete data. Add --confirm=DELETE-SELLERS-RESELLERS-ORDERS.");
if (apply && !noBackupConfirmed) throw new Error("No backup was requested. Add --confirm-no-backup to acknowledge that this reset cannot be rolled back.");
if (!apply && target && target !== "production") throw new Error("Only --target=production is supported.");

await mongoose.connect(process.env.MONGO_URI, { serverSelectionTimeoutMS: 15000 });
try {
  const db = mongoose.connection.db;
  const databaseName = db.databaseName;
  const existing = new Set((await db.listCollections({}, { nameOnly: true }).toArray()).map(({ name }) => name));
  const targeted = collectionsToDelete.filter((name) => existing.has(name));
  const countRecords = async () => Object.fromEntries(await Promise.all(
    targeted.map(async (name) => [name, await db.collection(name).countDocuments()])
  ));

  console.log(JSON.stringify({
    target: target || "unspecified (dry-run only)",
    database: databaseName,
    backup: false,
    collections: await countRecords(),
    preserved: ["all other collections, including related payment, wallet, and seller-product records"]
  }, null, 2));

  if (!apply) {
    console.log("Dry run only. No data was changed.");
    console.log("After reviewing these counts, apply only with --target=production --apply --confirm-db=<database> --confirm=DELETE-SELLERS-RESELLERS-ORDERS --confirm-no-backup.");
  } else {
    if (!confirmedDatabase || confirmedDatabase !== databaseName) {
      throw new Error(`Database confirmation mismatch. Pass --confirm-db=${databaseName} to confirm this exact database.`);
    }

    console.warn("Applying production deletion without a backup.");
    for (const name of targeted) {
      const result = await db.collection(name).deleteMany({});
      console.log(`Deleted ${result.deletedCount} document(s) from ${name}.`);
    }

    const remaining = await countRecords();
    console.log(JSON.stringify({ remaining }, null, 2));
    if (Object.values(remaining).some(Boolean)) {
      throw new Error("Deletion verification failed; inspect the remaining counts before proceeding.");
    }
    console.log("Deletion completed and verified.");
  }
} finally {
  await mongoose.disconnect();
}
