import { CreditCard, MapPin, Package } from "lucide-react";

const money = (value) => new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR" }).format(Number(value) || 0);

export default function OrderSummaryPanel({ order, productUrl }) {
  const items = order?.items || [];
  const shipping = Number(order?.shipping?.amount || order?.shippingTotal || 0);
  const codCharge = order?.codChargePaidBy === "customer" ? Number(order?.codCharge || 0) : 0;
  const discount = Number(order?.discountTotal || order?.discount || 0);
  const subtotal = Number(order?.subtotal ?? items.reduce((sum, item) => sum + Number(item.price || 0) * Number(item.quantity || 0), 0));
  const address = order?.address || {};
  const addressText = [address.shippingAddress || address.billingAddress || address.line1, address.city, address.state, address.postalCode, address.country || "India"].filter(Boolean).join(", ");
  const mapUrl = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(addressText)}`;

  return <aside className="sharedOrderSummary">
    <section>
      <h2>Order Summary</h2>
      {items.map((item, index) => {
        const product = item.productDetails || item.product || {};
        const productId = product?._id || item.product;
        const image = product?.imageVariants?.storefront || product?.mainImage || product?.media?.find((entry) => entry.type === "image")?.url;
        const content = <><span className="sharedOrderImage">{image ? <img src={image} alt="" /> : <Package />}</span><span className="sharedOrderName"><strong>{item.name}</strong><small>{item.sku ? `${item.sku} · ` : ""}Qty: {item.quantity}</small></span><b>{money(Number(item.price) * Number(item.quantity))}</b></>;
        return productUrl && productId ? <a className="sharedOrderItem" href={productUrl(productId)} target="_blank" rel="noreferrer" key={`${item.sku}-${index}`}>{content}</a> : <article className="sharedOrderItem" key={`${item.sku}-${index}`}>{content}</article>;
      })}
      <dl className="sharedOrderTotals">
        <div><dt>Subtotal</dt><dd>{money(subtotal)}</dd></div>
        <div><dt>Shipping</dt><dd className={shipping === 0 ? "free" : ""}>{shipping === 0 ? "FREE" : money(shipping)}</dd></div>
        {codCharge > 0 && <div><dt>COD charges</dt><dd>{money(codCharge)}</dd></div>}
        {discount > 0 && <div><dt>Discount</dt><dd className="free">− {money(discount)}</dd></div>}
        <div className="total"><dt>Total</dt><dd>{money(order?.grandTotal)}</dd></div>
      </dl>
      <div className="sharedOrderPayment"><CreditCard /><strong>Payment Method</strong><span>{order?.payment?.methodName || order?.payment?.provider || order?.paymentMethod || order?.paymentStatus || "—"}</span></div>
    </section>
    <section>
      <header><h2><MapPin /> Delivery Address</h2>{addressText && <a href={mapUrl} target="_blank" rel="noreferrer">View on Map</a>}</header>
      <p><strong>{order?.customer?.name || address.name || "Customer"}</strong><br />{addressText || "Address unavailable"}{(order?.customer?.phone || address.phone) && <><br />Mobile: {order.customer?.phone || address.phone}</>}</p>
    </section>
  </aside>;
}
