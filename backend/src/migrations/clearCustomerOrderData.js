import "dotenv/config";
import mongoose from "mongoose";

if (!process.env.MONGO_URI) throw new Error("MONGO_URI is required");

const apply = process.argv.includes("--apply");
const confirmed = process.argv.includes("--confirm=DELETE-CUSTOMERS-AND-ORDERS");
if (apply && !confirmed) {
  throw new Error("Refusing to delete data. Take a verified backup, then add --confirm=DELETE-CUSTOMERS-AND-ORDERS.");
}

const collections = ["customers", "orders"];
try {
  await mongoose.connect(process.env.MONGO_URI);
  const counts = Object.fromEntries(await Promise.all(
    collections.map(async (name) => [name, await mongoose.connection.collection(name).countDocuments()])
  ));
  console.log("Documents targeted:", counts);

  if (!apply) {
    console.log("Dry run only. No data was deleted.");
    console.log("After confirming the counts and taking a verified backup, run:");
    console.log("node src/migrations/clearCustomerOrderData.js --apply --confirm=DELETE-CUSTOMERS-AND-ORDERS");
  } else {
    for (const name of collections) {
      const result = await mongoose.connection.collection(name).deleteMany({});
      console.log(`Deleted ${result.deletedCount} document(s) from ${name}.`);
    }
  }
} finally {
  await mongoose.disconnect();
}
