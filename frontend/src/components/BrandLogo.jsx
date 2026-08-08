export const logoStyle = (settings = {}, loading = false) => ({
  width: `${Math.max(1, Number(loading ? settings.loadingLogoWidth : settings.logoWidth) || (loading ? 120 : 140))}px`,
  height: `${Math.max(1, Number(loading ? settings.loadingLogoHeight : settings.logoHeight) || (loading ? 80 : 56))}px`
});

const configuredLogoUrl = (value = "") => {
  if (!value) return "";
  try {
    const apiUrl = String(window.__HRS_API_URL__ || import.meta.env.VITE_API_URL || (["localhost", "127.0.0.1"].includes(window.location.hostname) ? "http://localhost:5001/api" : "https://ebackend.hrsbasket.com/api"));
    const base = value.startsWith("/uploads/") || value.startsWith("/api/") ? new URL(apiUrl).origin : window.location.origin;
    return new URL(value, base).href;
  } catch (_error) { return value; }
};

export default function BrandLogo({ settings, loading = false, className = "", showText = true, subtitle = "" }) {
  let cachedSettings = {};
  try { cachedSettings = JSON.parse(localStorage.getItem("storefront_brand_settings") || "{}"); }
  catch (_error) { cachedSettings = {}; }
  settings = { ...cachedSettings, ...(settings || {}) };
  const imageUrl = configuredLogoUrl(loading ? (settings.loadingLogoUrl || settings.logoUrl) : settings.logoUrl);
  const name = settings.shopName || "HRSBasket";
  const hideText = settings.hideLogoText || !showText;
  return (
    <div className={`configuredBrand ${className}`.trim()}>
      {imageUrl
        ? <img className="configuredBrandImage" src={imageUrl} alt={hideText ? name : ""} style={logoStyle(settings, loading)} loading={loading ? "eager" : "lazy"} fetchPriority={loading ? "high" : "auto"} decoding="async" onError={(event) => { event.currentTarget.hidden = true; }} />
        : <span className="configuredBrandFallback">{name.slice(0, 2).toUpperCase()}</span>}
      {!hideText && <div className="configuredBrandText"><strong>{name}</strong>{subtitle && <span>{subtitle}</span>}</div>}
    </div>
  );
}
