import test from "node:test";
import assert from "node:assert/strict";
import SupportTicket from "../src/models/SupportTicket.js";
import Order from "../src/models/Order.js";
import { resellerTickets, resellerTicketReply, createResellerTicket } from "../src/controllers/supportController.js";

const reseller = { _id: "507f1f77bcf86cd799439011", fullName: "Reseller" };
function invoke(handler, extra = {}) {
  return new Promise(resolve => {
    let status = 200;
    handler({ reseller, ...extra }, { status(value) { status = value; return this; }, json(data) { resolve({ status, data }); } }, error => resolve({ status, error }));
  });
}
test("reseller tickets are scoped to reseller identity", async t => {
  const query = { sort() { return this; }, populate() { return this; }, then(resolve) { resolve([]); } };
  t.mock.method(SupportTicket, "find", filter => {
    assert.deepEqual(filter, { requesterType: "Reseller", requester: reseller._id });
    return query;
  });
  const result = await invoke(resellerTickets);
  assert.ifError(result.error);
  assert.deepEqual(result.data, []);
});
test("reseller replies cannot access a customer's ticket", async t => {
  t.mock.method(SupportTicket, "findOne", async filter => {
    assert.deepEqual(filter, { _id: "customer-ticket", requesterType: "Reseller", requester: reseller._id });
    return null;
  });
  const result = await invoke(resellerTicketReply, { params: { id: "customer-ticket" }, body: { message: "Reply" } });
  assert.equal(result.status, 404);
});
test("reseller support cannot reference unrelated customer orders", async t => {
  t.mock.method(Order, "findById", async () => ({ customer: reseller._id, resellerAttribution: { reseller: "another-reseller" } }));
  const result = await invoke(createResellerTicket, { body: { subject: "Order issue", message: "Help", orderId: "order" } });
  assert.equal(result.status, 403);
});
