const money = (value) => Number(Number(value || 0).toFixed(2));

export const isProductResellable = (product) => Boolean(
  product
  && product.status === "active"
  && (!product.seller || (["approved", "pending_update", "rejected_update"].includes(product.approvalStatus) && product.sellerEnabled !== false))
);

export const resolveResellerPricing = (product) => {
  if (product?.resellerPricing?.enabled) return {
    enabled: true,
    basePrice: money(product.resellerPricing.basePrice),
    minimumSellingPrice: money(product.resellerPricing.minimumSellingPrice),
    maximumMargin: money(product.resellerPricing.maximumMargin),
    maximumCustomerPrice: money(product.resellerPricing.maximumCustomerPrice)
  };

  const basePrice = money(product?.offerPrice ?? product?.price);
  const configuredPercent = Number(process.env.RESELLER_DEFAULT_MAX_MARGIN_PERCENT || 25);
  const safePercent = Number.isFinite(configuredPercent) && configuredPercent >= 0 ? configuredPercent : 25;
  const maximumMargin = money(basePrice * safePercent / 100);
  return {
    enabled: true,
    basePrice,
    minimumSellingPrice: basePrice,
    maximumMargin,
    maximumCustomerPrice: money(basePrice + maximumMargin)
  };
};

export const resellerCatalogFilter = {
  status: "active",
  $or: [
    { seller: null },
    { seller: { $exists: false } },
    { seller: { $ne: null }, approvalStatus: { $in: ["approved", "pending_update", "rejected_update"] }, sellerEnabled: { $ne: false } }
  ]
};
