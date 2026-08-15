const esc = (value = "") => String(value).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
const money = (value) => new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 2 }).format(Number(value) || 0);

export const invoiceHtml = (order) => {
  const items = order.items || [];
  const subtotal = items.reduce((sum, item) => sum + Number(item.taxableValue ?? item.price) * Number(item.quantity || 1), 0);
  const tax = items.reduce((sum, item) => sum + Number(item.gstAmount || 0) * Number(item.quantity || 1), 0);
  const shipping = Number(order.shipping?.amount || order.shippingTotal || 0);
  const codCharge = Number(order.codCharge || 0);
  const shippingModes = new Set(items.map((item) => item.shippingMode).filter(Boolean));
  const shippingMethod = shippingModes.has("realtime_customer")
    ? "Real-time Shiprocket — charged to customer"
    : shippingModes.has("free_realtime")
      ? "Real-time Shiprocket — free to customer (seller paid)"
      : shipping > 0
        ? "Shipping charged to customer"
        : "Free shipping";
  const total = Number(order.grandTotal || subtotal + tax + shipping + codCharge);
  const invoiceStore = order.invoiceStore || {};
  const store = { ...invoiceStore, address: [invoiceStore.sellerName || invoiceStore.shopName, invoiceStore.sellerAddress || invoiceStore.address].filter(Boolean).join(" · "), gstNumber: invoiceStore.sellerGstNumber || invoiceStore.gstNumber };
  const address = order.address || {};
  const hasGst = Boolean(store.gstNumber) && tax > 0;
  const fallbackLogo = `data:image/svg+xml,${encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" width="190" height="54"><rect width="54" height="54" rx="14" fill="#16a34a"/><text x="65" y="34" font-family="Arial" font-size="22" font-weight="700">HRSBASKET</text></svg>')}`;
  const logo = store.logoUrl ? (() => { try { const apiOrigin = new URL(String(window.__HRS_API_URL__ || import.meta.env.VITE_API_URL || (window.location.hostname === "localhost" ? "http://localhost:5001/api" : "https://ebackend.hrsbasket.com/api"))).origin; return new URL(store.logoUrl, store.logoUrl.startsWith("/uploads/") || store.logoUrl.startsWith("/api/") ? apiOrigin : window.location.origin).href; } catch (_error) { return fallbackLogo; } })() : fallbackLogo;
  const issueDate = new Date(order.invoiceGeneratedAt || order.createdAt || Date.now()).toLocaleString("en-IN", { day: "numeric", month: "long", year: "numeric", hour: "2-digit", minute: "2-digit", hour12: true });
  const rows = items.map((item) => `<tr><td><strong>${esc(item.name)}</strong><small>SKU: ${esc(item.sku)}</small></td><td>${item.quantity}</td><td>${money(item.price)}</td>${hasGst ? `<td>${Number(item.gstRate || 0)}%</td>` : ""}<td>${money(item.price * item.quantity)}</td></tr>`).join("");
  const gstHeader = hasGst ? "<th>Tax</th>" : "";
  const codTotal = codCharge > 0 ? `<tr><td>COD charges</td><td>${money(codCharge)}</td></tr>` : "";
  const gstTotals = `${hasGst ? `<tr><td>Total excluding tax</td><td>${money(subtotal)}</td></tr><tr><td>GST</td><td>${money(tax)}</td></tr>` : ""}${codTotal}`;
  return `<!doctype html><html><head><title>Invoice ${esc(order.invoiceNumber || order.orderNumber)}</title><meta name="viewport" content="width=device-width"><style>@page{size:A4;margin:0}*{box-sizing:border-box}body{margin:0;background:#eee;color:#111;font:14px Arial,sans-serif}.page{position:relative;width:210mm;min-height:297mm;margin:auto;padding:16mm 17mm;background:#fff}.top{display:flex;justify-content:space-between}.top h1{margin:0;font-size:29px}.logo{width:122px;max-height:68px;object-fit:contain}.meta{margin-top:28px;border-collapse:collapse}.meta td{padding:3px 13px 3px 0}.meta td:first-child{font-weight:700}.addresses{display:grid;grid-template-columns:1fr 1fr;gap:70px;margin-top:28px;line-height:1.55}.addresses h3{margin:0 0 8px;font-size:14px}.addresses p{margin:0}.items{width:100%;border-collapse:collapse}.items th{padding:8px 0;border-bottom:1px solid;text-align:right;font-size:12px;font-weight:400}.items th:first-child,.items td:first-child{text-align:left}.items td{padding:11px 0;text-align:right;vertical-align:top}.items small{display:block;margin-top:4px}.totals{width:50%;margin:15px 0 0 auto;border-collapse:collapse}.totals td{padding:5px 0;border-top:1px solid #ddd}.totals td:last-child{text-align:right}.totals .amountDue{font-weight:800;border-top:1px solid #111}.pageNumber{position:absolute;right:17mm;bottom:12mm;font-size:11px}@media print{body{background:#fff}.page{margin:0}}@media(max-width:760px){.page{width:100%;min-height:100vh;padding:24px 18px}.addresses{gap:20px}.totals{width:72%}}</style></head><body><main class="page"><header class="top"><h1>Invoice</h1><img class="logo" src="${esc(logo)}" alt="HRSBasket logo"></header><table class="meta"><tr><td>Invoice number</td><td><strong>${esc(order.invoiceNumber || order.orderNumber)}</strong></td></tr><tr><td>Date of issue</td><td>${issueDate}</td></tr><tr><td>Shipping method</td><td>${esc(shippingMethod)}</td></tr></table><section class="addresses"><div><h3>Seller Address</h3><p>${esc(store.address || "India")}<br>${esc(store.email || "")}<br>${esc(store.phone || "")}${hasGst ? `<br>GSTIN ${esc(store.gstNumber)}` : ""}</p></div><div><h3>Bill to</h3><p>${esc(order.customer?.name || address.name || "Customer")}<br>${esc(address.shippingAddress || address.billingAddress || "")}<br>${esc([address.city, address.state, address.postalCode].filter(Boolean).join(", "))}<br>India<br>${esc(order.customer?.email || address.email || "")}</p></div></section><table class="items"><thead><tr><th>Description</th><th>Qty</th><th>Unit price</th>${gstHeader}<th>Amount</th></tr></thead><tbody>${rows}</tbody></table><table class="totals"><tr><td>Subtotal</td><td>${money(subtotal)}</td></tr>${gstTotals}<tr><td>Shipping</td><td>${shipping ? money(shipping) : "Free"}</td></tr><tr><td>Total</td><td>${money(total)}</td></tr><tr class="amountDue"><td>Amount due</td><td>${money(total)}</td></tr></table><span class="pageNumber">Page 1 of 1</span></main></body></html>`;
};

export const openInvoice = (order, autoPrint = false) => {
  const popup = window.open("", "_blank", "width=1000,height=850");
  if (!popup) throw new Error("Allow pop-ups to view this invoice");
  popup.opener = null;
  popup.document.write(invoiceHtml(order));
  popup.document.close();
  popup.focus();
  if (autoPrint) { const logo = popup.document.querySelector(".logo"); const print = () => popup.print(); if (logo && !logo.complete) { logo.addEventListener("load", print, { once: true }); logo.addEventListener("error", print, { once: true }); window.setTimeout(print, 2000); } else window.setTimeout(print, 250); }
};
