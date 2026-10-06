import test from "node:test";
import assert from "node:assert/strict";
import { fundingRules, validFundingAmount } from "../src/utils/walletFunding.js";
import { lookupPincode } from "../src/services/pincodeService.js";

test("funding uses minimum plus increments and rejects invalid amounts", () => {
  const rules = fundingRules(null, "seller");
  for (const amount of [100, 150, 200, 1000000]) assert.equal(validFundingAmount(amount, rules), true);
  for (const amount of [0, 99, 125, 150.5, NaN, Infinity, 1000050]) assert.equal(validFundingAmount(amount, rules), false);
  const settings = { walletFunding: { seller: { minimum: 125, increment: 50 }, reseller: { minimum: 200, increment: 100 } } };
  assert.equal(validFundingAmount(175, fundingRules(settings, "seller")), true);
  assert.equal(validFundingAmount(150, fundingRules(settings, "seller")), false);
  assert.equal(validFundingAmount(200, fundingRules(settings, "reseller")), true);
  assert.equal(validFundingAmount(250, fundingRules(settings, "reseller")), false);
});
test("PIN lookup validates, normalizes, caches and handles service failures", async () => {
  await assert.rejects(lookupPincode("123"), { status: 400 });
  let calls = 0;
  const request = async () => { calls++; return { ok: true, json: async () => [{ Status: "Success", PostOffice: [{ Name: "Gohana", District: "Sonipat", State: "Haryana" }] }] }; };
  assert.deepEqual(await lookupPincode("131301", request), { pinCode: "131301", city: "Sonipat", state: "Haryana", localities: ["Gohana"] });
  await lookupPincode("131301", request);
  assert.equal(calls, 1);
  await assert.rejects(lookupPincode("999999", async () => ({ ok: true, json: async () => [{ Status: "Error", PostOffice: null }] })), { status: 404 });
  await assert.rejects(lookupPincode("110001", async () => { throw new Error("Network failed"); }), { status: 502 });
});
