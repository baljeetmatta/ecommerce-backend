// Build all updates before writing so duplicate/invalid emails stop the migration.
// Credential hashes are copied once, never rehashed or read by reseller login.
export function planResellerIdentityMigration(resellers, customers) {
  const byId = new Map(customers.map(customer => [String(customer._id), customer]));
  const emails = new Set();
  const updates = [];
  const resetRequired = [];
  let copiedPasswords = 0;
  for (const reseller of resellers) {
    const email = String(reseller.email || "").trim().toLowerCase();
    if (!/^\S+@\S+\.\S+$/.test(email)) throw new Error(`Reseller ${reseller._id} has an invalid email; correct it before migration.`);
    if (emails.has(email)) throw new Error("Duplicate reseller emails found. Assign a unique email to each reseller before migration.");
    emails.add(email);
    const changes = {};
    if (email !== reseller.email) changes.email = email;
    const legacyCustomer = reseller.customer && byId.get(String(reseller.customer));
    if (!reseller.password) {
      if (legacyCustomer?.password) {
        changes.password = legacyCustomer.password;
        if (legacyCustomer.passwordVault) changes.passwordVault = legacyCustomer.passwordVault;
        copiedPasswords += 1;
      } else resetRequired.push(String(reseller.resellerId || reseller._id));
    }
    if (!reseller.profileImage && legacyCustomer?.profileImage) changes.profileImage = legacyCustomer.profileImage;
    const update = {};
    if (Object.keys(changes).length) update.$set = changes;
    if (Object.hasOwn(reseller, "customer")) update.$unset = { customer: "" };
    if (Object.keys(update).length) updates.push({ _id: reseller._id, update });
  }
  return { updates, copiedPasswords, resetRequired };
}
