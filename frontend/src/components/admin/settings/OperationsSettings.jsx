import AccountSettings from "./AccountSettings.jsx";
import PaymentSettings from "./PaymentSettings.jsx";
import ShippingSettings from "./ShippingSettings.jsx";
import EmailSettings from "./EmailSettings.jsx";
import StorefrontSettings from "./StorefrontSettings.jsx";
import ShipRocketSettings from "./ShipRocketSettings.jsx";
import HomeSectionsSettings from "./HomeSectionsSettings.jsx";
import HomeContentSettings from "./HomeContentSettings.jsx";
import HeroSettings from "./HeroSettings.jsx";
import BannerSectionsSettings from "./BannerSectionsSettings.jsx";
import { useState, useEffect, lazy } from "react";
import { api } from "../../../services/api.js";
import { bannerSizeFromItem } from "./settingsUtils.js";
import { bannerSizeLabel } from "./settingsUtils.js";
import { optimizeImage } from "../../../utils/imageOptimizer.js";
import { Save } from "lucide-react";
const SettingsRouteTabs = lazy(() => import("../../SettingsRouteTabs.jsx"));
export default function OperationsSettings({
  activeTab,
  onTabChange,
  paymentMethods,
  shippingRules,
  storefrontSettings,
  shipRocketSettings,
  products,
  categories,
  currentUser,
  onAccountUpdated,
  onSavePayment,
  onSaveShipping,
  onDeletePayment,
  onDeleteShipping,
  onSaveStorefront,
  onSaveShipRocket
}) {
  const [paymentForm, setPaymentForm] = useState(paymentMethods[0] || { code: "cod", name: "Cash on Delivery", type: "cod", isActive: true, sortOrder: 1, razorpay: {}, payu: {} });
  const [shippingForm, setShippingForm] = useState(shippingRules[0] || { name: "Flat Rate", type: "flat_rate", isActive: true, flatRate: 8, freeShippingAbove: 75, weightBands: [] });
  const [storeForm, setStoreForm] = useState(storefrontSettings || {});
  const [shipForm, setShipForm] = useState(shipRocketSettings || {});
  const [emailForm, setEmailForm] = useState({ host: "", port: 587, secure: false, username: "", password: "", fromName: "HRSBasket", fromEmail: "" });
  const [testEmailAddress, setTestEmailAddress] = useState("");
  const [accountForm, setAccountForm] = useState({ email: currentUser?.email || "", currentPassword: "" });
  const [uploadStatus, setUploadStatus] = useState("");
  const [settingsMessage, setSettingsMessage] = useState("");
  const [savingSettings, setSavingSettings] = useState(false);
  const [expandedHomeSection, setExpandedHomeSection] = useState("");
  const [draggedHomeSection, setDraggedHomeSection] = useState(null);
  const [categoryPickerValues, setCategoryPickerValues] = useState({});
  useEffect(() => setStoreForm(storefrontSettings || {}), [storefrontSettings]);
  useEffect(() => setShipForm(shipRocketSettings || {}), [shipRocketSettings]);
  useEffect(() => setAccountForm((current) => ({ ...current, email: currentUser?.email || "" })), [currentUser?.email]);
  useEffect(() => { if (activeTab === "email") api.emailSettings().then(setEmailForm).catch((error) => setSettingsMessage(error.message)); }, [activeTab]);
  const updatePayment = (field, value) => setPaymentForm((current) => ({ ...current, [field]: value }));
  const updateRazorpay = (field, value) => setPaymentForm((current) => ({ ...current, razorpay: { ...current.razorpay, [field]: value } }));
  const updatePayu = (field, value) => setPaymentForm((current) => ({ ...current, payu: { ...current.payu, [field]: value } }));
  const updateShipping = (field, value) => setShippingForm((current) => ({ ...current, [field]: value }));
  const pages = storeForm.pages?.length ? storeForm.pages : [{ title: "", slug: "", menu: "footer", content: "", isActive: true }];
  const footerColumns = storeForm.footerColumns || [];
  const promoBanner = { linkUrl: "#/products", ...(storeForm.promoBanner || {}) };
  const benefitItems = storeForm.benefitItems?.length
    ? storeForm.benefitItems
    : [
        { icon: "/images/e-commerce/home/car.svg", title: "Free Shipping", text: "Free delivery for orders above your store threshold." },
        { icon: "/images/e-commerce/home/headphones.svg", title: "24/7 Support", text: "Fast help for product, delivery, and return questions." },
        { icon: "/images/e-commerce/home/Sync.svg", title: "Easy Returns", text: "Simple exchanges and refunds with clear tracking." }
      ];
  const homeSectionTypes = [
    ["shipping_info", "Shipping info"],
    ["browse_collections", "Browse Collections"],
    ["seasonal_banner", "Seasonal banner"],
    ["new_arrivals", "New Arrival"],
    ["promo_banner", "Banner"],
    ["blog", "Blog"],
    ["instagram", "Instagram"],
    ["custom_banner", "Custom banner"],
    ["category_products", "Category products"],
    ["custom_content", "Custom content"]
  ];
  const homeSections = storeForm.homeSections?.length
    ? [...storeForm.homeSections].sort((a, b) => (a.sortOrder || 0) - (b.sortOrder || 0))
    : [
        { type: "shipping_info", title: "Shipping info", isActive: true, sortOrder: 1 },
        { type: "browse_collections", title: "Browse Collections", columns: 6, mobileColumns: 2, mobileRows: 2, isActive: true, sortOrder: 2 },
        { type: "seasonal_banner", title: "Seasonal banner", isActive: true, sortOrder: 3 },
        { type: "new_arrivals", title: "New Arrival", isActive: true, sortOrder: 4 },
        { type: "promo_banner", title: "Banner", isActive: true, sortOrder: 5 },
        { type: "blog", title: "Blog", isActive: true, sortOrder: 6 }
      ];
  const heroItems = storeForm.heroItems?.length
    ? storeForm.heroItems
    : [{ hideText: Boolean(storeForm.hero?.hideText), title: storeForm.hero?.title || "", subtitle: storeForm.hero?.subtitle || "", imageUrl: storeForm.hero?.imageUrl || "", linkUrl: storeForm.hero?.linkUrl || "#/products", isActive: true, sortOrder: 1 }];
  const contentSections = storeForm.contentSections?.length
    ? storeForm.contentSections
    : [
        {
          title: "Seasonal banners",
          subtitle: "",
          locations: ["home_before_new_arrivals"],
          columns: 2,
          isActive: true,
          sortOrder: 1,
          items: [{ type: "image_text", title: "", text: "", imageUrl: "", linkUrl: "#/products", linkLabel: "Shop now" }]
        }
      ];
  const updateContentSection = (index, patch) => {
    const next = [...contentSections];
    next[index] = { ...next[index], ...patch };
    setStoreForm({ ...storeForm, contentSections: next });
  };
  const updateContentItem = (sectionIndex, itemIndex, patch) => {
    const next = [...contentSections];
    const items = next[sectionIndex].items?.length ? [...next[sectionIndex].items] : [];
    items[itemIndex] = { ...items[itemIndex], ...patch };
    next[sectionIndex] = { ...next[sectionIndex], items };
    setStoreForm({ ...storeForm, contentSections: next });
  };
  const updatePromoBanner = (patch) => setStoreForm((current) => ({ ...current, promoBanner: { linkUrl: "#/products", ...current.promoBanner, ...patch } }));
  const updateBenefit = (index, patch) => {
    const next = [...benefitItems];
    next[index] = { ...next[index], ...patch };
    setStoreForm({ ...storeForm, benefitItems: next });
  };
  const setHomeSections = (nextSections) => {
    setStoreForm({
      ...storeForm,
      homeSections: nextSections.map((section, index) => ({ ...section, sortOrder: index + 1 }))
    });
  };
  const updateHomeSection = (index, patch) => {
    const next = [...homeSections];
    next[index] = { ...next[index], ...patch };
    setHomeSections(next);
  };
  const updateHomeSectionItem = (sectionIndex, itemIndex, patch) => {
    const next = [...homeSections];
    const items = next[sectionIndex].items?.length ? [...next[sectionIndex].items] : [];
    items[itemIndex] = { ...items[itemIndex], ...patch };
    next[sectionIndex] = { ...next[sectionIndex], items };
    setHomeSections(next);
  };
  const updateHomeBannerItem = (sectionIndex, itemIndex, patch) => {
    setStoreForm((current) => {
      const sections = current.homeSections?.length
        ? [...current.homeSections].sort((a, b) => (a.sortOrder || 0) - (b.sortOrder || 0))
        : [...homeSections];
      const section = sections[sectionIndex] || {};
      const columns = Math.max(1, Math.min(3, Number(section.columns) || 1));
      const items = Array.from({ length: columns }, (_entry, index) => ({
        ...(section.items?.[index] || {}),
        imageUrl: section.items?.[index]?.imageUrl || (index === 0 ? section.banner?.imageUrl : "") || "",
        ...(index === itemIndex ? (() => { const currentItem = section.items?.[index] || {}; const currentSize = bannerSizeFromItem(currentItem); const nextWidth = Object.hasOwn(patch, "imageWidth") ? patch.imageWidth : currentSize.width; const nextHeight = Object.hasOwn(patch, "imageHeight") ? patch.imageHeight : currentSize.height; return { ...patch, linkLabel: bannerSizeLabel(nextWidth, nextHeight) }; })() : {})
      }));
      sections[sectionIndex] = { ...section, items };
      return { ...current, homeSections: sections.map((entry, index) => ({ ...entry, sortOrder: index + 1 })) };
    });
  };
  const reorderHomeSection = (index, target) => {
    if (index === target || target < 0 || target >= homeSections.length) return;
    const next = [...homeSections];
    const [moved] = next.splice(index, 1);
    next.splice(target, 0, moved);
    setHomeSections(next);
  };
  const homeSectionsPayload = () =>
    homeSections.map((section) => ({
      ...section,
      category: section.category?._id || section.category || undefined
    }));
  const uploadSettingImage = async (event, apply) => {
    const file = event.target.files?.[0];
    if (!file) return;
    setUploadStatus("Optimizing image...");
    const optimized = await optimizeImage(file, { maxWidth: 1800, maxHeight: 1200, quality: 0.82 });
    apply(optimized.url);
    setUploadStatus(`Image ready at ${optimized.width}x${optimized.height}.`);
  };
  const runSettingAction = async (action, successMessage) => {
    setSavingSettings(true);
    setSettingsMessage("Saving changes...");
    try {
      await action();
      setSettingsMessage(successMessage);
    } catch (error) {
      setSettingsMessage(`Changes were not saved: ${error.message}`);
    } finally {
      setSavingSettings(false);
    }
  };
  return (
    <section className="contentStack" onChange={() => setSettingsMessage("You have unsaved changes.")}>
      <SettingsRouteTabs activeTab={activeTab} onChange={onTabChange} />
      {settingsMessage && (
        <div className={settingsMessage.startsWith("Changes were not saved") ? "notice errorText" : "notice"} role="status" aria-live="polite">
          {settingsMessage}
        </div>
      )}
      {activeTab === "account" && (
        <AccountSettings setSavingSettings={setSavingSettings} setSettingsMessage={setSettingsMessage} accountForm={accountForm} onAccountUpdated={onAccountUpdated} setAccountForm={setAccountForm} savingSettings={savingSettings} />
      )}
      {activeTab === "payments" && (
      <PaymentSettings paymentMethods={paymentMethods} setPaymentForm={setPaymentForm} runSettingAction={runSettingAction} onDeletePayment={onDeletePayment} onSavePayment={onSavePayment} paymentForm={paymentForm} updatePayment={updatePayment} updateRazorpay={updateRazorpay} updatePayu={updatePayu} savingSettings={savingSettings} />
      )}
      {activeTab === "shipping" && (
      <ShippingSettings shippingRules={shippingRules} setShippingForm={setShippingForm} runSettingAction={runSettingAction} onDeleteShipping={onDeleteShipping} onSaveShipping={onSaveShipping} shippingForm={shippingForm} updateShipping={updateShipping} savingSettings={savingSettings} />
      )}
      {activeTab === "email" && (
        <EmailSettings runSettingAction={runSettingAction} emailForm={emailForm} setEmailForm={setEmailForm} savingSettings={savingSettings} testEmailAddress={testEmailAddress} setTestEmailAddress={setTestEmailAddress} />
      )}
      {false && (
        <section className="contentStack">
          <div className="panelHeader"><div><h2>Pages</h2><p className="mutedText">Create the content pages available across your storefront.</p></div><button className="inlineButton" type="button" onClick={() => setStoreForm({ ...storeForm, pages: [...pages, { title: "", slug: "", content: "", menu: "hidden", isActive: true }] })}>Add page</button></div>
          {pages.map((page, index) => <article className="panel pageEditor" key={page._id || index}><div className="panelHeader"><h3>Page {index + 1}</h3><button className="inlineButton" type="button" onClick={() => setStoreForm({ ...storeForm, pages: pages.filter((_, itemIndex) => itemIndex !== index) })}>Remove</button></div><div className="formGrid twoColumn"><label><span>Page title</span><input required value={page.title || ""} onChange={(event) => { const next = [...pages]; next[index] = { ...page, title: event.target.value, slug: page.slug || event.target.value.toLowerCase().trim().replace(/[^a-z0-9]+/g, "-") }; setStoreForm({ ...storeForm, pages: next }); }} /></label><label><span>URL slug</span><input required value={page.slug || ""} onChange={(event) => { const next = [...pages]; next[index] = { ...page, slug: event.target.value.toLowerCase().replace(/[^a-z0-9-]/g, "") }; setStoreForm({ ...storeForm, pages: next }); }} /></label><label><span>Menu visibility</span><select value={page.menu || "hidden"} onChange={(event) => { const next = [...pages]; next[index] = { ...page, menu: event.target.value }; setStoreForm({ ...storeForm, pages: next }); }}><option value="hidden">Hidden</option><option value="header">Header</option><option value="footer">Footer</option><option value="both">Header and footer</option></select></label><label className="toggleRow"><input type="checkbox" checked={page.isActive !== false} onChange={(event) => { const next = [...pages]; next[index] = { ...page, isActive: event.target.checked }; setStoreForm({ ...storeForm, pages: next }); }} /><span>Published</span></label><label className="full"><span>Page content</span><textarea rows="10" value={page.content || ""} placeholder="Write page content here…" onChange={(event) => { const next = [...pages]; next[index] = { ...page, content: event.target.value }; setStoreForm({ ...storeForm, pages: next }); }} /></label></div></article>)}
          <button className="primaryButton" type="button" disabled={savingSettings} onClick={() => runSettingAction(() => onSaveStorefront(storeForm), "Pages saved successfully.")}><Save size={18} />Save pages</button>
        </section>
      )}
      {false && (
        <section className="contentStack"><div className="panelHeader"><div><h2>Footer columns</h2><p className="mutedText">Drag columns to set their order. Add between 2 and 4 columns.</p></div><button className="inlineButton" type="button" disabled={footerColumns.length >= 4} onClick={() => setStoreForm({ ...storeForm, footerColumns: [...footerColumns, { title: "", type: "links", text: "", links: [{ label: "", url: "" }], pageIds: [], sortOrder: footerColumns.length }] })}>Add column</button></div><div className="footerColumnEditors">{footerColumns.map((column, index) => <article className="panel footerColumnEditor" key={column._id || index} draggable onDragStart={(event) => event.dataTransfer.setData("text/plain", String(index))} onDragOver={(event) => event.preventDefault()} onDrop={(event) => { const from = Number(event.dataTransfer.getData("text/plain")); const next = [...footerColumns]; const [moved] = next.splice(from, 1); next.splice(index, 0, moved); setStoreForm({ ...storeForm, footerColumns: next.map((item, order) => ({ ...item, sortOrder: order })) }); }}><div className="panelHeader"><h3>⋮⋮ Column {index + 1}</h3><button className="inlineButton" type="button" onClick={() => setStoreForm({ ...storeForm, footerColumns: footerColumns.filter((_, itemIndex) => itemIndex !== index) })}>Remove</button></div><label><span>Menu title</span><input value={column.title || ""} onChange={(event) => { const next = [...footerColumns]; next[index] = { ...column, title: event.target.value }; setStoreForm({ ...storeForm, footerColumns: next }); }} /></label><label><span>Content type</span><select value={column.type || "links"} onChange={(event) => { const next = [...footerColumns]; next[index] = { ...column, type: event.target.value }; setStoreForm({ ...storeForm, footerColumns: next }); }}><option value="text">Text</option><option value="links">Custom links</option><option value="pages">Pages</option></select></label>{column.type === "text" && <label><span>Text</span><textarea value={column.text || ""} onChange={(event) => { const next = [...footerColumns]; next[index] = { ...column, text: event.target.value }; setStoreForm({ ...storeForm, footerColumns: next }); }} /></label>}{column.type === "links" && <label><span>Links (label | URL, one per line)</span><textarea value={(column.links || []).map((link) => `${link.label || ""} | ${link.url || ""}`).join("\n")} onChange={(event) => { const links = event.target.value.split("\n").filter(Boolean).map((line) => { const [label, url] = line.split("|"); return { label: label?.trim() || "Link", url: url?.trim() || "#" }; }); const next = [...footerColumns]; next[index] = { ...column, links }; setStoreForm({ ...storeForm, footerColumns: next }); }} /></label>}{column.type === "pages" && <label><span>Pages to show</span><select multiple value={column.pageIds || []} onChange={(event) => { const next = [...footerColumns]; next[index] = { ...column, pageIds: [...event.target.selectedOptions].map((option) => option.value) }; setStoreForm({ ...storeForm, footerColumns: next }); }}>{pages.filter((page) => page.isActive !== false && page.title).map((page) => <option key={page._id || page.slug} value={page._id || page.slug}>{page.title}</option>)}</select></label>}</article>)}</div><button className="primaryButton" type="button" disabled={savingSettings} onClick={() => runSettingAction(() => onSaveStorefront(storeForm), "Footer saved successfully.")}><Save size={18} />Save footer</button></section>
      )}
      {activeTab === "storefront" && (
      <StorefrontSettings runSettingAction={runSettingAction} onSaveStorefront={onSaveStorefront} storeForm={storeForm} setStoreForm={setStoreForm} uploadSettingImage={uploadSettingImage} uploadStatus={uploadStatus} pages={pages} savingSettings={savingSettings} />
      )}
      {activeTab === "shiprocket" && (
      <ShipRocketSettings runSettingAction={runSettingAction} onSaveShipRocket={onSaveShipRocket} shipForm={shipForm} setShipForm={setShipForm} savingSettings={savingSettings} />
      )}
      {activeTab === "home-sections" && (
        <HomeSectionsSettings runSettingAction={runSettingAction} onSaveStorefront={onSaveStorefront} homeSectionsPayload={homeSectionsPayload} setHomeSections={setHomeSections} homeSections={homeSections} setDraggedHomeSection={setDraggedHomeSection} reorderHomeSection={reorderHomeSection} draggedHomeSection={draggedHomeSection} setExpandedHomeSection={setExpandedHomeSection} expandedHomeSection={expandedHomeSection} homeSectionTypes={homeSectionTypes} updateHomeSection={updateHomeSection} categoryPickerValues={categoryPickerValues} categories={categories} setCategoryPickerValues={setCategoryPickerValues} updateHomeBannerItem={updateHomeBannerItem} uploadSettingImage={uploadSettingImage} updateHomeSectionItem={updateHomeSectionItem} uploadStatus={uploadStatus} savingSettings={savingSettings} />
      )}
      {activeTab === "home" && (
        <HomeContentSettings runSettingAction={runSettingAction} onSaveStorefront={onSaveStorefront} storeForm={storeForm} promoBanner={promoBanner} benefitItems={benefitItems} updatePromoBanner={updatePromoBanner} uploadSettingImage={uploadSettingImage} setStoreForm={setStoreForm} updateBenefit={updateBenefit} uploadStatus={uploadStatus} savingSettings={savingSettings} />
      )}
      {activeTab === "hero" && (
        <HeroSettings products={products || []} runSettingAction={runSettingAction} onSaveStorefront={onSaveStorefront} storeForm={storeForm} heroItems={heroItems} setStoreForm={setStoreForm} uploadSettingImage={uploadSettingImage} uploadStatus={uploadStatus} savingSettings={savingSettings} />
      )}
      {activeTab === "sections" && (
        <BannerSectionsSettings runSettingAction={runSettingAction} onSaveStorefront={onSaveStorefront} storeForm={storeForm} contentSections={contentSections} updateContentSection={updateContentSection} updateContentItem={updateContentItem} uploadSettingImage={uploadSettingImage} setStoreForm={setStoreForm} uploadStatus={uploadStatus} savingSettings={savingSettings} />
      )}
    </section>
  );
}
