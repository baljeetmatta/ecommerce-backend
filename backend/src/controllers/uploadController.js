import crypto from "crypto";
import fs from "fs/promises";
import path from "path";
import sharp from "sharp";
import asyncHandler from "../utils/asyncHandler.js";

const uploadRoot = path.resolve(process.env.UPLOAD_DIR || "uploads");
const presets = {
  admin: { width: 240, height: 240, quality: 68 },
  storefront: { width: 640, height: 640, quality: 74 },
  detail: { width: 1400, height: 1400, quality: 80 },
  default: { width: 1600, height: 1200, quality: 78 }
};
const safePurpose = (value) => String(value || "general").toLowerCase().replace(/[^a-z0-9-]/g, "-").slice(0, 40) || "general";

const publicUrl = (req, relativePath) => {
  const configured = String(process.env.PUBLIC_API_URL || "").replace(/\/+$/, "");
  const origin = configured || `${req.protocol}://${req.get("host")}`;
  return `${origin}/uploads/${relativePath.split(path.sep).map(encodeURIComponent).join("/")}`;
};

const writeVariant = async (file, directory, basename, name, preset) => {
  const filename = `${basename}-${name}.webp`;
  await sharp(file.buffer)
    .rotate()
    .resize({ width: preset.width, height: preset.height, fit: "inside", withoutEnlargement: true })
    .webp({ quality: preset.quality, effort: 5 })
    .toFile(path.join(directory, filename));
  return filename;
};

export const uploadImage = asyncHandler(async (req, res) => {
  if (!req.file) {
    res.status(400);
    throw new Error("Choose an image to upload");
  }
  const metadata = await sharp(req.file.buffer).metadata().catch(() => null);
  if (!metadata?.width || !metadata?.height) {
    res.status(415);
    throw new Error("The uploaded file is not a supported image");
  }
  const purpose = safePurpose(req.body.purpose);
  const folder = new Date().toISOString().slice(0, 7);
  const relativeDirectory = path.join(purpose, folder);
  const directory = path.join(uploadRoot, relativeDirectory);
  await fs.mkdir(directory, { recursive: true });
  const basename = `${Date.now()}-${crypto.randomBytes(6).toString("hex")}`;

  if (purpose === "product-main") {
    const filenames = await Promise.all(Object.entries(presets).filter(([name]) => name !== "default").map(([name, preset]) => writeVariant(req.file, directory, basename, name, preset)));
    const variants = Object.fromEntries(["admin", "storefront", "detail"].map((name, index) => [name, publicUrl(req, path.join(relativeDirectory, filenames[index]))]));
    res.status(201).json({ url: variants.detail, variants, width: metadata.width, height: metadata.height });
    return;
  }

  const filename = await writeVariant(req.file, directory, basename, "optimized", presets.default);
  res.status(201).json({ url: publicUrl(req, path.join(relativeDirectory, filename)), width: metadata.width, height: metadata.height });
});
