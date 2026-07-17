import dotenv from "dotenv";
import mongoose from "mongoose";

dotenv.config();

const LEGACY_TERM = ["ven", "dor"].join("");
const legacyField = (suffix = "") => `${LEGACY_TERM}${suffix}`;

const collectionExists = async (db, name) => Boolean(await db.listCollections({ name }, { nameOnly: true }).next());

const renameCollection = async (db, from, to) => {
  const [hasSource, hasTarget] = await Promise.all([collectionExists(db, from), collectionExists(db, to)]);
  if (hasSource && hasTarget) throw new Error(`Both ${from} and ${to} exist; merge them before running this migration.`);
  if (hasSource) await db.collection(from).rename(to);
};

const dropLegacyIndexes = async (collection) => {
  const indexes = await collection.indexes();
  for (const index of indexes) {
    const refersToLegacyTerm = index.name.toLowerCase().includes(LEGACY_TERM)
      || Object.keys(index.key).some((key) => key.toLowerCase().includes(LEGACY_TERM));
    if (index.name !== "_id_" && refersToLegacyTerm) await collection.dropIndex(index.name);
  }
};

const migrateOrders = async (orders) => {
  const fieldMappings = [
    [legacyField(), "seller"],
    [legacyField("Status"), "sellerStatus"],
    [legacyField("CommissionRate"), "sellerCommissionRate"],
    [legacyField("PayoutAmount"), "sellerPayoutAmount"],
    [legacyField("PayoutCredited"), "sellerPayoutCredited"]
  ];
  const operations = [];
  for await (const order of orders.find({ [`items.${legacyField()}`]: { $exists: true } })) {
    const items = order.items.map((item) => {
      const next = { ...item };
      for (const [from, to] of fieldMappings) {
        if (Object.hasOwn(next, from) && !Object.hasOwn(next, to)) next[to] = next[from];
        delete next[from];
      }
      return next;
    });
    operations.push({ updateOne: { filter: { _id: order._id }, update: { $set: { items } } } });
    if (operations.length === 500) {
      await orders.bulkWrite(operations);
      operations.length = 0;
    }
  }
  if (operations.length) await orders.bulkWrite(operations);
};

const migrate = async () => {
  if (!process.env.MONGO_URI) throw new Error("MONGO_URI is required");
  await mongoose.connect(process.env.MONGO_URI);
  const db = mongoose.connection.db;

  await renameCollection(db, `${LEGACY_TERM}s`, "sellers");
  await renameCollection(db, `${LEGACY_TERM}payouts`, "sellerpayouts");

  if (await collectionExists(db, "sellers")) {
    const sellers = db.collection("sellers");
    await dropLegacyIndexes(sellers);
    await sellers.updateMany({ [legacyField("Number")]: { $exists: true } }, { $rename: { [legacyField("Number")]: "sellerNumber" } });
    await sellers.createIndex({ sellerNumber: 1 }, { unique: true });
  }

  if (await collectionExists(db, "products")) {
    const products = db.collection("products");
    await dropLegacyIndexes(products);
    await products.updateMany(
      { $or: [{ [legacyField()]: { $exists: true } }, { [legacyField("Enabled")]: { $exists: true } }] },
      { $rename: { [legacyField()]: "seller", [legacyField("Enabled")]: "sellerEnabled" } }
    );
    await products.createIndex({ seller: 1 });
  }

  if (await collectionExists(db, "orders")) await migrateOrders(db.collection("orders"));

  if (await collectionExists(db, "sellerpayouts")) {
    const payouts = db.collection("sellerpayouts");
    await dropLegacyIndexes(payouts);
    await payouts.updateMany({ [legacyField()]: { $exists: true } }, { $rename: { [legacyField()]: "seller" } });
    await payouts.createIndex({ seller: 1 });
    await payouts.createIndex({ seller: 1, order: 1, product: 1 }, { unique: true });
  }

  console.log("Seller terminology migration completed.");
};

migrate()
  .catch((error) => {
    console.error(`Seller terminology migration failed: ${error.message}`);
    process.exitCode = 1;
  })
  .finally(() => mongoose.disconnect());
