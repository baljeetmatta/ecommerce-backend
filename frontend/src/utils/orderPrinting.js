import { money } from "./currency.js";

export const escapeHtml = (value = "") =>
  String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");

export const printableMediaUrl = (value = "") => {
  if (!value) return "/images/e-commerce/logo.svg";
  try { const apiOrigin = new URL(String(window.__HRS_API_URL__ || import.meta.env.VITE_API_URL || (window.location.hostname === "localhost" ? "http://localhost:5001/api" : "https://ebackend.hrsbasket.com/api"))).origin; return new URL(value, value.startsWith("/uploads/") || value.startsWith("/api/") ? apiOrigin : window.location.origin).href; }
  catch (_error) { return "/images/e-commerce/logo.svg"; }
};

export const printHtml = (title, body) => {
  const frame = document.createElement("iframe");
  frame.style.position = "fixed";
  frame.style.right = "0";
  frame.style.bottom = "0";
  frame.style.width = "0";
  frame.style.height = "0";
  frame.style.border = "0";
  document.body.appendChild(frame);
  const doc = frame.contentWindow.document;
  doc.open();
  doc.write(`<!doctype html><html><head><title>${escapeHtml(title)}</title><style>
    body{font-family:Inter,Arial,sans-serif;color:#17211d;margin:0;padding:32px}
    .top{display:flex;justify-content:space-between;gap:24px;border-bottom:2px solid #17211d;padding-bottom:18px;margin-bottom:22px}
    img.logo{max-width:140px;max-height:72px;object-fit:contain}
    h1,h2,h3,p{margin:0} h1{font-size:28px} h2{font-size:18px;margin-bottom:10px}
    .muted{color:#68746e;line-height:1.5}.grid{display:grid;grid-template-columns:1fr 1fr;gap:18px;margin-bottom:22px}
    table{width:100%;border-collapse:collapse;margin-top:12px} th,td{border-bottom:1px solid #dfe5e1;padding:10px;text-align:left}
    th{font-size:12px;text-transform:uppercase;color:#68746e}.totals{margin-left:auto;width:320px;margin-top:18px}
    .totals div{display:flex;justify-content:space-between;padding:8px 0;border-bottom:1px solid #dfe5e1}.strong{font-weight:800}
    @media print{button{display:none} body{padding:18px}}
  </style></head><body>${body}</body></html>`);
  doc.close();
  window.setTimeout(() => {
    frame.contentWindow.focus();
    frame.contentWindow.print();
    window.setTimeout(() => frame.remove(), 1000);
  }, 150);
};

export const printInvoice = (order) => {
  const store = order.invoiceStore || {};
  const customerCodCharge = order.codChargePaidBy === "customer" ? Number(order.codCharge || 0) : 0;
  const hasGst = Boolean(store.sellerGstNumber) && Number(order.taxTotal || 0) > 0;
  const rows = (order.items || [])
    .map(
      (item) => `<tr><td>${escapeHtml(item.name)}</td><td>${escapeHtml(item.sku)}</td><td>${item.quantity}</td><td>${money((item.taxableValue ?? item.price - (item.gstAmount || 0)) * item.quantity)}</td>${hasGst ? `<td>${item.gstRate || 0}%</td><td>${money((item.gstAmount || 0) * item.quantity)}</td>` : ""}<td>${money(item.price * item.quantity)}</td></tr>`
    )
    .join("");
  printHtml(
    `Invoice ${order.invoiceNumber || order.orderNumber}`,
    `<section class="top">
      <div>
        <img class="logo" src="${escapeHtml(printableMediaUrl(store.logoUrl))}" alt="HRSBasket logo">
        <h1>${escapeHtml(store.shopName || "Store Invoice")}</h1>
      </div>
      <div>
        <h2>${hasGst ? "Tax Invoice" : "Invoice"}</h2>
        <p><span class="strong">Invoice:</span> ${escapeHtml(order.invoiceNumber || "")}</p>
        <p><span class="strong">Order:</span> ${escapeHtml(order.orderNumber)}</p>
        <p><span class="strong">Date:</span> ${new Date(order.invoiceGeneratedAt || Date.now()).toLocaleDateString("en-IN")}</p>
      </div>
    </section>
    <section class="grid">
      <div><h2>Seller Address</h2><p class="muted">${escapeHtml(store.sellerName || "Seller")}<br>${escapeHtml(store.sellerAddress || "—")}${store.sellerGstNumber ? `<br>GSTIN: ${escapeHtml(store.sellerGstNumber)}` : ""}</p></div>
      <div><h2>Customer Address</h2><p class="muted">${escapeHtml(order.customer?.name || order.address?.name || "Customer")}<br>${escapeHtml(order.address?.shippingAddress || order.address?.billingAddress || "")}<br>${escapeHtml([order.address?.city, order.address?.state, order.address?.postalCode].filter(Boolean).join(", "))}<br>${escapeHtml(order.customer?.email || order.address?.email || "")}</p></div>
    </section>
    <table><thead><tr><th>Item</th><th>SKU</th><th>Qty</th><th>${hasGst ? "Taxable value" : "Item total"}</th>${hasGst ? "<th>GST rate</th><th>GST collected</th>" : ""}<th>${hasGst ? "GST-inclusive total" : "Total"}</th></tr></thead><tbody>${rows}</tbody></table>
    <section class="totals">
      <div><span>${hasGst ? "Taxable subtotal" : "Subtotal"}</span><strong>${money(order.subtotal)}</strong></div>
      <div><span>Shipping</span><strong>${money(order.shippingTotal)}</strong></div>
      ${customerCodCharge > 0 ? `<div><span>COD charges</span><strong>${money(customerCodCharge)}</strong></div>` : ""}
      ${hasGst ? `<div><span>GST collected</span><strong>${money(order.taxTotal)}</strong></div>` : ""}
      <div><span>Total</span><strong>${money(order.grandTotal)}</strong></div>
    </section>`
  );
};

export const printPendingItems = (items) => {
  const rows = items
    .map((item) => `<tr><td>${escapeHtml(item.sku)}</td><td>${escapeHtml(item.name)}</td><td>${item.quantity}</td><td>${item.orderCount}</td><td>${escapeHtml(item.orderNumbers?.join(", ") || "")}</td></tr>`)
    .join("");
  printHtml(
    "Pending Items",
    `<section class="top"><div><h1>Pending Item Grouping</h1><p class="muted">Items required for pending and processing orders.</p></div><div><p>${new Date().toLocaleString("en-IN")}</p></div></section>
    <table><thead><tr><th>SKU</th><th>Item</th><th>Qty Required</th><th>Orders</th><th>Order Numbers</th></tr></thead><tbody>${rows}</tbody></table>`
  );
};
