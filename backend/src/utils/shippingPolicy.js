export const isSelfShipping = (product) => product.seller?.shippingMode === "self";
export const isRealtimeShipping = (product) => !isSelfShipping(product) && (["free_realtime", "realtime_customer"].includes(product.shippingMode) || (product.seller?.shippingMode === "shiprocket" && product.shippingMode === "free_included"));
export const isRealtimeCustomerShipping = (product) => !isSelfShipping(product) && product.shippingMode === "realtime_customer";
export const requiresCodQuote = (product) => !isSelfShipping(product) && (product.codChargePaidBy === "customer" || product.seller?.shippingMode === "shiprocket");
export const normalizeSelfShipping = (product) => {
  if (!isSelfShipping(product)) return product;
  const shippingMode = product.shippingMode === "fixed_customer" ? "fixed_customer" : product.shippingMode === "estimated_seller" ? "estimated_seller" : "free_included";
  Object.assign(product, {
    shippingMode,
    shippingIncludedInPrice: shippingMode !== "fixed_customer",
    shippingPaidBy: shippingMode === "fixed_customer" ? "customer" : "seller",
    shippingCharge: shippingMode === "fixed_customer" ? Number(product.shippingCharge || 0) : 0,
    shippingCost: 0
  });
  return product;
};

// Fees for self-delivery are per product unit and never enter seller settlement.
export const selfShippingCustomerCodCharge = (product, quantity = 1) =>
  isSelfShipping(product) && product.codAvailable && product.codChargePaidBy === "customer"
    ? Number((Number(product.codCharge || 0) * quantity).toFixed(2)) : 0;
