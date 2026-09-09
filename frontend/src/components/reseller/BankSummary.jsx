import { Building2 } from "lucide-react";
export default function BankSummary({ bank }) {
  if (!bank?.accountNumber) return <p>No bank account has been saved.</p>;
  const masked = `•••• ${String(bank.accountNumber).slice(-4)}`;
  return <div className="resellerBankSummary"><Building2 /><span><strong>{bank.bankName}</strong><small>{bank.branch}</small><small>{bank.accountHolder} · {masked}</small><small>IFSC: {bank.ifsc}</small></span></div>;
}
