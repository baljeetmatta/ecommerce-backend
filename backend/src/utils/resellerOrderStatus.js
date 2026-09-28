// Seller fulfilment is tracked on items; order.status can remain "Placed".
// Project the current fulfilment status for reseller read views without changing
// the stored order or giving resellers fulfilment permissions.
export const resellerOrderStatus = order => {
  const normalize = status => status === "Completed" ? "Delivered" : status === "Accepted" ? "Confirmed" : status === "Return Rejected" ? "Delivered" : status;
  if (["Cancelled", "Returned", "RTO", "Refunded"].includes(order.status)) return order.status;
  const items = order.items || [];
  if (!items.length) return normalize(order.status);
  const statuses = items.map(item => normalize(item.sellerStatus || order.status));
  if (statuses.every(status => status === "Cancelled")) return "Cancelled";
  if (items.some(item => ["Requested", "Approved", "Pickup Arranged", "Received"].includes(item.returnRequest?.status)) || statuses.some(status => ["Return Requested", "Return Approved"].includes(status))) return "Return Requested";
  if (statuses.includes("RTO")) return "RTO";
  if (statuses.includes("Returned")) return "Returned";
  const active = statuses.filter(status => status !== "Cancelled");
  if (active.every(status => status === "Delivered") || ["Delivered", "Completed"].includes(order.status)) return "Delivered";
  const stages = ["Pending", "Placed", "Confirmed", "Processing", "Packed", "Ready to Ship", "Ready to Dispatch", "Shipped", "Out for Delivery", "Delivered"];
  // A partially fulfilled order stays at the earliest unfinished item stage.
  return active.reduce((earliest, status) => stages.indexOf(status) < stages.indexOf(earliest) ? status : earliest);
};

export const resellerOrderView = order => {
  const value = order.toObject ? order.toObject() : order;
  return { ...value, status: resellerOrderStatus(value) };
};
