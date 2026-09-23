import { currentClientRoute } from "./adminRoutes.js";

export const announcementPreview = (value = "") => {
  const words = String(value || "").trim().split(/\s+/).filter(Boolean);
  return `${words.slice(0, 20).join(" ")}${words.length > 20 ? "…" : ""}`;
};

export const visibleAnnouncements = (items = [], audience = "all") => items.filter(item => item.isActive !== false && (audience === "all" || !item.audience || item.audience === "all" || item.audience === audience));
export const announcementKey = (item, items) => String(item._id || `item-${items.indexOf(item)}`);
export const announcementLink = (id, route = currentClientRoute()) => {
  const [path, query] = route.split("?");
  const params = new URLSearchParams(query);
  if (id == null) params.delete("announcement");
  else params.set("announcement", id);
  return `${path}${params.size ? `?${params}` : ""}`;
};
