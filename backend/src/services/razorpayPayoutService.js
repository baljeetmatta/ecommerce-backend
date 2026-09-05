const apiBase = "https://api.razorpay.com/v1";
const request = async (credentials, path, { method = "POST", payload, headers = {} } = {}) => {
  const response = await fetch(`${apiBase}${path}`, { method, headers: { Authorization: `Basic ${Buffer.from(`${credentials.keyId}:${credentials.keySecret}`).toString("base64")}`, "Content-Type": "application/json", ...headers }, ...(payload ? { body: JSON.stringify(payload) } : {}) });
  const data = await response.json();
  if (!response.ok) throw new Error(data.error?.description || data.error?.reason || "RazorpayX payout failed");
  return data;
};

export const sendBankPayout = async ({ credentials, withdrawal, beneficiary, idempotencyKey, narration = "Wallet withdrawal" }) => {
  const bank = withdrawal.bankSnapshot || {};
  if (credentials.environment !== "live") return { provider: "razorpayx_demo", environment: "test", payoutId: `pout_test_${withdrawal._id}`, fundAccountId: `fa_test_${withdrawal._id}`, status: "queued", initiatedAt: new Date(), updatedAt: new Date() };
  if (!credentials.payoutAccountNumber) throw new Error("RazorpayX payout account number is not configured");
  const contact = await request(credentials, "/contacts", { payload: { name: bank.accountHolderName || bank.accountHolder || beneficiary.name || beneficiary.fullName, email: beneficiary.email, contact: beneficiary.mobile, type: "vendor", reference_id: `withdrawal_${withdrawal._id}` } });
  const fund = await request(credentials, "/fund_accounts", { payload: { contact_id: contact.id, account_type: "bank_account", bank_account: { name: bank.accountHolderName || bank.accountHolder || beneficiary.name || beneficiary.fullName, ifsc: bank.ifsc, account_number: bank.accountNumber } } });
  const payout = await request(credentials, "/payouts", { headers: { "X-Payout-Idempotency": idempotencyKey }, payload: { account_number: credentials.payoutAccountNumber, fund_account_id: fund.id, amount: Math.round(withdrawal.amount * 100), currency: "INR", mode: "IMPS", purpose: "payout", queue_if_low_balance: true, reference_id: idempotencyKey, narration } });
  return { provider: "razorpayx", environment: "live", payoutId: payout.id, fundAccountId: fund.id, status: payout.status, utr: payout.utr, initiatedAt: new Date(), updatedAt: new Date() };
};

export const fetchPayoutStatus = async ({ credentials, payout }) => {
  if (!payout?.payoutId) throw new Error("No Razorpay payout has been initiated");
  if (payout.environment === "test" || payout.provider === "razorpayx_demo") return { status: "processed", utr: payout.utr || `DEMO${String(payout.payoutId).slice(-10).toUpperCase()}`, updatedAt: new Date() };
  if (credentials.environment !== "live") throw new Error("Switch Razorpay payouts to Live mode to check this live transfer");
  const result = await request(credentials, `/payouts/${encodeURIComponent(payout.payoutId)}`, { method: "GET" });
  return { status: result.status, utr: result.utr, failureReason: result.failure_reason || result.status_details?.description, updatedAt: new Date() };
};
