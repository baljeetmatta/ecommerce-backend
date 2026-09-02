import StorefrontSetting from "../models/StorefrontSetting.js";

export const ensureOrderInvoice = async (order, { seller = null, createdBy = null } = {}) => {
  const isNewInvoice = !order.invoiceNumber;
  const store = await StorefrontSetting.findOne({ singleton: "storefront" });
  order.invoiceNumber ||= `INV-${order.orderNumber.replace(/\D/g, "") || Date.now()}`;
  order.invoiceGeneratedAt ||= new Date();
  order.invoiceStore = {
    shopName: store?.shopName || "Store",
    logoUrl: store?.logoUrl || store?.footerLogoUrl,
    address: store?.address,
    email: store?.email,
    ...(seller ? {
      sellerName: seller.companyName,
      sellerAddress: [seller.address, seller.city, seller.state, seller.pinCode].filter(Boolean).join(", "),
      sellerGstNumber: seller.isGstRegistered === true && (seller.gstStatus === "verified" || seller.gstVerificationStatus === "verified") ? seller.gstNumber : undefined
    } : {})
  };
  order.fulfillment = { ...order.fulfillment, invoiceUrl: `/api/orders/${order._id}/invoice` };
  if (isNewInvoice) {
    order.timeline.push({
      status: order.status,
      title: "Invoice generated automatically",
      comment: `Invoice ${order.invoiceNumber} generated when the order was placed.`,
      ...(createdBy ? { createdBy } : {})
    });
  }
  return isNewInvoice;
};
