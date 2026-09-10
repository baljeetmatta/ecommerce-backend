import { Bell } from "lucide-react";
import "../styles/order-activity.css";
export default function NewOrderNotice({ activity, onOpen }) {
  if (!activity.pendingCount) return null;
  return <section className="newOrderNotice" role="status"><Bell size={24} /><div><strong>{activity.pendingCount} new order{activity.pendingCount === 1 ? "" : "s"} awaiting processing</strong><p>Recently received: {activity.pendingOrders.map(order => order.orderNumber).join(", ")}</p></div><button type="button" onClick={onOpen}>View orders</button></section>;
}
