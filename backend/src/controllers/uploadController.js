import crypto from "crypto";
import fs from "fs/promises";
import path from "path";
import sharp from "sharp";
import asyncHandler from "../utils/asyncHandler.js";

export const getUploadRoot = () => path.resolve(process.env.UPLOAD_DIR || "uploads");
export const ensureUploadDirectory = () => fs.mkdir(getUploadRoot(), { recursive: true });
const presets = {
  admin: { width: 240, height: 240, quality: 68 },
  storefront: { width: 640, height: 640, quality: 74 },
  detail: { width: 1400, height: 1400, quality: 80 },
  blogHome: { width: 300, height: 300, quality: 72 },
  blogDetail: { width: 800, height: 400, quality: 78 },
  partnerProfile: { width: 400, height: 400, quality: 72 },
  partnerKyc: { width: 800, height: 800, quality: 72 },
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
  const directory = path.join(getUploadRoot(), relativeDirectory);
  await fs.mkdir(directory, { recursive: true });
  const basename = `${Date.now()}-${crypto.randomBytes(6).toString("hex")}`;

  if (purpose === "product-main") {
    const filenames = await Promise.all(["admin", "storefront", "detail"].map((name) => writeVariant(req.file, directory, basename, name, presets[name])));
    const variants = Object.fromEntries(["admin", "storefront", "detail"].map((name, index) => [name, publicUrl(req, path.join(relativeDirectory, filenames[index]))]));
    res.status(201).json({ url: variants.detail, variants, width: metadata.width, height: metadata.height });
    return;
  }
  if (purpose === "blog") {
    const names = ["blogHome", "blogDetail"];
    const filenames = await Promise.all(names.map((name) => writeVariant(req.file, directory, basename, name, presets[name])));
    const variants = { home: publicUrl(req, path.join(relativeDirectory, filenames[0])), detail: publicUrl(req, path.join(relativeDirectory, filenames[1])) };
    res.status(201).json({ url: variants.detail, variants, width: metadata.width, height: metadata.height });
    return;
  }
  if (purpose === "partner-kyc") {
    const filename = await writeVariant(req.file, directory, basename, "800x800", presets.partnerKyc);
    res.status(201).json({ url: publicUrl(req, path.join(relativeDirectory, filename)), width: metadata.width, height: metadata.height });
    return;
  }
  if (purpose === "partner-profile") {
    const filename = await writeVariant(req.file, directory, basename, "400x400", presets.partnerProfile);
    res.status(201).json({ url: publicUrl(req, path.join(relativeDirectory, filename)), width: Math.min(metadata.width, 400), height: Math.min(metadata.height, 400) });
    return;
  }
  if (purpose === "seller-profile") {
    const filename = await writeVariant(req.file, directory, basename, "400x400", presets.partnerProfile);
    res.status(201).json({ url: publicUrl(req, path.join(relativeDirectory, filename)), width: Math.min(metadata.width, 400), height: Math.min(metadata.height, 400) });
    return;
  }
  if (purpose === "customer-profile") {
    const filename = await writeVariant(req.file, directory, basename, "400x400", presets.partnerProfile);
    res.status(201).json({ url: publicUrl(req, path.join(relativeDirectory, filename)), width: Math.min(metadata.width, 400), height: Math.min(metadata.height, 400) });
    return;
  }

  const filename = await writeVariant(req.file, directory, basename, "optimized", presets.default);
  res.status(201).json({ url: publicUrl(req, path.join(relativeDirectory, filename)), width: metadata.width, height: metadata.height });
});

export const uploadVideo = asyncHandler(async (req, res) => {
  if (!req.file) {
    res.status(400);
    throw new Error("Choose a Reel video to upload");
  }
  const extensions = {
    "video/mp4": ".mp4",
    "video/webm": ".webm",
    "video/quicktime": ".mov",
    "video/ogg": ".ogv"
  };
  const extension = extensions[req.file.mimetype];
  if (!extension) {
    res.status(415);
    throw new Error("Use an MP4, WebM, MOV, or OGV video");
  }
  const folder = new Date().toISOString().slice(0, 7);
  const relativeDirectory = path.join("product-reels", folder);
  const directory = path.join(getUploadRoot(), relativeDirectory);
  await fs.mkdir(directory, { recursive: true });
  const filename = `${Date.now()}-${crypto.randomBytes(6).toString("hex")}${extension}`;
  await fs.writeFile(path.join(directory, filename), req.file.buffer);
  res.status(201).json({
    url: publicUrl(req, path.join(relativeDirectory, filename)),
    filename,
    size: req.file.size,
    type: req.file.mimetype
  });
});

export const uploadDocument = asyncHandler(async (req, res) => {
  if (!req.file) {
    res.status(400);
    throw new Error("Choose a document to upload");
  }
  if (req.file.mimetype.startsWith("image/")) return uploadImage(req, res);
  if (req.file.mimetype !== "application/pdf") {
    res.status(415);
    throw new Error("Use an image or PDF document");
  }
  const folder = new Date().toISOString().slice(0, 7);
  const relativeDirectory = path.join("documents", folder);
  const directory = path.join(getUploadRoot(), relativeDirectory);
  await fs.mkdir(directory, { recursive: true });
  const filename = `${Date.now()}-${crypto.randomBytes(6).toString("hex")}.pdf`;
  await fs.writeFile(path.join(directory, filename), req.file.buffer);
  res.status(201).json({ url: publicUrl(req, path.join(relativeDirectory, filename)), filename, size: req.file.size, type: req.file.mimetype });
});
