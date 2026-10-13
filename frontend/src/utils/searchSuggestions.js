export const searchSuggestions = (products = [], value = "") => {
  const query = value.trim().toLocaleLowerCase();
  if (query.length < 5) return [];
  return products.filter(product => product.displayType !== "Reel")
    .map(product => {
      const name = String(product.name || "").toLocaleLowerCase();
      const searchable = [name, product.sku, product.manufacturerBrand, product.seller?.companyName, product.category?.name, product.category?.parent?.name].filter(Boolean).join(" ").toLocaleLowerCase();
      const matches = query.split(/\s+/).every(word => searchable.includes(word));
      return { product, score: matches ? name.startsWith(query) ? 0 : name.includes(query) ? 1 : 2 : -1 };
    })
    .filter(item => item.score >= 0)
    .sort((a, b) => a.score - b.score)
    .slice(0, 6)
    .map(item => item.product);
};
