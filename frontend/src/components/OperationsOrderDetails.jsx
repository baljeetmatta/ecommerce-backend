import { ArrowLeft, Check, Clipboard, Package, Truck } from "lucide-react";
import OrderSummaryPanel from "./OrderSummaryPanel.jsx";

const statusKey = (value = "") => String(value).toLowerCase().replace(/[^a-z]/g, "");
const stages = [["Placed", Clipboard], ["Confirmed", Check], ["Packed", Package], ["Shipped", Truck], ["Delivered", Check]];

export default function OperationsOrderDetails({ order, title, onClose, productUrl }) {
  const history = [...(order.timeline || [])].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  const current = statusKey(order.items?.[0]?.sellerStatus || order.status);
  const currentIndex = Math.max(0, stages.findIndex(([label]) => current.includes(statusKey(label))));

  return <div className="modalOverlay" role="dialog" aria-modal="true">
    <section className="operationsOrderDetail">
      <header className="operationsOrderHeader"><button type="button" onClick={onClose} aria-label="Close order details"><ArrowLeft /></button><div><h1>{title}</h1><p>Order ID: <strong>{order.orderNumber}</strong></p></div><span>Placed on: {new Date(order.createdAt).toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short" })}</span></header>
      <main>
        <div className="operationsOrderMain">
          <section className="operationsOrderProgress">{stages.map(([label, Icon], index) => <div className={index <= currentIndex ? "complete" : ""} key={label}><i><Icon /></i><strong>{label}</strong></div>)}</section>
          <section className="operationsTrackingDetails"><h2>Tracking Details</h2>{history.length ? history.map((entry, index) => <article key={entry._id || index}><i><Check /></i><div><strong>{entry.title || entry.status || "Order update"}</strong><small>{new Date(entry.createdAt).toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short" })}</small></div><p>{entry.comment || entry.details || "Order status updated."}</p></article>) : <p>No tracking updates have been recorded yet.</p>}</section>
        </div>
        <OrderSummaryPanel order={order} productUrl={productUrl} />
      </main>
    </section>
  </div>;
}
