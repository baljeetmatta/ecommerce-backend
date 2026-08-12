import crypto from "crypto";

const secret = () => process.env.GST_VERIFICATION_TOKEN_SECRET || process.env.JWT_SECRET || "development-gst-verification-secret";
const encode = (value) => Buffer.from(JSON.stringify(value)).toString("base64url");

export const issueTaxVerificationToken = ({ kind, value, legalName = "", state = "" }) => {
  const payload = encode({ kind, value, legalName, state, exp: Date.now() + 15 * 60 * 1000 });
  const signature = crypto.createHmac("sha256", secret()).update(payload).digest("base64url");
  return `${payload}.${signature}`;
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
    const error = new Error("GST verification service is not configured. Contact the administrator.");
    error.statusCode = 503;
    throw error;
  }
  const response = await fetch(url, { method: "POST", headers: { "content-type": "application/json", authorization: `Bearer ${apiKey}`, "x-api-key": apiKey }, body: JSON.stringify({ type: kind, gstin: kind === "gstin" ? value : undefined, enrolmentNumber: kind === "enrolment" ? value : undefined, value }) });
  const body = await response.json().catch(() => ({}));
  const details = body.data || body.result || body;
  const valid = response.ok && (details.valid === true || details.verified === true || ["active", "valid", "verified"].includes(String(details.status || details.sts || "").toLowerCase()));
  if (!valid) return { valid: false };
  return { valid: true, legalName: details.legalName || details.legal_name || details.lgnm || details.businessName || "", state: details.state || details.gstState || details.pradr?.addr?.stcd || "" };
};
