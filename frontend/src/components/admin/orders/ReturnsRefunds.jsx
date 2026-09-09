import { useState, lazy } from "react";
import { Search } from "lucide-react";
import { money } from "../../../utils/currency.js";

const DataTable = lazy(() => import("../../DataTable.jsx"));

export default function ReturnsRefunds({ orders, loading, onAction }) {
  const [search, setSearch] = useState("");
  const [target, setTarget] = useState(null);
  const [form, setForm] = useState({ amount: "", reason: "", note: "" });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const rows = orders.flatMap((order) => (order.items || [])
    .filter((item) => item.returnRequest?.status)
    .map((item) => ({
      ...item,
      _id: `${order._id}-${item.product?._id || item.product}-${item.sku}`,
      order,
      productId: item.product?._id || item.product,
      customerName: order.customer?.name || order.address?.name || "Customer",
      refundTotal: (order.refunds || []).reduce((sum, refund) => sum + Number(refund.amount || 0), 0)
    })))
    .filter((row) => [row.order.orderNumber, row.name, row.sku, row.customerName, row.returnRequest?.reason, row.returnRequest?.status]
      .filter(Boolean).join(" ").toLowerCase().includes(search.toLowerCase()));
  const openRefund = (row) => {
    setTarget(row);
    setForm({ amount: String(Number(row.price || 0) * Number(row.quantity || 1)), reason: row.returnRequest?.reason || "Returned item refund", note: "Refund processed and return closed by admin" });
  };
  const submitRefund = async (event) => {
    event.preventDefault();
    setBusy(true);
    setError("");
    try {
      await onAction(target.order, "return-refund", { productId: target.productId, amount: Number(form.amount), reason: form.reason, note: form.note });
      setTarget(null);
    } catch (actionError) { setError(actionError.message); } finally { setBusy(false); }
  };
  const runStage = async (row, action, payload = {}) => {
    setBusy(true); setError("");
    try { await onAction(row.order, action, { productId: row.productId, ...payload }); }
    catch (actionError) { setError(actionError.message); }
    finally { setBusy(false); }
  };
  const returnAction = (row) => {
    const status = row.returnRequest?.status;
    if (status === "Requested") return <div className="tableActions"><button className="primaryButton" disabled={busy} type="button" onClick={() => runStage(row, "return-status", { status: "Approved", note: "Return accepted by admin" })}>Accept return</button><button className="secondaryButton" disabled={busy} type="button" onClick={() => runStage(row, "return-status", { status: "Rejected", note: "Return rejected by admin" })}>Reject</button></div>;
    if (status === "Approved") return <button className="primaryButton" disabled={busy} type="button" onClick={() => runStage(row, "return-shipment")}>Create ShipRocket return</button>;
    if (status === "Pickup Arranged") return <button className="primaryButton" disabled={busy} type="button" onClick={() => runStage(row, "return-status", { status: "Received", note: "Returned product received and inspected" })}>Mark product received</button>;
    if (status === "Received") return <button className="primaryButton" disabled={busy} type="button" onClick={() => openRefund(row)}>Issue refund</button>;
    if (status === "Closed") return <small>{row.returnRequest.reviewNote || "Refund issued"}</small>;
    return <small>{status}</small>;
  };
  return <section className="contentStack returnsRefundsPage">
    <div className="panel">
      <div className="panelHeader"><div><h2>Returns &amp; Refunds</h2><p className="mutedText">Review customer return requests and close them after processing the refund.</p></div><label className="searchBox"><Search size={16} /><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search order, product or customer" /></label></div>
      {error && <div className="notice errorText" role="alert">{error}</div>}
      <DataTable rows={rows} loading={loading} loadingMessage="Loading returns…" sortable paginated columns={[
        { key: "order", label: "Order", sortValue: (row) => row.order.orderNumber, render: (row) => <><strong>{row.order.orderNumber}</strong><br /><small>{new Date(row.returnRequest.requestedAt || row.order.createdAt).toLocaleDateString("en-IN")}</small></> },
        { key: "name", label: "Product", render: (row) => <><strong>{row.name}</strong><br /><small>{row.sku} · Qty {row.quantity}</small></> },
        { key: "customerName", label: "Customer" },
        { key: "reason", label: "Return reason", sortValue: (row) => row.returnRequest?.reason || "", render: (row) => <>{row.returnRequest?.reason || "—"}<br /><small>{row.returnRequest?.comments || ""}</small>{row.returnRequest?.evidence?.map(entry=><p key={entry.url}><a href={entry.url} target="_blank" rel="noreferrer">{entry.category}</a></p>)}</> },
        { key: "status", label: "Status", sortValue: (row) => row.returnRequest?.status || "", render: (row) => <><span className={`status ${row.returnRequest?.status === "Closed" ? "approved" : "pending"}`}>{({ Requested: "Requested", Approved: "Accepted", "Pickup Arranged": "Return in transit", Received: "Product received", Closed: "Refund issued", Rejected: "Rejected" })[row.returnRequest?.status] || row.returnRequest?.status}</span>{row.returnRequest?.returnShipment?.awbCode && <><br /><small>AWB: {row.returnRequest.returnShipment.awbCode}</small>{row.returnRequest.returnShipment.trackingUrl && <><br /><a href={row.returnRequest.returnShipment.trackingUrl} target="_blank" rel="noreferrer">Track return</a></>}</>}</> },
        { key: "refundTotal", label: "Refunded", render: (row) => money(row.refundTotal) },
        { key: "actions", label: "Next action", sortable: false, render: returnAction }
      ]} />
    </div>
    {target && <div className="modalOverlay" role="dialog" aria-modal="true"><form className="sellerStatusModal" onSubmit={submitRefund}><div className="panelHeader"><div><span className="eyebrow">{target.order.orderNumber}</span><h2>Process return refund</h2></div><button className="inlineButton" type="button" disabled={busy} onClick={() => setTarget(null)}>Close</button></div><label>Refund amount<input required type="number" min="0.01" step="0.01" value={form.amount} onChange={(event) => setForm({ ...form, amount: event.target.value })} /></label><label>Reason<input required value={form.reason} onChange={(event) => setForm({ ...form, reason: event.target.value })} /></label><label>Admin note<textarea required value={form.note} onChange={(event) => setForm({ ...form, note: event.target.value })} /></label><button className="primaryButton" disabled={busy}>{busy ? "Processing…" : "Process refund & close return"}</button></form></div>}
  </section>;
}
