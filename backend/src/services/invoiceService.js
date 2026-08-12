import StorefrontSetting from "../models/StorefrontSetting.js";

export const ensureOrderInvoice = async (order, { seller = null, createdBy = null } = {}) => {
  if (order.invoiceNumber) return false;

  const store = await StorefrontSetting.findOne({ singleton: "storefront" });
  order.invoiceNumber = `INV-${order.orderNumber.replace(/\D/g, "") || Date.now()}`;
  order.invoiceGeneratedAt = new Date();
  order.invoiceStore = {
    shopName: store?.shopName || "Store",
    logoUrl: store?.logoUrl || store?.footerLogoUrl,
    address: store?.address,
    email: store?.email,
    phone: store?.phone,
    ...(seller ? {
      sellerName: seller.companyName,
      sellerAddress: [seller.address, seller.city, seller.state, seller.pinCode].filter(Boolean).join(", "),
      sellerGstNumber: seller.gstNumber
    } : {})
  };
  order.fulfillment = { ...order.fulfillment, invoiceUrl: `/api/orders/${order._id}/invoice` };
  order.timeline.push({
    status: order.status,
    title: "Invoice generated automatically",
    comment: `Invoice ${order.invoiceNumber} generated when the order was confirmed.`,
    ...(createdBy ? { createdBy } : {})
  });
  return true;
};
