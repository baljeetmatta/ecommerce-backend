

export const cachedBrandSettings = () => {
  try { return JSON.parse(localStorage.getItem("storefront_brand_settings") || "{}"); }
  catch (_error) { return {}; }
};

export const cacheBrandSettings = (settings = {}) => {
  const { shopName, logoUrl, logoWidth, logoHeight, hideLogoText, loadingLogoUrl, loadingLogoWidth, loadingLogoHeight } = settings;
  localStorage.setItem("storefront_brand_settings", JSON.stringify({ shopName, logoUrl, logoWidth, logoHeight, hideLogoText, loadingLogoUrl, loadingLogoWidth, loadingLogoHeight }));
};
