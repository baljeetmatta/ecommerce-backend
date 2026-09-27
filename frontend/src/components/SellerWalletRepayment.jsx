import { useEffect, useState } from "react";
import { api } from "../services/api.js";
import { openPayuModal, readPayuReturn, clearPayuReturn } from "../utils/payuCheckout.js";
const money = (value) => new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR" }).format(value);
export default function SellerWalletRepayment({ wallet, onPaid }) {
  const [methods, setMethods] = useState([]);
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [retry, setRetry] = useState(null);
  const due = Math.max(0, -Number(wallet.walletBalance || 0));
  const paused = due > Number(wallet.walletDebtLimit ?? 500);
  const verify = async (payment) => {
    setBusy(true); setRetry(payment);
    try { await api.verifySellerWalletPayment(payment); clearPayuReturn(); sessionStorage.removeItem("seller-wallet-payment"); setRetry(null); setMessage("Payment received. Your wallet has been updated."); await onPaid(); }
    catch (error) { setMessage(error.message); }
    finally { setBusy(false); }
  };
  useEffect(() => {
    api.sellerWalletPaymentMethods().then((items) => { setMethods(items); setCode(items[0]?.code || ""); }).catch((error) => setMessage(error.message));
    const returned = readPayuReturn();
    let pending = null;
    try { pending = JSON.parse(sessionStorage.getItem("seller-wallet-payment") || "null"); } catch { /* Ignore invalid local state. */ }
    if (returned?.kind === "seller-wallet") verify({ payuTxnId: returned.txnid });
    else if (pending) verify(pending);
  }, []);
  const pay = async () => {
    setBusy(true); setMessage("");
    try {
      const checkout = await api.createSellerWalletPayment({ paymentMethodCode: code, returnUrl: window.location.href });
      if (checkout.gateway === "payu") { await openPayuModal(checkout, { kind: "seller-wallet" }); return; }
      if (!window.Razorpay) await new Promise((resolve, reject) => { const script = document.createElement("script"); script.src = "https://checkout.razorpay.com/v1/checkout.js"; script.onload = resolve; script.onerror = () => reject(new Error("Unable to load payment gateway")); document.head.appendChild(script); });
      const payment = await new Promise((resolve, reject) => {
        const modal = new window.Razorpay({ key: checkout.keyId, amount: checkout.amount, currency: checkout.currency, name: checkout.merchantName, description: "Seller wallet repayment", order_id: checkout.orderId, handler: resolve, modal: { ondismiss: () => reject(new Error("Payment cancelled")) } });
        modal.on("payment.failed", (event) => reject(new Error(event.error?.description || "Payment failed"))); modal.open();
      });
      const confirmation = { ...payment, paymentMethodCode: code };
      sessionStorage.setItem("seller-wallet-payment", JSON.stringify(confirmation));
      await verify(confirmation);
    } catch (error) { setMessage(error.message); }
    finally { setBusy(false); }
  };
  if (!due && !message && !retry) return null;
  return <section className="notice" aria-live="polite"><h3>{paused ? "Your seller account is paused" : "Seller wallet payment"}</h3>{due > 0 && <><p>Outstanding balance: <strong>{money(due)}</strong>. {paused ? "Your products are hidden. Pay the outstanding amount to activate your account." : `Pay your wallet dues to keep selling. Sales pause when the balance falls below ${money(-Number(wallet.walletDebtLimit ?? 500))}.`}</p><label>Payment gateway <select value={code} onChange={(event) => setCode(event.target.value)} disabled={busy}>{methods.map((method) => <option key={method.code} value={method.code}>{method.name}</option>)}</select></label><button type="button" disabled={busy || !code || Boolean(retry)} onClick={pay}>{busy ? "Processing…" : `Pay ${money(due)}`}</button>{!methods.length && <p>No online payment gateway is available. Contact support.</p>}</>}{retry && <button disabled={busy} onClick={() => verify(retry)}>Verify payment again</button>}{message && <p>{message}</p>}</section>;
}
