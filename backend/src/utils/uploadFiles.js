import fs from "fs/promises";
import path from "path";

const uploadRoot = () => path.resolve(process.env.UPLOAD_DIR || "uploads");

const localUploadPath = (value) => {
  if (!value || String(value).startsWith("data:")) return null;
  let pathname;
  try {
    pathname = new URL(String(value), "http://local.invalid").pathname;
  } catch (_error) {
    return null;
  }
  const marker = "/uploads/";
  const markerIndex = pathname.indexOf(marker);
  if (markerIndex === -1) return null;
  const relative = pathname
    .slice(markerIndex + marker.length)
    .split("/")
    .map((segment) => decodeURIComponent(segment))
    .join(path.sep);
  const root = uploadRoot();
  const resolved = path.resolve(root, relative);
  return resolved.startsWith(`${root}${path.sep}`) ? resolved : null;
};

export const deleteUploadedFiles = async (urls = []) => {
  const files = [...new Set(urls.map(localUploadPath).filter(Boolean))];
  const results = await Promise.allSettled(files.map((file) => fs.unlink(file)));
  return {
    deleted: results.filter((result) => result.status === "fulfilled").length,
    missingOrFailed: results.filter((result) => result.status === "rejected").length
  };
};
