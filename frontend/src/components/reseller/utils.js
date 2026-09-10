
export const money = value => new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 2 }).format(Number(value) || 0);
export const sum = (rows, get) => rows.reduce((total, row) => total + (Number(get(row)) || 0), 0);
export const isReturn = order => /return|rto/i.test(order.status) || order.items?.some(item => item.returnRequest?.status || /return|rto/i.test(item.sellerStatus));
export const date = value => value && !Number.isNaN(new Date(value).getTime()) ? new Date(value).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" }) : "—";
export const earning = order => order.resellerAttribution?.finalEarning ?? order.resellerAttribution?.earning ?? 0;
export function salesData(orders, days) {
  const today = new Date(); today.setHours(0, 0, 0, 0);
  return Array.from({ length: days }, (_, index) => {
    const start = new Date(today); start.setDate(today.getDate() - days + index + 1);
    const end = new Date(start); end.setDate(end.getDate() + 1);
    return { date: start.toLocaleDateString("en-IN", { day: "numeric", month: "short" }), sales: sum(orders.filter(order => new Date(order.createdAt) >= start && new Date(order.createdAt) < end && !/cancel|return|rto/i.test(order.status)), order => order.grandTotal) };
  });
}
export function topProducts(orders) {
  const result = new Map();
  orders.filter(order=>!/cancel|return|rto/i.test(order.status)).forEach(order=>order.items?.forEach(item=>{ const name=item.name || "Product"; const row=result.get(name)||{name,quantity:0}; row.quantity+=Number(item.quantity)||0; result.set(name,row); }));
  return [...result.values()].sort((a,b)=>b.quantity-a.quantity);
}
export function downloadCsv(name, rows) {
  const csv=rows.map(row=>row.map(value=>{let text=String(value??"");if(/^[=+\-@\t\r]/.test(text))text=`'${text}`;return `"${text.replaceAll('"','""')}"`;}).join(",")).join("\r\n");
  const url=URL.createObjectURL(new Blob(["\uFEFF",csv],{type:"text/csv;charset=utf-8;"}));const anchor=document.createElement("a");anchor.href=url;anchor.download=name;anchor.click();setTimeout(()=>URL.revokeObjectURL(url),1000);
}
export function readSaved(key, fallback){try{return JSON.parse(localStorage.getItem(key))??fallback}catch{return fallback}}
