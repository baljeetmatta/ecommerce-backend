export const orderPaymentMode = (order) => {
  const payment = order?.payment || {};
  return [payment.provider, payment.methodCode].some(value => String(value || "").toLowerCase() === "cod") ? "COD" : "Online";
};
