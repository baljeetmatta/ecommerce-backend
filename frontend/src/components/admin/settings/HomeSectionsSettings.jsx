import { Plus } from "lucide-react";
import { GripVertical } from "lucide-react";
import { bannerSizeFromItem } from "./settingsUtils.js";
import { ImagePlus } from "lucide-react";
import { Trash2 } from "lucide-react";
import { Save } from "lucide-react";

export default function HomeSectionsSettings({ runSettingAction, onSaveStorefront, homeSectionsPayload, setHomeSections, homeSections, setDraggedHomeSection, reorderHomeSection, draggedHomeSection, setExpandedHomeSection, expandedHomeSection, homeSectionTypes, updateHomeSection, categoryPickerValues, categories, setCategoryPickerValues, updateHomeBannerItem, uploadSettingImage, updateHomeSectionItem, uploadStatus, savingSettings }) {
  return (
<form className="panel formPanel widePanel" onSubmit={(event) => { event.preventDefault(); runSettingAction(() => onSaveStorefront({ homeSections: homeSectionsPayload() }), "Home sections saved successfully."); }}>
          <div className="panelHeader">
            <h2>Home Sections</h2>
            <button
              className="inlineButton"
              type="button"
              onClick={() => setHomeSections([...homeSections, { type: "custom_content", title: "New Section", subtitle: "", columns: 2, isActive: true, sortOrder: homeSections.length + 1, items: [] }])}
            >
              <Plus size={16} /> Add Section
            </button>
          </div>
          <div className="heroEditorItem">
            <div className="heroEditorList">
              {homeSections.map((section, sectionIndex) => (
                <div
                  className="sectionColumnItem draggableSection"
                  draggable
                  key={section._id || `${section.type}-${sectionIndex}`}
                  onDragStart={(event) => {
                    setDraggedHomeSection(sectionIndex);
                    event.dataTransfer.effectAllowed = "move";
                  }}
                  onDragOver={(event) => event.preventDefault()}
                  onDrop={(event) => {
                    event.preventDefault();
                    reorderHomeSection(draggedHomeSection, sectionIndex);
                    setDraggedHomeSection(null);
                  }}
                  onDragEnd={() => setDraggedHomeSection(null)}
                >
                  <button
                    className="sectionCollapseHeader"
                    type="button"
                    onClick={() => setExpandedHomeSection(expandedHomeSection === String(sectionIndex) ? "" : String(sectionIndex))}
                  >
                    <GripVertical size={18} />
                    <span>
                      <strong>{section.type === "custom_banner" ? "Custom banner" : section.title || homeSectionTypes.find(([value]) => value === section.type)?.[1] || "Home Section"}</strong>
                      <small>{section.type === "custom_banner" ? `${Math.max(1, Math.min(3, Number(section.columns) || 1))} column layout · ${(section.items || []).filter((item) => item.imageUrl).length || (section.banner?.imageUrl ? 1 : 0)} image(s) selected` : `${homeSectionTypes.find(([value]) => value === section.type)?.[1] || section.type} · ${section.isActive === false ? "Inactive" : "Active"}`}</small>
                    </span>
                    <b>{expandedHomeSection === String(sectionIndex) ? "Hide" : "Edit"}</b>
                  </button>
                  {expandedHomeSection === String(sectionIndex) && (
                    <>
                      <div className="formGrid">
                        {section.type !== "custom_banner" && <label><span>Type</span>
                          <select value={section.type || "custom_content"} onChange={(event) => updateHomeSection(sectionIndex, { type: event.target.value })}>
                            {homeSectionTypes.map(([value, label]) => <option key={value} value={value}>{label}</option>)}
                          </select>
                        </label>}
                        {section.type !== "custom_banner" && <><label><span>Title</span><input value={section.title || ""} onChange={(event) => updateHomeSection(sectionIndex, { title: event.target.value })} /></label><label><span>Subtitle</span><input value={section.subtitle || ""} onChange={(event) => updateHomeSection(sectionIndex, { subtitle: event.target.value })} /></label></>}
                        {section.type !== "browse_collections" && <label><span>{section.type === "custom_banner" ? "Banner columns" : "Desktop columns"}</span>{section.type === "custom_banner" ? <select value={Math.max(1, Math.min(3, Number(section.columns) || 1))} onChange={(event) => { const columns = Number(event.target.value); const legacyImage = section.banner?.imageUrl; const items = Array.from({ length: columns }, (_item, index) => ({ ...(section.items?.[index] || {}), imageUrl: section.items?.[index]?.imageUrl || (index === 0 ? legacyImage : "") || "" })); updateHomeSection(sectionIndex, { columns, items }); }}><option value="1">1 column</option><option value="2">2 columns</option><option value="3">3 columns</option></select> : <input type="number" min={section.type === "category_products" ? 3 : 1} max={section.type === "category_products" ? 5 : 4} value={section.columns || (section.type === "category_products" ? 3 : 2)} onChange={(event) => updateHomeSection(sectionIndex, { columns: Math.max(1, Math.min(8, Number(event.target.value) || 1)) })} />}</label>}
                        {section.type === "category_products" && <label><span>Mobile columns</span><input type="number" min="1" value={section.mobileColumns || 2} onChange={(event) => updateHomeSection(sectionIndex, { mobileColumns: Math.max(1, Number(event.target.value)) })} /></label>}
                        {section.type !== "custom_banner" && <label className="toggleRow"><input type="checkbox" checked={section.isActive !== false} onChange={(event) => updateHomeSection(sectionIndex, { isActive: event.target.checked })} /><span>Active</span></label>}
                        {section.type === "category_products" && (
                          <>
                            {section.type === "category_products" && <label><span>Products per category</span><input type="number" min="1" max="24" value={section.productLimit || 6} onChange={(event) => updateHomeSection(sectionIndex, { productLimit: Number(event.target.value) })} /></label>}
                            <fieldset className="categorySelectionFieldset">
                              <legend>Categories to display</legend>
                              {(() => {
                                const selectedIds = (section.categories?.length ? section.categories : [section.category]).filter(Boolean).map((item) => String(item?._id || item));
                                const categoryLabel = (category) => category.parent?.name ? `${category.parent.name} / ${category.name}` : category.name;
                                const pickerValue = categoryPickerValues[sectionIndex] || "";
                                const addCategory = () => {
                                  const match = categories.find((category) => categoryLabel(category).toLowerCase() === pickerValue.trim().toLowerCase());
                                  if (!match || selectedIds.includes(String(match._id))) return;
                                  updateHomeSection(sectionIndex, { categories: [...selectedIds, match._id], category: undefined });
                                  setCategoryPickerValues((current) => ({ ...current, [sectionIndex]: "" }));
                                };
                                return <>
                                  <div className="categoryAutocomplete">
                                    <input
                                      type="text"
                                      list={`home-category-options-${sectionIndex}`}
                                      placeholder="Type a category name..."
                                      value={pickerValue}
                                      onChange={(event) => setCategoryPickerValues((current) => ({ ...current, [sectionIndex]: event.target.value }))}
                                      onKeyDown={(event) => { if (event.key === "Enter") { event.preventDefault(); addCategory(); } }}
                                    />
                                    <datalist id={`home-category-options-${sectionIndex}`}>
                                      {categories.filter((category) => !selectedIds.includes(String(category._id))).map((category) => <option key={category._id} value={categoryLabel(category)} />)}
                                    </datalist>
                                    <button className="inlineButton" type="button" onClick={addCategory}>Add category</button>
                                    <button className="inlineButton" type="button" onClick={() => updateHomeSection(sectionIndex, { categories: categories.map((category) => category._id), category: undefined })}>Select all</button>
                                    {selectedIds.length > 0 && <button className="inlineButton" type="button" onClick={() => updateHomeSection(sectionIndex, { categories: [], category: undefined })}>Clear</button>}
                                  </div>
                                  <div className="selectedCategoryChips">
                                    {selectedIds.map((categoryId) => {
                                      const category = categories.find((item) => String(item._id) === categoryId);
                                      if (!category) return null;
                                      return <span className="selectedCategoryChip" key={categoryId}>{categoryLabel(category)}<button type="button" aria-label={`Remove ${category.name}`} onClick={() => updateHomeSection(sectionIndex, { categories: selectedIds.filter((id) => id !== categoryId), category: undefined })}>×</button></span>;
                                    })}
                                    {!selectedIds.length && <small className="mutedText">No categories selected.</small>}
                                  </div>
                                </>;
                              })()}
                            </fieldset>
                          </>
                        )}
                      </div>
                      {section.type === "custom_banner" && (
                        <div className="formGrid homeSectionBannerEditor">
                          {Array.from({ length: Math.max(1, Math.min(3, Number(section.columns) || 1)) }, (_slot, imageIndex) => { const item = section.items?.[imageIndex] || {}; const size = bannerSizeFromItem(item); const imageUrl = item.imageUrl || (imageIndex === 0 ? section.banner?.imageUrl : "") || ""; const linkUrl = item.linkUrl || (imageIndex === 0 ? section.banner?.linkUrl : "") || ""; const updateBannerItem = (patch) => updateHomeBannerItem(sectionIndex, imageIndex, patch); return <div className="homeSectionBannerSlot" key={imageIndex}><label className="uploadBox compactUpload"><ImagePlus size={18} /><span>{imageUrl ? `Change image ${imageIndex + 1}` : `Choose image ${imageIndex + 1}`}</span><small>Optional image for column {imageIndex + 1}.</small><input type="file" accept="image/*" onChange={(event) => uploadSettingImage(event, (url) => updateBannerItem({ imageUrl: url }))} /></label><label><span>Image {imageIndex + 1} link (optional)</span><input value={linkUrl} placeholder="/products or https://..." onChange={(event) => updateBannerItem({ linkUrl: event.target.value })} /></label><div className="bannerDimensionFields"><label><span>Width in pixels (optional)</span><input type="number" min="1" placeholder="Automatic" value={size.width} onChange={(event) => updateBannerItem({ imageWidth: event.target.value ? Number(event.target.value) : null })} /></label><label><span>Height in pixels (optional)</span><input type="number" min="1" placeholder="Automatic" value={size.height} onChange={(event) => updateBannerItem({ imageHeight: event.target.value ? Number(event.target.value) : null })} /></label></div>{imageUrl && <figure className="homeSectionBannerPreview"><img src={imageUrl} style={{ ...(size.width ? { width: `${size.width}px`, maxWidth: "100%" } : {}), ...(size.height ? { height: `${size.height}px` } : {}) }} alt={`Custom banner image ${imageIndex + 1} preview`} /><figcaption>Column {imageIndex + 1} preview · dimensions apply to this image only</figcaption></figure>}</div>; })}
                        </div>
                      )}
                      {section.type === "custom_content" && (
                        <div className="sectionColumnEditor">
                          {(section.items || []).map((item, itemIndex) => (
                            <div className="sectionColumnItem" key={item._id || itemIndex}>
                              <div className="formGrid">
                                <select value={item.type || "image_text"} onChange={(event) => updateHomeSectionItem(sectionIndex, itemIndex, { type: event.target.value })}>
                                  <option value="image_text">Image and text</option>
                                  <option value="image">Image only</option>
                                  <option value="text">Text only</option>
                                </select>
                                <label><span>Title</span><input value={item.title || ""} onChange={(event) => updateHomeSectionItem(sectionIndex, itemIndex, { title: event.target.value })} /></label>
                                <label><span>Text</span><input value={item.text || ""} onChange={(event) => updateHomeSectionItem(sectionIndex, itemIndex, { text: event.target.value })} /></label>
                                <label><span>Link URL</span><input value={item.linkUrl || ""} onChange={(event) => updateHomeSectionItem(sectionIndex, itemIndex, { linkUrl: event.target.value })} /></label>
                                <label><span>Link label</span><input value={item.linkLabel || ""} onChange={(event) => updateHomeSectionItem(sectionIndex, itemIndex, { linkLabel: event.target.value })} /></label>
                              </div>
                              {item.type !== "text" && <><label className="uploadBox compactUpload"><ImagePlus size={18} /><span>{item.imageUrl ? "Change content image" : "Choose content image"}</span><small>Choose the image displayed in this home section.</small><input type="file" accept="image/*" required={!item.imageUrl} onChange={(event) => uploadSettingImage(event, (url) => updateHomeSectionItem(sectionIndex, itemIndex, { imageUrl: url }))} /></label>{item.imageUrl && <figure className="homeSectionBannerPreview"><img src={item.imageUrl} alt={`${item.title || "Home section content"} preview`} /><figcaption>Content image preview</figcaption></figure>}</>}
                              <button className="inlineButton" type="button" onClick={() => updateHomeSection(sectionIndex, { items: (section.items || []).filter((_item, index) => index !== itemIndex) })}><Trash2 size={16} /> Delete Content</button>
                            </div>
                          ))}
                          <button className="inlineButton" type="button" onClick={() => updateHomeSection(sectionIndex, { items: [...(section.items || []), { type: "image_text", title: "", text: "", imageUrl: "", linkUrl: "#/products", linkLabel: "Shop now" }] })}>Add Content</button>
                        </div>
                      )}
                      <div className="toolbar">
                        <button className="inlineButton" type="button" onClick={() => setHomeSections(homeSections.filter((_section, index) => index !== sectionIndex))}><Trash2 size={16} /> Delete Section</button>
                      </div>
                    </>
                  )}
                </div>
              ))}
            </div>
          </div>
          {uploadStatus && <p className="mutedText">{uploadStatus}</p>}
          <button className="primaryButton" type="submit" disabled={savingSettings}><Save size={18} /> {savingSettings ? "Saving..." : "Save Home Sections"}</button>
        </form>
  );
}
