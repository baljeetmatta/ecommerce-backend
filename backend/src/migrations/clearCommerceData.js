import "dotenv/config";
import mongoose from "mongoose";

if (!process.env.MONGO_URI) throw new Error("MONGO_URI is required");
const apply = process.argv.includes("--apply");
const confirmed = process.argv.includes("--confirm=DELETE-SELLERS-PARTNERS-PRODUCTS");
if (apply && !confirmed) throw new Error("Refusing to delete data. Add --confirm=DELETE-SELLERS-PARTNERS-PRODUCTS after taking a backup.");

await mongoose.connect(process.env.MONGO_URI);
const collections = ["sellers", "partners", "products"];
const counts = Object.fromEntries(await Promise.all(collections.map(async (name) => [name, await mongoose.connection.collection(name).countDocuments()])));
console.log("Documents targeted:", counts);

if (!apply) {
  console.log("Dry run only. No data was deleted.");
  console.log("After a verified backup, run: npm run clear:commerce-data -- --apply --confirm=DELETE-SELLERS-PARTNERS-PRODUCTS");
} else {
  for (const name of collections) {
    const result = await mongoose.connection.collection(name).deleteMany({});
    console.log(`Deleted ${result.deletedCount} document(s) from ${name}.`);
  }
}
await mongoose.disconnect();
