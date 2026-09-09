import { Save } from "lucide-react";
import { sectionLocations } from "./settingsUtils.js";
import { ImagePlus } from "lucide-react";
import { Trash2 } from "lucide-react";

export default function BannerSectionsSettings({ runSettingAction, onSaveStorefront, storeForm, contentSections, updateContentSection, updateContentItem, uploadSettingImage, setStoreForm, uploadStatus, savingSettings }) {
  return (
<form className="panel formPanel widePanel" onSubmit={(event) => { event.preventDefault(); runSettingAction(() => onSaveStorefront({ ...storeForm, contentSections }), "Banner sections saved successfully."); }}>
          <div className="panelHeader"><h2>Banner Sections</h2><Save size={18} /></div>
          <div className="heroEditorList">
            {contentSections.map((section, sectionIndex) => (
              <div className="heroEditorItem" key={section._id || sectionIndex}>
                <div className="formGrid">
                  <label><span>Title</span><input value={section.title || ""} onChange={(event) => updateContentSection(sectionIndex, { title: event.target.value })} required /></label>
                  <label><span>Subtitle</span><input value={section.subtitle || ""} onChange={(event) => updateContentSection(sectionIndex, { subtitle: event.target.value })} /></label>
                  <label><span>Columns</span><input type="number" min="1" max="4" value={section.columns || 2} onChange={(event) => updateContentSection(sectionIndex, { columns: Number(event.target.value) })} /></label>
                  <label><span>Sort</span><input type="number" value={section.sortOrder || sectionIndex + 1} onChange={(event) => updateContentSection(sectionIndex, { sortOrder: Number(event.target.value) })} /></label>
                  <label className="toggleRow"><input type="checkbox" checked={section.isActive !== false} onChange={(event) => updateContentSection(sectionIndex, { isActive: event.target.checked })} /><span>Active</span></label>
                </div>
                <div className="locationPicker">
                  {sectionLocations.map(([value, label]) => (
                    <label className="toggleRow" key={value}>
                      <input
                        type="checkbox"
                        checked={(section.locations || []).includes(value)}
                        onChange={(event) => {
                          const currentLocations = section.locations || [];
                          updateContentSection(sectionIndex, {
                            locations: event.target.checked ? [...currentLocations, value] : currentLocations.filter((item) => item !== value)
                          });
                        }}
                      />
                      <span>{label}</span>
                    </label>
                  ))}
                </div>
                <div className="sectionColumnEditor">
                  {(section.items || []).map((item, itemIndex) => (
                    <div className="sectionColumnItem" key={item._id || itemIndex}>
                      <div className="formGrid">
                        <select value={item.type || "image_text"} onChange={(event) => updateContentItem(sectionIndex, itemIndex, { type: event.target.value })}>
                          <option value="image_text">Image and text</option>
                          <option value="image">Image only</option>
                          <option value="text">Text only</option>
                        </select>
                        <label><span>Title</span><input value={item.title || ""} onChange={(event) => updateContentItem(sectionIndex, itemIndex, { title: event.target.value })} /></label>
                        <label><span>Text</span><input value={item.text || ""} onChange={(event) => updateContentItem(sectionIndex, itemIndex, { text: event.target.value })} /></label>
                        <label><span>Image URL</span><input value={item.imageUrl || ""} onChange={(event) => updateContentItem(sectionIndex, itemIndex, { imageUrl: event.target.value })} /></label>
                        <label><span>Link URL</span><input value={item.linkUrl || ""} onChange={(event) => updateContentItem(sectionIndex, itemIndex, { linkUrl: event.target.value })} /></label>
                        <label><span>Link label</span><input value={item.linkLabel || ""} onChange={(event) => updateContentItem(sectionIndex, itemIndex, { linkLabel: event.target.value })} /></label>
                      </div>
                      <label className="uploadBox compactUpload"><ImagePlus size={18} /><span>Upload image</span><input type="file" accept="image/*" onChange={(event) => uploadSettingImage(event, (url) => updateContentItem(sectionIndex, itemIndex, { imageUrl: url }))} /></label>
                      {item.imageUrl && <img className="heroEditorPreview" src={item.imageUrl} alt="" />}
                      <button className="inlineButton" type="button" onClick={() => updateContentSection(sectionIndex, { items: (section.items || []).filter((_item, index) => index !== itemIndex) })}>
                        <Trash2 size={16} /> Delete Column
                      </button>
                    </div>
                  ))}
                </div>
                <div className="toolbar">
                  <button className="inlineButton" type="button" onClick={() => updateContentSection(sectionIndex, { items: [...(section.items || []), { type: "image_text", title: "", text: "", imageUrl: "", linkUrl: "#/products", linkLabel: "Shop now" }] })}>Add Column</button>
                  <button className="inlineButton" type="button" onClick={() => setStoreForm({ ...storeForm, contentSections: contentSections.filter((_section, index) => index !== sectionIndex) })}><Trash2 size={16} /> Delete Section</button>
                </div>
              </div>
            ))}
          </div>
          {uploadStatus && <p className="mutedText">{uploadStatus}</p>}
          <div className="toolbar">
            <button className="inlineButton" type="button" onClick={() => setStoreForm({ ...storeForm, contentSections: [...contentSections, { title: "", subtitle: "", locations: ["home_before_new_arrivals"], columns: 2, isActive: true, sortOrder: contentSections.length + 1, items: [] }] })}>Add Section</button>
            <button className="primaryButton" type="submit" disabled={savingSettings}><Save size={18} /> {savingSettings ? "Saving..." : "Save Sections"}</button>
          </div>
        </form>
  );
}
