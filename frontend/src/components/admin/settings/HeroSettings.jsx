import { Save } from "lucide-react";
import { ImagePlus } from "lucide-react";
import { Trash2 } from "lucide-react";

export default function HeroSettings({ runSettingAction, onSaveStorefront, storeForm, heroItems, setStoreForm, uploadSettingImage, uploadStatus, savingSettings }) {
  return (
<form className="panel formPanel" onSubmit={(event) => { event.preventDefault(); runSettingAction(() => onSaveStorefront({ ...storeForm, heroItems }), "Hero settings saved successfully."); }}>
          <div className="panelHeader"><h2>Hero Settings</h2><Save size={18} /></div>
          <div className="heroEditorList">
            {heroItems.map((item, index) => (
              <div className="heroEditorItem" key={item._id || index}>
                <div className="formGrid">
                  <label><span>Title</span><input value={item.title || ""} onChange={(event) => { const next = [...heroItems]; next[index] = { ...next[index], title: event.target.value }; setStoreForm({ ...storeForm, heroItems: next }); }} /></label>
                  <label><span>Subtitle</span><input value={item.subtitle || ""} onChange={(event) => { const next = [...heroItems]; next[index] = { ...next[index], subtitle: event.target.value }; setStoreForm({ ...storeForm, heroItems: next }); }} /></label>
                  <label><span>Image URL</span><input value={item.imageUrl || ""} onChange={(event) => { const next = [...heroItems]; next[index] = { ...next[index], imageUrl: event.target.value }; setStoreForm({ ...storeForm, heroItems: next }); }} /></label>
                  <label><span>Link URL</span><input value={item.linkUrl || "#/products"} onChange={(event) => { const next = [...heroItems]; next[index] = { ...next[index], linkUrl: event.target.value }; setStoreForm({ ...storeForm, heroItems: next }); }} /></label>
                  <label><span>Sort</span><input type="number" value={item.sortOrder || index + 1} onChange={(event) => { const next = [...heroItems]; next[index] = { ...next[index], sortOrder: Number(event.target.value) }; setStoreForm({ ...storeForm, heroItems: next }); }} /></label>
                  <label className="toggleRow"><input type="checkbox" checked={item.isActive !== false} onChange={(event) => { const next = [...heroItems]; next[index] = { ...next[index], isActive: event.target.checked }; setStoreForm({ ...storeForm, heroItems: next }); }} /><span>Active</span></label>
                </div>
                <label className="uploadBox compactUpload"><ImagePlus size={18} /><span>Upload hero image</span><input type="file" accept="image/*" onChange={(event) => uploadSettingImage(event, (url) => { const next = [...heroItems]; next[index] = { ...next[index], imageUrl: url }; setStoreForm({ ...storeForm, heroItems: next }); })} /></label>
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
            <button className="inlineButton" type="button" onClick={() => setStoreForm({ ...storeForm, heroItems: [...heroItems, { title: "", subtitle: "", imageUrl: "", linkUrl: "#/products", isActive: true, sortOrder: heroItems.length + 1 }] })}>Add Hero</button>
            <button className="primaryButton" type="submit" disabled={savingSettings}><Save size={18} /> {savingSettings ? "Saving..." : "Save Heroes"}</button>
          </div>
        </form>
  );
}
