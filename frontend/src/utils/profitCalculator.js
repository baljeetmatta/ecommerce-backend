const number = (value) => Math.max(0, Number(value) || 0);

export function calculateRequiredSellingPrice({ productCost = 0, shippingInvoiceAmount = 0, shippingAmountIncludesGst = true, shippingGstRate = 18, packaging = 0, returnRto = 0, cod = 0, otherExpenses = 0, marketing = 0, targetProfit, desiredProfitRate = 0, platformCommissionRate = 0, commissionGstRate = 18, paymentGatewayRate = 2, paymentGatewayGstRate = 18, productGstRate = 0 }) {
  const shippingInvoice = number(shippingInvoiceAmount);
  const shippingRate = number(shippingGstRate) / 100;
  const shippingCost = shippingAmountIncludesGst ? shippingInvoice / (1 + shippingRate) : shippingInvoice;
  const shippingGst = shippingAmountIncludesGst ? shippingInvoice - shippingCost : shippingCost * shippingRate;
  const fixedCosts = number(productCost) + shippingCost + shippingGst + number(packaging) + number(returnRto) + number(cod) + number(otherExpenses) + number(marketing);
  const desiredProfit = targetProfit === undefined || targetProfit === null || targetProfit === "" ? number(productCost) * number(desiredProfitRate) / 100 : number(targetProfit);
  const platformRate = number(platformCommissionRate) / 100;
  const gatewayRate = number(paymentGatewayRate) / 100;
  const commissionGstFraction = number(commissionGstRate) / 100;
  const gatewayGstFraction = number(paymentGatewayGstRate) / 100;
  const productRate = number(productGstRate) / 100;
  const productGstFraction = productRate / (1 + productRate);
  const totalPercentageRate = productGstFraction + platformRate * (1 + commissionGstFraction) + gatewayRate * (1 + gatewayGstFraction);
  const divisor = 1 - totalPercentageRate;
  const exactSellingPrice = divisor > 0 ? (fixedCosts + desiredProfit) / divisor : 0;
  const requiredSellingPrice = exactSellingPrice > 0 ? Math.ceil(exactSellingPrice) : 0;
  const productGst = requiredSellingPrice * productGstFraction;
  const platformCommission = requiredSellingPrice * platformRate;
  const platformCommissionGst = platformCommission * commissionGstFraction;
  const paymentGatewayFee = requiredSellingPrice * gatewayRate;
  const paymentGatewayGst = paymentGatewayFee * gatewayGstFraction;
  const totalDeductions = fixedCosts + productGst + platformCommission + platformCommissionGst + paymentGatewayFee + paymentGatewayGst;
  const sellerSettlement = requiredSellingPrice - productGst - platformCommission - platformCommissionGst - paymentGatewayFee - paymentGatewayGst;
  return { productCost: number(productCost), shippingCost, shippingGst, packaging: number(packaging), returnRto: number(returnRto), cod: number(cod), otherExpenses: number(otherExpenses), marketing: number(marketing), fixedCosts, desiredProfit, productGst, platformCommission, platformCommissionGst, paymentGatewayFee, paymentGatewayGst, totalPercentageRate, availablePercentage: divisor, totalDeductions, exactSellingPrice, requiredSellingPrice, sellerSettlement, netProfit: sellerSettlement - fixedCosts };
}
