import { useRef, useState } from "react";
import { ArrowLeft, Package } from "lucide-react";
import { orderPaymentMode } from "../utils/orderPayment.js";
import { openInvoice } from "../utils/invoiceDocument.js";
import OrderTrackingPage from "./OrderTrackingPage.jsx";
import "../styles/customer-order-details.css";

const money = value => new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR" }).format(Number(value) || 0);
const date = value => value && !Number.isNaN(new Date(value).getTime()) ? new Date(value).toLocaleDateString("en-IN", { day: "numeric", month: "long", year: "numeric" }) : "—";

export default function CustomerOrderDetails({ order, activities, loading, error, onBack, onReview, onCancel, notice }) {
  const [showTracking, setShowTracking] = useState(false);
  const trackingRef = useRef(null);
  const items = order.items || [];
  const isCancelled = String(order.status || "").toLowerCase() === "cancelled" || (items.length > 0 && items.every(item => String(item.sellerStatus || "").toLowerCase() === "cancelled"));
  const lockedStatuses = ["Ready to Dispatch", "Shipped", "Out for Delivery", "Delivered", "Return Requested", "Returned", "RTO", "Cancelled"];
  const canCancel = !lockedStatuses.includes(order.status) && !items.some(item => lockedStatuses.includes(item.sellerStatus));
  const subtotal = order.subtotal ?? items.reduce((sum, item) => sum + Number(item.price || 0) * Number(item.quantity || 0), 0);
  const shipping = order.shipping?.amount ?? order.shippingTotal ?? 0;
  const discount = order.discountTotal ?? order.discount ?? 0;
  const track = () => {
    setShowTracking(true);
    window.setTimeout(() => trackingRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }), 0);
  };

  return <section className="customerOrderDetails">
    <button className="customerOrdersBack" type="button" onClick={onBack}><ArrowLeft size={18} /> Your Orders</button>
    <h1>Order details</h1>
    {notice && <p className="accountNotice" role="status">{notice}</p>}
    {items.map((item, index) => {
      const product = item.productDetails || (typeof item.product === "object" ? item.product : {}) || {};
      const productId = product._id || (typeof item.product === "string" ? item.product : null);
      const productUrl = productId ? `#/product/${encodeURIComponent(productId)}` : null;
      const image = product.imageVariants?.storefront || product.mainImage;
      const status = item.sellerStatus || order.status || "Pending";
      const deliveredAt = new Date(item.deliveredAt || order.fulfillment?.deliveredAt || order.updatedAt);
      const returnDeadline = item.returnWindowClosesAt ? new Date(item.returnWindowClosesAt) : new Date(deliveredAt.getTime() + Number(item.returnDays || 0) * 86400000);
      const canReview = productId && ["Delivered", "Completed", "Return Rejected"].includes(status) && returnDeadline <= new Date() && !["Requested", "Approved", "Pickup Arranged", "Received", "Closed"].includes(item.returnRequest?.status);
      const arrival = order.shipping?.estimatedDelivery;
      const heading = ["Delivered", "Completed"].includes(status) ? `Delivered${item.deliveredAt ? ` ${date(item.deliveredAt)}` : ""}` : /cancel|return|rto/i.test(status) ? status : arrival ? `Arriving ${date(arrival)}` : status;
      const seller = item.seller?.companyName || item.seller?.businessName || order.invoiceStore?.shopName || "HRS Basket";
      return <article className="customerPackage" key={item._id || `${item.sku}-${index}`}>
        <header><h2>{heading}</h2><span className="customerPackageImage">{image ? <img src={image} alt="" /> : <Package />}</span></header>
        <details open><summary>See details</summary><div className="customerPackageBody">
          <div className="customerPurchasedProduct"><span className="customerPackageImage">{image ? <img src={image} alt={item.name} /> : <Package />}</span><div>{productUrl ? <a href={productUrl}><strong>{item.name}</strong></a> : <strong>{item.name}</strong>}<p>Sold by: {item.seller?._id ? <a href={`#/sellers/${encodeURIComponent(item.seller._id)}`}>{seller}</a> : seller}</p><p>{money(item.price)} <small>· Qty {item.quantity}</small></p></div></div>
          <div className="customerPackageActions">{!isCancelled && <button className="trackPackage" type="button" onClick={track}>Track package</button>}<button type="button" disabled={!canCancel} title={canCancel ? "Cancel the full order" : "For cancellation, contact customer support."} onClick={() => onCancel?.(order)}>Cancel order</button><button type="button" disabled={!canReview} title={canReview ? "Review your purchase" : "Reviews become available after delivery and the return window closes."} onClick={() => onReview({ order, item })}>Write a product review</button>{productUrl ? <a href={productUrl}>Buy It Again</a> : <button type="button" disabled>Buy It Again</button>}</div>
          {!canCancel && <small className="customerCancellationNote">For cancellation, contact customer support.</small>}
          {item.returnRequest?.status && <p>Return: {item.returnRequest.status}</p>}
        </div></details>
      </article>;
    })}
    <section className="customerOrderSummary"><h2>Order summary</h2><p>Order placed {date(order.createdAt)}</p><p>Order number {order.orderNumber}</p><dl>
      <div><dt>Item(s) Subtotal:</dt><dd>{money(subtotal)}</dd></div>{!isCancelled && <div><dt>Shipping:</dt><dd>{money(shipping)}</dd></div>}
      {Number(order.marketplaceFee) > 0 && <div><dt>Marketplace Fee:</dt><dd>{money(order.marketplaceFee)}</dd></div>}
      {Number(order.taxTotal) > 0 && <div><dt>Tax:</dt><dd>{money(order.taxTotal)}</dd></div>}
      {order.codChargePaidBy === "customer" && Number(order.codCharge) > 0 && <div><dt>COD charges:</dt><dd>{money(order.codCharge)}</dd></div>}
      {Number(discount) > 0 && <div><dt>Discount:</dt><dd>−{money(discount)}</dd></div>}
      <div><dt>Total:</dt><dd>{money(order.grandTotal)}</dd></div><div className="grandTotal"><dt>Grand Total:</dt><dd>{money(order.grandTotal)}</dd></div>
    </dl>{order.invoiceNumber ? <div className="customerInvoiceActions"><button className="customerInvoiceLink" type="button" onClick={() => openInvoice(order)}>View Invoice</button><button className="customerInvoiceLink" type="button" onClick={() => openInvoice(order, true)}>Print / Save PDF</button></div> : <small>Invoice will be available once issued.</small>}
    <h2>Payment method</h2><p>{order.payment?.methodName || orderPaymentMode(order)}</p><h2>Delivery address</h2><p>{order.address?.name || order.customer?.name}</p><p>{[order.address?.shippingAddress || order.address?.billingAddress, order.address?.city, order.address?.state, order.address?.postalCode].filter(Boolean).join(", ")}</p></section>
    {showTracking && <div ref={trackingRef} className="customerExpandedTracking"><OrderTrackingPage order={order} activities={activities} loading={loading} error={error} onBack={() => setShowTracking(false)} /></div>}
  </section>;
}
