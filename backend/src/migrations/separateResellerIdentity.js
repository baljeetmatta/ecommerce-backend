import "dotenv/config";
import mongoose from "mongoose";
import { planResellerIdentityMigration } from "../utils/resellerIdentityMigration.js";

const apply = process.argv.includes("--apply");
try {
  // Raw collections avoid save hooks rehashing an existing bcrypt hash.
  await mongoose.connect(process.env.MONGO_URI, { autoIndex: false });
  const resellers = mongoose.connection.collection("resellers");
  const customers = mongoose.connection.collection("customers");
  const rows = await resellers.find({}, { projection: { email: 1, customer: 1, resellerId: 1, password: 1, profileImage: 1 } }).toArray();
  const ids = rows.filter(row => row.customer).map(row => row.customer);
  const legacy = await customers.find({ _id: { $in: ids } }, { projection: { password: 1, passwordVault: 1, profileImage: 1 } }).toArray();
  const plan = planResellerIdentityMigration(rows, legacy);
  console.log(JSON.stringify({ mode: apply ? "apply" : "audit", resellers: rows.length, updates: plan.updates.length, passwordsToCopy: plan.copiedPasswords, resetRequired: plan.resetRequired }, null, 2));
  if (apply) {
    // The former unique customer index rejects multiple independent registrations.
    // Establish reseller-only uniqueness before dropping that obsolete index.
    await resellers.createIndex({ email: 1 }, { unique: true });
    for (const index of await resellers.indexes()) {
      if (Object.hasOwn(index.key, "customer")) await resellers.dropIndex(index.name);
    }
    for (const item of plan.updates) await resellers.updateOne({ _id: item._id }, item.update);
    console.log("Reseller identities separated. Customer accounts and business records were not changed.");
  }
} catch (error) {
  console.error(error.message);
  process.exitCode = 1;
} finally {
  await mongoose.disconnect();
}
