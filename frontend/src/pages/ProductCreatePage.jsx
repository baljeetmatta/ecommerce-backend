import { ChevronDown, ImagePlus, Plus, Save, Trash2, Video, X } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { optimizeImage } from "../utils/imageOptimizer.js";
import { api } from "../services/api.js";
import GstPricePreview from "../components/GstPricePreview.jsx";
import { calculateRequiredSellingPrice } from "../utils/profitCalculator.js";

const initialForm = {
  name: "",
  sku: "",
  hsnCode: "",
  actualWeight: "",
  weightUnit: "kg",
  volumetricWeight: "",
  length: "",
  breadth: "",
  height: "",
  dimensionUnit: "cm",
  warranty: "",
  isReturnable: true,
  returnDays: 7,
  manufacturerBrand: "",
  countryOfOrigin: "India",
  variationOptions: [],
  variants: [],
  price: "",
  costPrice: "",
  offerPrice: "",
  sellerCosts: { productCost: "", shippingCharges: "", shippingAmountIncludesGst: true, packaging: "", platformFee: "", paymentGatewayFee: "", desiredProfitRate: "", otherCharges: "", marketing: "", gst: "" },
  shippingIncludedInPrice: true,
  shippingCharge: "",
  shippingCost: "",
  shippingPaidBy: "seller",
  shippingMode: "free_included",
  category: "",
  taxCategory: "",
  priceIncludesTax: true,
  displayType: "Product",
  status: "draft",
  isStockManageable: true,
  stock: "",
  lowStockThreshold: 10,
  tags: "",
  relatedProducts: [],
  shortDescription: "",
  detailedDescription: "",
  videoUrl: "",
  mainImage: "",
  imageVariants: {},
  media: []
};

const toForm = (product) => {
  if (!product) return initialForm;
  const proposed = product.pendingChanges ? { ...product, ...product.pendingChanges, sellerCosts: { ...(product.sellerCosts || {}), ...(product.pendingChanges.sellerCosts || {}) } } : product;
  return {
    ...initialForm,
    ...proposed,
    category: proposed.category?._id || proposed.category || "",
    taxCategory: proposed.taxCategory?._id || proposed.taxCategory || "",
    tags: Array.isArray(proposed.tags) ? proposed.tags.join(", ") : proposed.tags || "",
    media: proposed.media?.length ? proposed.media : proposed.mainImage ? [{ url: proposed.mainImage, type: "image", isMain: true, alt: proposed.name }] : [],
    variationOptions: (proposed.variationOptions || []).map((option) => ({ ...option, valuesInput: (option.values || []).join(", ") }))
  };
};

export default function ProductCreatePage({ categories, taxCategories, sellerSettlement = {}, gstDetails = null, products = [], initialProduct, onSave, onBack, hideCostPrice = false, hideStatus = false, gstEnabled = true }) {
  const [form, setForm] = useState(initialForm);
  const [imageStatus, setImageStatus] = useState("");
  const [relatedSearch, setRelatedSearch] = useState("");
  const [saving, setSaving] = useState(false);
  const [mediaUploading, setMediaUploading] = useState(false);
  const [saveError, setSaveError] = useState("");
  const [uploadProgress, setUploadProgress] = useState(0);

  useEffect(() => {
    setForm(toForm(initialProduct));
    setImageStatus("");
  }, [initialProduct]);

  useEffect(() => {
    const factor = form.dimensionUnit === "in" ? 2.54 : 1;
    const dimensions = [form.length, form.breadth, form.height].map((value) => Number(value) * factor);
    const volumetricWeight = dimensions.every((value) => Number.isFinite(value) && value > 0)
      ? Math.round((dimensions[0] * dimensions[1] * dimensions[2] / 5000) * 1000) / 1000
      : "";
    setForm((current) => current.volumetricWeight === volumetricWeight ? current : { ...current, volumetricWeight });
  }, [form.length, form.breadth, form.height, form.dimensionUnit]);

  const setField = (field, value) => {
    setForm((current) => ({ ...current, [field]: value }));
  };

  const profitCalculation = useMemo(() => {
    const platformRate = Number(sellerSettlement.platformFeeRate ?? form.sellerCosts?.platformFee ?? 0);
    const gatewayRate = Number(sellerSettlement.paymentGatewayFeeRate ?? 2);
    const productGstRate = gstEnabled ? Number(taxCategories.find((tax) => tax._id === form.taxCategory)?.rate || 0) : 0;
    return {
      platformRate,
      gatewayRate,
      productGstRate,
      result: calculateRequiredSellingPrice({
        productCost: form.sellerCosts?.productCost,
        shippingInvoiceAmount: form.sellerCosts?.shippingCharges,
        shippingAmountIncludesGst: form.sellerCosts?.shippingAmountIncludesGst !== false,
        packaging: form.sellerCosts?.packaging,
        otherExpenses: form.sellerCosts?.otherCharges,
        marketing: form.sellerCosts?.marketing,
        desiredProfitRate: form.sellerCosts?.desiredProfitRate,
        platformCommissionRate: platformRate,
        paymentGatewayRate: gatewayRate,
        productGstRate
      })
    };
  }, [form.sellerCosts, form.taxCategory, gstEnabled, sellerSettlement.platformFeeRate, sellerSettlement.paymentGatewayFeeRate, taxCategories]);

  useEffect(() => {
    const hasCalculatorInput = ["productCost", "shippingCharges", "packaging", "otherCharges", "marketing"].some((field) => Number(form.sellerCosts?.[field] || 0) > 0);
    if (!hasCalculatorInput || !profitCalculation.result.requiredSellingPrice) return;
    const calculatedPrice = (Math.ceil(profitCalculation.result.requiredSellingPrice * 100) / 100).toFixed(2);
    setForm((current) => current.price === calculatedPrice && current.offerPrice === calculatedPrice && current.priceIncludesTax
      ? current
      : { ...current, price: calculatedPrice, offerPrice: calculatedPrice, priceIncludesTax: true });
  }, [profitCalculation, form.sellerCosts]);

  const handleMainImage = async (event) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setUploadProgress(10);
    setMediaUploading(true);
    setImageStatus("Uploading and optimizing main image...");
    try {
      const optimized = await optimizeImage(file, { purpose: "product-main" });
      setForm((current) => ({
        ...current,
        mainImage: optimized.url,
        imageVariants: optimized.variants || {},
        media: [
          { url: optimized.url, type: "image", isMain: true, alt: current.name || optimized.name },
          ...current.media.filter((item) => !item.isMain)
        ]
      }));
      setImageStatus(`Main image uploaded and optimized from ${optimized.width}x${optimized.height}.`);
      setUploadProgress(100);
    } catch (error) {
      setImageStatus(error.message || "Unable to upload the main image.");
      setUploadProgress(0);
      event.target.value = "";
    } finally {
      setMediaUploading(false);
    }
  };

  const handleGalleryImages = async (event) => {
    const files = Array.from(event.target.files || []);
    if (files.length === 0) return;

    setUploadProgress(10);
    setMediaUploading(true);
    setImageStatus(`Uploading and optimizing ${files.length} gallery image${files.length > 1 ? "s" : ""}...`);
    try {
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
      setUploadProgress(100);
    } catch (error) {
      setImageStatus(error.message || "Unable to upload the gallery images.");
      setUploadProgress(0);
      event.target.value = "";
    } finally {
      setMediaUploading(false);
    }
  };

  const handleProductVideo = async (event) => {
    const file = event.target.files?.[0];
    if (!file) return;
    if (file.size > 50 * 1024 * 1024) { setImageStatus("Reel video must be 50 MB or smaller."); event.target.value = ""; return; }
    setUploadProgress(10);
    setMediaUploading(true);
    setImageStatus("Uploading reel video...");
    try {
      const uploaded = await api.uploadVideo(file);
      setField("videoUrl", uploaded.url);
      setImageStatus(`Reel uploaded: ${file.name} (${Math.max(1, Math.round(uploaded.size / 1024))} KB).`);
      setUploadProgress(100);
    } catch (error) {
      setImageStatus(error.message || "Unable to upload the Reel video.");
      setUploadProgress(0);
      event.target.value = "";
    } finally {
      setMediaUploading(false);
    }
  };

  const removeMedia = (index) => {
    setForm((current) => {
      const removed = current.media[index];
      const media = current.media.filter((_item, itemIndex) => itemIndex !== index);
      return {
        ...current,
        media,
        mainImage: media.find((item) => item.isMain)?.url || "",
        imageVariants: removed?.isMain ? {} : current.imageVariants
      };
    });
  };

  const generateVariants = () => {
    const options = (form.variationOptions || []).map((option) => ({ ...option, values: String(option.valuesInput ?? (option.values || []).join(",")).split(",").map((value) => value.trim()).filter(Boolean) })).filter((option) => option.name.trim() && option.values.length);
    const combinations = options.reduce((rows, option) => rows.flatMap((row) => option.values.filter(Boolean).map((value) => ({ ...row, [option.name.trim()]: value }))), [{}]);
    const existing = new Map((form.variants || []).map((variant) => [JSON.stringify(variant.attributes || {}), variant]));
    const skuPrefix = form.sku.trim() || `VAR-${Date.now().toString(36).toUpperCase()}`;
    setField("variants", combinations.map((attributes, index) => existing.get(JSON.stringify(attributes)) || { sku: `${skuPrefix}-${index + 1}`, attributes, price: Number(form.offerPrice || form.price || 0), costPrice: Number(form.costPrice || 0), stock: 0, backOrderAllowed: false }));
  };

  const submitProduct = async (event) => {
    event.preventDefault();
    if (saving || mediaUploading) return;
    if (form.displayType === "Reel" && !form.videoUrl) {
      setSaveError("Upload the Reel video and wait for the upload to finish before saving.");
      return;
    }
    setSaving(true);
    setUploadProgress(75);
    setSaveError("");
    const { costPrice: _costPrice, status: _status, ...sellerSafeForm } = form;
    try {
      await onSave({
        ...(hideCostPrice || hideStatus ? sellerSafeForm : form),
        ...(!hideStatus && { status: form.status }),
        price: Number(form.price),
        ...(!hideCostPrice && { costPrice: Number(form.costPrice || 0) }),
        offerPrice: form.offerPrice === "" ? Number(form.price) : Number(form.offerPrice),
        sellerCosts: { ...Object.fromEntries(Object.entries(form.sellerCosts || {}).map(([field, value]) => [field, field === "shippingAmountIncludesGst" ? value !== false : Number(value || 0)])), platformFee: Number(sellerSettlement.platformFeeRate ?? form.sellerCosts?.platformFee ?? 0), paymentGatewayFee: Number(sellerSettlement.paymentGatewayFeeRate ?? 2) },
        shippingIncludedInPrice: Boolean(form.shippingIncludedInPrice),
        shippingCharge: form.shippingMode === "fixed_customer" ? Number(form.shippingCharge || 0) : 0,
        shippingCost: Number(form.shippingCost || 0),
        shippingPaidBy: form.shippingIncludedInPrice ? "seller" : "customer",
        shippingMode: form.shippingMode || (form.shippingIncludedInPrice ? "free_included" : "fixed_customer"),
        isReturnable: Boolean(form.isReturnable),
        returnDays: form.isReturnable ? Math.max(1, Number(form.returnDays || 7)) : 0,
        stock: form.isStockManageable ? Number(form.stock || 0) : 0,
        lowStockThreshold: Number(form.lowStockThreshold || 0),
        actualWeight: form.actualWeight === "" ? undefined : Number(form.actualWeight),
        weightUnit: form.weightUnit || "kg",
        volumetricWeight: form.volumetricWeight === "" ? undefined : Number(form.volumetricWeight),
        length: form.length === "" ? undefined : Number(form.length),
        breadth: form.breadth === "" ? undefined : Number(form.breadth),
        height: form.height === "" ? undefined : Number(form.height),
        dimensionUnit: form.dimensionUnit || "cm",
        tags: form.tags.split(",").map((tag) => tag.trim()).filter(Boolean),
        relatedProducts: (form.relatedProducts || []).map((item) => item?._id || item).filter((id) => String(id) !== String(initialProduct?._id || "")),
        category: form.category,
        taxCategory: form.taxCategory || undefined,
        variationOptions: (form.variationOptions || []).map(({ name, values, valuesInput }) => ({ name: name.trim(), values: String(valuesInput ?? (values || []).join(",")).split(",").map((value) => value.trim()).filter(Boolean) })).filter((option) => option.name && option.values.length),
        videoUrl: form.videoUrl || "",
        seo: {
          slug: form.name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, ""),
          metaTitle: form.name,
          metaDescription: form.shortDescription
        }
      });
      if (!initialProduct) setForm(initialForm);
      setImageStatus("");
      setUploadProgress(100);
    } catch (error) {
      setSaveError(error.message || "Unable to save the product.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <section className="contentStack">
      <form className="panel productForm" onSubmit={submitProduct}>
        <div className="panelHeader">
          <h2>{initialProduct ? "Edit Product" : "Add Product"}</h2>
          {onBack && <button className="inlineButton" type="button" onClick={onBack}>← Back to products</button>}
        </div>

        <details className="productFormSection" open>
          <summary>Basic Details</summary>
          <div className="productSectionContent">
          {gstEnabled && gstDetails && <div className="productGstIdentity"><span><small>GSTIN</small><strong>{gstDetails.gstNumber || "Verified GST seller"}</strong></span><span><small>Legal name</small><strong>{gstDetails.legalName || "—"}</strong></span><span><small>GST state</small><strong>{gstDetails.state || "—"}</strong></span><b>GST Verified</b></div>}
          <div className="formGrid">
          <label>
            <span>Product name</span>
            <input value={form.name} onChange={(event) => setField("name", event.target.value)} required />
          </label>
          <label>
            <span>SKU</span>
            <input value={form.sku} onChange={(event) => setField("sku", event.target.value)} placeholder="Leave blank to generate automatically" />
          </label>
          <label>
            <span>Selling price {profitCalculation.result.requiredSellingPrice > 0 ? "(auto-calculated)" : ""}</span>
            <input type="number" min="0" step="0.01" value={form.price} readOnly={profitCalculation.result.requiredSellingPrice > 0} onChange={(event) => setField("price", event.target.value)} required />
            {profitCalculation.result.requiredSellingPrice > 0 && <small>GST-inclusive price, updated automatically to deliver the selected net profit after all deductions.</small>}
          </label>
          <label>
            <span>Offer price</span>
            <input type="number" min="0" step="0.01" value={form.offerPrice} readOnly={profitCalculation.result.requiredSellingPrice > 0} onChange={(event) => setField("offerPrice", event.target.value)} placeholder="Defaults to price" />
          </label>
          {!hideCostPrice && <label>
            <span>Cost price (for partner profit)</span>
            <input type="number" min="0" step="0.01" value={form.costPrice} onChange={(event) => setField("costPrice", event.target.value)} required />
          </label>}
          <label><span>Category</span><select required value={(() => { const selected = categories.find((item) => item._id === form.category); return selected?.parent?._id || selected?.parent || form.category || ""; })()} onChange={(event) => setField("category", event.target.value)}><option value="">Select category</option>{categories.filter((item) => !item.parent).map((category) => <option key={category._id} value={category._id}>{category.name}</option>)}</select></label>
          <label><span>Subcategory</span><select value={categories.find((item) => item._id === form.category)?.parent ? form.category : ""} onChange={(event) => setField("category", event.target.value || event.target.dataset.parent)} data-parent={(() => { const selected = categories.find((item) => item._id === form.category); return selected?.parent?._id || selected?.parent || form.category || ""; })()}><option value="">No subcategory</option>{categories.filter((item) => String(item.parent?._id || item.parent || "") === String((() => { const selected = categories.find((entry) => entry._id === form.category); return selected?.parent?._id || selected?.parent || form.category || ""; })())).map((category) => <option key={category._id} value={category._id}>{category.name}</option>)}</select></label>
          <label><span>HSN Code</span><input value={form.hsnCode || ""} onChange={(event) => setField("hsnCode", event.target.value)} /></label>
          <label><span>Manufacturer / Brand</span><input value={form.manufacturerBrand || ""} onChange={(event) => setField("manufacturerBrand", event.target.value)} /></label>
          {gstEnabled && <label>
            <span>Tax category</span>
            <select value={form.taxCategory} onChange={(event) => setField("taxCategory", event.target.value)}>
              <option value="">No tax category</option>
              {taxCategories.map((tax) => (
                <option key={tax._id} value={tax._id}>
                  {tax.name} ({tax.rate}%)
                </option>
              ))}
            </select>
          </label>}
          {gstEnabled && <><label><span>Does the entered price include GST?</span><select value={form.priceIncludesTax ? "yes" : "no"} onChange={(event) => setField("priceIncludesTax", event.target.value === "yes")}><option value="yes">Yes — GST is included</option><option value="no">No — add GST to the price</option></select></label><GstPricePreview price={form.price} offerPrice={form.offerPrice} taxCategory={taxCategories.find((tax) => tax._id === form.taxCategory)} priceIncludesTax={form.priceIncludesTax} /></>}
          <label><span>Customer Shipping</span><select value={form.shippingMode || "free_included"} onChange={(event) => { const mode = event.target.value; const customerPays = ["fixed_customer", "free_realtime", "realtime_customer"].includes(mode); setForm((current) => ({ ...current, shippingMode: mode, shippingIncludedInPrice: !customerPays, shippingPaidBy: customerPays ? "customer" : "seller", shippingCharge: mode === "fixed_customer" ? current.shippingCharge : 0 })); }}><option value="free_included">1. Free Shipping (included in price)</option><option value="fixed_customer">2. Fixed Shipping by Seller</option><option value="estimated_seller">3. Estimated Shipping (Seller only)</option><option value="free_realtime">4. Shipping with real-time Shiprocket</option><option value="realtime_customer">5. Real-time Shipping charged to Customer</option></select><small>{({ free_included: "Customer sees Free Shipping; seller bears this cost.", fixed_customer: "Customer pays the fixed amount entered below.", estimated_seller: "Estimate is private and used only in the profit calculation.", free_realtime: "Customer pays the live Shiprocket rate calculated from seller and delivery pincodes.", realtime_customer: "Customer pays the live Shiprocket rate at checkout." })[form.shippingMode || "free_included"]}</small></label>
          {form.shippingMode === "fixed_customer" && <label><span>Fixed shipping charged to customer</span><input type="number" min="0.01" step="0.01" required value={form.shippingCharge} onChange={(event) => setField("shippingCharge", event.target.value)} /></label>}
          <label><span>{["estimated_seller", "free_realtime", "realtime_customer"].includes(form.shippingMode) ? "Estimated Shiprocket cost" : "Actual shipping cost"} (profit calculation)</span><input type="number" min="0" step="0.01" required value={form.shippingCost} onChange={(event) => setForm((current) => ({ ...current, shippingCost: event.target.value, sellerCosts: { ...current.sellerCosts, shippingCharges: event.target.value } }))} /><small>Private: visible only to Seller/Admin. Live modes replace this estimate with the actual rate at order time.</small></label>
          <label><span>Display type</span><select value={form.displayType} onChange={(event) => setField("displayType", event.target.value)}><option>Product</option><option>Reel</option></select></label>
          {!hideStatus && <label><span>Status</span><select value={form.status} onChange={(event) => setField("status", event.target.value)}><option value="draft">Draft</option><option value="active">Active</option><option value="archived">Archived</option></select></label>}
          <label className="fullWidthField"><span>Short description</span><input value={form.shortDescription} onChange={(event) => setField("shortDescription", event.target.value)} required /></label>
          <label className="fullWidthField"><span>Detailed description</span><textarea value={form.detailedDescription} onChange={(event) => setField("detailedDescription", event.target.value)} rows="6" required /></label>
          <label className="fullWidthField"><span>Tags</span><input value={form.tags} onChange={(event) => setField("tags", event.target.value)} placeholder="comma, separated, tags" /></label>
          </div>
          </div>
        </details>

          <details className={`sellerProfitCalculator productFormSection ${gstEnabled ? "" : "noGst"}`}>
            <summary className="profitCalculatorToggle">
              <span><strong>Profit calculator</strong><small>Estimate your earnings before submitting this product.</small></span>
              <ChevronDown aria-hidden="true" />
            </summary>
            <div className="profitCalculatorContent">
            <div className="formGrid compact">
              {[["productCost", "Product cost (₹)"], ["shippingCharges", "Shiprocket invoice amount (₹)"], ["packaging", "Packaging (₹)"], ["otherCharges", "Other expenses (₹)"], ["marketing", "Marketing (₹)"], ["desiredProfitRate", "Desired profit (%)"]].map(([field, label]) => <label key={field}><span>{label}</span><input type="number" min="0" step="0.01" value={form.sellerCosts?.[field] ?? ""} onChange={(event) => setForm((current) => ({ ...current, ...(field === "shippingCharges" ? { shippingCost: event.target.value } : {}), sellerCosts: { ...(current.sellerCosts || {}), [field]: event.target.value } }))} /></label>)}
              <label><span>Shiprocket invoice GST</span><select value={form.sellerCosts?.shippingAmountIncludesGst === false ? "exclusive" : "inclusive"} onChange={(event) => setField("sellerCosts", { ...(form.sellerCosts || {}), shippingAmountIncludesGst: event.target.value === "inclusive" })}><option value="inclusive">Invoice amount includes GST</option><option value="exclusive">GST is extra on invoice</option></select><small>Uses the actual invoice treatment; GST is never added twice.</small></label>
              <label><span>Platform fee (%)</span><input type="number" readOnly value={sellerSettlement.platformFeeRate ?? form.sellerCosts?.platformFee ?? 0} /><small>Fixed by Admin; calculated on selling price.</small></label>
              <label><span>Payment gateway fee (%)</span><input type="number" readOnly value={sellerSettlement.paymentGatewayFeeRate ?? 2} /><small>Calculated on customer payment.</small></label>
              {gstEnabled && <label><span>Product GST (%)</span><input type="number" readOnly value={taxCategories.find((tax) => tax._id === form.taxCategory)?.rate || 0} /><small>Taken from the selected tax category.</small></label>}
            </div>
            {(() => {
              const { platformRate, gatewayRate, productGstRate, result } = profitCalculation;
              const rupees = (value) => new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 2 }).format(value || 0);
              return <div className="profitSummary finalCalculator">
                <span>Product Cost <strong>{rupees(result.productCost)}</strong></span>
                <span>Shipping Cost <strong>{rupees(result.shippingCost)}</strong></span>
                <span>GST on Shipping @18% <strong>{rupees(result.shippingGst)}</strong></span>
                <span>Packaging <strong>{rupees(result.packaging)}</strong></span>
                <span>Other Expenses <strong>{rupees(result.otherExpenses)}</strong></span>
                <span>Marketing <strong>{rupees(result.marketing)}</strong></span>
                <span>Product GST @{productGstRate}% <strong>{rupees(result.productGst)}</strong></span>
                <span>Platform Commission {platformRate}% <strong>{rupees(result.platformCommission)}</strong></span>
                <span>GST on Platform Commission @18% <strong>{rupees(result.platformCommissionGst)}</strong></span>
                <span>Payment Gateway {gatewayRate}% <strong>{rupees(result.paymentGatewayFee)}</strong></span>
                <span>GST on Payment Gateway @18% <strong>{rupees(result.paymentGatewayGst)}</strong></span>
                <span>Total Cost/Deductions <strong>{rupees(result.totalDeductions)}</strong></span>
                <span>Desired Profit <strong>{Number(form.sellerCosts?.desiredProfitRate || 0)}% · {rupees(result.desiredProfit)}</strong></span>
                <span>Required Selling Price <strong>{rupees(result.requiredSellingPrice)}</strong></span>
                <span>Seller Settlement <strong>{rupees(result.sellerSettlement)}</strong></span>
                <span>Net Profit <strong>{rupees(result.netProfit)}</strong></span>
                <small>Shipping GST follows the actual Shiprocket invoice. Product, shipping, commission and gateway GST remain separate and no GST is deducted twice.</small>
              </div>;
            })()}
            </div>
          </details>
        <details className="productFormSection">
          <summary>Product Data</summary>
        <div className="formGrid compact productSectionContent">
          <label><span>Actual weight</span><span className="inputWithUnit"><input required type="number" min="0.001" step="0.001" value={form.actualWeight ?? ""} onChange={(event) => setField("actualWeight", event.target.value)} /><select aria-label="Weight unit" value={form.weightUnit || "kg"} onChange={(event) => setField("weightUnit", event.target.value)}><option value="kg">kg</option><option value="g">g</option></select></span></label>
          <label><span>Dimension unit</span><select value={form.dimensionUnit || "cm"} onChange={(event) => setField("dimensionUnit", event.target.value)}><option value="cm">Centimetres (cm)</option><option value="in">Inches (in)</option></select></label>
          <label><span>Length ({form.dimensionUnit || "cm"})</span><input required type="number" min="0.01" step="0.01" value={form.length ?? ""} onChange={(event) => setField("length", event.target.value)} /></label>
          <label><span>Width ({form.dimensionUnit || "cm"})</span><input required type="number" min="0.01" step="0.01" value={form.breadth ?? ""} onChange={(event) => setField("breadth", event.target.value)} /></label>
          <label><span>Height ({form.dimensionUnit || "cm"})</span><input required type="number" min="0.01" step="0.01" value={form.height ?? ""} onChange={(event) => setField("height", event.target.value)} /></label>
          <label><span>Volumetric weight (kg)</span><input type="number" readOnly value={form.volumetricWeight ?? ""} placeholder="Calculated automatically" /><small>Length × width × height ÷ 5000</small></label>
          <label><span>Warranty</span><input value={form.warranty || ""} onChange={(event) => setField("warranty", event.target.value)} placeholder="Example: 1 year" /></label>
          <label><span>Country of origin</span><input required value={form.countryOfOrigin || ""} onChange={(event) => setField("countryOfOrigin", event.target.value)} placeholder="Example: India" /></label>
          <label><span>Return policy</span><select value={form.isReturnable === false ? "none" : String(form.returnDays || 7)} onChange={(event) => { const value = event.target.value; setForm((current) => ({ ...current, isReturnable: value !== "none", returnDays: value === "none" ? 0 : Number(value) })); }}><option value="7">7 day return</option><option value="10">10 day return</option><option value="none">No return</option></select></label>
        </div>
        </details>

        <details className="variantEditor productFormSection">
          <summary>Product Variations</summary>
          <div className="productSectionContent">
          <div className="panelHeader"><div><h2>Product variations</h2><p className="mutedText">Define options such as Size, Color, RAM, Storage, or Material.</p></div><button className="inlineButton" type="button" onClick={() => setField("variationOptions", [...(form.variationOptions || []), { name: "", values: [], valuesInput: "" }])}><Plus size={16} /> Add option</button></div>
          {(form.variationOptions || []).map((option, index) => <div className="formGrid compact" key={index}>
            <label><span>Option name</span><input value={option.name} placeholder="Size, Color, RAM…" onChange={(event) => { const next = [...form.variationOptions]; next[index] = { ...option, name: event.target.value }; setField("variationOptions", next); }} /></label>
            <label><span>Available values</span><input value={option.valuesInput ?? (option.values || []).join(", ")} placeholder="S, M, L or 8 GB, 16 GB" onChange={(event) => { const next = [...form.variationOptions]; next[index] = { ...option, valuesInput: event.target.value }; setField("variationOptions", next); }} /></label>
            <button className="dangerButton" type="button" onClick={() => setField("variationOptions", form.variationOptions.filter((_item, itemIndex) => itemIndex !== index))}><Trash2 size={15} /> Remove</button>
          </div>)}
          {(form.variationOptions || []).length > 0 && <button className="secondaryButton" type="button" onClick={generateVariants}>Generate variation combinations</button>}
          {(form.variants || []).length > 0 && <div className="tableWrap"><table><thead><tr><th>Variation</th><th>SKU</th><th>Price</th><th>Stock</th><th></th></tr></thead><tbody>{form.variants.map((variant, index) => <tr key={index}><td>{Object.entries(variant.attributes || {}).map(([name, value]) => `${name}: ${value}`).join(" · ")}</td><td><input required value={variant.sku || ""} onChange={(event) => { const next = [...form.variants]; next[index] = { ...variant, sku: event.target.value }; setField("variants", next); }} /></td><td><input type="number" min="0" step="0.01" required value={variant.price ?? ""} onChange={(event) => { const next = [...form.variants]; next[index] = { ...variant, price: Number(event.target.value) }; setField("variants", next); }} /></td><td><input type="number" min="0" required value={variant.stock ?? 0} onChange={(event) => { const next = [...form.variants]; next[index] = { ...variant, stock: Number(event.target.value) }; setField("variants", next); }} /></td><td><button type="button" title="Remove variation" onClick={() => setField("variants", form.variants.filter((_item, itemIndex) => itemIndex !== index))}><Trash2 size={15} /></button></td></tr>)}</tbody></table></div>}
          </div>
        </details>

        <details className="productFormSection">
          <summary>Stock Details</summary><div className="productSectionContent">
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
          </div>
        </details>

        <details className="relatedProductEditor productFormSection">
          <summary>Related Products</summary><div className="productSectionContent">
          <div className="panelHeader"><div><h2>Related products</h2><p className="mutedText">Search and add any number of products to display on this product's details page.</p></div></div>
          <label><span>Search products</span><input value={relatedSearch} onChange={(event) => setRelatedSearch(event.target.value)} placeholder="Search by product name or SKU" /></label>
          {relatedSearch.trim() && <div className="relatedProductSearchResults">{products.filter((product) => product._id !== initialProduct?._id && !(form.relatedProducts || []).some((item) => String(item?._id || item) === String(product._id)) && `${product.name} ${product.sku}`.toLowerCase().includes(relatedSearch.toLowerCase())).slice(0, 12).map((product) => <button type="button" key={product._id} onClick={() => { setField("relatedProducts", [...(form.relatedProducts || []), product._id]); setRelatedSearch(""); }}><Plus size={15} /><span><strong>{product.name}</strong><small>{product.sku}</small></span></button>)}{!products.some((product) => product._id !== initialProduct?._id && `${product.name} ${product.sku}`.toLowerCase().includes(relatedSearch.toLowerCase())) && <p>No matching products.</p>}</div>}
          {(form.relatedProducts || []).length > 0 && <div className="selectedRelatedProducts">{form.relatedProducts.map((item) => { const id = item?._id || item; const product = products.find((entry) => String(entry._id) === String(id)) || item; return <span key={id}>{product?.name || "Selected product"}<button type="button" aria-label="Remove related product" onClick={() => setField("relatedProducts", form.relatedProducts.filter((entry) => String(entry?._id || entry) !== String(id)))}><X size={14} /></button></span>; })}</div>}
          </div>
        </details>

        <details className="productFormSection">
          <summary>Product Images</summary><div className="productSectionContent">
        <div className="mediaGrid">
          <label className="uploadBox">
            <ImagePlus size={20} />
            <span>Main image</span>
            <input type="file" accept="image/*" disabled={mediaUploading} onChange={handleMainImage} />
          </label>
          <label className="uploadBox">
            <ImagePlus size={20} />
            <span>Gallery images</span>
            <input type="file" accept="image/*" multiple disabled={mediaUploading} onChange={handleGalleryImages} />
          </label>
          <label className="uploadBox">
            <Video size={20} />
            <span>{form.videoUrl ? "Replace reel video" : "Upload reel video"}</span>
            <input type="file" accept="video/*" disabled={mediaUploading} onChange={handleProductVideo} />
          </label>
        </div>

        {form.videoUrl && <div className="uploadedVideoPreview"><video src={form.videoUrl} controls /><button className="dangerButton" type="button" onClick={() => setField("videoUrl", "")}><Trash2 size={15} /> Remove video</button></div>}

        {(imageStatus || saving) && <div className="productUploadProgress" role="status" aria-live="polite"><div><span>{saving ? "Saving product to database…" : imageStatus}</span><strong>{uploadProgress}%</strong></div><progress max="100" value={uploadProgress} /></div>}
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
          </div>
        </details>

        {saveError && <p className="errorText" role="alert">{saveError}</p>}
        <button className="primaryButton" type="submit" disabled={saving || mediaUploading}>
          <Save size={18} /> {mediaUploading ? "Wait for upload…" : saving ? "Saving Product…" : initialProduct ? "Update Product" : "Save Product"}
        </button>
      </form>
    </section>
  );
}
