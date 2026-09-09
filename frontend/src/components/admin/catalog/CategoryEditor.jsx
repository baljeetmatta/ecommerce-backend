import { useState } from "react";
import { optimizeImage } from "../../../utils/imageOptimizer.js";
import { ImagePlus, Save } from "lucide-react";

export default function CategoryEditor({ categories, initialCategory, onBack, onSave }) {
  const empty = { name: "", slug: "", parent: "", description: "", imageUrl: "", isActive: true };
  const [form, setForm] = useState(() => initialCategory ? { ...initialCategory, parent: initialCategory.parent?._id || initialCategory.parent || "" } : empty);
  const [status, setStatus] = useState("");
  const selectedParent = categories.find((item) => item._id === form.parent);
  const rootParent = selectedParent?.parent?._id || selectedParent?.parent || form.parent || "";
  const uploadImage = async (event) => {
    const file = event.target.files?.[0];
    if (!file) return;
    setStatus("Optimizing category image...");
    const optimized = await optimizeImage(file, { maxWidth: 1200, maxHeight: 900, quality: 0.82 });
    setForm((current) => ({ ...current, imageUrl: optimized.url }));
    setStatus(`Image ready at ${optimized.width}x${optimized.height}.`);
  };
  return <form className="panel formPanel" onSubmit={async (event) => { event.preventDefault(); await onSave({ ...form, parent: form.parent || null }); }}>
    <div className="panelHeader"><h2>{initialCategory ? "Edit Category" : "Add Category"}</h2><button className="inlineButton" type="button" onClick={onBack}>← Back to categories</button></div>
    <label><span>Name</span><input value={form.name || ""} onChange={(event) => setForm({ ...form, name: event.target.value })} required /></label>
    <label><span>Slug</span><input value={form.slug || ""} onChange={(event) => setForm({ ...form, slug: event.target.value })} /></label>
    <div className="formGrid">
      <label><span>Category</span><select value={rootParent} onChange={(event) => setForm({ ...form, parent: event.target.value })}><option value="">None (create top-level category)</option>{categories.filter((item) => !item.parent && item._id !== initialCategory?._id).map((category) => <option key={category._id} value={category._id}>{category.name}</option>)}</select></label>
      <label><span>Subcategory</span><select value={selectedParent?.parent ? form.parent : ""} disabled={!rootParent} onChange={(event) => setForm({ ...form, parent: event.target.value || rootParent })}><option value="">No subcategory</option>{categories.filter((item) => item._id !== initialCategory?._id && String(item.parent?._id || item.parent || "") === String(rootParent)).map((category) => <option key={category._id} value={category._id}>{category.name}</option>)}</select></label>
    </div>
    <label><span>Description</span><textarea value={form.description || ""} onChange={(event) => setForm({ ...form, description: event.target.value })} /></label>
    <label><span>Image URL</span><input value={form.imageUrl || ""} onChange={(event) => setForm({ ...form, imageUrl: event.target.value })} /></label>
    <label className="uploadBox compactUpload"><ImagePlus size={18} /><span>Upload image</span><input type="file" accept="image/*" onChange={uploadImage} /></label>
    {form.imageUrl && <img className="formPreviewImage" src={form.imageUrl} alt="" />}{status && <p className="mutedText">{status}</p>}
    <label className="toggleRow"><input type="checkbox" checked={Boolean(form.isActive)} onChange={(event) => setForm({ ...form, isActive: event.target.checked })} /><span>Active</span></label>
    <button className="primaryButton" type="submit"><Save size={18} /> {initialCategory ? "Update Category" : "Save Category"}</button>
  </form>;
}
