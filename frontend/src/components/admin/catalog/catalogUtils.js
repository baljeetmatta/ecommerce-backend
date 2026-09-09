

export function getCategoryName(category) {
  if (!category) return "Unassigned";
  if (typeof category === "string") return category;
  return category.parent?.name ? `${category.parent.name} / ${category.name}` : category.name;
}

export function getProductThumb(product) {
  return product.imageVariants?.admin || product.mainImage || product.media?.find((item) => item.type === "image")?.url || "";
}
