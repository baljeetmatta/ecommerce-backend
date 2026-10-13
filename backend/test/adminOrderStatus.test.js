import test from "node:test";
import assert from "node:assert/strict";
import { updateOrderStatus } from "../src/controllers/orderController.js";
import Order from "../src/models/Order.js";

for (const status of ["Pending", "Placed", "Accepted", "Processing", "Packed", "Ready to Ship", "Shipped", "Out for Delivery"]) {
  test(`admin ${status} updates both admin and seller items`, async t => {
    let saved = false;
    const order = { status: "Pending", items: [{ sellerStatus: "Pending" }, { seller: "seller", sellerStatus: "Pending" }, { seller: "seller", sellerStatus: "Cancelled" }, { sellerStatus: "Return Requested", returnRequest: { status: "Requested" } }], timeline: [], populate: async () => {}, save: async () => { saved = true; } };
    t.mock.method(Order, "findById", async () => order);
    const result = await new Promise((resolve, reject) => updateOrderStatus({ params: { id: "order" }, body: { status }, user: { _id: "admin" } }, { status() { return this; }, json: resolve }, reject));
    const expected = status === "Ready to Ship" ? "Ready to Dispatch" : status;
    assert.equal(saved, true);
    assert.equal(result.status, expected);
    assert.equal(order.items[0].sellerStatus, expected);
    assert.equal(order.items[1].sellerStatus, expected);
    assert.equal(order.items[2].sellerStatus, "Cancelled");
    assert.equal(order.items[3].sellerStatus, "Return Requested");
  });
}
test("unknown admin status is rejected before updating an order", async t => {
  t.mock.method(Order, "findById", () => assert.fail("Unexpected lookup"));
  await assert.rejects(new Promise((resolve, reject) => updateOrderStatus({ body: { status: "Unknown" } }, { status() { return this; }, json: resolve }, reject)), /valid order status/);
});
