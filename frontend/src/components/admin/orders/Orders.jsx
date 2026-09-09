import { useState, useEffect, lazy } from "react";
import { currentClientRoute } from "../../../utils/adminRoutes.js";
import { api } from "../../../services/api.js";
import { showToast } from "../../../utils/toast.js";
import { money } from "../../../utils/currency.js";
import { MoreVertical, Search, Printer } from "lucide-react";
import { printInvoice, printPendingItems } from "../../../utils/orderPrinting.js";
import OrderTrackingPage from "../../OrderTrackingPage.jsx";
import OrderSettlementDetails from "../../OrderSettlementDetails.jsx";

const DataTable = lazy(() => import("../../DataTable.jsx"));

export default function Orders({ orders, pendingItems, pagination, onPageChange, loading, onStatus, onAction }) {
  const [tab, setTab] = useState("pending");
  const [ownershipFilter, setOwnershipFilter] = useState("all");
  const [paymentFilter, setPaymentFilter] = useState("all");
  const [orderSearch, setOrderSearch] = useState("");
  const [statusDrafts, setStatusDrafts] = useState({});
  const [menu, setMenu] = useState("");
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [settlement, setSettlement] = useState(null);
  const [detailTab, setDetailTab] = useState("summary");
  useEffect(() => {
    const id = currentClientRoute().match(/^#\/admin\/orders\/([^/?]+)/)?.[1];
    if (id && orders.length) setSelectedOrder(orders.find((order) => String(order._id) === decodeURIComponent(id)) || null);
  }, [orders]);
  const openOrder = (order) => { setSelectedOrder(order); window.location.hash = `#/admin/orders/${order._id}`; };
  const closeOrder = () => { setSelectedOrder(null); window.location.hash = "#/admin/orders"; };
  const reviewSettlement = async (order, item) => {
    try {
      const productId = item.product?._id || item.product;
      const result = item.settlement?.settledAt ? { payout: { ...item.settlement, commissionAmount: item.settlement.platformFee } } : await api.reviewAdminSellerSettlement(order._id, productId);
      setSettlement({ order, item, ...result.payout, pending: Boolean(result.pending), returnWindowClosesAt: result.returnWindowClosesAt });
    } catch (error) { showToast(error.message || "Unable to review settlement.", "error"); }
  };
  useEffect(() => { if (selectedOrder && !window.location.hash.includes(String(selectedOrder._id))) window.location.hash = `#/admin/orders/${selectedOrder._id}`; }, [selectedOrder]);
  useEffect(() => {
    const closeMenu = (event) => { if (!event.target.closest(".verticalActionMenu")) setMenu(""); };
    document.addEventListener("pointerdown", closeMenu);
    return () => document.removeEventListener("pointerdown", closeMenu);
  }, []);
  const statuses = ["Placed", "Confirmed", "Packed", "Ready to Ship", "Shipped", "Delivered", "Cancelled"];
  const isSellerOrder = (order) => (order.items || []).some((item) => item.seller);
  const itemStatuses = (order) => [...new Set((order.items || []).map((item) => item.sellerStatus || order.status).filter(Boolean))];
  const owner = (order) => {
    const sellers = [...new Map((order.items || []).filter((item) => item.seller).map((item) => [String(item.seller._id || item.seller), item.seller])).values()];
    return sellers.length ? sellers.map((seller) => `${seller.companyName || "Seller"} (${seller.sellerNumber || "No ID"})`).join(", ") : "Admin";
  };
  const searchMatch = (order) => [order.orderNumber, order.invoiceNumber, order.customer?.name, order.customer?.email, order.address?.name, order.address?.email, owner(order)].filter(Boolean).join(" ").toLowerCase().includes(orderSearch.toLowerCase());
  const ownershipMatch = (order) => ownershipFilter === "all" || (ownershipFilter === "seller" ? owner(order) !== "Admin" : owner(order) === "Admin");
  const paymentMatch = (order) => paymentFilter === "all" || order.paymentStatus === paymentFilter;
  const isDelivered = (order) => order.status === "Delivered" || ((order.items || []).length > 0 && order.items.every((item) => ["Delivered", "Completed"].includes(item.sellerStatus)));
  const currentOrders = orders.filter((order) => !isDelivered(order) && !["Cancelled", "Returned"].includes(order.status) && searchMatch(order) && ownershipMatch(order) && paymentMatch(order));
  const deliveredOrders = orders.filter((order) => isDelivered(order) && searchMatch(order) && ownershipMatch(order) && paymentMatch(order));
  const displayOrders = tab === "delivered" ? deliveredOrders : currentOrders;
  const columns = [
    { key: "orderNumber", label: "Order", render: (row) => <><strong>{row.orderNumber}</strong><br /><small>{new Date(row.createdAt).toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short" })}</small></> },
    { key: "owner", label: "Order owner", render: (row) => <span className={`orderOwnerBadge ${isSellerOrder(row) ? "seller" : "admin"}`}><strong>{isSellerOrder(row) ? "Seller" : "Admin"}</strong><small>{isSellerOrder(row) ? owner(row) : "Store fulfilled"}</small></span> },
    { key: "customer", label: "Customer", render: (row) => <>{row.customer?.name || row.address?.name || "Guest"}<br /><small>{row.customer?.email || row.address?.email || ""}</small></> },
    { key: "invoiceNumber", label: "Invoice", render: (row) => <><strong>{row.invoiceNumber || "Not generated"}</strong><br /><small>Shipping {money(Number(row.shipping?.amount) || Number(row.shippingTotal))}</small><br /><small>Total {money(Number(row.grandTotal || 0))}</small><br /><small>Payment: {row.payment?.methodName || "—"} · {row.paymentStatus}</small></> },
    { key: "status", label: "Item status", render: (row) => tab === "delivered" ? <span className="status approved">Delivered</span> : isSellerOrder(row) ? <div className="adminItemStatuses">{itemStatuses(row).map((status) => <span key={status} className={`sellerStatusButton ${String(status).toLowerCase().replaceAll(" ", "-")}`}>{status}</span>)}</div> : <select value={statusDrafts[row._id] || row.status} onChange={(event) => setStatusDrafts((current) => ({ ...current, [row._id]: event.target.value }))}>{statuses.map((status) => <option key={status}>{status}</option>)}</select> },
    { key: "actions", label: "Actions", render: (row) => <div className="verticalActionMenu"><button type="button" aria-label="Order actions" onClick={() => setMenu(menu === row._id ? "" : row._id)}><MoreVertical size={18} /></button>{menu === row._id && <div><button type="button" onClick={() => { setSelectedOrder(row); setDetailTab("summary"); setMenu(""); }}>View details</button>{tab !== "delivered" && !isSellerOrder(row) && <button type="button" onClick={() => onStatus(row, statusDrafts[row._id] || row.status)}>Update status</button>}{row.invoiceNumber && <button type="button" onClick={() => printInvoice(row)}>Print invoice</button>}{tab !== "delivered" && <button type="button" onClick={() => onAction(row, "shiprocket")}>Queue ShipRocket</button>}</div>}</div> }
  ];
  return <section className="contentStack orderFulfillmentPage">
    <nav className="orderFulfillmentTabs"><button className={tab === "pending" ? "active" : ""} onClick={() => setTab("pending")}>Current Pending Orders</button><button className={tab === "grouping" ? "active" : ""} onClick={() => setTab("grouping")}>Pending Item Grouping</button><button className={tab === "delivered" ? "active" : ""} onClick={() => setTab("delivered")}>Delivered Orders</button></nav>
    <div className="panel"><div className="panelHeader"><h2>{tab === "pending" ? "Fulfillment Queue" : tab === "grouping" ? "Seller Pending Item Grouping" : "Delivered Orders"}</h2><div className="toolbar"><label className="searchBox"><Search size={16} /><input placeholder="Search order, seller code/name or Admin" value={orderSearch} onChange={(event) => setOrderSearch(event.target.value)} /></label>{tab !== "grouping" && <><select value={ownershipFilter} onChange={(event) => setOwnershipFilter(event.target.value)}><option value="all">Seller + Admin</option><option value="seller">Seller orders</option><option value="admin">Admin orders</option></select><select aria-label="Filter by payment status" value={paymentFilter} onChange={(event) => setPaymentFilter(event.target.value)}><option value="all">All payments</option><option>Pending</option><option>Paid</option><option>Partially Refunded</option><option>Refunded</option><option>Failed</option></select></>}{tab === "grouping" && <button className="inlineButton" type="button" onClick={() => printPendingItems(pendingItems)}><Printer size={16} /> Print</button>}</div></div>
      {tab === "grouping" ? <DataTable rows={pendingItems.filter((item) => `${item.sku} ${item.name} ${item.seller?.companyName || ""} ${item.seller?.sellerNumber || ""} ${(item.orderNumbers || []).join(" ")}`.toLowerCase().includes(orderSearch.toLowerCase()))} columns={[{ key: "owner", label: "Order owner", render: () => "Admin" },{ key: "sku", label: "SKU" },{ key: "name", label: "Admin Item" },{ key: "quantity", label: "Qty Required" },{ key: "orderCount", label: "Orders" },{ key: "orderNumbers", label: "Order Numbers", render: (row) => row.orderNumbers?.join(", ") }]} /> : <DataTable rows={displayOrders} loading={loading} loadingMessage="Loading orders…" sortable paginated columns={columns} onRowClick={openOrder} />}
    </div>
    {selectedOrder && <div className="trackingRouteOverlay"><OrderTrackingPage order={selectedOrder} onBack={closeOrder} onViewSettlement={reviewSettlement} adminView /></div>}
    {settlement && <OrderSettlementDetails order={settlement.order} item={settlement.item} settlement={settlement} onClose={() => setSettlement(null)} adminView />}
  </section>;
}
