const policies = [
  { title: "Shipping Policy", slug: "shipping-policy" },
  { title: "Return Policy", slug: "return-policy", aliases: ["returns-policy", "return-and-refund-policy", "refund-policy", "returns-and-refunds"] },
  { title: "Privacy Policy", slug: "privacy-policy" },
  { title: "Terms and Conditions", slug: "terms-and-conditions", aliases: ["terms-conditions", "terms-of-service"] }
];
const normalize = value => String(value || "").toLowerCase().replace(/&/g, "and").replace(/[^a-z0-9]/g, "");

// Preserve existing content and custom slugs; add only missing page entries.
export const ensurePolicyPages = settings => {
  let changed = false;
  if (!settings.pages) settings.pages = [];
  const links = policies.map(policy => {
    const names = [policy.title, policy.slug, ...(policy.aliases || [])].map(normalize);
    let page = settings.pages.find(page => names.includes(normalize(page.slug)) || names.includes(normalize(page.title)));
    if (!page) {
      settings.pages.push({ title: policy.title, slug: policy.slug, content: "", menu: "hidden", isActive: true });
      page = settings.pages[settings.pages.length - 1];
      changed = true;
    }
    // Footer destinations must be accessible even if an existing policy was unpublished.
    if (page.isActive === false) { page.isActive = true; changed = true; }
    return { label: policy.title, url: `/page/${page.slug}` };
  });
  if (!settings.footerColumns) settings.footerColumns = [];
  const column = settings.footerColumns.find(column => normalize(column.title) === "policies");
  if (!column) {
    const sortOrder = Math.max(3, ...settings.footerColumns.map(column => Number(column.sortOrder) || 0)) + 1;
    settings.footerColumns.push({ title: "Policies", type: "links", links, pageIds: [], sortOrder });
    changed = true;
  } else if (column.type !== "links" || JSON.stringify((column.links || []).map(({ label, url }) => ({ label, url }))) !== JSON.stringify(links)) {
    column.type = "links";
    column.links = links;
    changed = true;
  }
  return changed;
};
