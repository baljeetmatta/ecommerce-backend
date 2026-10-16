import ReturnEvidence from "../../ReturnEvidence.jsx";
import { useState, lazy } from "react";
import { Search } from "lucide-react";
import { money } from "../../../utils/currency.js";
import { api } from "../../../services/api.js";
import OrderDetailsModal from "./OrderDetailsModal.jsx";

const DataTable = lazy(() => import("../../DataTable.jsx"));

export default function ReturnsRefunds({ orders, loading, onAction }) {
  const [search, setSearch] = useState("");
  const [target, setTarget] = useState(null);
  const [form, setForm] = useState({ amount: "", reason: "", note: "" });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [detailOrder, setDetailOrder] = useState(null);
  const [customerDetails, setCustomerDetails] = useState(null);
  const [customerLoading, setCustomerLoading] = useState(false);
  const [productDetails, setProductDetails] = useState(null);
  const [productLoading, setProductLoading] = useState(false);
  const rows = orders.flatMap((order) => (order.items || [])
    .filter((item) => item.returnRequest?.status)
    .map((item) => ({
      ...item,
      _id: `${order._id}-${item.product?._id || item.product}-${item.sku}`,
      order,
      productId: item.product?._id || item.product,
      customerName: order.customer?.name || order.address?.name || "Customer",
      customerPhone: order.customer?.phone || order.address?.phone || "—",
      refundTotal: (order.refunds || []).reduce((sum, refund) => sum + Number(refund.amount || 0), 0)
    })))
    .filter((row) => [row.order.orderNumber, row.name, row.sku, row.customerName, row.customerPhone, row.returnRequest?.reason, row.returnRequest?.status]
      .filter(Boolean).join(" ").toLowerCase().includes(search.toLowerCase()));
  const openCustomer = async (row) => {
    setCustomerDetails({ customer: { _id: row.order.customer?._id, name: row.customerName, phone: row.customerPhone, email: row.order.customer?.email || row.order.address?.email, addresses: row.order.customer?.addresses || [] }, order: row.order });
    if (!row.order.customer?._id) return;
    setCustomerLoading(true);
    try { setCustomerDetails({ ...(await api.customer(row.order.customer._id)), order: row.order }); }
    catch (requestError) { setError(requestError.message || "Unable to load customer details."); }
    finally { setCustomerLoading(false); }
  };
  const openProduct = async (row) => {
    setProductDetails({ row, product: row.product && typeof row.product === "object" ? row.product : null, error: "" });
    if (!row.productId) return;
    setProductLoading(true);
    try { setProductDetails({ row, product: await api.product(row.productId), error: "" }); }
    catch (requestError) { setProductDetails(current => current ? { ...current, error: requestError.message || "Unable to load full product details." } : current); }
    finally { setProductLoading(false); }
  };
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
        { key: "order", label: "Order", sortValue: (row) => row.order.orderNumber, render: (row) => <><button className="inlineButton" type="button" onClick={() => setDetailOrder(row.order)}>{row.order.orderNumber}</button><br /><small>{new Date(row.returnRequest.requestedAt || row.order.createdAt).toLocaleDateString("en-IN")}</small></> },
        { key: "name", label: "Product", render: (row) => <><button className="inlineButton" type="button" onClick={() => openProduct(row)}>{row.name}</button><br /><small>{row.sku} · Qty {row.quantity}</small></> },
        { key: "customerName", label: "Customer", sortValue: (row) => row.customerName, render: (row) => <><button className="inlineButton" type="button" onClick={() => openCustomer(row)}>{row.customerName}</button><br /><small>{row.customerPhone}</small></> },
        { key: "reason", label: "Return reason", sortValue: (row) => row.returnRequest?.reason || "", render: (row) => <>{row.returnRequest?.reason || "—"}<br /><small>{row.returnRequest?.comments || ""}</small><ReturnEvidence evidence={row.returnRequest?.evidence} /></> },
        { key: "status", label: "Status", sortValue: (row) => row.returnRequest?.status || "", render: (row) => <><span className={`status ${row.returnRequest?.status === "Closed" ? "approved" : "pending"}`}>{({ Requested: "Requested", Approved: "Accepted", "Pickup Arranged": "Return in transit", Received: "Product received", Closed: "Refund issued", Rejected: "Rejected" })[row.returnRequest?.status] || row.returnRequest?.status}</span>{row.returnRequest?.returnShipment?.awbCode && <><br /><small>AWB: {row.returnRequest.returnShipment.awbCode}</small>{row.returnRequest.returnShipment.trackingUrl && <><br /><a href={row.returnRequest.returnShipment.trackingUrl} target="_blank" rel="noreferrer">Track return</a></>}</>}</> },
        { key: "refundTotal", label: "Refunded", render: (row) => money(row.refundTotal) },
        { key: "actions", label: "Next action", sortable: false, render: returnAction }
      ]} />
    </div>
    {detailOrder && <OrderDetailsModal order={detailOrder} onClose={() => setDetailOrder(null)} />}
    {customerDetails && <div className="modalOverlay" role="dialog" aria-modal="true" aria-labelledby="return-customer-title"><section className="orderDetailModal customerDetailDialog"><div className="panelHeader"><div><span className="eyebrow">Customer details</span><h2 id="return-customer-title">{customerDetails.customer?.name || "Customer"}</h2></div><button className="inlineButton" type="button" onClick={() => setCustomerDetails(null)}>Close</button></div>{customerLoading ? <p className="mutedText">Loading customer details…</p> : <div className="resellerAdminDetailsGrid"><div><small>Name</small><strong>{customerDetails.customer?.name || "—"}</strong></div><div><small>Phone</small><strong>{customerDetails.customer?.phone || customerDetails.order?.address?.phone || "—"}</strong></div><div><small>Email</small><strong>{customerDetails.customer?.email || customerDetails.order?.address?.email || "—"}</strong></div><div><small>Customer ID</small><strong>{customerDetails.customer?._id || "Guest checkout"}</strong></div>{(customerDetails.customer?.addresses || []).map((address, index) => <div key={address._id || index}><small>{address.label || `Saved address ${index + 1}`}</small><strong>{[address.line1, address.city, address.state, address.postalCode, address.country].filter(Boolean).join(", ") || "—"}</strong></div>)}{customerDetails.order?.address && <div><small>Order address</small><strong>{[customerDetails.order.address.shippingAddress || customerDetails.order.address.billingAddress, customerDetails.order.address.city, customerDetails.order.address.state, customerDetails.order.address.postalCode].filter(Boolean).join(", ") || "—"}</strong></div>}</div>}</section></div>}
    {productDetails && <div className="modalOverlay" role="dialog" aria-modal="true" aria-labelledby="return-product-title"><section className="orderDetailModal"><div className="panelHeader"><div><span className="eyebrow">Ordered product</span><h2 id="return-product-title">{productDetails.row.name}</h2></div><button className="inlineButton" type="button" onClick={() => setProductDetails(null)}>Close</button></div>{productLoading ? <p className="mutedText">Loading product details…</p> : <div className="orderDetailSummary">{productDetails.error && <p className="notice">{productDetails.error}</p>}{(productDetails.product?.imageVariants?.storefront || productDetails.product?.mainImage) && <img style={{ display: "block", width: 160, maxHeight: 180, objectFit: "contain", marginBottom: 16 }} src={productDetails.product.imageVariants?.storefront || productDetails.product.mainImage} alt={productDetails.row.name} />}<dl><div><dt>Product</dt><dd>{productDetails.product?.name || productDetails.row.name}</dd></div><div><dt>SKU</dt><dd>{productDetails.row.sku || "—"}</dd></div><div><dt>Quantity ordered</dt><dd>{productDetails.row.quantity}</dd></div><div><dt>Unit price</dt><dd>{money(productDetails.row.price)}</dd></div><div><dt>Category</dt><dd>{productDetails.product?.category?.name || "—"}</dd></div><div><dt>Brand</dt><dd>{productDetails.product?.manufacturerBrand || "—"}</dd></div><div><dt>Description</dt><dd>{productDetails.product?.detailedDescription || productDetails.product?.shortDescription || productDetails.product?.description || "—"}</dd></div><div><dt>Product ID</dt><dd>{productDetails.row.productId || "—"}</dd></div></dl></div>}</section></div>}
    {target && <div className="modalOverlay" role="dialog" aria-modal="true"><form className="sellerStatusModal" onSubmit={submitRefund}><div className="panelHeader"><div><span className="eyebrow">{target.order.orderNumber}</span><h2>Process return refund</h2></div><button className="inlineButton" type="button" disabled={busy} onClick={() => setTarget(null)}>Close</button></div><label>Refund amount<input required type="number" min="0.01" step="0.01" value={form.amount} onChange={(event) => setForm({ ...form, amount: event.target.value })} /></label><label>Reason<input required value={form.reason} onChange={(event) => setForm({ ...form, reason: event.target.value })} /></label><label>Admin note<textarea required value={form.note} onChange={(event) => setForm({ ...form, note: event.target.value })} /></label><button className="primaryButton" disabled={busy}>{busy ? "Processing…" : "Process refund & close return"}</button></form></div>}
  </section>;
}
