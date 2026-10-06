import Seller from "../models/Seller.js";
import Reseller from "../models/Reseller.js";

export const creditWalletFunding = async ({ kind, ownerId, amount, reference, provider }) => {
  const Model = kind === "seller-wallet" ? Seller : kind === "reseller-wallet" ? Reseller : null;
  if (!Model || !ownerId || !reference || !Number.isFinite(amount) || amount <= 0) throw new Error("Invalid wallet payment");
  // The reference and balance change are atomic, including callback/browser races.
  await Model.updateOne({ _id: ownerId, "walletRepayments.reference": { $ne: reference } }, {
    $inc: { walletBalance: amount },
    $push: { walletRepayments: { reference, amount, provider, paidAt: new Date() } }
  });
  const owner = await Model.findById(ownerId);
  if (!owner) throw new Error("Wallet account not found");
  return owner.walletBalance;
};
