export const isActiveDeal = (product, type, now = Date.now()) => {
  if (!["super", "today"].includes(type)) return false;
  const deal = product.deals?.[type];
  if (!deal?.enabled || !deal.from || !deal.to) return false;
  const date = new Date(now).toLocaleDateString("en-CA", { timeZone: "Asia/Kolkata" });
  return deal.from <= date && date <= deal.to;
};
