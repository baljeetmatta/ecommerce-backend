const apiBase = "https://api.razorpay.com/v1";
const request = async (credentials, path, payload) => {
  const response = await fetch(`${apiBase}${path}`, { method: "POST", headers: { Authorization: `Basic ${Buffer.from(`${credentials.keyId}:${credentials.keySecret}`).toString("base64")}`, "Content-Type": "application/json" }, body: JSON.stringify(payload) });
  const data = await response.json();
  if (!response.ok) throw new Error(data.error?.description || data.error?.reason || "RazorpayX payout failed");
  return data;
};

export const sendBankPayout = async ({ credentials, withdrawal, beneficiary, idempotencyKey }) => {
  if (!credentials.payoutAccountNumber) throw new Error("RazorpayX payout account number is not configured");
  const bank = withdrawal.bankSnapshot || {};
  const contact = await request(credentials, "/contacts", { name: bank.accountHolderName || beneficiary.name, email: beneficiary.email, contact: beneficiary.mobile, type: "vendor", reference_id: `withdrawal_${withdrawal._id}` });
  const fund = await request(credentials, "/fund_accounts", { contact_id: contact.id, account_type: "bank_account", bank_account: { name: bank.accountHolderName || beneficiary.name, ifsc: bank.ifsc, account_number: bank.accountNumber } });
  const payout = await request(credentials, "/payouts", { account_number: credentials.payoutAccountNumber, fund_account_id: fund.id, amount: Math.round(withdrawal.amount * 100), currency: "INR", mode: "IMPS", purpose: "payout", queue_if_low_balance: true, reference_id: idempotencyKey, narration: "Seller withdrawal" });
  return { provider: "razorpayx", payoutId: payout.id, fundAccountId: fund.id, status: payout.status, utr: payout.utr, initiatedAt: new Date() };
};
