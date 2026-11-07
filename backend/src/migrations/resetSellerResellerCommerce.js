import "dotenv/config";
import mongoose from "mongoose";

if (!process.env.MONGO_URI) throw new Error("MONGO_URI is required");

const apply = process.argv.includes("--apply");
const target = process.argv.find((argument) => argument.startsWith("--target="))?.slice("--target=".length);
const confirmed = process.argv.includes("--confirm=WIPE-ORDERS-SELLERS-RESELLERS-WALLETS");
const noBackupConfirmed = process.argv.includes("--confirm-no-backup");
const confirmedDatabase = process.argv.find((argument) => argument.startsWith("--confirm-db="))?.slice("--confirm-db=".length);

if (apply && target !== "production") throw new Error("Applying this reset requires --target=production.");
if (apply && !confirmed) throw new Error("Refusing to delete data. Add --confirm=WIPE-ORDERS-SELLERS-RESELLERS-WALLETS.");
if (apply && !noBackupConfirmed) throw new Error("No backup was requested. Add --confirm-no-backup to acknowledge that this reset cannot be rolled back.");
if (!apply && target && target !== "production") throw new Error("Only --target=production is supported.");

const collectionsToDelete = [
  "orders",
  "orderotps",
  "sellers",
  "resellers",
  "sellerpayouts",
  "partnerpayouts",
  "sellerwalletadjustments",
  "sellerbalancecollections",
  "resellerwallettransactions",
  "withdrawals",
  "sellerwithdrawals",
  "resellerwithdrawals",
  "partnerwithdrawalotps",
  "sellerwithdrawalotps",
  "sellerwithdrawalpayoutotps",
  "resellerlinks",
  "sellerregistrationotps",
  "resellerregistrationotps",
  "sellerimpersonations",
  "sellerbankotps",
  "admindeletionotps",
  "payutransactions",
  "products",
  "reviews",
  "supporttickets",
  "workassignments"
];
const walletOwners = ["sellers", "resellers", "partners"];
const nonzeroWalletFilter = { walletBalance: { $exists: true, $ne: 0 } };

const filters = {
  payutransactions: { kind: { $in: ["storefront", "partner-payment", "seller-wallet", "reseller-wallet"] } },
  products: { seller: { $exists: true, $ne: null } },
  supporttickets: {
    $or: [
      { requesterType: { $in: ["Seller", "Reseller"] } },
      { order: { $exists: true, $ne: null } }
    ]
  },
  workassignments: { entityType: { $in: ["Seller", "Reseller"] } }
};

await mongoose.connect(process.env.MONGO_URI, { serverSelectionTimeoutMS: 15000 });
try {
  const db = mongoose.connection.db;
  const databaseName = db.databaseName;
  const existing = new Set((await db.listCollections({}, { nameOnly: true }).toArray()).map((collection) => collection.name));
  const targeted = collectionsToDelete.filter((name) => existing.has(name));
  const countRecords = async () => Object.fromEntries(await Promise.all(
    targeted.map(async (name) => [name, await db.collection(name).countDocuments(filters[name] || {})])
  ));
  const countNonzeroWallets = async () => Object.fromEntries(await Promise.all(
    walletOwners
      .filter((name) => existing.has(name))
      .map(async (name) => [name, await db.collection(name).countDocuments(nonzeroWalletFilter)])
  ));

  console.log(JSON.stringify({
    target: target || "unspecified (dry-run only)",
    database: databaseName,
    backup: false,
    collections: await countRecords(),
    accountsWithNonzeroWallets: await countNonzeroWallets(),
    preserved: ["customer accounts", "partner accounts and registration payments", "admin users", "invoice sequence", "non-seller products", "audit logs"]
  }, null, 2));

  if (!apply) {
    console.log("Dry run only. No data was changed.");
    console.log("After reviewing these counts, apply only with --target=production --apply --confirm-db=<database> --confirm=WIPE-ORDERS-SELLERS-RESELLERS-WALLETS --confirm-no-backup.");
  } else {
    if (!confirmedDatabase || confirmedDatabase !== databaseName) {
      throw new Error(`Database confirmation mismatch. Pass --confirm-db=${databaseName} to confirm this exact database.`);
    }

    console.warn("Applying production reset without a backup. External payment or payout activity will not be reversed.");
    for (const name of walletOwners.filter((collection) => existing.has(collection))) {
      const result = await db.collection(name).updateMany(
        nonzeroWalletFilter,
        { $set: { walletBalance: 0 } }
      );
      console.log(`Cleared wallet balances for ${result.modifiedCount} ${name} account(s).`);
    }

    for (const name of targeted) {
      const result = await db.collection(name).deleteMany(filters[name] || {});
      console.log(`Deleted ${result.deletedCount} document(s) from ${name}.`);
    }

    const remaining = await countRecords();
    const accountsWithNonzeroWallets = await countNonzeroWallets();
    console.log(JSON.stringify({ remaining, accountsWithNonzeroWallets }, null, 2));

    if (Object.values(remaining).some(Boolean) || Object.values(accountsWithNonzeroWallets).some(Boolean)) {
      throw new Error("Reset verification failed; inspect the remaining counts before proceeding.");
    }
    console.log("Reset completed and verified.");
  }
} finally {
  await mongoose.disconnect();
}
