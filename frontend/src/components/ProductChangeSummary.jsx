const labels = {
  shortDescription: "Short description", detailedDescription: "Detailed description", hsnCode: "HSN code",
  actualWeight: "Actual weight", weightUnit: "Weight unit", volumetricWeight: "Volumetric weight",
  dimensionUnit: "Dimension unit", isReturnable: "Return eligibility", returnDays: "Return window",
  prepaidAvailable: "Prepaid availability", codAvailable: "COD availability", rtoApplicable: "RTO applicable",
  manufacturerBrand: "Brand", countryOfOrigin: "Country of origin", offerPrice: "Offer price",
  sellerCosts: "Seller costs", shippingIncludedInPrice: "Shipping included in price", shippingCharge: "Customer shipping charge",
  shippingCost: "Actual shipping cost", shippingPaidBy: "Shipping paid by", shippingMode: "Shipping mode",
  taxCategory: "Tax category", priceIncludesTax: "Price includes tax", displayType: "Display type",
  relatedProducts: "Related products", isStockManageable: "Stock management", lowStockThreshold: "Low-stock threshold",
  backOrderAllowed: "Back orders", variationOptions: "Variation options", mainImage: "Main image",
  imageVariants: "Generated images", videoUrl: "Product video", seo: "SEO details"
};

const clean = (value) => {
  if (Array.isArray(value)) return value.map(clean);
  if (value && typeof value === "object") return Object.fromEntries(Object.entries(value).filter(([key]) => key !== "_id").map(([key, entry]) => [key, clean(entry)]));
  return value ?? null;
};
const same = (left, right) => JSON.stringify(clean(left)) === JSON.stringify(clean(right));
const fallbackChanges = (product) => Object.entries(product.pendingChanges || {}).flatMap(([field, after]) => same(product[field], after) ? [] : [{ field, before: clean(product[field]), after: clean(after) }]);
export const productChanges = (product) => product.pendingChangeLog?.changes?.length ? product.pendingChangeLog.changes : fallbackChanges(product);

const summarize = (value, field) => {
  if (value === null || value === undefined || value === "") return "Not set";
  if (typeof value === "boolean") return value ? "Yes" : "No";
  if (["price", "offerPrice", "shippingCharge", "shippingCost"].includes(field) && Number.isFinite(Number(value))) return new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR" }).format(Number(value));
  if (field === "returnDays") return `${value} days`;
  if (["mainImage", "videoUrl"].includes(field)) return value ? "Uploaded file" : "No file";
  if (field === "media") return `${Array.isArray(value) ? value.length : 0} media file(s)`;
  if (field === "variants") return `${Array.isArray(value) ? value.length : 0} variant(s)`;
  if (field === "variationOptions") return `${Array.isArray(value) ? value.length : 0} option group(s)`;
  if (typeof value === "object") return JSON.stringify(value);
  return String(value);
};

export default function ProductChangeSummary({ product, compact = false }) {
  if (product.approvalStatus === "pending_new") return <span className="newProductChange">New product — review all submitted details</span>;
  const changes = productChanges(product);
  if (!changes.length) return <span>No effective changes detected.</span>;
  if (compact) return <span className="productChangeCount">{changes.length} changed field{changes.length === 1 ? "" : "s"}</span>;
  return <div className="productChangeComparison">{changes.map(({ field, before, after }) => <article key={field}><strong>{labels[field] || field.replace(/([A-Z])/g, " $1").replace(/^./, (letter) => letter.toUpperCase())}</strong><div><span><small>Current</small><del>{summarize(before, field)}</del></span><b aria-hidden="true">→</b><span><small>Seller’s update</small><ins>{summarize(after, field)}</ins></span></div></article>)}</div>;
}
