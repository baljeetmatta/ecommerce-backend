import Order from "../models/Order.js";
import Partner from "../models/Partner.js";
import PartnerPayout from "../models/PartnerPayout.js";

export const distributeOrderProfit = async (orderId) => {
  const order = await Order.findOneAndUpdate(
    { _id: orderId, status: "Delivered", paymentStatus: "Paid", partnerPayoutDistributed: false, partnerProfit: { $gt: 0 } },
    { $set: { partnerPayoutDistributed: true } },
    { new: true }
  );
  if (!order) return;
  try {
    const partners = await Partner.find({ status: "active" }).select("_id package").populate("package", "sharePercentage").sort({ _id: 1 });
    if (!partners.length) {
      await Order.updateOne({ _id: orderId }, { $set: { partnerPayoutDistributed: false } });
      return;
    }
    const totalPaise = Math.round(order.partnerProfit * 100);
    const totalWeight = partners.reduce((sum, partner) => sum + Number(partner.package?.sharePercentage || 0), 0);
    if (totalWeight <= 0) { await Order.updateOne({ _id: orderId }, { $set: { partnerPayoutDistributed: false } }); return; }
    let distributedPaise = 0;
    for (let index = 0; index < partners.length; index += 1) {
      const paise = index === partners.length - 1 ? totalPaise - distributedPaise : Math.floor(totalPaise * Number(partners[index].package?.sharePercentage || 0) / totalWeight);
      distributedPaise += paise;
      const amount = paise / 100;
      if (!amount) continue;
      await PartnerPayout.create({ partner: partners[index]._id, order: order._id, amount, payoutType: "sale_profit", description: `Profit share for ${order.orderNumber}` });
      await Partner.updateOne({ _id: partners[index]._id }, { $inc: { walletBalance: amount } });
    }
  } catch (error) {
    await Order.updateOne({ _id: orderId }, { $set: { partnerPayoutDistributed: false } });
    throw error;
  }
};
