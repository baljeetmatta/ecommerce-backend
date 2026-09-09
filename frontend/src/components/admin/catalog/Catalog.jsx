import { useState, useMemo, lazy } from "react";
import { getCategoryName, getProductThumb } from "./catalogUtils.js";
import { optimizeImage } from "../../../utils/imageOptimizer.js";
import { Search, Plus, FileText, Trash2, ImagePlus, Save } from "lucide-react";
import { money } from "../../../utils/currency.js";
import ConfirmDeleteModal from "../shared/ConfirmDeleteModal.jsx";

const CategoryTreeSelect = lazy(() => import("../../CategoryTreeSelect.jsx"));
const DataTable = lazy(() => import("../../DataTable.jsx"));
const TablePagination = lazy(() => import("../../TablePagination.jsx"));
const GstPricePreview = lazy(() => import("../../GstPricePreview.jsx"));

export default function Catalog({ products, categories, taxCategories, pagination, onPageChange, loading, query, setQuery, ownerFilter, sellerFilter, onOwnerFilter, onAddProduct, onFeature, onUpdateProduct, onEditProduct, onDeleteProduct, onCategories, onTaxCategories }) {
  const [editing, setEditing] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [imageStatus, setImageStatus] = useState("");
  const [sellerId, setSellerId] = useState(sellerFilter || "");
  const [catalogFilters, setCatalogFilters] = useState({ category: "", tax: "", status: "", missingImage: false });
  const visibleProducts = useMemo(() => products.filter((product) => {
    const text = query.trim().toLowerCase();
    const textMatch = !text || [product.name, product.sku, getCategoryName(product.category), product.taxCategory?.name, product.taxCategory?.code].join(" ").toLowerCase().includes(text);
    const categoryMatch = !catalogFilters.category || String(product.category?._id || product.category || "") === catalogFilters.category;
    const taxMatch = !catalogFilters.tax || (catalogFilters.tax === "none" ? !product.taxCategory : String(product.taxCategory?._id || product.taxCategory || "") === catalogFilters.tax);
    const statusMatch = !catalogFilters.status || product.status === catalogFilters.status;
    const imageMatch = !catalogFilters.missingImage || !getProductThumb(product);
    return textMatch && categoryMatch && taxMatch && statusMatch && imageMatch;
  }), [products, query, catalogFilters]);

  const updateEditingMedia = (patch) => setEditing((current) => ({ ...current, ...patch }));

  const handleEditMainImage = async (event) => {
    const file = event.target.files?.[0];
    if (!file || !editing) return;
    setImageStatus("Optimizing main image...");
    try {
      const optimized = await optimizeImage(file, { purpose: "product-main" });
      setEditing((current) => ({
        ...current,
        mainImage: optimized.url,
        imageVariants: optimized.variants || {},
        media: [
          { url: optimized.url, type: "image", isMain: true, alt: current.name || optimized.name },
          ...(current.media || []).filter((item) => !item.isMain)
        ]
      }));
      setImageStatus(`Main image uploaded and optimized from ${optimized.width}x${optimized.height}.`);
    } catch (error) {
      setImageStatus(error.message || "Unable to upload the main image.");
      event.target.value = "";
    }
  };

  const handleEditGalleryImages = async (event) => {
    const files = Array.from(event.target.files || []);
    if (!files.length || !editing) return;
    setImageStatus(`Optimizing ${files.length} gallery image${files.length > 1 ? "s" : ""}...`);
    const optimizedImages = await Promise.all(files.map((file) => optimizeImage(file)));
    setEditing((current) => ({
      ...current,
      media: [
        ...(current.media || []),
        ...optimizedImages.map((image) => ({
          url: image.url,
          type: "image",
          isMain: false,
          alt: current.name || image.name
        }))
      ]
    }));
    setImageStatus(`${optimizedImages.length} gallery image${optimizedImages.length > 1 ? "s" : ""} optimized.`);
  };

  const setEditMainMedia = (index) => {
    setEditing((current) => {
      const media = (current.media || []).map((item, itemIndex) => ({ ...item, isMain: itemIndex === index }));
      return { ...current, media, mainImage: media[index]?.url || current.mainImage || "" };
    });
  };

  const removeEditMedia = (index) => {
    setEditing((current) => {
      const media = (current.media || []).filter((_item, itemIndex) => itemIndex !== index);
      const currentMainRemoved = current.media?.[index]?.isMain;
      const nextMedia = currentMainRemoved && media.length ? media.map((item, itemIndex) => ({ ...item, isMain: itemIndex === 0 })) : media;
      return {
        ...current,
        media: nextMedia,
        mainImage: nextMedia.find((item) => item.isMain)?.url || nextMedia[0]?.url || ""
      };
    });
  };

  const submitEdit = async (event) => {
    event.preventDefault();
    await onUpdateProduct(editing, {
      name: editing.name,
      sku: editing.sku,
      price: Number(editing.price),
      costPrice: Number(editing.costPrice),
      offerPrice: Number(editing.offerPrice || editing.price),
      status: editing.status,
      category: editing.category?._id || editing.category,
      taxCategory: editing.taxCategory?._id || editing.taxCategory || undefined,
      priceIncludesTax: editing.priceIncludesTax !== false,
      shortDescription: editing.shortDescription,
      detailedDescription: editing.detailedDescription,
      videoUrl: editing.videoUrl || undefined,
      mainImage: editing.mainImage || editing.media?.find((item) => item.isMain)?.url || "",
      imageVariants: editing.imageVariants || {},
      media: editing.media || []
    });
    setEditing(null);
    setImageStatus("");
  };

  return (
    <section className="contentStack">
      {!editing && <div className="panel">
        <div className="panelHeader">
          <h2>Products</h2>
          <div className="toolbar">
            <label className="searchBox">
              <Search size={16} />
              <input placeholder="Search name, SKU, tax or category" value={query} onChange={(event) => setQuery(event.target.value)} />
            </label>
            <button className="primaryButton" type="button" onClick={onAddProduct}>
              <Plus size={18} /> Add Product
            </button>
            <button className="inlineButton" type="button" onClick={onCategories}>Categories</button>
            <button className="inlineButton" type="button" onClick={onTaxCategories}>Tax</button>
          </div>
        </div>
        <div className="catalogFilters">
          <label>Product owner<select value={ownerFilter} onChange={(event) => onOwnerFilter({ owner: event.target.value, seller: event.target.value === "seller" ? sellerId : "" })}><option value="">Admin &amp; sellers</option><option value="admin">Admin only</option><option value="seller">Seller only</option></select></label>
          <label>Seller ID<div className="searchBox"><input placeholder="e.g. HRS000123" value={sellerId} onChange={(event) => setSellerId(event.target.value.toUpperCase())} onKeyDown={(event) => { if (event.key === "Enter") { event.preventDefault(); onOwnerFilter({ owner: "seller", seller: sellerId }); } }} /><button type="button" title="Filter by seller ID" onClick={() => onOwnerFilter({ owner: "seller", seller: sellerId })}><Search size={16} /></button></div></label>
          <label>Category<CategoryTreeSelect categories={categories} value={catalogFilters.category} onChange={(category) => setCatalogFilters({ ...catalogFilters, category })} placeholder="All categories" clearLabel="All categories" /></label>
          <label>Tax<select value={catalogFilters.tax} onChange={(event) => setCatalogFilters({ ...catalogFilters, tax: event.target.value })}><option value="">All tax categories</option><option value="none">No tax category</option>{taxCategories.map((tax) => <option key={tax._id} value={tax._id}>{tax.name} ({tax.rate}%)</option>)}</select></label>
          <label>Status<select value={catalogFilters.status} onChange={(event) => setCatalogFilters({ ...catalogFilters, status: event.target.value })}><option value="">All statuses</option><option value="active">Active</option><option value="draft">Draft</option><option value="archived">Archived</option></select></label>
          <label className="toggleRow"><input type="checkbox" checked={catalogFilters.missingImage} onChange={(event) => setCatalogFilters({ ...catalogFilters, missingImage: event.target.checked })} /><span>Without image only</span></label>
          <button className="inlineButton" type="button" onClick={() => { setCatalogFilters({ category: "", tax: "", status: "", missingImage: false }); setQuery(""); setSellerId(""); onOwnerFilter({}); }}>Clear filters</button>
        </div>
        <DataTable
          rows={visibleProducts}
          loading={loading}
          loadingMessage="Loading products…"
          sortable
          paginated={false}
          className="catalogProductTable"
          columns={[
            { key: "image", label: "Image", sortable: false, render: (row) => getProductThumb(row) ? <img className="tableThumb" src={getProductThumb(row)} alt="" /> : "None" },
            { key: "name", label: "Product", render: (row) => <div><strong>{row.name}</strong><br /><small>SKU: {row.sku} · Price: {money(row.price)} · Offer: {money(row.offerPrice || row.price)}</small></div> },
            { key: "owner", label: "Owner", sortValue: (row) => row.seller?.sellerNumber || "Admin", render: (row) => row.seller ? <div><strong>{row.seller.companyName}</strong><br /><small>Seller ID: {row.seller.sellerNumber}</small></div> : <strong>Admin</strong> },
            { key: "category", label: "Category", sortValue: (row) => getCategoryName(row.category), render: (row) => getCategoryName(row.category) },
            { key: "taxCategory", label: "Tax", sortValue: (row) => row.taxCategory?.name || "", render: (row) => row.taxCategory ? `${row.taxCategory.name} (${row.taxCategory.rate}%)` : "None" },
            { key: "status", label: "Status", render: (row) => <span className="badge">{row.status}</span> }
            ,
            {
              key: "isFeatured",
              label: "Featured",
              render: (row) => (
                <label className="toggleRow compactToggle">
                  <input type="checkbox" checked={Boolean(row.isFeatured)} onChange={(event) => onFeature(row, { isFeatured: event.target.checked })} />
                  <span>{row.isFeatured ? "Yes" : "No"}</span>
                </label>
              )
            },
            {
              key: "actions",
              label: "Actions",
              sortable: false,
              render: (row) => (
                <div className="tableActions">
                  <button
                    type="button"
                    title="Edit product"
                    onClick={() => onEditProduct(row)}
                  >
                    <FileText size={16} />
                  </button>
                  <button type="button" title="Delete product" onClick={() => setDeleteTarget(row)}><Trash2 size={16} /></button>
                </div>
              )
            }
          ]}
        />
        <TablePagination total={pagination.total} page={pagination.page} pageSize={pagination.limit} pageSizes={[10]} onPageChange={(page) => onPageChange(page, 10)} onPageSizeChange={() => {}} />
      </div>}

      {editing && (
        <form className="panel formPanel" onSubmit={submitEdit}>
          <div className="panelHeader">
            <h2>Edit Product</h2>
            <button className="inlineButton" type="button" onClick={() => { setEditing(null); setImageStatus(""); }}>← Back to products</button>
          </div>
          <div className="formGrid">
            <label><span>Name</span><input value={editing.name || ""} onChange={(event) => setEditing({ ...editing, name: event.target.value })} required /></label>
            <label><span>SKU</span><input value={editing.sku || ""} onChange={(event) => setEditing({ ...editing, sku: event.target.value })} required /></label>
            <label><span>Price</span><input type="number" value={editing.price || 0} onChange={(event) => setEditing({ ...editing, price: event.target.value })} required /></label>
            <label><span>Cost price</span><input type="number" min="0" step="0.01" value={editing.costPrice ?? ""} onChange={(event) => setEditing({ ...editing, costPrice: event.target.value })} required /></label>
            <label><span>Offer price</span><input type="number" value={editing.offerPrice || ""} onChange={(event) => setEditing({ ...editing, offerPrice: event.target.value })} /></label>
            <label><span>Category</span><select value={editing.category?._id || editing.category || ""} onChange={(event) => setEditing({ ...editing, category: event.target.value })}>{categories.map((category) => <option key={category._id} value={category._id}>{getCategoryName(category)}</option>)}</select></label>
            <label><span>Tax</span><select value={editing.taxCategory?._id || editing.taxCategory || ""} onChange={(event) => setEditing({ ...editing, taxCategory: event.target.value })}><option value="">None</option>{taxCategories.map((tax) => <option key={tax._id} value={tax._id}>{tax.name}</option>)}</select></label>
            <label><span>Entered price includes GST?</span><select value={editing.priceIncludesTax === false ? "no" : "yes"} onChange={(event) => setEditing({ ...editing, priceIncludesTax: event.target.value === "yes" })}><option value="yes">Yes — GST included</option><option value="no">No — add GST</option></select></label>
            <GstPricePreview price={editing.price} offerPrice={editing.offerPrice} taxCategory={taxCategories.find((tax) => tax._id === (editing.taxCategory?._id || editing.taxCategory))} priceIncludesTax={editing.priceIncludesTax !== false} />
            <label><span>Status</span><select value={editing.status || "draft"} onChange={(event) => setEditing({ ...editing, status: event.target.value })}><option value="draft">Draft</option><option value="active">Active</option><option value="archived">Archived</option></select></label>
          </div>
          <label><span>Short description</span><input value={editing.shortDescription || ""} onChange={(event) => setEditing({ ...editing, shortDescription: event.target.value })} /></label>
          <label><span>Detailed description</span><textarea value={editing.detailedDescription || ""} onChange={(event) => setEditing({ ...editing, detailedDescription: event.target.value })} /></label>
          <div className="mediaGrid">
            <label className="uploadBox">
              <ImagePlus size={20} />
              <span>Main image</span>
              <input type="file" accept="image/*" onChange={handleEditMainImage} />
            </label>
            <label className="uploadBox">
              <ImagePlus size={20} />
              <span>Gallery images</span>
              <input type="file" accept="image/*" multiple onChange={handleEditGalleryImages} />
            </label>
            <label className="videoField">
              <span>Product video URL</span>
              <div>
                <input value={editing.videoUrl || ""} onChange={(event) => updateEditingMedia({ videoUrl: event.target.value })} placeholder="https://..." />
              </div>
            </label>
          </div>
          {imageStatus && <p className="mutedText">{imageStatus}</p>}
          {(editing.media || []).length > 0 && (
            <div className="mediaPreview">
              {(editing.media || []).map((item, index) => (
                <div className="mediaTile" key={`${item.url.slice(0, 24)}-${index}`}>
                  <img src={item.url} alt={item.alt || editing.name || "Product media"} />
                  {item.isMain && <span>Main</span>}
                  <div className="mediaActions">
                    {!item.isMain && <button type="button" title="Set as main image" onClick={() => setEditMainMedia(index)}>Main</button>}
                    <button type="button" className="mediaRemove" title="Remove image" onClick={() => removeEditMedia(index)}>
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
          <button className="primaryButton" type="submit"><Save size={18} /> Save Product</button>
        </form>
      )}

      {deleteTarget && <ConfirmDeleteModal recordName={deleteTarget.name} recordType="product" onCancel={() => setDeleteTarget(null)} onConfirm={async () => { await onDeleteProduct(deleteTarget); setDeleteTarget(null); }} />}

    </section>
  );
}
