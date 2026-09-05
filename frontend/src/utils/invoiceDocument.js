const esc = (value = "") => String(value).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
const money = (value) => new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 2 }).format(Number(value) || 0);
const roundMoney = (value) => Math.round((Number(value) + Number.EPSILON) * 100) / 100;
const splitGst = (gstAmount) => {
  const totalPaise = Math.round((Number(gstAmount) || 0) * 100);
  const cgstPaise = Math.ceil(totalPaise / 2);
  return { cgst: cgstPaise / 100, sgst: (totalPaise - cgstPaise) / 100 };
};
const normalizedState = (state) => String(state || "").trim().toLowerCase().replace(/[^a-z0-9]/g, "");
const invoiceItemTax = (item) => {
  const price = Number(item.price || 0);
  const rate = Math.max(0, Number(item.gstRate || 0));
  const savedTaxable = Number(item.taxableValue || 0);
  const savedGst = Number(item.gstAmount || 0);
  if (!rate) return { taxableValue: price, gstAmount: 0, rate };
  if (savedTaxable > 0 && savedGst > 0) return { taxableValue: savedTaxable, gstAmount: savedGst, rate };
  const taxableValue = roundMoney(price / (1 + rate / 100));
  return { taxableValue, gstAmount: roundMoney(price - taxableValue), rate };
};

export const invoiceHtml = (order) => {
  const items = order.items || [];
  const subtotal = roundMoney(items.reduce((sum, item) => sum + invoiceItemTax(item).taxableValue * Number(item.quantity || 1), 0));
  const tax = roundMoney(items.reduce((sum, item) => sum + invoiceItemTax(item).gstAmount * Number(item.quantity || 1), 0));
  const customerShippingItems = items.filter((item) => item.shippingPaidBy === "customer" || ["fixed_customer", "realtime_customer"].includes(item.shippingMode));
  const shipping = roundMoney(customerShippingItems.length
    ? customerShippingItems.reduce((sum, item) => sum + Number(item.shippingCharge || 0) * Number(item.quantity || 1), 0)
    : Number(order.shippingTotal ?? order.shipping?.amount ?? 0));
  const customerPaysCod = order.codChargePaidBy === "customer" || items.some((item) => item.codChargePaidBy === "customer");
  const codCharge = customerPaysCod ? Number(order.codCharge || 0) : 0;
  const discount = Math.max(0, Number(order.discountTotal || 0));
  const shippingModes = new Set(items.map((item) => item.shippingMode).filter(Boolean));
  const shippingMethod = shippingModes.has("realtime_customer")
    ? "Real-time Shiprocket — charged to customer"
    : shippingModes.has("free_realtime")
      ? "Real-time Shiprocket — free to customer (seller paid)"
      : shipping > 0
        ? "Shipping charged to customer"
        : "Free shipping";
  const total = roundMoney(Math.max(0, subtotal + tax + shipping + codCharge - discount));
  const invoiceStore = order.invoiceStore || {};
  const store = { ...invoiceStore, phone: "", address: [invoiceStore.sellerName || invoiceStore.shopName, invoiceStore.sellerAddress || invoiceStore.address].filter(Boolean).join(" · "), gstNumber: invoiceStore.sellerGstNumber || invoiceStore.gstNumber };
  const address = order.address || {};
  const hasGst = Boolean(store.gstNumber) && tax > 0;
  const sellerState = normalizedState(invoiceStore.sellerState);
  const buyerState = normalizedState(address.state);
  const isInterstate = Boolean(sellerState && buyerState && sellerState !== buyerState);
  const fallbackLogo = `data:image/svg+xml,${encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" width="190" height="54"><rect width="54" height="54" rx="14" fill="#16a34a"/><text x="65" y="34" font-family="Arial" font-size="22" font-weight="700">HRSBASKET</text></svg>')}`;
  const logo = store.logoUrl ? (() => { try { const apiOrigin = new URL(String(window.__HRS_API_URL__ || import.meta.env.VITE_API_URL || (window.location.hostname === "localhost" ? "http://localhost:5001/api" : "https://ebackend.hrsbasket.com/api"))).origin; return new URL(store.logoUrl, store.logoUrl.startsWith("/uploads/") || store.logoUrl.startsWith("/api/") ? apiOrigin : window.location.origin).href; } catch (_error) { return fallbackLogo; } })() : fallbackLogo;
  const issueDate = new Date(order.invoiceGeneratedAt || order.createdAt || Date.now()).toLocaleString("en-IN", { day: "numeric", month: "long", year: "numeric", hour: "2-digit", minute: "2-digit", hour12: true });
  const rows = items.map((item) => `<tr><td><strong>${esc(item.name)}</strong><small>SKU: ${esc(item.sku)}</small></td><td>${item.quantity}</td><td>${money(item.price)}</td>${hasGst ? `<td>${Number(item.gstRate || 0)}%</td>` : ""}<td>${money(item.price * item.quantity)}</td></tr>`).join("");
  const gstHeader = hasGst ? "<th>Tax</th>" : "";
  const codTotal = codCharge > 0 ? `<tr><td>COD charges (paid by customer)</td><td>${money(codCharge)}</td></tr>` : "";
  const taxByRate = items.reduce((rates, item) => {
    const { rate, gstAmount } = invoiceItemTax(item);
    const amount = roundMoney(gstAmount * Number(item.quantity || 1));
    if (rate > 0 && amount > 0) rates.set(rate, roundMoney((rates.get(rate) || 0) + amount));
    return rates;
  }, new Map());
  const gstSplitRows = [...taxByRate.entries()].map(([rate, amount]) => {
    if (isInterstate) return `<tr><td>IGST @ ${Number(rate)}%</td><td>${money(amount)}</td></tr>`;
    const { cgst, sgst } = splitGst(amount);
    const halfRate = Number((rate / 2).toFixed(3));
    return `<tr><td>CGST @ ${halfRate}%</td><td>${money(cgst)}</td></tr><tr><td>SGST @ ${halfRate}%</td><td>${money(sgst)}</td></tr>`;
  }).join("");
  const gstTotals = `${hasGst ? `<tr><td>Taxable value</td><td>${money(subtotal)}</td></tr>${gstSplitRows}<tr><td>Total GST</td><td>${money(tax)}</td></tr>` : ""}${discount > 0 ? `<tr><td>Discount</td><td>− ${money(discount)}</td></tr>` : ""}${codTotal}`;
  return `<!doctype html><html><head><title>Invoice ${esc(order.invoiceNumber || order.orderNumber)}</title><meta name="viewport" content="width=device-width"><style>@page{size:A4;margin:0}*{box-sizing:border-box}body{margin:0;background:#eee;color:#111;font:14px Arial,sans-serif}.page{position:relative;width:210mm;min-height:297mm;margin:auto;padding:16mm 17mm;background:#fff}.top{display:flex;justify-content:space-between}.top h1{margin:0;font-size:29px}.logo{width:122px;max-height:68px;object-fit:contain}.meta{margin-top:28px;border-collapse:collapse}.meta td{padding:3px 13px 3px 0}.meta td:first-child{font-weight:700}.addresses{display:grid;grid-template-columns:1fr 1fr;gap:70px;margin-top:28px;line-height:1.55}.addresses h3{margin:0 0 8px;font-size:14px}.addresses p{margin:0}.items{width:100%;border-collapse:collapse}.items th{padding:8px 0;border-bottom:1px solid;text-align:right;font-size:12px;font-weight:400}.items th:first-child,.items td:first-child{text-align:left}.items td{padding:11px 0;text-align:right;vertical-align:top}.items small{display:block;margin-top:4px}.totals{width:50%;margin:15px 0 0 auto;border-collapse:collapse}.totals td{padding:5px 0;border-top:1px solid #ddd}.totals td:last-child{text-align:right}.totals .amountDue{font-weight:800;border-top:1px solid #111}.pageNumber{position:absolute;right:17mm;bottom:12mm;font-size:11px}@media print{body{background:#fff}.page{margin:0}}@media(max-width:760px){.page{width:100%;min-height:100vh;padding:24px 18px}.addresses{gap:20px}.totals{width:72%}}</style></head><body><main class="page"><header class="top"><h1>Invoice</h1><img class="logo" src="${esc(logo)}" alt="HRSBasket logo"></header><table class="meta"><tr><td>Invoice number</td><td><strong>${esc(order.invoiceNumber || order.orderNumber)}</strong></td></tr><tr><td>Date of issue</td><td>${issueDate}</td></tr><tr><td>Shipping method</td><td>${esc(shippingMethod)}</td></tr></table><section class="addresses"><div><h3>Seller Address</h3><p>${esc(store.address || "India")}<br>${esc(store.email || "")}<br>${esc(store.phone || "")}${hasGst ? `<br>GSTIN ${esc(store.gstNumber)}` : ""}</p></div><div><h3>Bill to</h3><p>${esc(order.customer?.name || address.name || "Customer")}<br>${esc(address.shippingAddress || address.billingAddress || "")}<br>${esc([address.city, address.state, address.postalCode].filter(Boolean).join(", "))}<br>India<br>${esc(order.customer?.email || address.email || "")}</p></div></section><table class="items"><thead><tr><th>Description</th><th>Qty</th><th>Unit price</th>${gstHeader}<th>Amount</th></tr></thead><tbody>${rows}</tbody></table><table class="totals">${hasGst ? "" : `<tr><td>Subtotal</td><td>${money(subtotal)}</td></tr>`}${gstTotals}<tr><td>Shipping</td><td>${shipping ? money(shipping) : "Free"}</td></tr><tr><td>Total</td><td>${money(total)}</td></tr><tr class="amountDue"><td>Amount due</td><td>${money(total)}</td></tr></table><span class="pageNumber">Page 1 of 1</span></main></body></html>`;
};

export const openInvoice = (order, autoPrint = false) => {
  const popup = window.open("", "_blank", "width=1200,height=900");
  if (!popup) throw new Error("Allow pop-ups to view this invoice");
  popup.opener = null;
  popup.document.write(invoiceHtml(order));
  const readableStyle = popup.document.createElement("style");
  readableStyle.textContent = "body{font-size:16px;line-height:1.45}.page{width:min(100%,210mm);padding:14mm 15mm}.items{margin-top:20px}.items th{font-size:14px;font-weight:700}.items td{padding:14px 0}.totals td{padding:8px 0}@media(max-width:760px){body{background:#fff}.addresses{grid-template-columns:1fr;gap:20px}.totals{width:100%}}";
  popup.document.head.appendChild(readableStyle);
  popup.document.close();
  popup.focus();
  if (autoPrint) { const logo = popup.document.querySelector(".logo"); const print = () => popup.print(); if (logo && !logo.complete) { logo.addEventListener("load", print, { once: true }); logo.addEventListener("error", print, { once: true }); window.setTimeout(print, 2000); } else window.setTimeout(print, 250); }
};
