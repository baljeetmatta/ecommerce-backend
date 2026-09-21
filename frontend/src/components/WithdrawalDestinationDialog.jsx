import "../styles/withdrawal-destination.css";

export default function WithdrawalDestinationDialog({ withdrawal, kind, onClose }) {
  if (!withdrawal) return null;
  const account = kind === "seller" ? withdrawal.seller : withdrawal.reseller;
  const name = kind === "seller" ? account?.companyName : account?.fullName;
  const id = kind === "seller" ? account?.sellerNumber : account?.resellerId;
  const bank = withdrawal.bankSnapshot || {};
  const currentUpi = kind === "seller" ? account?.bankDetails : account?.paymentDetails;
  const upiId = bank.upiId || currentUpi?.upiId || "";
  const payee = bank.upiDisplayName || currentUpi?.upiDisplayName || bank.accountHolderName || bank.accountHolder || name || "";
  const params = new URLSearchParams({ pa: upiId, pn: payee, am: Number(withdrawal.amount || 0).toFixed(2), cu: "INR" });
  const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=260x260&data=${encodeURIComponent(`upi://pay?${params}`)}`;
  return <div className="withdrawalDestinationOverlay" onMouseDown={event => { if (event.target === event.currentTarget) onClose(); }}><section className="withdrawalDestinationDialog" role="dialog" aria-modal="true" aria-label="Withdrawal transfer details"><button className="withdrawalDestinationClose" type="button" onClick={onClose} aria-label="Close">×</button><h2>{name || "Withdrawal request"}</h2><p>{kind === "seller" ? "Seller" : "Reseller"} ID: <strong>{id || "—"}</strong></p><p>Amount: <strong>{new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR" }).format(withdrawal.amount || 0)}</strong></p><p>UPI ID: <strong>{upiId || "Not provided"}</strong></p><p>UPI name: <strong>{payee || "—"}</strong></p>{upiId ? <><img className="withdrawalUpiQr" src={qrUrl} alt={`UPI payment QR for ${payee}`} /><small>Check the payee name and amount in your UPI app before transferring.</small></> : <p>No UPI QR is available for this request.</p>}<div className="withdrawalBankDetails"><strong>Bank destination</strong><span>{bank.bankName || "—"} · {bank.branch || "—"}</span><span>{bank.accountNumber || "—"} · {bank.ifsc || "—"}</span></div></section></div>;
}
