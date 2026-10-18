import OrderPaymentMode, { OrderPaymentFilter } from "../../OrderPaymentMode.jsx";
import { orderPaymentMode } from "../../../utils/orderPayment.js";
import { useState, useEffect, lazy } from "react";
import { currentClientRoute, navigateAdminPath } from "../../../utils/adminRoutes.js";
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
  const [paymentMode, setPaymentMode] = useState("all");
  const [paymentFilter, setPaymentFilter] = useState("all");
  const [orderSearch, setOrderSearch] = useState("");
  const [statusDialog, setStatusDialog] = useState(null);
  const [statusBusy, setStatusBusy] = useState(false);
  const [statusError, setStatusError] = useState("");
  const changeStatus = order => { setStatusDialog({order,status:order.status,note:""}); setStatusError(""); };
  const [menu, setMenu] = useState("");
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [settlement, setSettlement] = useState(null);
  const [detailTab, setDetailTab] = useState("summary");
  const [cancelledOrders, setCancelledOrders] = useState([]);
  const [cancellationReason, setCancellationReason] = useState(null);
  useEffect(() => {
    if (tab !== "cancelled") return;
    let active = true;
    (async () => {
      try {
        const first = await api.orders({ status: "Cancelled", limit: 100, page: 1 });
        const pages = Number(first.pagination?.pages || 1);
        const rest = await Promise.all(Array.from({ length: Math.max(0, pages - 1) }, (_, index) => api.orders({ status: "Cancelled", limit: 100, page: index + 2 })));
        if (active) setCancelledOrders([...(first.items || []), ...rest.flatMap(result => result.items || [])]);
      } catch (error) { showToast(error.message || "Unable to load cancelled orders.", "error"); }
    })();
    return () => { active = false; };
  }, [tab]);
  useEffect(() => {
    const syncOrder = () => {
      const id = currentClientRoute().match(/^#\/admin\/orders\/([^/?]+)/)?.[1];
      setSelectedOrder(id ? orders.find((order) => String(order._id) === decodeURIComponent(id)) || null : null);
    };
    syncOrder();
    window.addEventListener("popstate", syncOrder);
    window.addEventListener("hashchange", syncOrder);
    return () => { window.removeEventListener("popstate", syncOrder); window.removeEventListener("hashchange", syncOrder); };
  }, [orders]);
  const openOrder = (order) => navigateAdminPath(`orders/${encodeURIComponent(order._id)}`);
  const closeOrder = () => navigateAdminPath("orders");
  const reviewSettlement = async (order, item) => {
    try {
      const productId = item.product?._id || item.product;
      const result = item.settlement?.settledAt ? { payout: { ...item.settlement, commissionAmount: item.settlement.platformFee } } : await api.reviewAdminSellerSettlement(order._id, productId);
      setSettlement({ order, item, ...result.payout, pending: Boolean(result.pending), returnWindowClosesAt: result.returnWindowClosesAt });
    } catch (error) { showToast(error.message || "Unable to review settlement.", "error"); }
  };
  useEffect(() => {
    const closeMenu = (event) => { if (!event.target.closest(".verticalActionMenu")) setMenu(""); };
    document.addEventListener("pointerdown", closeMenu);
    return () => document.removeEventListener("pointerdown", closeMenu);
  }, []);
  const statuses = ["Pending", "Placed", "Confirmed", "Accepted", "Processing", "Packed", "Ready to Dispatch", "Shipped", "Out for Delivery", "Delivered", "Return Requested", "Returned", "RTO", "Cancelled"];
  const isSellerOrder = (order) => (order.items || []).some((item) => item.seller);
  const itemStatuses = (order) => [...new Set((order.items || []).map((item) => item.sellerStatus || order.status).filter(Boolean))];
  const owner = (order) => {
    const sellers = [...new Map((order.items || []).filter((item) => item.seller).map((item) => [String(item.seller._id || item.seller), item.seller])).values()];
    return sellers.length ? sellers.map((seller) => `${seller.companyName || "Seller"} (${seller.sellerNumber || "No ID"})`).join(", ") : "Admin";
  };
  const searchMatch = (order) => [order.orderNumber, order.invoiceNumber, order.customer?.name, order.customer?.email, order.address?.name, order.address?.email, owner(order)].filter(Boolean).join(" ").toLowerCase().includes(orderSearch.toLowerCase());
  const ownershipMatch = (order) => ownershipFilter === "all" || (ownershipFilter === "seller" ? owner(order) !== "Admin" : owner(order) === "Admin");
  const paymentMatch = (order) => (paymentFilter === "all" || order.paymentStatus === paymentFilter) && (paymentMode === "all" || orderPaymentMode(order) === paymentMode);
  const isDelivered = (order) => order.status === "Delivered" || ((order.items || []).length > 0 && order.items.every((item) => ["Delivered", "Completed"].includes(item.sellerStatus)));
  const currentOrders = orders.filter((order) => !isDelivered(order) && !["Cancelled", "Returned"].includes(order.status) && searchMatch(order) && ownershipMatch(order) && paymentMatch(order));
  const deliveredOrders = orders.filter((order) => isDelivered(order) && searchMatch(order) && ownershipMatch(order) && paymentMatch(order));
  const cancelledRows = cancelledOrders.filter(order => searchMatch(order) && ownershipMatch(order) && paymentMatch(order));
  const displayOrders = tab === "delivered" ? deliveredOrders : currentOrders;
  const columns = [
    { key: "paymentMode", label: "Payment mode", render: row => <OrderPaymentMode order={row} /> },
    { key: "orderNumber", label: "Order", render: (row) => <><strong>{row.orderNumber}</strong><br /><small>{new Date(row.createdAt).toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short" })}</small></> },
    { key: "owner", label: "Order owner", render: (row) => <span className={`orderOwnerBadge ${isSellerOrder(row) ? "seller" : "admin"}`}><strong>{isSellerOrder(row) ? "Seller" : "Admin"}</strong><small>{isSellerOrder(row) ? owner(row) : "Store fulfilled"}</small></span> },
    { key: "customer", label: "Customer", render: (row) => <>{row.customer?.name || row.address?.name || "Guest"}<br /><small>{row.customer?.email || row.address?.email || ""}</small></> },
    { key: "invoiceNumber", label: "Invoice", render: (row) => <><strong>{row.invoiceNumber || "Not generated"}</strong><br /><small>Shipping {money(Number(row.shipping?.amount) || Number(row.shippingTotal))}</small><br /><small>Total {money(Number(row.grandTotal || 0))}</small><br /><small>Payment: {row.payment?.methodName || "—"} · {row.paymentStatus}</small></> },
    { key: "status", label: "Item status", render: (row) => tab === "delivered" ? <span className="status approved">Delivered</span> : isSellerOrder(row) ? <div className="adminItemStatuses">{itemStatuses(row).map((status) => <span key={status} className={`sellerStatusButton ${String(status).toLowerCase().replaceAll(" ", "-")}`}>{status}</span>)}</div> : <button type="button" className={`sellerStatusButton ${String(row.status).toLowerCase().replaceAll(" ", "-")}`} onClick={() => changeStatus(row)}>{row.status} · Change</button> },
    ...(tab === "cancelled" ? [{ key: "reason", label: "Cancellation reason", render: row => <button type="button" className="cancelReasonButton" onClick={event => { event.stopPropagation(); setCancellationReason(row); }}>View reason</button> }] : []),
    { key: "actions", label: "Actions", render: (row) => <div className="verticalActionMenu"><button type="button" aria-label="Order actions" onClick={() => setMenu(menu === row._id ? "" : row._id)}><MoreVertical size={18} /></button>{menu === row._id && <div><button type="button" onClick={() => { setSelectedOrder(row); setDetailTab("summary"); setMenu(""); }}>{row.shipping?.shipmentId ? "Tracking & shipping documents" : "View details"}</button>{tab !== "delivered" && <button type="button" onClick={() => { changeStatus(row); setMenu(""); }}>Update status</button>}{row.invoiceNumber && <button type="button" onClick={() => printInvoice(row)}>Print invoice</button>}{tab !== "delivered" && (row.shipping?.shipmentId || (isSellerOrder(row) ? itemStatuses(row).length > 0 && itemStatuses(row).every(status => ["Ready to Dispatch", "Ready to Ship"].includes(status)) : ["Ready to Dispatch", "Ready to Ship"].includes(row.status))) && <button type="button" onClick={async () => { setMenu(""); try { await onAction(row, "shiprocket"); showToast("ShipRocket shipment updated.", "success"); } catch (error) { showToast(error.message || "Unable to update ShipRocket shipment.", "error"); } }}>{row.shipping?.shipmentId ? "Sync ShipRocket status" : "Send to ShipRocket"}</button>}</div>}</div> }
  ];
  return <section className="contentStack orderFulfillmentPage">
    <nav className="orderFulfillmentTabs"><button className={tab === "pending" ? "active" : ""} onClick={() => setTab("pending")}>Current Pending Orders</button><button className={tab === "grouping" ? "active" : ""} onClick={() => setTab("grouping")}>Pending Item Grouping</button><button className={tab === "delivered" ? "active" : ""} onClick={() => setTab("delivered")}>Delivered Orders</button><button className={tab === "cancelled" ? "active" : ""} onClick={() => setTab("cancelled")}>Cancelled Orders</button></nav>
    <div className="panel"><div className="panelHeader"><h2>{tab === "pending" ? "Fulfillment Queue" : tab === "grouping" ? "Seller Pending Item Grouping" : tab === "cancelled" ? "Cancelled Orders" : "Delivered Orders"}</h2><div className="toolbar"><label className="searchBox"><Search size={16} /><input placeholder="Search order, seller code/name or Admin" value={orderSearch} onChange={(event) => setOrderSearch(event.target.value)} /></label>{tab !== "grouping" && <><select value={ownershipFilter} onChange={(event) => setOwnershipFilter(event.target.value)}><option value="all">Seller + Admin</option><option value="seller">Seller orders</option><option value="admin">Admin orders</option></select><OrderPaymentFilter value={paymentMode} onChange={setPaymentMode} /><select aria-label="Filter by payment status" value={paymentFilter} onChange={(event) => setPaymentFilter(event.target.value)}><option value="all">All payments</option><option>Pending</option><option>Paid</option><option>Partially Refunded</option><option>Refunded</option><option>Failed</option></select></>}{tab === "grouping" && <button className="inlineButton" type="button" onClick={() => printPendingItems(pendingItems)}><Printer size={16} /> Print</button>}</div></div>
      {tab === "grouping" ? <DataTable rows={pendingItems.filter((item) => `${item.sku} ${item.name} ${item.seller?.companyName || ""} ${item.seller?.sellerNumber || ""} ${(item.orderNumbers || []).join(" ")}`.toLowerCase().includes(orderSearch.toLowerCase()))} columns={[{ key: "owner", label: "Order owner", render: () => "Admin" },{ key: "sku", label: "SKU" },{ key: "name", label: "Admin Item" },{ key: "quantity", label: "Qty Required" },{ key: "orderCount", label: "Orders" },{ key: "orderNumbers", label: "Order Numbers", render: (row) => row.orderNumbers?.join(", ") }]} /> : <DataTable rows={tab === "cancelled" ? cancelledRows : displayOrders} loading={loading} loadingMessage="Loading orders…" sortable paginated columns={columns} onRowClick={openOrder} />}
    </div>
    {selectedOrder && <div className="trackingRouteOverlay"><OrderTrackingPage order={selectedOrder} onBack={closeOrder} onViewSettlement={reviewSettlement} onOrderUpdate={setSelectedOrder} adminView /></div>}
    {statusDialog && <div className="modalOverlay" role="dialog" aria-modal="true" aria-labelledby="admin-status-title"><form className="sellerStatusModal" onSubmit={async event => { event.preventDefault(); setStatusBusy(true); setStatusError(""); try { await onStatus(statusDialog.order,statusDialog.status,statusDialog.note); setStatusDialog(null); showToast("Order status updated.","success"); } catch(error) { setStatusError(error.message || "Unable to update status."); } finally { setStatusBusy(false); } }}><div className="panelHeader"><h2 id="admin-status-title">{statusDialog.order.orderNumber}</h2><button type="button" className="inlineButton" disabled={statusBusy} onClick={() => setStatusDialog(null)}>Close</button></div><label>Order status<select value={statusDialog.status} onChange={event => setStatusDialog({...statusDialog,status:event.target.value})}>{statuses.map(status => <option key={status} value={status}>{status === "Ready to Dispatch" ? "Ready to Ship" : status}</option>)}</select></label><label>Note (optional)<textarea value={statusDialog.note} onChange={event => setStatusDialog({...statusDialog,note:event.target.value})} /></label>{statusError && <p className="errorText" role="alert">{statusError}</p>}<button className="primaryButton" disabled={statusBusy}>{statusBusy ? "Updating…" : "Update status"}</button></form></div>}
    {settlement && <OrderSettlementDetails order={settlement.order} item={settlement.item} settlement={settlement} onClose={() => setSettlement(null)} adminView />}
    {cancellationReason && <div className="modalOverlay" role="dialog" aria-modal="true"><section className="sellerStatusModal"><div className="panelHeader"><h2>Cancellation reason · {cancellationReason.orderNumber}</h2><button type="button" className="inlineButton" onClick={() => setCancellationReason(null)}>Close</button></div><p>{[...(cancellationReason.timeline || [])].reverse().find(entry => entry.status === "Cancelled")?.comment || "No reason was recorded."}</p></section></div>}
  </section>;
}
