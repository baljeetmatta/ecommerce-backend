export const gstBreakdown = (enteredPrice, rate = 0, includesTax = true) => {
  const entered = Math.max(0, Number(enteredPrice) || 0);
  const gstRate = Math.max(0, Number(rate) || 0);
  const grossPrice = Math.floor(includesTax || !gstRate ? entered : entered * (1 + gstRate / 100));
  const taxableValue = !gstRate ? grossPrice : includesTax ? grossPrice / (1 + gstRate / 100) : entered;
  return {
    enteredPrice: entered,
    grossPrice,
    taxableValue: Number(taxableValue.toFixed(2)),
    gstRate,
    gstAmount: Number(Math.max(0, grossPrice - taxableValue).toFixed(2)),
    priceIncludesTax: Boolean(includesTax)
  };
};

export const storefrontProduct = (product) => {
  const source = product.toObject ? product.toObject() : product;
  const sellerCollectsGst = !source.seller || (source.seller.isGstRegistered === true && (source.seller.gstStatus === "verified" || source.seller.gstVerificationStatus === "verified"));
  const rate = sellerCollectsGst ? Number(source.taxCategory?.rate || 0) : 0;
  const regular = gstBreakdown(source.price, rate, source.priceIncludesTax !== false);
  const offer = gstBreakdown(source.offerPrice ?? source.price, rate, source.priceIncludesTax !== false);
  return { ...source, resellerPricing: { enabled: Boolean(source.resellerPricing?.enabled) }, taxCategory: sellerCollectsGst ? source.taxCategory : null, enteredPrice: source.price, enteredOfferPrice: source.offerPrice, price: regular.grossPrice, offerPrice: offer.grossPrice, gstRate: rate };
};
