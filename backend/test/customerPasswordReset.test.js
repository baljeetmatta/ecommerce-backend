import test from "node:test";
import assert from "node:assert/strict";
import bcrypt from "bcryptjs";
import nodemailer from "nodemailer";
import Customer from "../src/models/Customer.js";
import EmailSetting from "../src/models/EmailSetting.js";
import StorefrontSetting from "../src/models/StorefrontSetting.js";
import { forgotCustomerPassword, resetCustomerPassword } from "../src/controllers/authController.js";
import { hashResetCode } from "../src/utils/passwordReset.js";
const call = (handler, body) => new Promise((resolve, reject) => handler({ body }, { status() { return this; }, json: resolve }, reject));
const mockMail = (t, sendMail) => {
  t.mock.method(EmailSetting, "findOne", () => ({ select: async () => ({ host: "smtp.example.com", fromEmail: "hello@example.com", port: 587 }) }));
  t.mock.method(StorefrontSetting, "findOne", () => ({ select: async () => ({ logoUrl: "https://example.com/logo.png" }) }));
  t.mock.method(nodemailer, "createTransport", () => ({ sendMail, close() {} }));
};

test("customer reset emails contain branded single-use links and store only their hash", async t => {
  const customer = { _id: "buyer", name: "Buyer <Name>", email: "buyer@example.com", save: async () => {} };
  t.mock.method(Customer, "findOne", async filter => { assert.equal(filter.email, customer.email); return customer; });
  let message;
  mockMail(t, async data => { message = data; return { accepted: [data.to] }; });
  const result = await call(forgotCustomerPassword, { email: " Buyer@Example.com " });
  const link = message.text.match(/https?:\/\/\S+/)[0];
  const url = new URL(link);
  const params = new URLSearchParams(url.hash.split("?")[1]);
  const token = params.get("token");
  assert.match(token, /^[a-f0-9]{64}$/);
  assert.equal(params.get("email"), "buyer@example.com");
  assert.equal(customer.passwordResetToken, hashResetCode(token));
  assert.ok(customer.passwordResetExpires > new Date(Date.now() + 29 * 60 * 1000));
  assert.match(message.html, /Reset my password/);
  assert.match(message.html, /example.com\/logo.png/);
  assert.match(message.html, /Buyer &lt;Name&gt;/);
  assert.equal(result.token, undefined);
  assert.equal(result.resetCode, undefined);
});

test("unknown customers receive the same message without sending email", async t => {
  t.mock.method(Customer, "findOne", async () => null);
  t.mock.method(nodemailer, "createTransport", () => assert.fail("Unexpected email"));
  const result = await call(forgotCustomerPassword, { email: "unknown@example.com" });
  assert.match(result.message, /If an account exists/);
});

test("SMTP failure invalidates the unsent reset link", async t => {
  t.mock.method(Customer, "findOne", async () => ({ _id: "buyer", email: "buyer@example.com", save: async () => {} }));
  mockMail(t, async () => { throw new Error("SMTP failed"); });
  let cleared;
  t.mock.method(Customer, "updateOne", async (filter, update) => { cleared = { filter, update }; });
  await assert.rejects(call(forgotCustomerPassword, { email: "buyer@example.com" }), /Unable to send/);
  assert.equal(cleared.filter._id, "buyer");
  assert.match(cleared.filter.passwordResetToken, /^[a-f0-9]{64}$/);
  assert.equal(cleared.update.$unset.passwordResetToken, 1);
});

test("reset consumes the token atomically and saves a hashed password", async t => {
  let used = false;
  t.mock.method(Customer, "findOneAndUpdate", async (filter, update) => {
    assert.equal(filter.passwordResetToken, hashResetCode("a".repeat(64)));
    assert.ok(filter.passwordResetExpires.$gt instanceof Date);
    assert.equal(filter.status.$ne, "blocked");
    assert.ok(await bcrypt.compare("my-new-password", update.$set.password));
    assert.deepEqual(update.$unset, { passwordResetToken: 1, passwordResetExpires: 1, passwordVault: 1 });
    if (used) return null;
    used = true;
    return { _id: "buyer" };
  });
  const payload = { email: "buyer@example.com", token: "a".repeat(64), password: "my-new-password" };
  assert.match((await call(resetCustomerPassword, payload)).message, /successfully/);
  await assert.rejects(call(resetCustomerPassword, payload), /invalid or has expired/);
});

test("invalid email, malformed token, and short password are rejected before database updates", async t => {
  t.mock.method(Customer, "findOne", () => assert.fail("Unexpected lookup"));
  t.mock.method(Customer, "findOneAndUpdate", () => assert.fail("Unexpected update"));
  await assert.rejects(call(forgotCustomerPassword, { email: "HRS424371" }), /valid email/);
  await assert.rejects(call(resetCustomerPassword, { token: "123456", password: "new-password" }), /invalid or has expired/);
  await assert.rejects(call(resetCustomerPassword, { token: "a".repeat(64), password: "short" }), /at least 8/);
});
