import test from "node:test";
import assert from "node:assert/strict";
import { actionSuccessMessage, withActionNotifications } from "../src/utils/actionNotifications.js";
import { isSaveMessage, showToast } from "../src/utils/toast.js";

const events = [];
globalThis.window = { dispatchEvent: event => events.push(event.detail) };

test("bank confirmation is emitted only after saving succeeds, preserving response", async () => {
  events.length = 0;
  let finish;
  const result = { _id: "reseller", paymentDetails: { bankName: "Bank" } };
  const api = withActionNotifications({ updateResellerBank: () => new Promise(resolve => { finish = resolve; }) });
  const pending = api.updateResellerBank({ accountHolder: "Test" });
  assert.equal(events.length, 0);
  finish(result);
  assert.equal(await pending, result);
  assert.deepEqual(events, [{ message: "Bank details verified and saved successfully.", type: "success" }]);
});

test("failed updates emit errors and preserve rejection", async () => {
  events.length = 0;
  const failure = new Error("Profile could not be updated");
  const api = withActionNotifications({ sellerUpdateProfile: async () => { throw failure; } });
  await assert.rejects(api.sellerUpdateProfile({}), error => error === failure);
  assert.deepEqual(events, [{ message: failure.message, type: "error" }]);
});

test("unsuccessful response does not show a success popup", async () => {
  events.length = 0;
  const api = withActionNotifications({ createProduct: async () => ({ success: false, message: "Product validation failed" }) });
  await api.createProduct({});
  assert.equal(events[0].type, "error");
});

test("background reads, cart synchronization and payment preparation stay quiet", async () => {
  events.length = 0;
  const actions = Object.fromEntries(["resellerDashboard", "saveCustomerCart", "createPayuCheckout", "createRazorpayCheckoutOrder", "shippingQuote", "sellerPayoutStatus", "recordReelView", "createPartnerRegistrationOrder"].map(name => [name, async () => ({})]));
  const api = withActionNotifications(actions);
  for (const action of Object.values(api)) await action();
  assert.equal(events.length, 0);
});

test("all portal save families have meaningful confirmations", () => {
  for (const name of ["updateResellerBank", "sellerUpdateBank", "partnerUpdateBank", "updateCustomerProfile", "createProduct", "saveStorefrontSettings", "updateStaff", "uploadImage", "createCustomerTicket", "replySellerTicket", "requestResellerWithdrawal", "sellerUploadKyc", "resellerQuickRegister"]) {
    assert.ok(actionSuccessMessage(name), name);
  }
  assert.match(actionSuccessMessage("paySellerWithdrawal"), /request submitted/);
  assert.doesNotMatch(actionSuccessMessage("paySellerWithdrawal"), /paid successfully/);
});

test("identical duplicate events are suppressed but different actions remain visible", () => {
  events.length = 0;
  showToast("Category saved in test"); showToast("Category saved in test"); showToast("Banner saved in test");
  assert.equal(events.length, 2);
});

test("error wording is never classified as a saved message", () => {
  assert.equal(isSaveMessage("Bank details could not be updated"), false);
  assert.equal(isSaveMessage("Failed to save the uploaded document"), false);
  assert.equal(isSaveMessage("Profile updated successfully"), true);
});
