import Seller from "../models/Seller.js";
import SellerWalletAdjustment from "../models/SellerWalletAdjustment.js";

const money = (value) => Math.round((Number(value) || 0) * 100) / 100;

export const debitShiprocketReturn = async ({ order, item, createdBy = null, rto = false }) => {
  const sellerId = item.seller?._id || item.seller;
  const productId = item.product?._id || item.product;
  if (!sellerId || !productId || (!order.shipping?.shipmentId && !item.returnRequest?.returnShipment?.shipmentId)) return null;
  const orderGross = order.items.reduce((sum, entry) => sum + Number(entry.price || 0) * Number(entry.quantity || 0), 0) || 1;
  const itemGross = Number(item.price || 0) * Number(item.quantity || 0);
  const shippingCharge = money(Number(order.shipping?.actualCost || 0) * itemGross / orderGross);
  const rtoCharge = money(item.rtoApplicable === false ? 0 : item.returnRtoCharge || 0);
  const amount = money(shippingCharge + rtoCharge);
  if (!amount) return null;
  const type = rto ? "rto_shiprocket" : "return_shiprocket";
  try {
    const adjustment = await SellerWalletAdjustment.create({ seller: sellerId, order: order._id, product: productId, type, shippingCharge, rtoCharge, amount, description: `${rto ? "RTO" : "Return"} Shiprocket shipping and RTO charges for ${order.orderNumber}`, createdBy });
    await Seller.updateOne({ _id: sellerId }, { $inc: { walletBalance: -amount } });
    return adjustment;
  } catch (error) {
    if (error.code === 11000) return SellerWalletAdjustment.findOne({ seller: sellerId, order: order._id, product: productId, type });
    throw error;
  }
};
