import test from "node:test";
import assert from "node:assert/strict";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import Customer from "../src/models/Customer.js";
import Reseller from "../src/models/Reseller.js";
import { loginReseller, resetResellerPassword, resetForgottenResellerPassword, changeResellerPassword, quickRegister, revealResellerPassword } from "../src/controllers/resellerController.js";
import { protectCustomer, protectReseller } from "../src/middleware/authMiddleware.js";
import profileSettingsRoutes from "../src/routes/profileSettingsRoutes.js";
import { hashResetCode } from "../src/utils/passwordReset.js";

const resellerId = "507f1f77bcf86cd799439011";
function invoke(handler, req) {
  return new Promise(resolve => {
    let status = 200;
    handler(req, { status(value) { status = value; return this; }, json(data) { resolve({ status, data }); } }, error => resolve({ status, error, passed: !error }));
  });
}
function setup(t, extra = {}) {
  const originalSecret = process.env.JWT_SECRET;
  process.env.JWT_SECRET = "reseller-auth-test-secret";
  t.after(() => { if (originalSecret === undefined) delete process.env.JWT_SECRET; else process.env.JWT_SECRET = originalSecret; });
  // A legacy reseller code must not prevent a password-only update.
  const reseller = Reseller.hydrate({ _id: resellerId, resellerId: "RS1256", fullName: "Manju", email: "reseller@example.test", mobile: "9999999999", gstStatus: "non-gst", status: "active", termsAcceptedAt: new Date(), ...extra });
  t.mock.method(Reseller, "findById", () => ({ select: async () => reseller, then: (resolve, reject) => Promise.resolve(reseller).then(resolve, reject) }));
  t.mock.method(Reseller, "findOne", () => ({ select: async () => reseller }));
  const writes = [];
  t.mock.method(Reseller.collection, "updateOne", async (_query, update) => { writes.push(update); return { acknowledged: true, matchedCount: 1 }; });
  // Reseller authentication must never read, create, or modify customer accounts.
  for (const method of ["findById", "findOne", "create", "updateOne"]) t.mock.method(Customer, method, () => { throw Error(`Unexpected customer ${method}`); });
  return { reseller, writes };
}

test("admin resets an orphan reseller independently; new credentials work with email and HRR code", async t => {
  const { reseller, writes } = setup(t, { resellerId: "HRR000123", passwordResetToken: "old-code", passwordResetExpires: new Date(Date.now() + 60000) });
  const result = await invoke(resetResellerPassword, { params: { id: resellerId } });
  assert.ifError(result.error);
  assert.ok(await bcrypt.compare(result.data.password, writes[0].$set.password));
  assert.equal(reseller.passwordResetToken, undefined);
  assert.equal(reseller.passwordResetExpires, undefined);
  for (const identifier of [" Reseller@Example.Test ", " hrr000123 "]) {
    t.mock.method(Reseller, "findOne", query => {
      assert.ok(query.$or.some(value => value.email === reseller.email || value.resellerId === reseller.resellerId));
      return { select: async () => reseller };
    });
    const login = await invoke(loginReseller, { body: { identifier, password: result.data.password } });
    assert.ifError(login.error);
    const claims = jwt.verify(login.data.token, process.env.JWT_SECRET);
    assert.equal(claims.role, "Reseller");
    assert.equal(claims.id, resellerId);
    const output = JSON.parse(JSON.stringify(login.data));
    for (const key of ["customer", "password", "passwordVault", "passwordResetToken", "passwordResetExpires"]) assert.equal(output.reseller[key], undefined);
    assert.equal(output.customer, undefined);
  }
  const reveal = await invoke(revealResellerPassword, { params: { id: resellerId } });
  assert.equal(reveal.data.password, result.data.password);
  const invalid = await invoke(loginReseller, { body: { identifier: reseller.email, password: "WrongPass@1" } });
  assert.equal(invalid.status, 401);
});

test("admin reset tolerates legacy profile fields and needs no customer record", async t => {
  const { reseller } = setup(t);
  assert.ok(reseller.validateSync().errors.resellerId);
  const result = await invoke(resetResellerPassword, { params: { id: resellerId } });
  assert.ifError(result.error);
  assert.ok(await reseller.matchPassword(result.data.password));
});

test("forgot-password verifies a reseller-owned code and accepts a strong password with a digit", async t => {
  const { reseller } = setup(t);
  t.mock.method(Reseller, "findOne", query => {
    assert.equal(query.passwordResetToken, hashResetCode("123456"));
    assert.ok(query.passwordResetExpires.$gt instanceof Date);
    return { select: async () => reseller };
  });
  const result = await invoke(resetForgottenResellerPassword, { body: { identifier: reseller.email, code: "123456", password: "NewPass@1" } });
  assert.ifError(result.error);
  assert.ok(await reseller.matchPassword("NewPass@1"));
  assert.equal(reseller.passwordResetToken, undefined);
});

test("invalid or expired reseller reset codes never change a password", async t => {
  const { writes } = setup(t);
  t.mock.method(Reseller, "findOne", () => ({ select: async () => null }));
  const result = await invoke(resetForgottenResellerPassword, { body: { identifier: "HRR000123", code: "123456", password: "NewPass@1" } });
  assert.equal(result.status, 400);
  assert.match(result.error.message, /invalid or has expired/);
  assert.equal(writes.length, 0);
});

test("reseller password changes use only reseller credentials", async t => {
  const { reseller } = setup(t, { password: await bcrypt.hash("OldPass@1", 4) });
  const wrong = await invoke(changeResellerPassword, { reseller, body: { currentPassword: "WrongPass@1", newPassword: "NewPass@1" } });
  assert.equal(wrong.status, 400);
  const result = await invoke(changeResellerPassword, { reseller, body: { currentPassword: "OldPass@1", newPassword: "NewPass@1" } });
  assert.ifError(result.error);
  assert.ok(await reseller.matchPassword("NewPass@1"));
  assert.equal(await reseller.matchPassword("OldPass@1"), false);
});

test("profile settings security updates the reseller account", async t => {
  const { reseller } = setup(t, { password: await bcrypt.hash("OldPass@1", 4) });
  const route = profileSettingsRoutes.stack.find(layer => layer.route?.path === "/:role/password");
  const result = await invoke(route.route.stack.at(-1).handle, { profileRole: "reseller", reseller, body: { currentPassword: "OldPass@1", newPassword: "NewPass@1" } });
  assert.ifError(result.error);
  assert.ok(await reseller.matchPassword("NewPass@1"));
});

test("customer and reseller tokens cannot access the other identity", async t => {
  const { reseller } = setup(t, { resellerId: "HRR000123" });
  const customerToken = jwt.sign({ id: resellerId, role: "Customer" }, process.env.JWT_SECRET);
  const resellerToken = jwt.sign({ id: resellerId, role: "Reseller" }, process.env.JWT_SECRET);
  assert.equal((await invoke(protectReseller, { headers: { authorization: `Bearer ${customerToken}` } })).status, 403);
  assert.equal((await invoke(protectCustomer, { headers: { authorization: `Bearer ${resellerToken}` } })).status, 403);
  const req = { headers: { authorization: `Bearer ${resellerToken}` } };
  assert.equal((await invoke(protectReseller, req)).passed, true);
  assert.equal(req.reseller._id.toString(), resellerId);
  reseller.status = "suspended";
  assert.equal((await invoke(protectReseller, req)).status, 401);
});

test("registration creates only a reseller, even if the email is used by a customer", async t => {
  setup(t);
  t.mock.method(Reseller, "exists", async () => null);
  let stored;
  t.mock.method(Reseller.collection, "insertOne", async data => { stored = data; return { acknowledged: true, insertedId: data._id }; });
  const body = { fullName: "Independent Reseller", businessName: "Business", mobile: "9999999999", email: "reseller@example.test", password: "NewPass@1", confirmPassword: "NewPass@1", businessType: "Retail", city: "Delhi", address: "Shop 1", gstStatus: "non-gst", termsAccepted: true };
  const result = await invoke(quickRegister, { body });
  assert.ifError(result.error);
  assert.equal(result.status, 201);
  assert.equal(stored.customer, undefined);
  assert.ok(await bcrypt.compare(body.password, stored.password));
  const claims = jwt.verify(result.data.token, process.env.JWT_SECRET);
  assert.equal(claims.role, "Reseller");
  assert.equal(claims.id, String(stored._id));
});

test("admin reset rejects an unknown reseller", async t => {
  setup(t);
  t.mock.method(Reseller, "findById", () => ({ select: async () => null }));
  const result = await invoke(resetResellerPassword, { params: { id: resellerId } });
  assert.equal(result.status, 404);
});

test("expired reseller sessions return 401 so the portal can show login again", async t => {
  setup(t);
  const token = jwt.sign({ id: resellerId, role: "Reseller" }, process.env.JWT_SECRET, { expiresIn: -1 });
  const result = await invoke(protectReseller, { headers: { authorization: `Bearer ${token}` } });
  assert.equal(result.status, 401);
  assert.match(result.error.message, /session expired/);
});
