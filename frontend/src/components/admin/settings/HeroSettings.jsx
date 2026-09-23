import { Save } from "lucide-react";
import { ImagePlus } from "lucide-react";
import { Trash2 } from "lucide-react";

export default function HeroSettings({ products = [], runSettingAction, onSaveStorefront, storeForm, heroItems, setStoreForm, uploadSettingImage, uploadStatus, savingSettings }) {
  return (
<form className="panel formPanel" onSubmit={(event) => { event.preventDefault(); runSettingAction(() => onSaveStorefront({ ...storeForm, heroItems }), "Hero settings saved successfully."); }}>
          <div className="panelHeader"><h2>Hero Settings</h2><Save size={18} /></div>
          <div className="heroEditorList">
            {heroItems.map((item, index) => (
              <div className="heroEditorItem" key={item._id || index}>
                <div className="formGrid">
                  <label><span>{item.hideText ? "Image description (accessibility)" : "Title"}</span><input required={!item.hideText} value={item.title || ""} onChange={(event) => { const next = [...heroItems]; next[index] = { ...next[index], title: event.target.value }; setStoreForm({ ...storeForm, heroItems: next }); }} /></label>
                  <label><span>Subtitle</span><input disabled={Boolean(item.hideText)} value={item.subtitle || ""} onChange={(event) => { const next = [...heroItems]; next[index] = { ...next[index], subtitle: event.target.value }; setStoreForm({ ...storeForm, heroItems: next }); }} /></label>
                  <label><span>Background banner URL</span><input required={Boolean(item.hideText)} value={item.imageUrl || ""} onChange={(event) => { const next = [...heroItems]; next[index] = { ...next[index], imageUrl: event.target.value }; setStoreForm({ ...storeForm, heroItems: next }); }} /></label>
                  <label><span>Product or page link</span><input value={item.linkUrl || "#/products"} onChange={(event) => { const next = [...heroItems]; next[index] = { ...next[index], linkUrl: event.target.value }; setStoreForm({ ...storeForm, heroItems: next }); }} /></label>
                  <label><span>Link to product</span><select value={products.some(product => item.linkUrl === `#/product/${product._id}`) ? item.linkUrl : ""} onChange={event => { const next = [...heroItems]; next[index] = { ...next[index], linkUrl: event.target.value || "#/products" }; setStoreForm({ ...storeForm, heroItems: next }); }}><option value="">Custom link / all products</option>{products.map(product => <option key={product._id} value={`#/product/${product._id}`}>{product.name}</option>)}</select></label>
                  <label className="toggleRow"><input type="checkbox" checked={Boolean(item.hideText)} onChange={event => { const next = [...heroItems]; next[index] = { ...next[index], hideText: event.target.checked }; setStoreForm({ ...storeForm, heroItems: next }); }} /><span>Image only — hide text and buttons</span></label>
                  <label><span>Sort</span><input type="number" value={item.sortOrder || index + 1} onChange={(event) => { const next = [...heroItems]; next[index] = { ...next[index], sortOrder: Number(event.target.value) }; setStoreForm({ ...storeForm, heroItems: next }); }} /></label>
                  <label className="toggleRow"><input type="checkbox" checked={item.isActive !== false} onChange={(event) => { const next = [...heroItems]; next[index] = { ...next[index], isActive: event.target.checked }; setStoreForm({ ...storeForm, heroItems: next }); }} /><span>Active</span></label>
                </div>
                <label className="uploadBox compactUpload"><ImagePlus size={18} /><span>Upload background banner</span><input type="file" accept="image/*" onChange={(event) => uploadSettingImage(event, (url) => { const next = [...heroItems]; next[index] = { ...next[index], imageUrl: url }; setStoreForm({ ...storeForm, heroItems: next }); })} /></label>
                <p className="mutedText">Use a wide banner. Image-only banners display the complete image and open the selected product or link when clicked.</p>
                {item.imageUrl && <img className="heroEditorPreview" src={item.imageUrl} alt="" />}
                <button
                  className="inlineButton"
                  type="button"
                  onClick={() => setStoreForm({ ...storeForm, heroItems: heroItems.filter((_hero, heroIndex) => heroIndex !== index) })}
                >
                  <Trash2 size={16} /> Delete Hero
                </button>
              </div>
            ))}
          </div>
          {uploadStatus && <p className="mutedText">{uploadStatus}</p>}
          <div className="toolbar">
            <button className="inlineButton" type="button" onClick={() => setStoreForm({ ...storeForm, heroItems: [...heroItems, { title: "", subtitle: "", imageUrl: "", hideText: false, linkUrl: "#/products", isActive: true, sortOrder: heroItems.length + 1 }] })}>Add Hero</button>
            <button className="primaryButton" type="submit" disabled={savingSettings}><Save size={18} /> {savingSettings ? "Saving..." : "Save Heroes"}</button>
          </div>
        </form>
  );
}
