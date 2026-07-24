export const logoStyle = (settings = {}, loading = false) => ({
  width: `${Math.max(1, Number(loading ? settings.loadingLogoWidth : settings.logoWidth) || (loading ? 120 : 140))}px`,
  height: `${Math.max(1, Number(loading ? settings.loadingLogoHeight : settings.logoHeight) || (loading ? 80 : 56))}px`
});

export default function BrandLogo({ settings, loading = false, className = "", showText = true, subtitle = "" }) {
  if (!settings) {
    try { settings = JSON.parse(localStorage.getItem("storefront_brand_settings") || "{}"); }
    catch (_error) { settings = {}; }
  }
  const imageUrl = loading ? (settings.loadingLogoUrl || settings.logoUrl) : settings.logoUrl;
  const name = settings.shopName || "HRSBasket";
  const hideText = settings.hideLogoText || !showText;
  return (
    <div className={`configuredBrand ${className}`.trim()}>
      {imageUrl
        ? <img className="configuredBrandImage" src={imageUrl} alt={hideText ? name : ""} style={logoStyle(settings, loading)} loading={loading ? "eager" : "lazy"} fetchPriority={loading ? "high" : "auto"} decoding="async" />
        : <span className="configuredBrandFallback">{name.slice(0, 2).toUpperCase()}</span>}
      {!hideText && <div className="configuredBrandText"><strong>{name}</strong>{subtitle && <span>{subtitle}</span>}</div>}
    </div>
  );
}
