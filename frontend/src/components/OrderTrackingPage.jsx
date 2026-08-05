import { useEffect } from "react";
import { ArrowLeft, Check, Clipboard, CreditCard, Headphones, MapPin, Package, RefreshCcw, ShieldCheck, Truck } from "lucide-react";

const money = (value) => new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR" }).format(Number(value) || 0);
const dateTime = (value) => value ? new Date(value).toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short" }) : "—";
const key = (value = "") => String(value).toLowerCase().replace(/[^a-z]/g, "");
const stages = [["Placed", ["placed", "pending"], Clipboard], ["Confirmed", ["confirmed", "processing", "accepted"], Check], ["Packed", ["packed", "readytodispatch"], Package], ["Shipped", ["shipped", "outfordelivery"], Truck], ["Delivered", ["delivered", "completed"], Check]];
const activityStatus = (entry = {}) => entry.status || entry.title || entry.activity || entry["sr-status-label"] || "Order update";
const activityDate = (entry = {}) => entry.createdAt || entry.date || entry.updatedAt;

export default function OrderTrackingPage({ order, activities, loading = false, error = "", onBack }) {
  useEffect(() => {
    const cards = [...document.querySelectorAll(".trackingOrderItem")];
    const cleanups = cards.map((card, index) => {
      const item = order?.items?.[index];
      const id = item?.product?._id || item?.product || item?.productDetails?._id;
      const open = () => id && window.open(`${window.location.origin}${window.location.pathname}#/product/${id}`, "_blank", "noopener,noreferrer");
      card.addEventListener("click", open);
      return () => card.removeEventListener("click", open);
    });
    return () => cleanups.forEach((cleanup) => cleanup());
  }, [order]);
  if (!order) return null;

  const history = [...(activities || order.timeline || [])].sort((a, b) => new Date(activityDate(b) || 0) - new Date(activityDate(a) || 0));
  const statuses = order.items?.map((item) => item.sellerStatus || order.status) || [];
  const furthest = Math.max(0, ...statuses.map((status) => stages.findIndex(([, keys]) => keys.includes(key(status)))));
  const stageDates = stages.map(([, keys]) => history.find((entry) => keys.some((value) => key(activityStatus(entry)).includes(value))));
  const shipping = Number(order.shipping?.amount || order.shippingTotal || 0);
  const subtotal = Number(order.subtotal ?? (Number(order.grandTotal || 0) - shipping));
  const discount = Number(order.discountTotal || order.discount || 0);
  const address = order.address || {};
  const addressText = [address.shippingAddress || address.billingAddress || address.line1, address.city, address.state, address.postalCode, address.country || "India"].filter(Boolean).join(", ");
  const mapUrl = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(addressText)}`;
  const returnItems = (order.items || []).filter((item) => item.returnApplicable || item.returnRequest?.status);
  const canReturn = (item) => {
    const deliveredAt = new Date(item.deliveredAt || order.fulfillment?.deliveredAt || order.updatedAt);
    const deadline = new Date(deliveredAt.getTime() + Number(item.returnDays || 0) * 86400000);
    return item.returnApplicable && item.returnDays > 0 && ["Delivered", "Return Rejected"].includes(item.sellerStatus || order.status) && deadline >= new Date() && !["Requested", "Approved", "Pickup Arranged", "Received", "Closed"].includes(item.returnRequest?.status);
  };

  return <section className="orderTrackingPage">
    <div className="orderTrackingMain">
      <header className="trackingPageHeader"><button type="button" onClick={onBack}><ArrowLeft /></button><div><h1>Order Tracking</h1><p>Order ID: <strong>{order.orderNumber}</strong></p></div><span>Placed on: {dateTime(order.createdAt)}</span></header>
      <section className="trackingProgressCard">
        <div className="estimatedDelivery"><span>Estimated Delivery</span><strong>{statuses.every((status) => ["Delivered", "Completed"].includes(status)) ? "Delivered" : "On the way"}</strong><small>Track updates below</small></div>
        <div className="trackingStages">{stages.map(([label,, Icon], index) => <div className={index <= furthest ? "complete" : ""} key={label}><i><Icon /></i><strong>{label}</strong><small>{stageDates[index] ? dateTime(activityDate(stageDates[index])) : "—"}</small></div>)}</div>
        {(order.shipping?.courierName || order.shipping?.awbCode) && <div className="trackingCourier"><Truck /><span><small>Courier</small><strong>{order.shipping?.courierName || order.fulfillment?.carrier || "Courier partner"}</strong></span><span><small>Tracking ID</small><strong>{order.shipping?.awbCode || order.fulfillment?.trackingNumber}</strong></span>{order.shipping?.trackingUrl && <a href={order.shipping.trackingUrl} target="_blank" rel="noreferrer">Track on courier website</a>}</div>}
        {loading && <p className="trackingLoading">Fetching latest tracking status…</p>}{error && <p className="errorText">{error}</p>}
      </section>
      <section className="trackingDetailsCard"><h2>Tracking Details</h2><div className="trackingItemStatuses">{(order.items || []).map((item, index) => <article key={`${item.sku}-${index}`}><Package /><span><strong>{item.name}</strong><small>{item.sku} · Qty {item.quantity}</small></span><b className={`itemOrderStatus ${key(item.sellerStatus || order.status)}`}>{item.sellerStatus || order.status}</b></article>)}</div><div className="trackingTimeline">{stages.map(([label,, Icon], index) => <article key={label}><i><Icon /></i><div><strong>{label}</strong><small>{stageDates[index] ? dateTime(activityDate(stageDates[index])) : index <= furthest ? "Completed" : "Pending"}</small></div><p>{stageDates[index]?.comment || stageDates[index]?.details || (index <= furthest ? `${label} stage completed.` : `${label} stage is pending.`)}</p></article>)}</div></section>
    </div>
    <aside className="orderTrackingAside">
      <section><h2>Order Summary</h2>{(order.items || []).map((item, index) => { const product = item.productDetails || item.product || {}; const image = product.imageVariants?.storefront || product.mainImage; return <article className="trackingOrderItem" key={`${item.sku}-${index}`}>{image ? <img src={image} alt="" /> : <span className="trackingImageFallback"><Package /></span>}<div><strong>{item.name}</strong><small>Qty: {item.quantity}</small></div><b>{money(item.price * item.quantity)}</b></article>; })}<dl className="trackingTotals"><div><dt>Subtotal</dt><dd>{money(subtotal)}</dd></div><div><dt>Shipping</dt><dd className={shipping === 0 ? "free" : ""}>{shipping === 0 ? "FREE" : money(shipping)}</dd></div>{discount > 0 && <div><dt>Discount</dt><dd className="free">− {money(discount)}</dd></div>}<div className="total"><dt>Total</dt><dd>{money(order.grandTotal)}</dd></div></dl><p className="trackingPayment"><CreditCard /><strong>Payment Method</strong><span>{order.payment?.methodName || order.paymentStatus || "—"}</span></p></section>
      <section><header><h2><MapPin /> Delivery Address</h2><a href={mapUrl} target="_blank" rel="noreferrer">View on Map</a></header><p><strong>{order.customer?.name || address.name || "Customer"}</strong><br />{addressText}<br />{(order.customer?.phone || address.phone) && <>Mobile: {order.customer?.phone || address.phone}</>}</p></section>
      <section className="trackingReturn"><header><h2><RefreshCcw /> Return / Refund</h2></header>{returnItems.length ? returnItems.map((item, index) => <div className="trackingReturnItem" key={`${item.sku}-${index}`}><p><strong>{item.name}</strong><br />{item.returnRequest?.status ? `Status: ${item.returnRequest.status}` : `Return within ${item.returnDays} days of delivery`}{item.returnRequest?.reason && <><br />Reason: {item.returnRequest.reason}</>}</p>{canReturn(item) && <button type="button" title={`Return ${item.name}`} onClick={() => window.dispatchEvent(new CustomEvent("customer-order-return", { detail: { order, item } }))}><RefreshCcw /></button>}</div>) : <p>No items in this order are returnable.</p>}</section>
    </aside>
    <footer className="trackingBenefits">{[[ShieldCheck,"Secure Payment","Your payment is safe and secure with us."],[Headphones,"24/7 Support","We are here to help you anytime."],[Package,"Easy Returns","Hassle-free returns within the return window."],[ShieldCheck,"100% Authentic","Original, quality-checked products."]].map(([Icon,title,text]) => <div key={title}><Icon /><span><strong>{title}</strong><small>{text}</small></span></div>)}</footer>
  </section>;
}
