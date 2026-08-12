import crypto from "crypto";

const secret = () => process.env.GST_VERIFICATION_TOKEN_SECRET || process.env.JWT_SECRET || "development-gst-verification-secret";
const encode = (value) => Buffer.from(JSON.stringify(value)).toString("base64url");

export const issueTaxVerificationToken = ({ kind, value, legalName = "", state = "", verificationMode = "provider" }) => {
  const payload = encode({ kind, value, legalName, state, verificationMode, exp: Date.now() + 15 * 60 * 1000 });
  const signature = crypto.createHmac("sha256", secret()).update(payload).digest("base64url");
  return `${payload}.${signature}`;
};

const gstinAlphabet = "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ";
const hasValidGstinChecksum = (gstin) => {
  if (!/^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z][1-9A-Z]Z[0-9A-Z]$/.test(gstin)) return false;
  let sum = 0;
  for (let index = 0; index < 14; index += 1) {
    const product = gstinAlphabet.indexOf(gstin[index]) * (index % 2 === 0 ? 1 : 2);
    sum += Math.floor(product / 36) + (product % 36);
  }
  return gstinAlphabet[(36 - (sum % 36)) % 36] === gstin[14];
};

export const readTaxVerificationToken = (token, expectedKind, expectedValue) => {
  const [payload, signature] = String(token || "").split(".");
  if (!payload || !signature) return null;
  const expected = crypto.createHmac("sha256", secret()).update(payload).digest("base64url");
  if (signature.length !== expected.length || !crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expected))) return null;
  try {
    const data = JSON.parse(Buffer.from(payload, "base64url").toString("utf8"));
    return data.exp > Date.now() && data.kind === expectedKind && data.value === expectedValue ? data : null;
  } catch { return null; }
};

export const verifyTaxIdentifier = async ({ kind, value }) => {
  const url = kind === "gstin" ? process.env.GST_VERIFICATION_API_URL : (process.env.GST_ENROLMENT_VERIFICATION_API_URL || process.env.GST_VERIFICATION_API_URL);
  const apiKey = process.env.GST_VERIFICATION_API_KEY;
  if (!url || !apiKey) {
    return { valid: hasValidGstinChecksum(value), verificationMode: "manual" };
  }
  const response = await fetch(url, { method: "POST", headers: { "content-type": "application/json", authorization: `Bearer ${apiKey}`, "x-api-key": apiKey }, body: JSON.stringify({ type: kind, gstin: kind === "gstin" ? value : undefined, enrolmentNumber: kind === "enrolment" ? value : undefined, value }) });
  const body = await response.json().catch(() => ({}));
  const details = body.data || body.result || body;
  const valid = response.ok && (details.valid === true || details.verified === true || ["active", "valid", "verified"].includes(String(details.status || details.sts || "").toLowerCase()));
  if (!valid) return { valid: false };
  return { valid: true, verificationMode: "provider", legalName: details.legalName || details.legal_name || details.lgnm || details.businessName || "", state: details.state || details.gstState || details.pradr?.addr?.stcd || "" };
};
