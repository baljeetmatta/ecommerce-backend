export const isSelfShipping = (product) => product.seller?.shippingMode === "self";
export const isRealtimeShipping = (product) => !isSelfShipping(product) && ["free_realtime", "realtime_customer"].includes(product.shippingMode);
export const isRealtimeCustomerShipping = (product) => !isSelfShipping(product) && product.shippingMode === "realtime_customer";
export const requiresCodQuote = (product) => !isSelfShipping(product) && (product.codChargePaidBy === "customer" || product.seller?.shippingMode === "shiprocket");
export const normalizeSelfShipping = (product) => {
  if (!isSelfShipping(product)) return product;
  Object.assign(product, { shippingMode: "free_included", shippingIncludedInPrice: true, shippingPaidBy: "seller", shippingCharge: 0, shippingCost: 0 });
  return product;
};

// Fees for self-delivery are per product unit and never enter seller settlement.
export const selfShippingCustomerCodCharge = (product, quantity = 1) =>
  isSelfShipping(product) && product.codAvailable && product.codChargePaidBy === "customer"
    ? Number((Number(product.codCharge || 0) * quantity).toFixed(2)) : 0;
