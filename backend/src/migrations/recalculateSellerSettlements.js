import "dotenv/config";
import mongoose from "mongoose";
import Order from "../models/Order.js";
import Seller from "../models/Seller.js";
import SellerPayout from "../models/SellerPayout.js";
import StorefrontSetting from "../models/StorefrontSetting.js";
import { sellerSettlementBreakdown } from "../controllers/sellerController.js";

if (!process.env.MONGO_URI) throw new Error("MONGO_URI is required");

const apply = process.argv.includes("--apply");
const roundMoney = (value) => Math.round((Number(value) || 0) * 100) / 100;
const settlementFields = [
  "selfShipping",
  "grossAmount",
  "commissionRate",
  "commissionAmount",
  "paymentGatewayFeeRate",
  "paymentGatewayFee",
  "paymentGatewayGst",
  "shippingCharge",
  "shippingDeduction",
  "customerPaidShipping",
  "shippingPaidBy",
  "codCharge",
  "gstOnCommission",
  "returnRtoCharge",
  "otherCharges",
  "netAmount",
  "returnWindowClosesAt"
];

const payoutPatch = (breakdown) => Object.fromEntries(settlementFields.map((field) => [field, breakdown[field]]));
const changed = (current = {}, next = {}) => settlementFields.some((field) => {
  const left = current[field] instanceof Date ? current[field].getTime() : current[field];
  const right = next[field] instanceof Date ? next[field].getTime() : next[field];
  return String(left ?? "") !== String(right ?? "");
});

await mongoose.connect(process.env.MONGO_URI);

const settings = await StorefrontSetting.findOne({ singleton: "storefront" }).select("sellerSettlement").lean();
const config = settings?.sellerSettlement || {};
const orders = await Order.find({ "items.seller": { $exists: true, $ne: null } }).sort({ createdAt: 1 });
const sellerIds = [...new Set(orders.flatMap((order) => order.items.map((item) => item.seller).filter(Boolean).map(String)))];
const sellers = new Map((await Seller.find({ _id: { $in: sellerIds } })).map((seller) => [String(seller._id), seller]));

const stats = {
  ordersScanned: orders.length,
  itemsScanned: 0,
  settlementsChanged: 0,
  payoutsChanged: 0,
  walletAdjustments: 0,
  walletDelta: 0,
  missingSellers: 0
};

for (const order of orders) {
  let orderChanged = false;
  for (const item of order.items) {
    if (!item.seller) continue;
    stats.itemsScanned += 1;
    const seller = sellers.get(String(item.seller));
    if (!seller) {
      stats.missingSellers += 1;
      continue;
    }
    const breakdown = sellerSettlementBreakdown(order, item, seller, config);
    // Recalculating money must not move an existing return deadline when
    // saving the order changes its updatedAt timestamp.
    breakdown.returnWindowClosesAt = item.settlement?.returnWindowClosesAt || breakdown.returnWindowClosesAt;
    const nextSettlement = { ...breakdown, platformFee: breakdown.commissionAmount, settledAt: item.settlement?.settledAt };
    const currentSettlement = { ...item.settlement, commissionAmount: item.settlement?.platformFee };
    if (changed(currentSettlement, nextSettlement) || Number(item.sellerPayoutAmount || 0) !== Number(breakdown.netAmount || 0)) {
      stats.settlementsChanged += 1;
      orderChanged = true;
      if (apply) {
        item.sellerPayoutAmount = breakdown.netAmount;
        item.settlement = nextSettlement;
      }
    }
    const productId = item.product?._id || item.product;
    const payout = productId ? await SellerPayout.findOne({ seller: seller._id, order: order._id, product: productId, type: "order_settlement" }) : null;
    if (!payout) continue;
    const previousNet = Number(payout.netAmount || 0);
    const delta = roundMoney(Number(breakdown.netAmount || 0) - previousNet);
    if (changed(payout, breakdown)) {
      stats.payoutsChanged += 1;
      if (delta) {
        stats.walletAdjustments += 1;
        stats.walletDelta = roundMoney(stats.walletDelta + delta);
      }
      if (apply) {
        payout.set(payoutPatch(breakdown));
        await payout.save();
        if (delta) await Seller.updateOne({ _id: seller._id }, { $inc: { walletBalance: delta } });
      }
    }
  }
  if (apply && orderChanged) await order.save();
}

await mongoose.disconnect();

console.log(JSON.stringify({ mode: apply ? "apply" : "dry-run", ...stats }, null, 2));
