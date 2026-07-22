import crypto from "crypto";

const sha512 = (value) => crypto.createHash("sha512").update(value).digest("hex");
const normalizedAmount = (amount) => Number(amount).toFixed(2);

export const payuUrls = (environment = "test") => environment === "live"
  ? { payment: "https://secure.payu.in/_payment", verify: "https://info.payu.in/merchant/postservice.php?form=2" }
  : { payment: "https://test.payu.in/_payment", verify: "https://test.payu.in/merchant/postservice.php?form=2" };

export const createPayuRequest = ({ config, txnid, amount, productinfo, firstname, email, phone, callbackUrl, udf1 = "", udf2 = "" }) => {
  const fields = { key: config.merchantKey, txnid, amount: normalizedAmount(amount), productinfo, firstname, email, phone, surl: callbackUrl, furl: callbackUrl, udf1, udf2, udf3: "", udf4: "", udf5: "" };
  fields.hash = sha512(`${fields.key}|${fields.txnid}|${fields.amount}|${fields.productinfo}|${fields.firstname}|${fields.email}|${fields.udf1}|${fields.udf2}|${fields.udf3}|${fields.udf4}|${fields.udf5}||||||${config.salt}`);
  return { gateway: "payu", action: payuUrls(config.environment).payment, fields };
};

export const validatePayuResponseHash = (body, salt) => {
  const prefix = body.additional_charges ? `${body.additional_charges}|` : "";
  const splitInfo = body.splitInfo ? `${body.splitInfo}|` : "";
  const raw = `${prefix}${salt}|${body.status}|${splitInfo}||||||${body.udf5 || ""}|${body.udf4 || ""}|${body.udf3 || ""}|${body.udf2 || ""}|${body.udf1 || ""}|${body.email || ""}|${body.firstname || ""}|${body.productinfo || ""}|${body.amount || ""}|${body.txnid || ""}|${body.key || ""}`;
  const expected = sha512(raw);
  const received = String(body.hash || "");
  return expected.length === received.length && crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(received));
};

export const verifyPayuPayment = async ({ config, txnid, expectedAmount }) => {
  const command = "verify_payment";
  const hash = sha512(`${config.merchantKey}|${command}|${txnid}|${config.salt}`);
  const response = await fetch(payuUrls(config.environment).verify, { method: "POST", headers: { "Content-Type": "application/x-www-form-urlencoded" }, body: new URLSearchParams({ key: config.merchantKey, command, var1: txnid, hash }) });
  const data = await response.json().catch(() => ({}));
  const transaction = data.transaction_details?.[txnid];
  const amount = Number(transaction?.transaction_amount ?? transaction?.amt);
  if (!response.ok || !transaction || transaction.status !== "success" || !["captured", "auth"].includes(transaction.unmappedstatus) || Math.abs(amount - Number(expectedAmount)) > 0.001) throw new Error("PayU payment status or amount could not be verified");
  return transaction;
};

export const payuCallbackHtml = (payload, requestedOrigin) => {
  const targetOrigin = /^https?:\/\/[^\s]+$/i.test(String(requestedOrigin || "")) ? requestedOrigin : "*";
  return `<!doctype html><html><body><script>var p=${JSON.stringify(payload)},o=${JSON.stringify(targetOrigin)};window.parent&&window.parent!==window&&window.parent.postMessage(p,o);window.opener&&window.opener.postMessage(p,o);window.close();</script><p>Payment processed. You may close this window.</p></body></html>`;
};
