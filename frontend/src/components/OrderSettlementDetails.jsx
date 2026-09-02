import { CalendarDays, CircleDollarSign, Clock3, Package, Tag, Truck, WalletCards } from "lucide-react";

const money = (value) => new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR" }).format(Number(value) || 0);
const date = (value) => value ? new Date(value).toLocaleDateString("en-IN", { day: "2-digit", month: "2-digit", year: "numeric" }) : "—";

function Row({ label, value, positive = false, deduction = false }) {
  return <div className={positive ? "positive" : deduction ? "deduction" : ""}><span>{label}</span><strong>{positive ? "+ " : deduction ? "− " : ""}{money(value)}</strong></div>;
}

function Block({ icon: Icon, number, title, children, totalLabel, total, deduction = false }) {
  return <section className="settlementBlock"><h3><Icon /> {number}. {title}</h3><div className="settlementRows">{children}</div><div className={`settlementBlockTotal ${deduction ? "deduction" : ""}`}><span>{totalLabel}</span><strong>{deduction ? "− " : ""}{money(total)}</strong></div></section>;
}

export default function OrderSettlementDetails({ order, item, settlement, onClose, adminView = false }) {
  const closesAt = settlement.returnWindowClosesAt || item.returnWindowClosesAt;
  const settled = Boolean(settlement.settledAt || item.sellerPayoutCredited || item.sellerStatus === "Completed");
  const gross = Number(settlement.grossAmount || item.price * item.quantity || 0);
  const orderCharges = Number(settlement.commissionAmount || settlement.platformFee || 0) + Number(settlement.gstOnCommission || 0) + Number(settlement.paymentGatewayFee || 0) + Number(settlement.paymentGatewayGst || 0);
  const shippingDeduction = Number(settlement.shippingDeduction ?? (settlement.shippingPaidBy === "seller" ? settlement.shippingCharge : 0));
  const logistics = shippingDeduction + Number(settlement.returnRtoCharge || 0) + Number(settlement.codCharge || 0);
  const deductions = orderCharges + logistics;
  const image = item.productDetails?.mainImage || item.product?.mainImage || item.mainImage;
  const gstSeller = item.seller?.isGstRegistered === true || Boolean(order.invoiceStore?.sellerGstNumber);
  return <div className="modalOverlay settlementOverlay" role="dialog" aria-modal="true"><section className="orderSettlementDetails">
    <header><div><span>Order Settlement Details</span><h2>{order.orderNumber}</h2></div><button type="button" onClick={onClose}>Close</button></header>
    <div className={`settlementNotice ${settled ? "released" : "pending"}`}><CircleDollarSign /><p>{settled ? <>Settlement completed. The net amount was credited to the seller wallet on <strong>{date(settlement.settledAt)}</strong>.</> : <>Settlement calculated. The net amount will be released automatically after the return window closes on <strong>{date(closesAt)}</strong>.</>}</p></div>
    <section className="settlementProduct">{image ? <img src={image} alt="" /> : <i><Package /></i>}<div><h3>{item.name}</h3><p>Qty: {item.quantity} <b>|</b> SKU: {item.sku || "—"} <em>{gstSeller ? "GST SELLER" : "NON-GST SELLER"}</em></p>{adminView && item.seller && <small>Seller: {item.seller.companyName} ({item.seller.sellerNumber})</small>}</div></section>
    <Block icon={Package} number="1" title="Order Value" totalLabel="Gross Order Value" total={gross}><Row label="Product Selling Price" value={gross} /><Row label="Customer Discount" value={0} deduction /></Block>
    <Block icon={Tag} number="2" title="Platform & Payment Charges" totalLabel="Total Platform & Payment Charges" total={orderCharges} deduction><Row label={`Platform Fee (${settlement.commissionRate || 0}%)`} value={settlement.commissionAmount || settlement.platformFee} deduction /><Row label="GST on Platform Fee" value={settlement.gstOnCommission} deduction /><Row label={`Payment Gateway Fee (${settlement.paymentGatewayFeeRate || 0}%)`} value={settlement.paymentGatewayFee} deduction />{Number(settlement.paymentGatewayGst || 0) > 0 && <Row label="GST on Payment Gateway Fee (18%)" value={settlement.paymentGatewayGst} deduction />}</Block>
    <Block icon={Truck} number="3" title="Shipping & Logistics" totalLabel="Total Shipping & Logistics" total={logistics} deduction><Row label={settlement.shippingPaidBy === "seller" ? "Forward Shipping (Seller)" : shippingDeduction > 0 ? "ShipRocket Shipping Balance" : "Forward Shipping (Customer / Admin)"} value={shippingDeduction} deduction /><Row label="Reverse Shipping / Return Pickup" value={settlement.returnRtoCharge} deduction /><Row label="COD / RTO Shipping" value={settlement.codCharge} deduction /></Block>
    <section className="settlementGrandTotal"><Row label="Gross Order Value" value={gross} /><Row label="Total Deductions" value={deductions} deduction /><div><span>Net Seller Settlement</span><strong>{money(settlement.netAmount)}</strong></div></section>
    <section className="settlementMeta"><div><Clock3 /><span><small>Settlement Status</small><strong>{settled ? "Completed" : "Pending"}</strong></span></div><div><CircleDollarSign /><span><small>Reason</small><strong>{settled ? "Return Window Closed" : "Return Window Open"}</strong></span></div><div><CalendarDays /><span><small>{settled ? "Settlement Date" : "Expected Settlement Date"}</small><strong>{date(settled ? settlement.settledAt : closesAt)}</strong></span></div><div><WalletCards /><span><small>Destination</small><strong>Seller Wallet</strong></span></div><div><WalletCards /><span><small>Wallet Credit</small><strong>{money(settlement.netAmount)}</strong></span></div></section>
    <footer>The amount is credited to the seller wallet automatically only after the return window closes and no active return remains.</footer>
  </section></div>;
}
