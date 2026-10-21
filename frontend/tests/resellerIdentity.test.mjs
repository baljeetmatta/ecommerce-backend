import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import vm from "node:vm";

function storage() {
  const values = new Map();
  return { getItem: key => values.get(key) ?? null, setItem: (key, value) => values.set(key, String(value)), removeItem: key => values.delete(key) };
}

test("reseller API, settings, address changes, uploads and logout use a separate session", async () => {
  const calls = [];
  const source = (await readFile(new URL("../src/services/api.js", import.meta.url), "utf8"))
    .replace(/^import .*;\n/gm, "")
    .replaceAll("import.meta.env.VITE_API_URL", "undefined")
    .replaceAll("export ", "");
  const context = vm.createContext({
    localStorage: storage(), sessionStorage: storage(),
    window: { location: { hostname: "localhost" }, setTimeout, clearTimeout },
    AbortController, URLSearchParams, FormData, Uint32Array,
    withActionNotifications: value => value, navigatePortalPath() {},
    fetch: async (url, options) => { calls.push({ url, options }); return { ok: true, headers: { get: () => "application/json" }, json: async () => ({}) }; }
  });
  vm.runInContext(source + "\nglobalThis.subject = {api, customerAuthStore, resellerAuthStore, profileSettingsRequest};", context);
  const { api, customerAuthStore, resellerAuthStore, profileSettingsRequest } = context.subject;
  customerAuthStore.token = "customer-session";
  customerAuthStore.customer = { name: "Shopper" };
  resellerAuthStore.token = "reseller-session";
  await api.resellerMe();
  await api.resellerWallet();
  await api.changeResellerPassword({ currentPassword: "old", newPassword: "new" });
  await api.resellerTickets();
  await api.addressChanges("reseller");
  await profileSettingsRequest("reseller");
  await api.uploadResellerDocument(new Blob(["proof"]), "reseller-kyc");
  assert.equal(calls.length, 7);
  assert.ok(calls.every(call => call.options.headers.Authorization === "Bearer reseller-session"));
  calls.length = 0;
  await api.customerOrders();
  assert.equal(calls[0].options.headers.Authorization, "Bearer customer-session");
  resellerAuthStore.clear();
  assert.equal(customerAuthStore.token, "customer-session");
  assert.equal(customerAuthStore.customer.name, "Shopper");
  assert.equal(resellerAuthStore.token, null);
});
