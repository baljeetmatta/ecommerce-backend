import StorefrontSetting from "../models/StorefrontSetting.js";
export const sellerDebtLimit = async () => {
  const settings = await StorefrontSetting.findOne({ singleton: "storefront" }).select("sellerSettlement.walletDebtLimit").lean();
  return Number(settings?.sellerSettlement?.walletDebtLimit ?? 500);
};
