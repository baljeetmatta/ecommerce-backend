import { useEffect, useState } from "react";
import { Eye, Search, X } from "lucide-react";
import { api } from "../services/api.js";
import TablePagination from "../components/TablePagination.jsx";
import { isSaveMessage, showToast } from "../utils/toast.js";
import ProductChangeSummary from "../components/ProductChangeSummary.jsx";

const money = (value) => new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR" }).format(value || 0);

export default function SellerProductsAdminPage() {
  const [products, setProducts] = useState([]);
  const [selected, setSelected] = useState(null);
  const [search, setSearch] = useState("");
  const [message, setMessage] = useState("");
  useEffect(() => {
    if (isSaveMessage(message)) showToast(message);
  }, [message]);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const load = async () => setProducts(await api.pendingSellerProducts());
  useEffect(() => { load().catch((error) => setMessage(error.message)); }, []);
  const act = async (action) => {
    try {
      await action();
      setSelected(null);
      await load();
      setMessage("Product approval updated.");
    } catch (error) {
      const errorMessage = error?.message || "Unable to update the seller product approval.";
      setMessage(errorMessage);
      showToast(errorMessage, "error");
    }
  };
  const filtered = products.filter((product) => `${product.name} ${product.sku} ${product.seller?.companyName} ${product.seller?.sellerNumber}`.toLowerCase().includes(search.toLowerCase()));
  const pageCount = Math.max(1, Math.ceil(filtered.length / pageSize));
  const safePage = Math.min(page, pageCount);
  const visibleProducts = filtered.slice((safePage - 1) * pageSize, safePage * pageSize);
  useEffect(() => { setPage(1); }, [search, pageSize]);
  return <section><div className="partnerTableToolbar"><label className="searchBox"><Search size={16} /><input placeholder="Search pending product, SKU or seller" value={search} onChange={(event) => setSearch(event.target.value)} /></label><span>{filtered.length} pending approval{filtered.length === 1 ? "" : "s"}</span></div>{message && <div className="notice">{message}</div>}<div className="panel tableWrap"><table><thead><tr><th>Product</th><th>Seller</th><th>Type</th><th>Sale price</th><th>Status</th><th>Changes</th><th>Details</th></tr></thead><tbody>{visibleProducts.map((product) => { const proposed = product.pendingChanges || product; return <tr className={product.approvalStatus === "pending_update" ? "sellerProductChangedRow" : ""} key={product._id}><td><strong>{proposed.name || product.name}</strong><br />{proposed.sku || product.sku}</td><td>{product.seller?.companyName}<br />ID {product.seller?.sellerNumber}</td><td>{proposed.displayType || product.displayType}</td><td>{money(proposed.offerPrice || proposed.price || product.offerPrice || product.price)}</td><td>{product.approvalStatus.replaceAll("_", " ")}</td><td><ProductChangeSummary product={product} compact /></td><td><button className="detailsButton" title="View product and seller details" onClick={() => setSelected(product)}><Eye size={18} /></button></td></tr>; })}{!filtered.length && <tr><td colSpan="7">No seller products are currently pending.</td></tr>}</tbody></table><TablePagination total={filtered.length} page={safePage} pageSize={pageSize} onPageChange={setPage} onPageSizeChange={setPageSize} /></div>{selected && <SellerProductApproval product={selected} close={() => setSelected(null)} approve={() => act(() => api.approveSellerProduct(selected.seller._id, selected._id))} reject={() => { const reason = window.prompt("Reason shown to the seller for rejection:"); if (reason?.trim()) act(() => api.rejectSellerProduct(selected.seller._id, selected._id, reason.trim())); }} />}</section>;
}

function SellerProductApproval({ product, close, approve, reject }) {
  const proposed = product.pendingChanges ? { ...product, ...product.pendingChanges } : product;
  const seller = product.seller || {};
  const mainImage = proposed.mainImage || product.mainImage;
  const gallery = (proposed.media || []).filter((item) => item.type !== "video" && !item.isMain && item.url !== mainImage);
  return <div className="partnerDetailsOverlay" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) close(); }}><section className="partnerDetailsDialog sellerProductDialog" role="dialog" aria-modal="true">
    <header><div><h2>{proposed.name || product.name}</h2><p>{product.approvalStatus.replaceAll("_", " ")} · SKU {proposed.sku || product.sku}</p></div><button className="detailsButton" onClick={close}><X size={20} /></button></header>
    <div className="sellerProductPreview">{mainImage && <img src={mainImage} alt={proposed.name || product.name} />}{(proposed.displayType || product.displayType) === "Reel" && (proposed.videoUrl || product.videoUrl) && <video controls src={proposed.videoUrl || product.videoUrl} />}</div>
    {gallery.length > 0 && <section className="sellerApprovalGallery"><h3>Gallery images ({gallery.length})</h3><div>{gallery.map((item,index)=><figure key={`${item.url}-${index}`}><img src={item.url} alt={item.alt || `${proposed.name} gallery ${index+1}`}/><figcaption>{item.alt || `Gallery image ${index+1}`}</figcaption></figure>)}</div></section>}
    {product.pendingChanges && <section className="productChangesPanel"><h3>Changes submitted by seller</h3><p>Compare the currently published value with the seller’s proposed update.</p><ProductChangeSummary product={product} /></section>}
    <div className="twoColumn"><div className="panel"><h3>Proposed product details</h3><dl className="partnerDetailsGrid single"><dt>Name</dt><dd>{proposed.name || product.name}</dd><dt>SKU</dt><dd>{proposed.sku || product.sku}</dd><dt>Type</dt><dd>{proposed.displayType || product.displayType}</dd><dt>Price</dt><dd>{money(proposed.price || product.price)}</dd><dt>Offer</dt><dd>{money(proposed.offerPrice || product.offerPrice || proposed.price || product.price)}</dd><dt>Stock</dt><dd>{proposed.stock ?? product.stock}</dd><dt>Description</dt><dd>{proposed.detailedDescription || product.detailedDescription}</dd></dl></div><div className="panel"><h3>Seller details</h3><dl className="partnerDetailsGrid single"><dt>Company</dt><dd>{seller.companyName}</dd><dt>Seller ID</dt><dd>{seller.sellerNumber}</dd><dt>Email</dt><dd>{seller.email}</dd><dt>Mobile</dt><dd>{seller.mobile}</dd><dt>GST</dt><dd>{seller.gstNumber || "Non-GST"}</dd><dt>Approval</dt><dd>{seller.approvalStatus}</dd><dt>Commission</dt><dd>{seller.commissionRate ?? 20}%</dd></dl></div></div>
    <div className="kycActions"><button className="primaryButton" onClick={approve}>Approve product</button><button className="secondaryButton" onClick={reject}>Reject with reason</button></div>
  </section></div>;
}
