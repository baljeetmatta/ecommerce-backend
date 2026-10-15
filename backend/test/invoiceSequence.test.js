import test from "node:test";
import assert from "node:assert/strict";
import Sequence from "../src/models/Sequence.js";
import StorefrontSetting from "../src/models/StorefrontSetting.js";
import { ensureOrderInvoice } from "../src/services/invoiceService.js";

test("fresh invoices use the atomic HRS counter and existing invoices retain their number", async t => {
  t.mock.method(StorefrontSetting, "findOne", async () => ({ shopName: "HRSBasket" }));
  let value = 0;
  t.mock.method(Sequence, "findOneAndUpdate", async (filter, update, options) => {
    assert.deepEqual(filter, { key: "invoice" });
    assert.deepEqual(update, { $inc: { value: 1 } });
    assert.equal(options.upsert, true);
    assert.equal(options.new, true);
    return { value: ++value };
  });
  const create = id => ({ _id: id, items: [], timeline: [], fulfillment: {} });
  const first = create("one");
  const second = create("two");
  assert.equal(await ensureOrderInvoice(first), true);
  assert.equal(await ensureOrderInvoice(second), true);
  assert.equal(first.invoiceNumber, "HRS-000001");
  assert.equal(second.invoiceNumber, "HRS-000002");
  assert.equal(await ensureOrderInvoice(first), false);
  assert.equal(first.invoiceNumber, "HRS-000001");
  assert.equal(value, 2);
});
