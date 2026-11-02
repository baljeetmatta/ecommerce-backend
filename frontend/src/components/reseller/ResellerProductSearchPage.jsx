import { useState } from "react";
import { normalizeProductSearch, money } from "./portalUtils.js";
import { storefrontProductUrl } from "../../utils/adminRoutes.js";
import { Search, X, ChevronRight } from "lucide-react";
export default function ResellerProductSearchPage({ products = [], onSelect }) {
  const [query, setQuery] = useState("");
  const searchTerms = normalizeProductSearch(query).split(" ").filter(Boolean);
  const matches = (Array.isArray(products) ? products : []).filter((product) => {
    if (!searchTerms.length) return true;
    const category = product?.category && typeof product.category === "object" ? product.category.name : product?.category;
    const tags = Array.isArray(product?.tags) ? product.tags : [];
    const searchable = normalizeProductSearch([product?.name, product?.sku, product?.shortDescription, product?.manufacturerBrand, product?.seller?.companyName, product?.seller?.sellerNumber, category, ...tags].join(" "));
    return searchTerms.every((term) => searchable.includes(term));
  });
  return <section className="resellerRoutePage resellerSelectPanel" data-route="margin/products">
    <div className="resellerProductSearch"><Search /><input type="text" autoComplete="off" placeholder="Search by product, SKU, category or tag" value={query} onChange={(event) => setQuery(event.currentTarget.value)} />{query && <button type="button" onClick={() => setQuery("")} aria-label="Clear product search"><X /></button>}</div>
    <div className="resellerSelectGrid">{matches.map((product) => <article key={product._id}><div className="resellerSelectVisual">{product.mainImage && <img src={product.mainImage} alt={product.name || "Product"} />}<strong>{money(product.resellerPricing?.basePrice)}</strong><span>Margin up to {money(product.resellerPricing?.maximumMargin)}</span></div><div className="resellerSelectDetails"><small>{product.seller ? "APPROVED SELLER PRODUCT" : "HRSBASKET PRODUCT"}</small><h3><a href={storefrontProductUrl(encodeURIComponent(product._id))} target="_blank" rel="noopener noreferrer">{product.name || "Unnamed product"}</a></h3>{product.sku && <small className="resellerProductSku">SKU: {product.sku}</small>}<dl className="resellerProductFacts">{product.manufacturerBrand && <div><dt>Brand</dt><dd>{product.manufacturerBrand}</dd></div>}<div><dt>Category</dt><dd>{product.category?.name || "—"}</dd></div><div><dt>Sold by</dt><dd>{product.seller?.companyName || "HRSBasket"}</dd></div><div><dt>Stock</dt><dd>{product.isStockManageable ? product.stock : "Available"}</dd></div></dl><button type="button" className="resellerActionGreen" style={{ background: "#18a35b", borderColor: "#18a35b", color: "#fff" }} onClick={() => onSelect(product)}>Select &amp; Set Margin <ChevronRight /></button></div><p className="resellerSelectDescription">{product.shortDescription || "Add this product to your reseller catalog."}</p></article>)}</div>
    {!matches.length && <div className="resellerCatalogEmpty"><Search /><h3>No matching products</h3><p>Try a product name, SKU, category, or tag.</p><button type="button" onClick={() => setQuery("")}>Clear search</button></div>}
  </section>;
}
