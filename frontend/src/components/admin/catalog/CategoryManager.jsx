import { useState, lazy } from "react";
import { Search, Plus, FileText, Trash2 } from "lucide-react";
import ConfirmDeleteModal from "../shared/ConfirmDeleteModal.jsx";

const DataTable = lazy(() => import("../../DataTable.jsx"));

export default function CategoryManager({ categories, products, onAdd, onEdit, onDelete }) {
  const [categorySearch, setCategorySearch] = useState("");
  const [deleteTarget, setDeleteTarget] = useState(null);
  const descendantIds = (categoryId) => { const ids = new Set([String(categoryId)]); let changed = true; while (changed) { changed = false; categories.forEach((item) => { if (ids.has(String(item.parent?._id || item.parent || "")) && !ids.has(String(item._id))) { ids.add(String(item._id)); changed = true; } }); } return ids; };
  const categoryRows = categories.map((category) => {
    const ids = descendantIds(category._id);
    const categoryProducts = products.filter((product) => ids.has(String(product.category?._id || product.category || "")));
    return { ...category, productCount: categoryProducts.length, productSearch: categoryProducts.map((product) => `${product.name} ${product.sku}`).join(" ") };
  }).filter((category) => !categorySearch.trim() || [category.name, category.parent?.name, category.slug, category.productSearch].join(" ").toLowerCase().includes(categorySearch.trim().toLowerCase()));

  return (
    <section className="contentStack">
      <div className="panel">
        <div className="panelHeader"><h2>Categories & Subcategories</h2><div className="toolbar"><label className="searchBox"><Search size={16} /><input value={categorySearch} onChange={(event) => setCategorySearch(event.target.value)} placeholder="Search name, product or SKU" /></label><button className="primaryButton" type="button" onClick={onAdd}><Plus size={18} /> Add Category</button></div></div>
        <DataTable
          rows={categoryRows}
          sortable
          paginated
          columns={[
            { key: "imageUrl", label: "Image", sortable: false, render: (row) => row.imageUrl ? <img className="tableThumb" src={row.imageUrl} alt="" /> : "None" },
            { key: "name", label: "Name" },
            { key: "parent", label: "Parent", sortValue: (row) => row.parent?.name || "", render: (row) => row.parent?.name || "None" },
            { key: "type", label: "Type", sortValue: (row) => row.parent ? "Subcategory" : "Category", render: (row) => row.parent ? "Subcategory" : "Category" },
            { key: "productCount", label: "Total products" },
            { key: "slug", label: "Slug" },
            { key: "isActive", label: "Active", render: (row) => (row.isActive ? "Yes" : "No") },
            {
              key: "actions",
              label: "Actions",
              sortable: false,
              render: (row) => (
                <div className="tableActions">
                  <button type="button" title="Edit category" onClick={() => onEdit(row)}><FileText size={16} /></button>
                  <button type="button" title="Delete category" onClick={() => setDeleteTarget(row)}><Trash2 size={16} /></button>
                </div>
              )
            }
          ]}
        />
      </div>
      {deleteTarget && <ConfirmDeleteModal recordName={deleteTarget.name} recordType="category" onCancel={() => setDeleteTarget(null)} onConfirm={async () => { await onDelete(deleteTarget); setDeleteTarget(null); }} />}
    </section>
  );
}
