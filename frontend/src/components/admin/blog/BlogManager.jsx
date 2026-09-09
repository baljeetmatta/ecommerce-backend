import { useState, lazy } from "react";
import { Plus, FileText, Trash2, PackageSearch, Save } from "lucide-react";

const DataTable = lazy(() => import("../../DataTable.jsx"));

export default function BlogManager({ categories, posts, onCreatePost, onEditPost, onSaveCategory, onDeleteCategory, onDeletePost }) {
  const [categoryForm, setCategoryForm] = useState({ name: "", slug: "", parent: "", description: "", isActive: true });
  const resetCategory = () => setCategoryForm({ name: "", slug: "", parent: "", description: "", isActive: true });
  const parentOptions = categories.filter((category) => category._id !== categoryForm._id);

  return (
    <section className="contentStack">
      <div className="panel widePanel">
        <div className="panelHeader">
          <h2>Blog Posts</h2>
          <button className="primaryButton" type="button" onClick={onCreatePost}><Plus size={18} /> New Post</button>
        </div>
        <DataTable
          rows={posts}
          columns={[
            { key: "title", label: "Title" },
            { key: "category", label: "Category", render: (row) => row.category?.name || "Unassigned" },
            { key: "publishedAt", label: "Published", render: (row) => (row.publishedAt ? new Date(row.publishedAt).toLocaleDateString("en-IN") : "Draft") },
            { key: "isActive", label: "Active", render: (row) => (row.isActive ? "Yes" : "No") },
            {
              key: "actions",
              label: "Actions",
              render: (row) => (
                <div className="tableActions">
                  <button type="button" title="Edit post" onClick={() => onEditPost(row)}><FileText size={16} /></button>
                  <button type="button" title="Delete post" onClick={() => onDeletePost(row)}><Trash2 size={16} /></button>
                </div>
              )
            }
          ]}
        />
      </div>

      <div className="twoColumn">
        <div className="panel widePanel">
          <div className="panelHeader"><h2>Blog Categories</h2><PackageSearch size={18} /></div>
          <DataTable
            rows={categories}
            columns={[
              { key: "name", label: "Name" },
              { key: "slug", label: "Slug" },
              { key: "parent", label: "Parent", render: (row) => row.parent?.name || "Parent" },
              { key: "isActive", label: "Active", render: (row) => (row.isActive ? "Yes" : "No") },
              {
                key: "actions",
                label: "Actions",
                render: (row) => (
                  <div className="tableActions">
                    <button type="button" title="Edit category" onClick={() => setCategoryForm({ ...row, parent: row.parent?._id || "" })}><FileText size={16} /></button>
                    <button type="button" title="Delete category" onClick={() => onDeleteCategory(row)}><Trash2 size={16} /></button>
                  </div>
                )
              }
            ]}
          />
        </div>
        <form className="panel formPanel" onSubmit={(event) => { event.preventDefault(); onSaveCategory(categoryForm); resetCategory(); }}>
          <div className="panelHeader"><h2>{categoryForm._id ? "Edit Category" : "New Category"}</h2><Save size={18} /></div>
          <label><span>Name</span><input value={categoryForm.name || ""} onChange={(event) => setCategoryForm({ ...categoryForm, name: event.target.value })} required /></label>
          <label><span>Slug</span><input value={categoryForm.slug || ""} onChange={(event) => setCategoryForm({ ...categoryForm, slug: event.target.value })} placeholder="Auto-generated from name" /></label>
          <label><span>Parent category</span>
            <select value={categoryForm.parent || ""} onChange={(event) => setCategoryForm({ ...categoryForm, parent: event.target.value })}>
              <option value="">None - top level parent</option>
              {parentOptions.map((category) => <option key={category._id} value={category._id}>{category.name}</option>)}
            </select>
          </label>
          <label><span>Description</span><textarea value={categoryForm.description || ""} onChange={(event) => setCategoryForm({ ...categoryForm, description: event.target.value })} /></label>
          <label className="toggleRow"><input type="checkbox" checked={categoryForm.isActive !== false} onChange={(event) => setCategoryForm({ ...categoryForm, isActive: event.target.checked })} /><span>Active</span></label>
          <button className="primaryButton" type="submit"><Save size={18} /> Save Category</button>
          <button className="inlineButton" type="button" onClick={resetCategory}>New Category</button>
        </form>
      </div>
    </section>
  );
}
