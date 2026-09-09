import { Save } from "lucide-react";
import { ImagePlus } from "lucide-react";

export default function StorefrontSettings({ runSettingAction, onSaveStorefront, storeForm, setStoreForm, uploadSettingImage, uploadStatus, pages, savingSettings }) {
  return (
<div className="twoColumn">
        <form className="panel formPanel widePanel" onSubmit={(event) => { event.preventDefault(); runSettingAction(() => onSaveStorefront(storeForm), "Storefront settings saved successfully."); }}>
          <div className="panelHeader"><h2>Custom Storefront</h2><Save size={18} /></div>
          <div className="formGrid">
            <label><span>Project title</span><input value={storeForm.projectTitle || "E-commerce Admin"} onChange={(event) => setStoreForm({ ...storeForm, projectTitle: event.target.value })} /></label>
            <label><span>Shop name</span><input value={storeForm.shopName || ""} onChange={(event) => setStoreForm({ ...storeForm, shopName: event.target.value })} /></label>
            <label><span>Admin / portal button color</span><input type="color" value={storeForm.adminButtonColor || "#1e88e5"} onChange={(event) => setStoreForm({ ...storeForm, adminButtonColor: event.target.value })} /></label>
            <label className="uploadBox compactUpload"><ImagePlus size={18} /><span>Upload logo</span><input type="file" accept="image/*" onChange={(event) => uploadSettingImage(event, (url) => setStoreForm((current) => ({ ...current, logoUrl: url })))} /></label>
            <label><span>Header logo width (px)</span><input type="number" min="1" value={storeForm.logoWidth || 140} onChange={(event) => setStoreForm({ ...storeForm, logoWidth: Math.max(1, Number(event.target.value) || 1) })} /></label>
            <label><span>Header logo height (px)</span><input type="number" min="1" value={storeForm.logoHeight || 56} onChange={(event) => setStoreForm({ ...storeForm, logoHeight: Math.max(1, Number(event.target.value) || 1) })} /></label>
            <label className="toggleRow"><input type="checkbox" checked={Boolean(storeForm.hideLogoText)} onChange={(event) => setStoreForm({ ...storeForm, hideLogoText: event.target.checked })} /><span>Hide shop name beside logo</span></label>
            <label className="uploadBox compactUpload"><ImagePlus size={18} /><span>Upload loading screen logo</span><input type="file" accept="image/*" onChange={(event) => uploadSettingImage(event, (url) => setStoreForm((current) => ({ ...current, loadingLogoUrl: url })))} /></label>
            <label><span>Loading logo width (px)</span><input type="number" min="1" value={storeForm.loadingLogoWidth || 120} onChange={(event) => setStoreForm({ ...storeForm, loadingLogoWidth: Math.max(1, Number(event.target.value) || 1) })} /></label>
            <label><span>Loading logo height (px)</span><input type="number" min="1" value={storeForm.loadingLogoHeight || 80} onChange={(event) => setStoreForm({ ...storeForm, loadingLogoHeight: Math.max(1, Number(event.target.value) || 1) })} /></label>
            <label><span>Email</span><input value={storeForm.email || ""} onChange={(event) => setStoreForm({ ...storeForm, email: event.target.value })} /></label>
            <label><span>Phone</span><input value={storeForm.phone || ""} onChange={(event) => setStoreForm({ ...storeForm, phone: event.target.value })} /></label>
            <label><span>Desktop products per row</span><select value={storeForm.productGridSize || 3} onChange={(event) => setStoreForm({ ...storeForm, productGridSize: Number(event.target.value) })}><option value="2">2 products</option><option value="3">3 products</option><option value="4">4 products</option><option value="5">5 products</option></select></label>
            <label><span>Mobile products per row</span><select value={storeForm.mobileProductGridSize || 2} onChange={(event) => setStoreForm({ ...storeForm, mobileProductGridSize: Number(event.target.value) })}><option value="1">1 product</option><option value="2">2 products</option><option value="3">3 products</option></select></label>
            <label><span>Minimum partner withdrawal amount (₹)</span><input type="number" min="0" step="0.01" value={storeForm.minimumPartnerWithdrawalAmount ?? 0} onChange={(event) => setStoreForm({ ...storeForm, minimumPartnerWithdrawalAmount: Math.max(0, Number(event.target.value) || 0) })} /></label>
            <label><span>Seller payment gateway fee (%)</span><input type="number" min="0" max="100" step="0.01" value={storeForm.sellerSettlement?.paymentGatewayFeeRate ?? 2} onChange={(event) => setStoreForm({ ...storeForm, sellerSettlement: { ...storeForm.sellerSettlement, paymentGatewayFeeRate: Number(event.target.value) || 0 } })} /></label>
            <label><span>GST on payment gateway fee (%)</span><input type="number" readOnly value="18" /><small>Calculated on the payment gateway fee, not on the order value.</small></label>
            <label><span>GST on seller platform fee (%)</span><input type="number" readOnly value="18" /><small>Statutory GST is fixed at 18%.</small></label>
            <label><span>Seller referral commission (% of platform fee)</span><input type="number" min="0" max="100" step="0.01" value={storeForm.sellerSettlement?.referralCommissionRate ?? 0} onChange={(event) => setStoreForm({ ...storeForm, sellerSettlement: { ...storeForm.sellerSettlement, referralCommissionRate: Number(event.target.value) || 0 } })} /></label>
            <label><span>Shipping paid by</span><select value={storeForm.sellerSettlement?.shippingPaidBy || "customer"} onChange={(event) => setStoreForm({ ...storeForm, sellerSettlement: { ...storeForm.sellerSettlement, shippingPaidBy: event.target.value } })}><option value="customer">Customer</option><option value="seller">Seller</option><option value="admin">Admin</option></select></label>
            <label><span>Payment assurance</span><input value={storeForm.productAssurances?.securePayment || "Secure payment"} onChange={(event) => setStoreForm({ ...storeForm, productAssurances: { ...storeForm.productAssurances, securePayment: event.target.value } })} /></label>
            <label><span>Returns assurance</span><input value={storeForm.productAssurances?.returns || "30-day returns"} onChange={(event) => setStoreForm({ ...storeForm, productAssurances: { ...storeForm.productAssurances, returns: event.target.value } })} /></label>
            <label><span>Shipping assurance</span><input value={storeForm.productAssurances?.shipping || "Ships in 24 hours"} onChange={(event) => setStoreForm({ ...storeForm, productAssurances: { ...storeForm.productAssurances, shipping: event.target.value } })} /></label>
            <label className="toggleRow"><input type="checkbox" checked={Boolean(storeForm.partnerPaymentBypassEnabled)} onChange={(event) => setStoreForm({ ...storeForm, partnerPaymentBypassEnabled: event.target.checked })} /><span>Allow partner registration without payment (testing only)</span></label>
            <label className="toggleRow"><input type="checkbox" checked={Boolean(storeForm.showCodOtpOnScreen)} onChange={(event) => setStoreForm({ ...storeForm, showCodOtpOnScreen: event.target.checked })} /><span>Show Cash on Delivery OTP on checkout screen (testing only)</span></label>
          </div>
          <div className="panelHeader"><h3>Contact Us details</h3></div>
          <div className="formGrid">
            {[["address", "Address"], ["state", "State"], ["city", "City"], ["pincode", "Pincode"], ["email", "Contact email"], ["mobile", "Mobile"], ["phone", "Phone"], ["googleMapUrl", "Google Map link"]].map(([field, label]) => <label key={field}><span>{label}</span><input type={field === "email" ? "email" : field === "googleMapUrl" ? "url" : "text"} value={storeForm.contactDetails?.[field] || ""} onChange={(event) => setStoreForm({ ...storeForm, contactDetails: { ...storeForm.contactDetails, [field]: event.target.value } })} /></label>)}
          </div>
          {storeForm.logoUrl && <img className="formPreviewImage" src={storeForm.logoUrl} alt="" />}
          {storeForm.loadingLogoUrl && <img className="formPreviewImage" src={storeForm.loadingLogoUrl} alt="Loading screen logo preview" />}
          {uploadStatus && <p className="mutedText">{uploadStatus}</p>}
          <label><span>Address</span><textarea value={storeForm.address || ""} onChange={(event) => setStoreForm({ ...storeForm, address: event.target.value })} /></label>
          <div className="formGrid">
            {pages.slice(0, 2).map((page, index) => (
              <label key={index}><span>Custom page {index + 1}</span><input value={page.title || ""} placeholder="Title" onChange={(event) => { const next = [...pages]; next[index] = { ...next[index], title: event.target.value, slug: event.target.value.toLowerCase().replace(/\s+/g, "-"), isActive: true }; setStoreForm({ ...storeForm, pages: next }); }} /></label>
            ))}
          </div>
          <button className="primaryButton" type="submit" disabled={savingSettings}><Save size={18} /> {savingSettings ? "Saving..." : "Save Storefront"}</button>
        </form>
      </div>
  );
}
