const number = (value) => Math.max(0, Number(value) || 0);

export function calculateRequiredSellingPrice({ productCost = 0, shippingInvoiceAmount = 0, shippingAmountIncludesGst = true, shippingGstRate = 18, packaging = 0, otherExpenses = 0, marketing = 0, desiredProfitRate = 0, platformCommissionRate = 0, paymentGatewayRate = 2, productGstRate = 0 }) {
  const shippingInvoice = number(shippingInvoiceAmount);
  const shippingRate = number(shippingGstRate) / 100;
  const shippingCost = shippingAmountIncludesGst ? shippingInvoice / (1 + shippingRate) : shippingInvoice;
  const shippingGst = shippingAmountIncludesGst ? shippingInvoice - shippingCost : shippingCost * shippingRate;
  const fixedCosts = number(productCost) + shippingCost + shippingGst + number(packaging) + number(otherExpenses) + number(marketing);
  const desiredProfit = number(productCost) * number(desiredProfitRate) / 100;
  const platformRate = number(platformCommissionRate) / 100;
  const gatewayRate = number(paymentGatewayRate) / 100;
  const productRate = number(productGstRate) / 100;
  const productGstFraction = productRate / (1 + productRate);
  const divisor = 1 - productGstFraction - platformRate * 1.18 - gatewayRate * 1.18;
  const requiredSellingPrice = divisor > 0 ? (fixedCosts + desiredProfit) / divisor : 0;
  const productGst = requiredSellingPrice * productGstFraction;
  const platformCommission = requiredSellingPrice * platformRate;
  const platformCommissionGst = platformCommission * .18;
  const paymentGatewayFee = requiredSellingPrice * gatewayRate;
  const paymentGatewayGst = paymentGatewayFee * .18;
  const totalDeductions = fixedCosts + productGst + platformCommission + platformCommissionGst + paymentGatewayFee + paymentGatewayGst;
  const sellerSettlement = requiredSellingPrice - productGst - platformCommission - platformCommissionGst - paymentGatewayFee - paymentGatewayGst;
  return { productCost: number(productCost), shippingCost, shippingGst, packaging: number(packaging), otherExpenses: number(otherExpenses), marketing: number(marketing), desiredProfit, productGst, platformCommission, platformCommissionGst, paymentGatewayFee, paymentGatewayGst, totalDeductions, requiredSellingPrice, sellerSettlement, netProfit: sellerSettlement - fixedCosts };
}
