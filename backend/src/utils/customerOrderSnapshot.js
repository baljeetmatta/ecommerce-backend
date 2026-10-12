import { adminInvoiceSnapshot } from "./adminInvoiceSnapshot.js";
export const customerOrderSnapshot = order => {
  const snapshot = adminInvoiceSnapshot(order);
  if (snapshot.items) snapshot.items = snapshot.items.map(item => {
    const { seller, ...safeItem } = item;
    // Older admin updates left the item at its initial status.
    if (!seller && ["Placed", "Pending"].includes(item.sellerStatus) && !item.returnRequest?.status && snapshot.status) safeItem.sellerStatus = snapshot.status;
    return safeItem;
  });
  return snapshot;
};
