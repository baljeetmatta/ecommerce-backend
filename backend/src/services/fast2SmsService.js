import Fast2SmsSetting from "../models/Fast2SmsSetting.js";

const normalizeIndianMobile = (value) => {
  const digits = String(value || "").replace(/\D/g, "");
  const mobile = digits.length === 12 && digits.startsWith("91") ? digits.slice(2) : digits;
  return /^\d{10}$/.test(mobile) ? mobile : "";
};

export async function sendFast2Sms({ to, message, allowInactive = false }) {
  const setting = await Fast2SmsSetting.findOne({ singleton: "fast2sms" }).select("+apiKey");
  if (!allowInactive && !setting?.isActive) return false;
  if (!setting?.apiKey) {
    if (allowInactive || setting?.isActive) throw new Error("Fast2SMS API key is not configured");
    return false;
  }
  const mobile = normalizeIndianMobile(to);
  if (!mobile) throw new Error("A valid 10-digit Indian mobile number is required");
  if (!String(message || "").trim()) throw new Error("SMS message cannot be empty");

  const response = await fetch("https://www.fast2sms.com/dev/bulkV2", {
    method: "POST",
    headers: {
      authorization: setting.apiKey,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      route: "q",
      message: String(message).trim(),
      language: "english",
      flash: 0,
      numbers: mobile
    }),
    signal: AbortSignal.timeout(15000)
  });
  let result;
  try {
    result = await response.json();
  } catch {
    throw new Error(`Fast2SMS returned an invalid response (HTTP ${response.status})`);
  }
  if (!response.ok || result?.return !== true) {
    throw new Error(result?.message || `Fast2SMS request failed (HTTP ${response.status})`);
  }
  return true;
}

export const normalizeFast2SmsMobile = normalizeIndianMobile;
