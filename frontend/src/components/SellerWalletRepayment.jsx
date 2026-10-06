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
  const [amount, setAmount] = useState("");
  const [rules, setRules] = useState(null);
  const fundingAmount = Number(amount);
  const validAmount = rules && Number.isSafeInteger(fundingAmount) && fundingAmount >= rules.minimum && fundingAmount <= rules.maximum && (fundingAmount - rules.minimum) % rules.increment === 0;
  const allowedExamples = rules ? Array.from({ length: 3 }, (_, index) => rules.minimum + index * rules.increment).filter((value) => value <= rules.maximum).map(money).join(", ") : "";
  const amountHelp = rules ? `The minimum amount you can add is ${money(rules.minimum)}. Above this minimum, add funds in multiples of ${money(rules.increment)}. Allowed amounts: ${allowedExamples}${rules.minimum + 3 * rules.increment <= rules.maximum ? ", and so on" : ""}. Maximum: ${money(rules.maximum)}.` : "Loading the minimum amount and allowed multiples…";
  const [methods, setMethods] = useState([]);
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);
  const busyRef = useRef(false);
  busyRef.current = busy;
  const [message, setMessage] = useState("");
  const [messageError, setMessageError] = useState(false);
  const [confirmed, setConfirmed] = useState(false);
  const verifyingRef = useRef(false);
  const [retry, setRetry] = useState(null);
  const paused = due > Number(wallet.walletDebtLimit ?? 500);
  const verify = async (payment) => {
    if (verifyingRef.current) return;
    verifyingRef.current = true;
    setOpen(true); setBusy(true); setRetry(payment); setConfirmed(false); setMessageError(false); setMessage("Confirming payment and updating your wallet…");
    try {
      await verifyPayment(payment);
      await onPaid();
      clearPayuReturn(); sessionStorage.removeItem(storageKey); setRetry(null);
      setConfirmed(true); setMessageError(false); setMessage("Payment successful. Your wallet has been updated."); setOpen(false);
    }
    catch (error) { setOpen(true); setMessageError(true); setMessage(error.message); }
    finally { verifyingRef.current = false; setBusy(false); }
  };
  useEffect(() => {

    const returned = readPayuReturn();
    let pending = null;
    try { pending = JSON.parse(sessionStorage.getItem(storageKey) || "null"); } catch { /* Ignore invalid local state. */ }
    if (returned?.kind === kind) verify({ payuTxnId: returned.txnid });
    else if (pending?.payuTxnId && returned?.txnid === pending.payuTxnId) verify(pending);
    else if (pending?.payuTxnId) setRetry(pending);
    else if (pending) verify(pending);
  }, []);
  useEffect(() => {
    let active = true;
    setRules(null);
    methodsRequest().then(({ methods: items, fundingRules }) => {
      if (!active) return;
      setMethods(items); setRules(fundingRules);
      setAmount(String(fundingRules.minimum + Math.min(Math.floor((fundingRules.maximum - fundingRules.minimum) / fundingRules.increment), Math.max(0, Math.ceil((due - fundingRules.minimum) / fundingRules.increment))) * fundingRules.increment));
      setCode((current) => items.some((item) => item.code === current) ? current : items[0]?.code || "");
    }).catch((error) => { if (active) { setMessageError(true); setMessage(error.message); } });
    return () => { active = false; };
  }, [open, methodsRequest]);
  const pay = async () => {
    if (busy || retry) return;
    if (!validAmount) { setMessageError(true); setMessage(amountHelp); return; }
    setBusy(true); setConfirmed(false); setMessageError(false); setMessage("");
    try {
      const returnUrl = new URL(window.location.href);
      returnUrl.searchParams.set("payu_kind", kind);
      const checkout = await createPayment({ paymentMethodCode: code, amount: fundingAmount, returnUrl: returnUrl.toString() });
      if (checkout.gateway === "payu") {
        sessionStorage.setItem(storageKey, JSON.stringify({ payuTxnId: checkout.fields.txnid }));
        setOpen(false);
        await openPayuModal(checkout, { kind }); return;
      }
      if (!window.Razorpay) await new Promise((resolve, reject) => { const script = document.createElement("script"); script.src = "https://checkout.razorpay.com/v1/checkout.js"; script.onload = resolve; script.onerror = () => reject(new Error("Unable to load payment gateway")); document.head.appendChild(script); });
      setOpen(false);
      const payment = await new Promise((resolve, reject) => {
        const modal = new window.Razorpay({ key: checkout.keyId, amount: checkout.amount, currency: checkout.currency, name: checkout.merchantName, description: `${role} wallet funding`, order_id: checkout.orderId, handler: resolve, modal: { ondismiss: () => reject(new Error("Payment cancelled")) } });
        modal.on("payment.failed", (event) => reject(new Error(event.error?.description || "Payment failed"))); modal.open();
      });
      const confirmation = { ...payment, paymentMethodCode: code };
      sessionStorage.setItem(storageKey, JSON.stringify(confirmation));
      await verify(confirmation);
    } catch (error) { setOpen(true); setMessageError(true); setMessage(error.message); }
    finally { setBusy(false); }
  };
  const openDialog = () => {
    if (busyRef.current) return;
    openerRef.current = document.activeElement;
    setConfirmed(false); setMessageError(false); setMessage("");
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
    {confirmed && !open && <p className="walletFundingSuccess" role="status">{message}</p>}
    {!hideTrigger && (showAddFunds || due > 0 || retry) && <button className="sellerWithdrawButton walletAddFundsButton" type="button" onClick={openDialog}><Plus size={18} />Add Funds</button>}
    {open && createPortal(<div className="modalOverlay walletFundingOverlay" onMouseDown={event => { if (event.target === event.currentTarget && !busy) setOpen(false); }}>
      <section className="walletFundingDialog" ref={dialogRef} role="dialog" aria-modal="true" aria-labelledby={titleId}>
        <header><h2 id={titleId}>Add funds to {role} wallet</h2><button className="walletFundingClose" type="button" aria-label="Close add funds" disabled={busy} onClick={() => setOpen(false)}><X size={20} /></button></header>
        <p>{reseller ? "Add funds securely to your reseller wallet." : <>Outstanding balance: <strong>{money(due)}</strong>. Added funds first clear your negative balance; any remainder stays in your wallet.{paused && " Your products are hidden until your balance is within the selling limit."}</>}</p>
        <form onSubmit={event => { event.preventDefault(); pay(); }}>
          <label>Amount (₹)<input type="number" min={rules?.minimum} max={rules?.maximum} step={rules?.increment} value={amount} onChange={event => setAmount(event.target.value)} disabled={busy || Boolean(retry) || !rules} aria-invalid={Boolean(rules && amount && !validAmount)} aria-describedby={`${titleId}-amount-help`} /></label>
          <div className="walletFundingRules" id={`${titleId}-amount-help`} role="status">{rules && <strong>Minimum amount &amp; allowed multiples</strong>}<p>{amountHelp}</p></div>
          {rules && amount && !validAmount && <p className="walletFundingError" role="alert">Enter at least {money(rules.minimum)}, then increase by {money(rules.increment)} each time. Choose {allowedExamples}{rules.minimum + 3 * rules.increment <= rules.maximum ? ", or another allowed amount" : ""}.</p>}
          <label>Payment gateway<select value={code} onChange={event => setCode(event.target.value)} disabled={busy || Boolean(retry)}>{methods.map(method => <option key={method.code} value={method.code}>{method.name}</option>)}</select></label>
          {!methods.length && <p>No online payment gateway is available. Contact support.</p>}
          <button className="sellerWithdrawButton" type="submit" disabled={busy || !code || Boolean(retry) || !validAmount}>{busy ? "Processing…" : `Add ${money(fundingAmount)}`}</button>
        </form>
        {retry && <button className="secondaryButton" type="button" disabled={busy} onClick={() => verify(retry)}>Verify payment again</button>}
        {message && <p className={messageError ? "walletFundingError" : undefined} role={messageError ? "alert" : "status"}>{message}</p>}
      </section>
    </div>, document.body)}
  </>;
}
