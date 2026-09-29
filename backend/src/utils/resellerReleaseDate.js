// Never use the checkout date as the start of a return window.
export const resellerReleaseDate = (order) => {
  if (!order.items?.length) return null;
  const dates = order.items.map((item) => {
    if (["Cancelled", "Returned", "RTO", "Return Requested", "Return Approved"].includes(item.sellerStatus)) return null;
    if (!["Delivered", "Completed"].includes(item.sellerStatus) && order.status !== "Delivered") return null;
    if (item.returnRequest?.status && item.returnRequest.status !== "Rejected") return null;
    if (item.returnWindowClosesAt) return new Date(item.returnWindowClosesAt);
    const deliveredAt = item.deliveredAt || order.fulfillment?.deliveredAt;
    if (!deliveredAt) return null;
    return new Date(new Date(deliveredAt).getTime() + (item.returnApplicable === false ? 0 : Number(item.returnDays ?? 7)) * 86400000);
  });
  if (dates.some((date) => !date || !Number.isFinite(date.getTime()))) return null;
  return new Date(Math.max(...dates.map(Number)));
};
