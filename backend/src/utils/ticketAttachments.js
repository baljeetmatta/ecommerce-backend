export const normalizeTicketAttachments = (value = []) => {
  if (!Array.isArray(value) || value.length > 6) throw new Error("Attach up to 6 images per message.");
  return [...new Set(value.map(url => {
    if (typeof url !== "string" || url.length > 2048) throw new Error("Invalid image attachment.");
    const parsed = new URL(url, "http://local.invalid");
    if (!["http:", "https:"].includes(parsed.protocol) || !/^\/uploads\/[^?#]+\.(webp|png|jpe?g|gif)$/i.test(parsed.pathname)) throw new Error("Attach an uploaded image.");
    return url;
  }))];
};
