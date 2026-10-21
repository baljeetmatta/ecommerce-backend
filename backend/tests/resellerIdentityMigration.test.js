import test from "node:test";
import assert from "node:assert/strict";
import { planResellerIdentityMigration } from "../src/utils/resellerIdentityMigration.js";

test("migration copies a legacy hash once, removes the link, and preserves business data", () => {
  const reseller = { _id: "reseller-1", customer: "customer-1", email: " Shop@Example.Test ", resellerId: "HRR000001", walletBalance: 450 };
  const customer = { _id: "customer-1", password: "bcrypt-hash", passwordVault: "encrypted-vault", profileImage: "image-url", passwordResetToken: "customer-code" };
  const originalCustomer = structuredClone(customer);
  const { updates, copiedPasswords, resetRequired } = planResellerIdentityMigration([reseller], [customer]);
  assert.equal(copiedPasswords, 1);
  assert.deepEqual(resetRequired, []);
  assert.deepEqual(updates, [{ _id: "reseller-1", update: { $set: { email: "shop@example.test", password: "bcrypt-hash", passwordVault: "encrypted-vault", profileImage: "image-url" }, $unset: { customer: "" } } }]);
  assert.deepEqual(customer, originalCustomer);
  const migrated = { ...reseller, ...updates[0].update.$set };
  delete migrated.customer;
  assert.equal(migrated.walletBalance, 450);
  assert.deepEqual(planResellerIdentityMigration([migrated], [customer]).updates, []);
});

test("migration never overwrites an independent reseller password with a customer password", () => {
  const result = planResellerIdentityMigration([{ _id: "r", customer: "c", email: "r@example.test", password: "independent-hash" }], [{ _id: "c", password: "customer-hash", passwordVault: "customer-vault" }]);
  assert.equal(result.copiedPasswords, 0);
  assert.deepEqual(result.updates, [{ _id: "r", update: { $unset: { customer: "" } } }]);
});

test("orphan resellers are listed for password reset without creating customers", () => {
  const result = planResellerIdentityMigration([{ _id: "r", resellerId: "HRR000001", customer: "deleted", email: "r@example.test" }], []);
  assert.deepEqual(result.resetRequired, ["HRR000001"]);
  assert.equal(result.copiedPasswords, 0);
  assert.deepEqual(result.updates[0].update, { $unset: { customer: "" } });
});

test("duplicate reseller emails stop migration before any updates", () => {
  assert.throws(() => planResellerIdentityMigration([{ _id: "r1", email: "same@example.test" }, { _id: "r2", email: " Same@Example.Test " }], []), /Duplicate reseller emails/);
});
