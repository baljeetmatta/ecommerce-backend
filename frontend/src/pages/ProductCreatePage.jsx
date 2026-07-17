import { ImagePlus, Plus, Save, Trash2, Video } from "lucide-react";
import { useState } from "react";
import { optimizeImage } from "../utils/imageOptimizer.js";
import CategoryTreeSelect from "../components/CategoryTreeSelect.jsx";
import GstPricePreview from "../components/GstPricePreview.jsx";

const initialForm = {
  name: "",
  sku: "",
  price: "",
  costPrice: "",
  offerPrice: "",
  category: "",
  taxCategory: "",
  priceIncludesTax: true,
  displayType: "Product",
  status: "draft",
  isStockManageable: true,
  stock: "",
  lowStockThreshold: 10,
  tags: "",
  shortDescription: "",
  detailedDescription: "",
  videoUrl: "",
  mainImage: "",
  media: []
};

export default function ProductCreatePage({ categories, taxCategories, onCreate, onCreateCategory, onCreateTaxCategory }) {
  const [form, setForm] = useState(initialForm);
  const [categoryForm, setCategoryForm] = useState({ name: "", parent: "" });
  const [taxForm, setTaxForm] = useState({ name: "", code: "", rate: "" });
  const [imageStatus, setImageStatus] = useState("");

  const setField = (field, value) => {
    setForm((current) => ({ ...current, [field]: value }));
  };

  const handleMainImage = async (event) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setImageStatus("Optimizing main image...");
    const optimized = await optimizeImage(file, { maxWidth: 1600, maxHeight: 1600, quality: 0.8 });
    setForm((current) => ({
      ...current,
      mainImage: optimized.url,
      media: [
        { url: optimized.url, type: "image", isMain: true, alt: current.name || optimized.name },
        ...current.media.filter((item) => !item.isMain)
      ]
    }));
    setImageStatus(`Main image optimized to ${optimized.width}x${optimized.height}.`);
  };

  const handleGalleryImages = async (event) => {
    const files = Array.from(event.target.files || []);
    if (files.length === 0) return;

    setImageStatus(`Optimizing ${files.length} gallery image${files.length > 1 ? "s" : ""}...`);
    const optimizedImages = await Promise.all(files.map((file) => optimizeImage(file)));
    setForm((current) => ({
      ...current,
      media: [
        ...current.media,
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

  const removeMedia = (index) => {
    setForm((current) => {
      const media = current.media.filter((_item, itemIndex) => itemIndex !== index);
      return {
        ...current,
        media,
        mainImage: media.find((item) => item.isMain)?.url || ""
      };
    });
  };

  const submitProduct = async (event) => {
    event.preventDefault();
    await onCreate({
      ...form,
      price: Number(form.price),
      costPrice: Number(form.costPrice || 0),
      offerPrice: form.offerPrice === "" ? Number(form.price) : Number(form.offerPrice),
      stock: form.isStockManageable ? Number(form.stock || 0) : 0,
      lowStockThreshold: Number(form.lowStockThreshold || 0),
      tags: form.tags.split(",").map((tag) => tag.trim()).filter(Boolean),
      category: form.category,
      taxCategory: form.taxCategory || undefined,
      videoUrl: form.videoUrl || undefined,
      seo: {
        slug: form.name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, ""),
        metaTitle: form.name,
        metaDescription: form.shortDescription
      }
    });
    setForm(initialForm);
    setImageStatus("");
  };

  const submitCategory = async (event) => {
    event.preventDefault();
    const created = await onCreateCategory(categoryForm);
    setForm((current) => ({ ...current, category: created._id }));
    setCategoryForm({ name: "", parent: "" });
  };

  const submitTaxCategory = async (event) => {
    event.preventDefault();
    const created = await onCreateTaxCategory({ ...taxForm, rate: Number(taxForm.rate) });
    setForm((current) => ({ ...current, taxCategory: created._id }));
    setTaxForm({ name: "", code: "", rate: "" });
  };

  return (
    <section className="productCreate">
      <form className="panel productForm" onSubmit={submitProduct}>
        <div className="panelHeader">
          <h2>Add Product</h2>
          <Save size={18} />
        </div>

        <div className="formGrid">
          <label>
            <span>Product name</span>
            <input value={form.name} onChange={(event) => setField("name", event.target.value)} required />
          </label>
          <label>
            <span>SKU</span>
            <input value={form.sku} onChange={(event) => setField("sku", event.target.value)} required />
          </label>
          <label>
            <span>Price</span>
            <input type="number" min="0" step="0.01" value={form.price} onChange={(event) => setField("price", event.target.value)} required />
          </label>
          <label>
            <span>Offer price</span>
            <input type="number" min="0" step="0.01" value={form.offerPrice} onChange={(event) => setField("offerPrice", event.target.value)} placeholder="Defaults to price" />
          </label>
          <label>
            <span>Cost price (for partner profit)</span>
            <input type="number" min="0" step="0.01" value={form.costPrice} onChange={(event) => setField("costPrice", event.target.value)} required />
          </label>
          <label>
            <span>Category</span>
            <CategoryTreeSelect categories={categories} value={form.category} onChange={(value) => setField("category", value)} required />
          </label>
          <label>
            <span>Tax category</span>
            <select value={form.taxCategory} onChange={(event) => setField("taxCategory", event.target.value)}>
              <option value="">No tax category</option>
              {taxCategories.map((tax) => (
                <option key={tax._id} value={tax._id}>
                  {tax.name} ({tax.rate}%)
                </option>
              ))}
            </select>
          </label>
          <label><span>Does the entered price include GST?</span><select value={form.priceIncludesTax ? "yes" : "no"} onChange={(event) => setField("priceIncludesTax", event.target.value === "yes")}><option value="yes">Yes — GST is included</option><option value="no">No — add GST to the price</option></select></label>
          <GstPricePreview price={form.price} offerPrice={form.offerPrice} taxCategory={taxCategories.find((tax) => tax._id === form.taxCategory)} priceIncludesTax={form.priceIncludesTax} />
          <label>
            <span>Display type</span>
            <select value={form.displayType} onChange={(event) => setField("displayType", event.target.value)}>
              <option>Product</option>
              <option>Reel</option>
            </select>
          </label>
          <label>
            <span>Status</span>
            <select value={form.status} onChange={(event) => setField("status", event.target.value)}>
              <option value="draft">Draft</option>
              <option value="active">Active</option>
              <option value="archived">Archived</option>
            </select>
          </label>
        </div>

        <label className="toggleRow">
          <input
            type="checkbox"
            checked={form.isStockManageable}
            onChange={(event) => setField("isStockManageable", event.target.checked)}
          />
          <span>Stock Manageable</span>
        </label>

        {form.isStockManageable && (
          <div className="formGrid compact">
            <label>
              <span>Stock</span>
              <input type="number" min="0" value={form.stock} onChange={(event) => setField("stock", event.target.value)} required />
            </label>
            <label>
              <span>Low stock alert</span>
              <input type="number" min="0" value={form.lowStockThreshold} onChange={(event) => setField("lowStockThreshold", event.target.value)} />
            </label>
          </div>
        )}

        <label>
          <span>Short description</span>
          <input value={form.shortDescription} onChange={(event) => setField("shortDescription", event.target.value)} required />
        </label>
        <label>
          <span>Detailed description</span>
          <textarea value={form.detailedDescription} onChange={(event) => setField("detailedDescription", event.target.value)} rows="6" required />
        </label>
        <label>
          <span>Tags</span>
          <input value={form.tags} onChange={(event) => setField("tags", event.target.value)} placeholder="comma, separated, tags" />
        </label>

        <div className="mediaGrid">
          <label className="uploadBox">
            <ImagePlus size={20} />
            <span>Main image</span>
            <input type="file" accept="image/*" onChange={handleMainImage} />
          </label>
          <label className="uploadBox">
            <ImagePlus size={20} />
            <span>Gallery images</span>
            <input type="file" accept="image/*" multiple onChange={handleGalleryImages} />
          </label>
          <label className="videoField">
            <span>Product video URL</span>
            <div>
              <Video size={18} />
              <input value={form.videoUrl} onChange={(event) => setField("videoUrl", event.target.value)} placeholder="https://..." />
            </div>
          </label>
        </div>

        {imageStatus && <p className="mutedText">{imageStatus}</p>}
        {form.media.length > 0 && (
          <div className="mediaPreview">
            {form.media.map((item, index) => (
              <div className="mediaTile" key={`${item.url.slice(0, 24)}-${index}`}>
                <img src={item.url} alt={item.alt || "Product media"} />
                {item.isMain && <span>Main</span>}
                <button type="button" className="mediaRemove" title="Remove image" onClick={() => removeMedia(index)}>
                  <Trash2 size={14} />
                </button>
              </div>
            ))}
          </div>
        )}

        <button className="primaryButton" type="submit">
          <Save size={18} /> Save Product
        </button>
      </form>

      <aside className="sideStack">
        <form className="panel formPanel" onSubmit={submitCategory}>
          <div className="panelHeader">
            <h2>Add Category</h2>
            <Plus size={18} />
          </div>
          <label>
            <span>Category name</span>
            <input value={categoryForm.name} onChange={(event) => setCategoryForm({ ...categoryForm, name: event.target.value })} required />
          </label>
          <label>
            <span>Parent category</span>
            <select value={categoryForm.parent} onChange={(event) => setCategoryForm({ ...categoryForm, parent: event.target.value })}>
              <option value="">No parent</option>
              {categories.map((category) => (
                <option key={category._id} value={category._id}>
                  {category.name}
                </option>
              ))}
            </select>
          </label>
          <button className="primaryButton" type="submit">
            <Plus size={18} /> Add Category
          </button>
        </form>

        <form className="panel formPanel" onSubmit={submitTaxCategory}>
          <div className="panelHeader">
            <h2>Add Tax Category</h2>
            <Plus size={18} />
          </div>
          <label>
            <span>Name</span>
            <input value={taxForm.name} onChange={(event) => setTaxForm({ ...taxForm, name: event.target.value })} required />
          </label>
          <label>
            <span>Code</span>
            <input value={taxForm.code} onChange={(event) => setTaxForm({ ...taxForm, code: event.target.value })} required />
          </label>
          <label>
            <span>Rate %</span>
            <input type="number" min="0" step="0.01" value={taxForm.rate} onChange={(event) => setTaxForm({ ...taxForm, rate: event.target.value })} required />
          </label>
          <button className="primaryButton" type="submit">
            <Plus size={18} /> Add Tax
          </button>
        </form>
      </aside>
    </section>
  );
}
