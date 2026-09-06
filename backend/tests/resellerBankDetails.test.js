import test from "node:test";
import assert from "node:assert/strict";
import Reseller from "../src/models/Reseller.js";
import { updateBankDetails } from "../src/controllers/resellerController.js";

function invoke(body, reseller) {
  return new Promise((resolve) => {
    const result = { status: 200 };
    const res = { status(code) { result.status = code; return this; }, json(data) { resolve({ ...result, data }); } };
    updateBankDetails({ body, reseller }, res, error => resolve({ ...result, error }));
  });
}
const details = { accountHolder: "Test Reseller", accountNumber: "1234567890", ifsc: "TEST0001234" };

test("bank updates preserve legacy reseller IDs and validate only payment details", async (t) => {
  const existing = Reseller.hydrate({ _id: "507f1f77bcf86cd799439011", resellerId: "RS1256", fullName: "Test", mobile: "9999999999", customer: "507f1f77bcf86cd799439012", gstStatus: "non-gst", termsAcceptedAt: new Date() });
  assert.ok(existing.validateSync().errors.resellerId, "reproduce the full-document validation failure");
  t.mock.method(globalThis, "fetch", async () => ({ ok: true, json: async () => ({ IFSC: details.ifsc, BANK: "Test Bank", BRANCH: "Test Branch" }) }));
  t.mock.method(Reseller, "findByIdAndUpdate", async (id, update, options) => {
    assert.equal(String(id), String(existing._id));
    assert.deepEqual(Object.keys(update.$set), ["paymentDetails"]);
    assert.equal(update.$set.paymentDetails.accountNumber, details.accountNumber);
    assert.equal(update.$set.paymentDetails.bankName, "Test Bank");
    assert.equal(update.$set.paymentDetails.method, "bank");
    assert.equal(options.runValidators, true);
    assert.equal(options.new, true);
    return { ...existing.toObject(), paymentDetails: update.$set.paymentDetails };
  });
  const result = await invoke({ ...details, resellerId: "HRR999999", bankName: "Unverified" }, existing);
  assert.equal(result.status, 200);
  assert.equal(result.data.resellerId, "RS1256");
  assert.equal(result.data.paymentDetails.bankName, "Test Bank");
});

test("invalid bank input is rejected before verification or database writes", async (t) => {
  const fetchMock = t.mock.method(globalThis, "fetch", () => { throw Error("Unexpected verification"); });
  const updateMock = t.mock.method(Reseller, "findByIdAndUpdate", () => { throw Error("Unexpected update"); });
  const result = await invoke({ ...details, accountNumber: "invalid" }, {});
  assert.equal(result.status, 400);
  assert.match(result.error.message, /valid account holder/);
  assert.equal(fetchMock.mock.callCount(), 0);
  assert.equal(updateMock.mock.callCount(), 0);
});

test("unverified IFSC never updates bank details", async (t) => {
  t.mock.method(globalThis, "fetch", async () => ({ ok: false }));
  const updateMock = t.mock.method(Reseller, "findByIdAndUpdate", () => { throw Error("Unexpected update"); });
  const result = await invoke(details, {});
  assert.equal(result.status, 400);
  assert.match(result.error.message, /could not be verified/);
  assert.equal(updateMock.mock.callCount(), 0);
});

test("missing reseller returns a clear error", async (t) => {
  t.mock.method(globalThis, "fetch", async () => ({ ok: true, json: async () => ({ IFSC: details.ifsc, BANK: "Test Bank", BRANCH: "Test Branch" }) }));
  t.mock.method(Reseller, "findByIdAndUpdate", async () => null);
  const result = await invoke(details, { _id: "507f1f77bcf86cd799439011" });
  assert.equal(result.status, 404);
  assert.match(result.error.message, /account not found/);
});
