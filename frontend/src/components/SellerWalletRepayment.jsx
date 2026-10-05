import { useEffect, useId, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Plus, X } from "lucide-react";
import { api } from "../services/api.js";
import { openPayuModal, readPayuReturn, clearPayuReturn } from "../utils/payuCheckout.js";
const money = (value) => new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR" }).format(value);
export default function SellerWalletRepayment({ wallet, onPaid, showAddFunds = false, role = "seller", hideTrigger = false }) {
  const [open, setOpen] = useState(false);
  const dialogRef = useRef(null);
  const openerRef = useRef(null);
  const titleId = useId();
  const reseller = role === "reseller";
  const kind = `${role}-wallet`;
  const storageKey = `${kind}-payment`;
  const methodsRequest = reseller ? api.resellerWalletPaymentMethods : api.sellerWalletPaymentMethods;
  const createPayment = reseller ? api.createResellerWalletPayment : api.createSellerWalletPayment;
  const verifyPayment = reseller ? api.verifyResellerWalletPayment : api.verifySellerWalletPayment;
  const due = Math.max(0, -Number(wallet.walletBalance ?? wallet.balance ?? 0));
  const [amount, setAmount] = useState(String(Math.max(100, Math.ceil(due / 100) * 100)));
  const fundingAmount = Number(amount);
  const validAmount = Number.isSafeInteger(fundingAmount) && fundingAmount >= 100 && fundingAmount <= 1000000 && fundingAmount % 100 === 0;
  const [methods, setMethods] = useState([]);
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);
  const busyRef = useRef(false);
  busyRef.current = busy;
  const [message, setMessage] = useState("");
  const [retry, setRetry] = useState(null);
  const paused = due > Number(wallet.walletDebtLimit ?? 500);
  const verify = async (payment) => {
    setOpen(true); setBusy(true); setRetry(payment);
    try { await verifyPayment(payment); clearPayuReturn(); sessionStorage.removeItem(storageKey); setRetry(null); setMessage("Payment received. Your wallet has been updated."); await onPaid(); }
    catch (error) { setMessage(error.message); }
    finally { setBusy(false); }
  };
  useEffect(() => {
    methodsRequest().then((items) => { setMethods(items); setCode(items[0]?.code || ""); }).catch((error) => setMessage(error.message));
    const returned = readPayuReturn();
    let pending = null;
    try { pending = JSON.parse(sessionStorage.getItem(storageKey) || "null"); } catch { /* Ignore invalid local state. */ }
    if (returned?.kind === kind) verify({ payuTxnId: returned.txnid });
    else if (pending) verify(pending);
  }, []);
  const pay = async () => {
    if (busy || retry) return;
    if (!validAmount) { setMessage("Add at least ₹100, in multiples of ₹100."); return; }
    setBusy(true); setMessage("");
    try {
      const checkout = await createPayment({ paymentMethodCode: code, amount: fundingAmount, returnUrl: window.location.href });
      if (checkout.gateway === "payu") { await openPayuModal(checkout, { kind }); return; }
      if (!window.Razorpay) await new Promise((resolve, reject) => { const script = document.createElement("script"); script.src = "https://checkout.razorpay.com/v1/checkout.js"; script.onload = resolve; script.onerror = () => reject(new Error("Unable to load payment gateway")); document.head.appendChild(script); });
      const payment = await new Promise((resolve, reject) => {
        const modal = new window.Razorpay({ key: checkout.keyId, amount: checkout.amount, currency: checkout.currency, name: checkout.merchantName, description: `${role} wallet funding`, order_id: checkout.orderId, handler: resolve, modal: { ondismiss: () => reject(new Error("Payment cancelled")) } });
        modal.on("payment.failed", (event) => reject(new Error(event.error?.description || "Payment failed"))); modal.open();
      });
      const confirmation = { ...payment, paymentMethodCode: code };
      sessionStorage.setItem(storageKey, JSON.stringify(confirmation));
      await verify(confirmation);
    } catch (error) { setMessage(error.message); }
    finally { setBusy(false); }
  };
  const openDialog = () => {
    openerRef.current = document.activeElement;
    setOpen(true);
  };
  useEffect(() => {
    if (role !== "seller") return undefined;
    window.addEventListener("seller-wallet-add-funds", openDialog);
    return () => window.removeEventListener("seller-wallet-add-funds", openDialog);
  }, [role]);
  useEffect(() => {
    if (!open) return undefined;
    const previousFocus = openerRef.current || document.activeElement;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    dialogRef.current?.querySelector("input")?.focus();
    const handleKey = (event) => {
      if (busyRef.current) return;
      if (event.key === "Escape") { event.preventDefault(); setOpen(false); }
      if (event.key !== "Tab") return;
      const controls = [...(dialogRef.current?.querySelectorAll('button:not(:disabled), input:not(:disabled), select:not(:disabled)') || [])];
      const first = controls[0], last = controls[controls.length - 1];
      if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last?.focus(); }
      else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first?.focus(); }
    };
    document.addEventListener("keydown", handleKey);
    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener("keydown", handleKey);
      if (previousFocus?.isConnected) previousFocus.focus();
    };
  }, [open]);
  return <>
    {!hideTrigger && (showAddFunds || due > 0 || retry) && <button className="sellerWithdrawButton walletAddFundsButton" type="button" onClick={openDialog}><Plus size={18} />Add Funds</button>}
    {open && createPortal(<div className="modalOverlay walletFundingOverlay" onMouseDown={event => { if (event.target === event.currentTarget && !busy) setOpen(false); }}>
      <section className="walletFundingDialog" ref={dialogRef} role="dialog" aria-modal="true" aria-labelledby={titleId}>
        <header><h2 id={titleId}>Add funds to {role} wallet</h2><button className="walletFundingClose" type="button" aria-label="Close add funds" disabled={busy} onClick={() => setOpen(false)}><X size={20} /></button></header>
        <p>{reseller ? "Add funds securely to your reseller wallet." : <>Outstanding balance: <strong>{money(due)}</strong>. Added funds first clear your negative balance; any remainder stays in your wallet.{paused && " Your products are hidden until your balance is within the selling limit."}</>}</p>
        <form onSubmit={event => { event.preventDefault(); pay(); }}>
          <label>Amount (₹)<input type="number" min="100" max="1000000" step="100" value={amount} onChange={event => setAmount(event.target.value)} disabled={busy || Boolean(retry)} aria-describedby={`${titleId}-amount-help`} /></label>
          <small id={`${titleId}-amount-help`}>Minimum ₹100, in multiples of ₹100.</small>
          <label>Payment gateway<select value={code} onChange={event => setCode(event.target.value)} disabled={busy || Boolean(retry)}>{methods.map(method => <option key={method.code} value={method.code}>{method.name}</option>)}</select></label>
          {!methods.length && <p>No online payment gateway is available. Contact support.</p>}
          <button className="sellerWithdrawButton" type="submit" disabled={busy || !code || Boolean(retry) || !validAmount}>{busy ? "Processing…" : `Add ${money(fundingAmount)}`}</button>
        </form>
        {retry && <button className="secondaryButton" type="button" disabled={busy} onClick={() => verify(retry)}>Verify payment again</button>}
        {message && <p role="status">{message}</p>}
      </section>
    </div>, document.body)}
  </>;
}
