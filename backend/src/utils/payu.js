import crypto from "crypto";

const sha512 = (value) => crypto.createHash("sha512").update(value).digest("hex");
const normalizedAmount = (amount) => Number(amount).toFixed(2);

export const payuUrls = (environment = "test") => environment === "live"
  ? { payment: "https://secure.payu.in/_payment", verify: "https://info.payu.in/merchant/postservice.php?form=2" }
  : { payment: "https://test.payu.in/_payment", verify: "https://test.payu.in/merchant/postservice.php?form=2" };

export const createPayuRequest = ({ config, txnid, amount, productinfo, firstname, email, phone, callbackUrl, udf1 = "", udf2 = "" }) => {
  const fields = { key: String(config.merchantKey || "").trim(), txnid, amount: normalizedAmount(amount), productinfo, firstname, email, phone, surl: callbackUrl, furl: callbackUrl, udf1, udf2, udf3: "", udf4: "", udf5: "" };
  for (const key of Object.keys(fields)) fields[key] = String(fields[key] ?? "");
  if (!fields.key || !String(config.salt || "").trim()) throw new Error("PayU merchant key and salt are required");
  fields.hash = sha512(`${fields.key}|${fields.txnid}|${fields.amount}|${fields.productinfo}|${fields.firstname}|${fields.email}|${fields.udf1}|${fields.udf2}|${fields.udf3}|${fields.udf4}|${fields.udf5}||||||${String(config.salt || "").trim()}`);
  return { gateway: "payu", action: payuUrls(config.environment).payment, fields };
};

export const validatePayuResponseHash = (body, salt) => {
  const parts = [String(salt || "").trim(), body.status || ""];
  if (body.splitInfo) parts.push(body.splitInfo);
  parts.push(...Array(5).fill(""), ...["udf5", "udf4", "udf3", "udf2", "udf1", "email", "firstname", "productinfo", "amount", "txnid", "key"].map(key => body[key] ?? ""));
  if (body.additional_charges) parts.unshift(body.additional_charges);
  const raw = parts.join("|");
  const expected = sha512(raw);
  const received = String(body.hash || "");
  return expected.length === received.length && crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(received));
};

export const verifyPayuPayment = async ({ config, txnid, expectedAmount }) => {
  const command = "verify_payment";
  const hash = sha512(`${String(config.merchantKey || "").trim()}|${command}|${txnid}|${String(config.salt || "").trim()}`);
  const response = await fetch(payuUrls(config.environment).verify, { method: "POST", headers: { "Content-Type": "application/x-www-form-urlencoded" }, body: new URLSearchParams({ key: String(config.merchantKey || "").trim(), command, var1: txnid, hash }) });
  const data = await response.json().catch(() => ({}));
  const transaction = data.transaction_details?.[txnid];
  const amount = Number(transaction?.transaction_amount ?? transaction?.amt);
  if (!response.ok || !transaction || transaction.status !== "success" || !["captured", "auth"].includes(transaction.unmappedstatus) || !Number.isFinite(amount) || !Number.isFinite(Number(expectedAmount)) || Math.abs(amount - Number(expectedAmount)) > 0.001) throw new Error("PayU payment status or amount could not be verified");
  return transaction;
};

export const payuCallbackHtml = (payload, requestedOrigin) => {
  const targetOrigin = /^https?:\/\/[^\s]+$/i.test(String(requestedOrigin || "")) ? requestedOrigin : "*";
  return `<!doctype html><html><body><script>var p=${JSON.stringify(payload)},o=${JSON.stringify(targetOrigin)};window.parent&&window.parent!==window&&window.parent.postMessage(p,o);window.opener&&window.opener.postMessage(p,o);window.close();</script><p>Payment processed. You may close this window.</p></body></html>`;
};
