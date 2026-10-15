import Sequence from "../models/Sequence.js";
import StorefrontSetting from "../models/StorefrontSetting.js";

export const ensureOrderInvoice = async (order, { seller = null, createdBy = null } = {}) => {
  const isNewInvoice = !order.invoiceNumber;
  const store = await StorefrontSetting.findOne({ singleton: "storefront" });
  if (isNewInvoice) {
    const sequence = await Sequence.findOneAndUpdate({ key: "invoice" }, { $inc: { value: 1 } }, { upsert: true, new: true });
    order.invoiceNumber = `HRS-${String(sequence.value).padStart(6, "0")}`;
  }
  order.invoiceGeneratedAt ||= new Date();
  order.invoiceStore = {
    ...(order.invoiceStore?.toObject ? order.invoiceStore.toObject() : order.invoiceStore || {}),
    shopName: store?.shopName || "Store",
    logoUrl: store?.logoUrl || store?.footerLogoUrl,
    address: store?.address,
    email: store?.email,
    ...(!(order.items || []).some(item => item.seller) ? {
      sellerName: store?.shopName || "HRSBasket",
      sellerAddress: store?.address || store?.contactDetails?.address,
      sellerState: store?.contactDetails?.state,
      sellerGstNumber: store?.gstNumber || order.invoiceStore?.sellerGstNumber
    } : {}),
    ...(seller ? {
      sellerName: seller.companyName,
      sellerAddress: [seller.address, seller.city, seller.state, seller.pinCode].filter(Boolean).join(", "),
      sellerState: seller.state,
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
