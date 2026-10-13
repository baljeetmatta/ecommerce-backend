import test from "node:test";
import assert from "node:assert/strict";
import { checkProductDelivery } from "../src/controllers/storefrontController.js";
import Product from "../src/models/Product.js";
import ShipRocketSetting from "../src/models/ShipRocketSetting.js";

const run = (pincode = "400001") => new Promise((resolve, reject) => checkProductDelivery({ params: { productId: "aaaaaaaaaaaaaaaaaaaaaaaa" }, body: { pincode } }, { status() { return this; }, json: resolve }, reject));
const setup = (t, seller) => {
  t.mock.method(Product, "findOne", () => ({ populate: async () => ({ _id: "aaaaaaaaaaaaaaaaaaaaaaaa", name: "Parcel", actualWeight: 1, seller }) }));
  t.mock.method(ShipRocketSetting, "findOne", async () => ({ email: "api@example.com", password: "test" }));
};
test("product delivery checks fixed/free shipping with the correct seller pickup", async t => {
  setup(t, { _id: "seller", shippingMode: "shiprocket", pinCode: "110001", pickupPinCode: "560001", pickupSameAsBusiness: true });
  t.mock.method(globalThis, "fetch", async url => {
    if (String(url).includes("auth/login")) return { ok: true, json: async () => ({ token: "test" }) };
    assert.equal(new URL(url).searchParams.get("pickup_postcode"), "110001");
    assert.equal(new URL(url).searchParams.get("delivery_postcode"), "400001");
    return { ok: true, json: async () => ({ data: { available_courier_companies: [{ courier_company_id: 1, courier_name: "Courier", rate: 80, estimated_delivery_days: 3 }] } }) };
  });
  const result = await run();
  assert.equal(result.available, true);
  assert.equal(result.estimatedDays, 3);
  assert.equal("amount" in result, false);
});
test("self delivery never requests Shiprocket estimates", async t => {
  setup(t, { shippingMode: "self" });
  t.mock.method(globalThis, "fetch", () => assert.fail("Unexpected Shiprocket request"));
  await assert.rejects(run(), /handles delivery directly/);
});
test("invalid delivery pincode is rejected before product lookup", async t => {
  t.mock.method(Product, "findOne", () => assert.fail("Unexpected lookup"));
  await assert.rejects(run("012345"), /valid 6-digit/);
});
test("unserviceable delivery does not invent a transit estimate", async t => {
  setup(t, { _id: "seller", shippingMode: "shiprocket", pinCode: "110001" });
  t.mock.method(globalThis, "fetch", async url => ({ ok: true, json: async () => String(url).includes("auth/login") ? { token: "test" } : { data: { available_courier_companies: [] } } }));
  await assert.rejects(run(), /No Shiprocket courier/);
});
