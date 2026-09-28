import { Banknote, CreditCard, SlidersHorizontal } from "lucide-react";
import { orderPaymentMode } from "../utils/orderPayment.js";
import "../styles/order-payment.css";

export default function OrderPaymentMode({ order }) {
  const mode = orderPaymentMode(order);
  const Icon = mode === "COD" ? Banknote : CreditCard;
  return <span className={`orderPaymentBadge ${mode === "COD" ? "orderPaymentCod" : "orderPaymentOnline"}`} title={mode === "COD" ? "Cash on delivery" : "Online payment"}><Icon size={15} aria-hidden="true" /><span>{mode}</span></span>;
}

export function OrderPaymentFilter({ value, onChange }) {
  return <label className="orderPaymentFilter"><span><SlidersHorizontal size={14} aria-hidden="true" />Payment mode</span><select value={value} onChange={event => onChange(event.target.value)}><option value="all">All payment modes</option><option value="COD">Cash on delivery (COD)</option><option value="Online">Online payment</option></select></label>;
}
