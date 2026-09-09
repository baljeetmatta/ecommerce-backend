

export const sectionLocations = [
  ["home_before_new_arrivals", "Home before New Arrivals"],
  ["home_after_blog", "Home after Blog"],
  ["product_detail_below_details", "Product details below details"],
  ["products_top_right", "All products top right"]
];

export const bannerSizeFromItem = (item = {}) => {
  const match = String(item.linkLabel || "").match(/^__banner_size__:(\d*)x(\d*)$/);
  return {
    width: Number(item.imageWidth || match?.[1]) || "",
    height: Number(item.imageHeight || match?.[2]) || ""
  };
};

export const bannerSizeLabel = (width, height) => `__banner_size__:${width || ""}x${height || ""}`;
