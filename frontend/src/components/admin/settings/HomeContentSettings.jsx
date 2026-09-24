import { Save } from "lucide-react";
import { ImagePlus } from "lucide-react";

export default function HomeContentSettings({ runSettingAction, onSaveStorefront, storeForm, promoBanner, benefitItems, updatePromoBanner, uploadSettingImage, setStoreForm, updateBenefit, uploadStatus, savingSettings }) {
  return (
<form className="panel formPanel widePanel" onSubmit={(event) => { event.preventDefault(); runSettingAction(() => onSaveStorefront({ promoBanner: { ...promoBanner, isActive: promoBanner.isActive !== false }, benefitItems, showBenefitItems: storeForm.showBenefitItems !== false }), "Home content saved successfully."); }}>
          <div className="panelHeader"><h2>Home Content</h2><Save size={18} /></div>
          <div className="heroEditorItem">
            <div className="panelHeader"><h2>Sale Banner</h2></div>
            <label className="toggleRow"><input type="checkbox" checked={promoBanner.isActive !== false} disabled={savingSettings} onChange={(event) => updatePromoBanner({ isActive: event.target.checked })} /><span>Enable sale banner on homepage</span></label>
            <p className="fieldHint">Disable to hide the banner while keeping its image and link saved. An enabled banner appears once an image is uploaded.</p>
            <div className="formGrid"><label><span>Banner image link</span><input value={promoBanner.linkUrl || ""} placeholder="#/products or https://..." onChange={(event) => updatePromoBanner({ linkUrl: event.target.value })} /></label></div>
            <label className="uploadBox compactUpload"><ImagePlus size={18} /><span>{promoBanner.imageUrl ? "Change banner image" : "Choose banner image"}</span><input type="file" accept="image/*" onChange={(event) => uploadSettingImage(event, (url) => updatePromoBanner({ imageUrl: url }))} /></label>
            {promoBanner.imageUrl && <figure className="homeSectionBannerPreview"><img src={promoBanner.imageUrl} alt="Sale banner preview" /><figcaption>Banner image preview</figcaption></figure>}
          </div>
          <div className="heroEditorItem">
            <div className="panelHeader"><div><h2>Home Benefits</h2><p className="mutedText">Free Shipping, 24/7 Support and Easy Returns.</p></div></div>
            <label className="toggleRow"><input type="checkbox" checked={storeForm.showBenefitItems !== false} disabled={savingSettings} onChange={(event) => setStoreForm({ ...storeForm, showBenefitItems: event.target.checked })} /><span>Enable benefits section on homepage</span></label>
            <div className="sectionColumnEditor">
              {benefitItems.map((item, index) => (
                <div className="sectionColumnItem" key={index}>
                  <div className="formGrid">
                    <label><span>Title</span><input value={item.title || ""} onChange={(event) => updateBenefit(index, { title: event.target.value })} /></label>
                    <label><span>Description</span><input value={item.text || ""} onChange={(event) => updateBenefit(index, { text: event.target.value })} /></label>
                    <label><span>Icon URL</span><input value={item.icon || ""} onChange={(event) => updateBenefit(index, { icon: event.target.value })} /></label>
                  </div>
                  <label className="uploadBox compactUpload"><ImagePlus size={18} /><span>Upload icon</span><input type="file" accept="image/*" onChange={(event) => uploadSettingImage(event, (url) => updateBenefit(index, { icon: url }))} /></label>
                </div>
              ))}
            </div>
          </div>
          {uploadStatus && <p className="mutedText">{uploadStatus}</p>}
          <button className="primaryButton" type="submit" disabled={savingSettings}><Save size={18} /> {savingSettings ? "Saving..." : "Save Home Content"}</button>
        </form>
  );
}
