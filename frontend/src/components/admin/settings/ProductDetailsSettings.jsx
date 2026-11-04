import { ArrowDown, ArrowUp, GripVertical, Plus, Save, Trash2 } from "lucide-react";

export const productDetailSectionTypes = [
  ["same_category_seller", "More from this category and seller", "More from this category and seller"],
  ["same_seller", "More from this seller", "More products from this seller"],
  ["same_category", "More from this category", "More from this category"],
  ["similar_category", "More from similar categories", "More from similar categories"]
];

const sectionTypeLabel = (type) => productDetailSectionTypes.find(([value]) => value === type)?.[1] || "Product section";

export default function ProductDetailsSettings({ runSettingAction, onSaveStorefront, sections, setSections, savingSettings }) {
  const updateSection = (index, patch) => {
    setSections(sections.map((section, sectionIndex) => {
      if (sectionIndex !== index) return section;
      const next = { ...section, ...patch };
      if (patch.type && patch.type !== section.type && section.title === sectionTypeLabel(section.type)) {
        next.title = sectionTypeLabel(patch.type);
      }
      return next;
    }));
  };
  const moveSection = (from, to) => {
    if (to < 0 || to >= sections.length) return;
    const next = [...sections];
    const [section] = next.splice(from, 1);
    next.splice(to, 0, section);
    setSections(next);
  };
  const addSection = () => {
    const [type, , title] = productDetailSectionTypes[0];
    setSections([...sections, { type, title, productLimit: 10, isActive: true }]);
  };
  const reorderDraggedSection = (event, targetIndex) => {
    const sourceValue = event.dataTransfer.getData("text/plain");
    const sourceIndex = Number(sourceValue);
    if (sourceValue === "" || !Number.isInteger(sourceIndex) || sourceIndex < 0 || sourceIndex >= sections.length) return;
    moveSection(sourceIndex, targetIndex);
  };

  return (
    <form className="panel formPanel widePanel" onSubmit={(event) => {
      event.preventDefault();
      runSettingAction(() => onSaveStorefront({
        productDetailSections: sections.map((section, index) => ({ ...section, sortOrder: index + 1 }))
      }), "Product detail sections saved successfully.");
    }}>
      <div className="panelHeader">
        <div>
          <h2>Product Details</h2>
          <p className="mutedText">Create and order recommendation sections shown below product information.</p>
        </div>
        <button className="inlineButton" type="button" onClick={addSection}><Plus size={16} /> Add Section</button>
      </div>
      <div className="heroEditorList">
        {sections.map((section, index) => (
          <article
            className="sectionColumnItem draggableSection"
            draggable
            key={section._id || `${section.type}-${index}`}
            onDragStart={(event) => {
              event.dataTransfer.effectAllowed = "move";
              event.dataTransfer.setData("text/plain", String(index));
            }}
            onDragOver={(event) => event.preventDefault()}
            onDrop={(event) => {
              event.preventDefault();
              reorderDraggedSection(event, index);
            }}
          >
            <div className="panelHeader">
              <h3><GripVertical size={16} /> {section.title || sectionTypeLabel(section.type)}</h3>
              <div className="toolbar">
                <button className="inlineButton" type="button" aria-label={`Move section ${index + 1} up`} disabled={index === 0} onClick={() => moveSection(index, index - 1)}><ArrowUp size={16} /></button>
                <button className="inlineButton" type="button" aria-label={`Move section ${index + 1} down`} disabled={index === sections.length - 1} onClick={() => moveSection(index, index + 1)}><ArrowDown size={16} /></button>
                <button className="inlineButton" type="button" onClick={() => setSections(sections.filter((_item, itemIndex) => itemIndex !== index))}><Trash2 size={16} /> Remove</button>
              </div>
            </div>
            <div className="formGrid">
              <label>
                <span>Section type</span>
                <select value={section.type || productDetailSectionTypes[0][0]} onChange={(event) => updateSection(index, { type: event.target.value })}>
                  {productDetailSectionTypes.map(([value, label]) => <option key={value} value={value}>{label}</option>)}
                </select>
              </label>
              <label>
                <span>Title</span>
                <input value={section.title || ""} onChange={(event) => updateSection(index, { title: event.target.value })} />
              </label>
              <label>
                <span>Products to show</span>
                <input type="number" min="1" max="24" value={section.productLimit || 10} onChange={(event) => updateSection(index, { productLimit: Math.max(1, Math.min(24, Number(event.target.value) || 1)) })} />
              </label>
              <label className="toggleRow">
                <input type="checkbox" checked={section.isActive !== false} onChange={(event) => updateSection(index, { isActive: event.target.checked })} />
                <span>Active</span>
              </label>
            </div>
          </article>
        ))}
        {!sections.length && <p className="mutedText">No product detail sections yet. Add a section to show related products below product information.</p>}
      </div>
      <button className="primaryButton" type="submit" disabled={savingSettings}><Save size={18} /> {savingSettings ? "Saving..." : "Save Product Details"}</button>
    </form>
  );
}
