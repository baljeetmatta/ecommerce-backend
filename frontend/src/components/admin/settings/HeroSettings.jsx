import { useState } from "react";
import { api } from "../../../services/api.js";
import { Save } from "lucide-react";
import { ImagePlus } from "lucide-react";
import { Trash2 } from "lucide-react";

export default function HeroSettings({ products = [], runSettingAction, onSaveStorefront, storeForm, heroItems, setStoreForm, uploadSettingImage, uploadStatus, savingSettings }) {
  const [videoBusy, setVideoBusy] = useState(false);
  const [videoStatus, setVideoStatus] = useState("");
  const uploadVideo = async (event, index) => {
    const file = event.target.files?.[0];
    if (!file) return;
    event.target.value = "";
    if (file.size > 50 * 1024 * 1024) { setVideoStatus("Choose a video smaller than 50 MB."); return; }
    setVideoBusy(true);
    setVideoStatus("Uploading video…");
    try {
      const uploaded = await api.uploadVideo(file);
      setStoreForm(current => ({ ...current, heroItems: (current.heroItems?.length ? current.heroItems : heroItems).map((hero, heroIndex) => heroIndex === index ? { ...hero, videoUrl: uploaded.url } : hero) }));
      setVideoStatus("Video uploaded. Save Heroes to publish your changes.");
    } catch (error) { setVideoStatus(error.message); }
    finally { setVideoBusy(false); }
  };
  return (
<form className="panel formPanel" onSubmit={(event) => { event.preventDefault(); if (videoBusy) return; runSettingAction(() => onSaveStorefront({ ...storeForm, heroItems }), "Hero settings saved successfully."); }}>
          <div className="panelHeader"><h2>Hero Settings</h2><Save size={18} /></div>
          <fieldset className="heroEditorList" disabled={videoBusy || savingSettings} style={{ border: 0, padding: 0, margin: 0, minWidth: 0 }}>
            {heroItems.map((item, index) => (
              <div className="heroEditorItem" key={item._id || index}>
                <div className="formGrid">
                  <label><span>{item.hideText ? "Media description (accessibility)" : "Title"}</span><input required={!item.hideText} value={item.title || ""} onChange={(event) => { const next = [...heroItems]; next[index] = { ...next[index], title: event.target.value }; setStoreForm({ ...storeForm, heroItems: next }); }} /></label>
                  <label><span>Subtitle</span><input disabled={Boolean(item.hideText)} value={item.subtitle || ""} onChange={(event) => { const next = [...heroItems]; next[index] = { ...next[index], subtitle: event.target.value }; setStoreForm({ ...storeForm, heroItems: next }); }} /></label>
                  <label><span>Banner image URL</span><input required={Boolean(item.hideText) && !item.videoUrl?.trim()} value={item.imageUrl || ""} onChange={(event) => { const next = [...heroItems]; next[index] = { ...next[index], imageUrl: event.target.value }; setStoreForm({ ...storeForm, heroItems: next }); }} /></label>
                  <label><span>Optional video URL</span><input value={item.videoUrl || ""} placeholder="https://…/banner.mp4" onChange={event => { const next = [...heroItems]; next[index] = { ...next[index], videoUrl: event.target.value }; setStoreForm({ ...storeForm, heroItems: next }); }} /></label>
                  <label><span>Product or page link</span><input value={item.linkUrl || "#/products"} onChange={(event) => { const next = [...heroItems]; next[index] = { ...next[index], linkUrl: event.target.value }; setStoreForm({ ...storeForm, heroItems: next }); }} /></label>
                  <label><span>Link to product</span><select value={products.some(product => item.linkUrl === `#/product/${product._id}`) ? item.linkUrl : ""} onChange={event => { const next = [...heroItems]; next[index] = { ...next[index], linkUrl: event.target.value || "#/products" }; setStoreForm({ ...storeForm, heroItems: next }); }}><option value="">Custom link / all products</option>{products.map(product => <option key={product._id} value={`#/product/${product._id}`}>{product.name}</option>)}</select></label>
                  <label className="toggleRow"><input type="checkbox" checked={Boolean(item.hideText)} onChange={event => { const next = [...heroItems]; next[index] = { ...next[index], hideText: event.target.checked }; setStoreForm({ ...storeForm, heroItems: next }); }} /><span>Media only — hide text and buttons</span></label>
                  <label><span>Sort</span><input type="number" value={item.sortOrder || index + 1} onChange={(event) => { const next = [...heroItems]; next[index] = { ...next[index], sortOrder: Number(event.target.value) }; setStoreForm({ ...storeForm, heroItems: next }); }} /></label>
                  <label className="toggleRow"><input type="checkbox" checked={item.isActive !== false} onChange={(event) => { const next = [...heroItems]; next[index] = { ...next[index], isActive: event.target.checked }; setStoreForm({ ...storeForm, heroItems: next }); }} /><span>Active</span></label>
                </div>
                <label className="uploadBox compactUpload"><ImagePlus size={18} /><span>Upload background banner</span><input type="file" accept="image/*" onChange={(event) => uploadSettingImage(event, (url) => { const next = [...heroItems]; next[index] = { ...next[index], imageUrl: url }; setStoreForm({ ...storeForm, heroItems: next }); })} /></label>
                <label className="uploadBox compactUpload"><span>Upload optional video (MP4 or WebM, up to 50 MB)</span><input type="file" accept="video/mp4,video/webm" onChange={event => uploadVideo(event, index)} /></label>
                <p className="mutedText">The image takes priority. Clear the image URL to show the video. Use a wide image or a short video; the complete media fits inside the slider.</p>
                {item.imageUrl?.trim() ? <><img className="heroEditorPreview" src={item.imageUrl} alt="Banner preview" /><button className="inlineButton" type="button" onClick={() => { const next = [...heroItems]; next[index] = { ...next[index], imageUrl: "" }; setStoreForm({ ...storeForm, heroItems: next }); }}>Remove image</button></> : item.videoUrl?.trim() ? <video className="heroEditorPreview" src={item.videoUrl} controls muted playsInline preload="metadata" /> : null}
                <button
                  className="inlineButton"
                  type="button"
                  onClick={() => setStoreForm({ ...storeForm, heroItems: heroItems.filter((_hero, heroIndex) => heroIndex !== index) })}
                >
                  <Trash2 size={16} /> Delete Hero
                </button>
              </div>
            ))}
          </fieldset>
          {videoStatus && <p className="mutedText" role="status">{videoStatus}</p>}
          {uploadStatus && <p className="mutedText">{uploadStatus}</p>}
          <div className="toolbar">
            <button className="inlineButton" type="button" disabled={videoBusy || savingSettings} onClick={() => setStoreForm({ ...storeForm, heroItems: [...heroItems, { title: "", subtitle: "", imageUrl: "", videoUrl: "", hideText: false, linkUrl: "#/products", isActive: true, sortOrder: heroItems.length + 1 }] })}>Add Hero</button>
            <button className="primaryButton" type="submit" disabled={savingSettings || videoBusy}><Save size={18} /> {savingSettings ? "Saving..." : "Save Heroes"}</button>
          </div>
        </form>
  );
}
