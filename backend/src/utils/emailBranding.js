import path from "node:path";
import { access } from "node:fs/promises";

const escapeHtml = value => String(value ?? "").replace(/[&<>"']/g, character => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[character]));

export async function emailBranding({ html, text, store }) {
  const logo = store?.logoUrl || store?.footerLogoUrl;
  const attachments = [];
  let source = "";
  if (logo) {
    const url = new URL(logo, process.env.PUBLIC_API_URL || "http://localhost:5001");
    if (["http:", "https:"].includes(url.protocol)) {
      source = url.href;
      // Embed uploaded logos so they work even when the API is on localhost.
      if (url.pathname.startsWith("/uploads/")) {
        const root = path.resolve(process.env.UPLOAD_DIR || "uploads");
        const filename = path.resolve(root, decodeURIComponent(url.pathname.slice("/uploads/".length)));
        if (filename.startsWith(root + path.sep)) {
          try {
            await access(filename);
            attachments.push({ filename: path.basename(filename), path: filename, cid: "hrs-admin-logo" });
            source = "cid:hrs-admin-logo";
          } catch { /* Use the public URL if this upload is stored remotely. */ }
        }
      }
    }
  }
  let content = html || `<html><body style="margin:0;background:#f3f6f4;font-family:Arial,sans-serif"><div style="max-width:600px;margin:auto;padding:28px;background:#fff"><div style="white-space:pre-wrap;line-height:1.7;color:#172b22">${escapeHtml(text)}</div></div></body></html>`;
  if (source) {
    const logoImage = `<img src="${escapeHtml(source)}" alt="${escapeHtml(store?.shopName || "HRSBasket")}" width="180" style="display:block;margin:0 auto;max-width:180px;max-height:72px;width:auto;height:auto;border:0">`;
    if (content.includes("<span data-hrs-email-logo>")) {
      content = content.replace(/<span data-hrs-email-logo>[\s\S]*?<\/span>/, logoImage);
    } else {
      const header = `<div style="padding:24px;text-align:center;background:#fff">${logoImage}</div>`;
      content = /<body\b[^>]*>/i.test(content) ? content.replace(/<body\b[^>]*>/i, match => match + header) : header + content;
    }
  }
  return { html: content, attachments };
}
