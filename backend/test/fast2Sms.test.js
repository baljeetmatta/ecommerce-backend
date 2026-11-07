import test from "node:test";
import assert from "node:assert/strict";
import Customer from "../src/models/Customer.js";
import Fast2SmsSetting from "../src/models/Fast2SmsSetting.js";
import Reseller from "../src/models/Reseller.js";
import Seller from "../src/models/Seller.js";
import { normalizeFast2SmsMobile, sendFast2Sms } from "../src/services/fast2SmsService.js";
import { notifyOrderSms, notifyOrderStatusSms, notifyRegistrationSms, notifyWithdrawalSms } from "../src/services/smsNotificationService.js";

const query = setting => ({ select: async () => setting });
const leanQuery = value => ({ select() { return this; }, lean: async () => value });

test("Fast2SMS normalizes Indian numbers and sends the configured message", async t => {
  let request;
  t.mock.method(Fast2SmsSetting, "findOne", () => query({ isActive: true, apiKey: "test-api-key" }));
  t.mock.method(globalThis, "fetch", async (url, options) => {
    request = { url, options };
    return { ok: true, status: 200, json: async () => ({ return: true }) };
  });

  assert.equal(normalizeFast2SmsMobile("+91 98765 43210"), "9876543210");
  assert.equal(await sendFast2Sms({ to: "+91 98765 43210", message: "Order placed" }), true);
  assert.equal(request.url, "https://www.fast2sms.com/dev/bulkV2");
  assert.equal(request.options.headers.authorization, "test-api-key");
  assert.deepEqual(JSON.parse(request.options.body), {
    route: "q",
    message: "Order placed",
    language: "english",
    flash: 0,
    numbers: "9876543210"
  });
});

test("Fast2SMS stays inactive until enabled and rejects provider errors", async t => {
  t.mock.method(Fast2SmsSetting, "findOne", () => query({ isActive: false, apiKey: "test-api-key" }));
  t.mock.method(globalThis, "fetch", async () => {
    throw new Error("Inactive SMS setting should not call Fast2SMS");
  });
  assert.equal(await sendFast2Sms({ to: "9876543210", message: "Order placed" }), false);
  await assert.rejects(sendFast2Sms({ to: "123", message: "Order placed", allowInactive: true }), /valid 10-digit/);
});

test("Fast2SMS safe settings never expose the API key", () => {
  const setting = new Fast2SmsSetting({ apiKey: "secret-key" });
  assert.equal(setting.toSafeObject().apiKey, "********");
});

test("new orders text the customer and, when configured, matching sellers and reseller", async t => {
  const messages = [];
  t.mock.method(Fast2SmsSetting, "findOne", () => query({ isActive: true, apiKey: "test-api-key", events: { orders: true } }));
  t.mock.method(Customer, "findById", () => leanQuery({ phone: "9876543210" }));
  t.mock.method(Seller, "find", () => leanQuery([{ _id: "seller-1", mobile: "9876543211" }]));
  t.mock.method(Reseller, "findById", () => leanQuery({ mobile: "9876543212" }));
  t.mock.method(globalThis, "fetch", async (_url, options) => {
    messages.push(JSON.parse(options.body));
    return { ok: true, status: 200, json: async () => ({ return: true }) };
  });

  await notifyOrderSms({
    orderNumber: "ORD-123",
    grandTotal: 125.5,
    customer: "customer-1",
    address: { phone: "9876543210" },
    items: [{ seller: "seller-1", quantity: 2 }],
    resellerAttribution: { reseller: "reseller-1" }
  });

  assert.equal(messages.length, 3);
  assert.deepEqual(messages.map(message => message.numbers).sort(), ["9876543210", "9876543211", "9876543212"]);
  assert.ok(messages.some(message => message.message.includes("ORD-123") && message.message.includes("125.50")));
});

test("disabled order event suppresses all order SMS", async t => {
  const messages = [];
  t.mock.method(Fast2SmsSetting, "findOne", () => query({ isActive: true, apiKey: "test-api-key", events: { orders: false } }));
  t.mock.method(Customer, "findById", () => {
    throw new Error("Customer lookup must not run when order SMS is disabled");
  });
  t.mock.method(Seller, "find", () => {
    throw new Error("Seller lookup must not run when order SMS is disabled");
  });
  t.mock.method(Reseller, "findById", () => {
    throw new Error("Reseller lookup must not run when order SMS is disabled");
  });
  t.mock.method(globalThis, "fetch", async (_url, options) => {
    messages.push(JSON.parse(options.body));
    return { ok: true, status: 200, json: async () => ({ return: true }) };
  });

  await notifyOrderSms({
    orderNumber: "ORD-456",
    customer: "customer-1",
    items: [{ seller: "seller-1", quantity: 1 }],
    resellerAttribution: { reseller: "reseller-1" }
  });

  assert.equal(messages.length, 0);
});

test("registration SMS is sent only when the registration event is enabled", async t => {
  const messages = [];
  t.mock.method(Fast2SmsSetting, "findOne", () => query({ isActive: true, apiKey: "test-api-key", events: { registration: true } }));
  t.mock.method(globalThis, "fetch", async (_url, options) => {
    messages.push(JSON.parse(options.body));
    return { ok: true, status: 200, json: async () => ({ return: true }) };
  });

  await notifyRegistrationSms({ to: "9876543210", name: "Customer", accountType: "customer" });

  assert.equal(messages.length, 1);
  assert.match(messages[0].message, /Verify your email/);
});

test("order status change sends completion SMS when the full order is delivered", async t => {
  const messages = [];
  t.mock.method(Fast2SmsSetting, "findOne", () => query({ isActive: true, apiKey: "test-api-key", events: { orderCompletion: true, orderStatusChange: true } }));
  t.mock.method(Customer, "findById", () => leanQuery({ phone: "9876543210" }));
  t.mock.method(globalThis, "fetch", async (_url, options) => {
    messages.push(JSON.parse(options.body));
    return { ok: true, status: 200, json: async () => ({ return: true }) };
  });

  await notifyOrderStatusSms(
    { orderNumber: "ORD-789", status: "Delivered", customer: "customer-1", items: [{ sellerStatus: "Delivered" }] },
    "Shipped",
    "Delivered"
  );

  assert.equal(messages.length, 1);
  assert.match(messages[0].message, /is complete/);
});

test("order status change and seller/reseller withdrawal respect their own event switches", async t => {
  const messages = [];
  t.mock.method(Fast2SmsSetting, "findOne", () => query({
    isActive: true,
    apiKey: "test-api-key",
    events: { orderStatusChange: true, sellerResellerWithdrawal: false }
  }));
  t.mock.method(Customer, "findById", () => leanQuery({ phone: "9876543210" }));
  t.mock.method(globalThis, "fetch", async (_url, options) => {
    messages.push(JSON.parse(options.body));
    return { ok: true, status: 200, json: async () => ({ return: true }) };
  });

  await notifyOrderStatusSms(
    { orderNumber: "ORD-790", status: "Shipped", customer: "customer-1", items: [{ sellerStatus: "Shipped" }] },
    "Packed",
    "Shipped"
  );
  await notifyWithdrawalSms({ to: "9876543211", name: "Seller", accountType: "seller", amount: 100 });

  assert.equal(messages.length, 1);
  assert.match(messages[0].message, /status is now Shipped/);
});

test("seller/reseller withdrawal event sends a confirmation SMS when enabled", async t => {
  const messages = [];
  t.mock.method(Fast2SmsSetting, "findOne", () => query({
    isActive: true,
    apiKey: "test-api-key",
    events: { sellerResellerWithdrawal: true }
  }));
  t.mock.method(globalThis, "fetch", async (_url, options) => {
    messages.push(JSON.parse(options.body));
    return { ok: true, status: 200, json: async () => ({ return: true }) };
  });

  await notifyWithdrawalSms({ to: "9876543211", name: "Seller", accountType: "seller", amount: 100 });

  assert.equal(messages.length, 1);
  assert.match(messages[0].message, /withdrawal request for Rs\. 100\.00 has been received/);
});
