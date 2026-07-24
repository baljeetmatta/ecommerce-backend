import "dotenv/config";
import crypto from "crypto";
import fs from "fs/promises";
import path from "path";
import mongoose from "mongoose";
import sharp from "sharp";

if (!process.env.MONGO_URI) throw new Error("MONGO_URI is required");

const apply = process.argv.includes("--apply");
const uploadRoot = path.resolve(process.env.UPLOAD_DIR || "uploads");
const publicBase = String(process.env.PUBLIC_API_URL || "").replace(/\/+$/, "");
if (apply && !publicBase) throw new Error("PUBLIC_API_URL is required when applying the migration");
const dataUrlPattern = /^data:([^;,]+);base64,(.+)$/s;
const productPresets = {
  admin: { width: 240, height: 240, quality: 68 },
  storefront: { width: 640, height: 640, quality: 74 },
  detail: { width: 1400, height: 1400, quality: 80 }
};

const parseDataUrl = (value) => {
  const match = String(value || "").match(dataUrlPattern);
  return match ? { mime: match[1].toLowerCase(), buffer: Buffer.from(match[2], "base64") } : null;
};
const embeddedBytes = (value) => {
  if (typeof value === "string") return dataUrlPattern.test(value) ? Buffer.byteLength(value) : 0;
  if (Array.isArray(value)) return value.reduce((sum, item) => sum + embeddedBytes(item), 0);
  if (value && typeof value === "object") return Object.values(value).reduce((sum, item) => sum + embeddedBytes(item), 0);
  return 0;
};

const mediaUrl = (relativePath) => `${publicBase}/uploads/${relativePath.split(path.sep).map(encodeURIComponent).join("/")}`;

const writeImage = async (source, relativeDirectory, basename, preset, suffix) => {
  const filename = `${basename}-${suffix}.webp`;
  await sharp(source)
    .rotate()
    .resize({ width: preset.width, height: preset.height, fit: "inside", withoutEnlargement: true })
    .webp({ quality: preset.quality, effort: 5 })
    .toFile(path.join(uploadRoot, relativeDirectory, filename));
  return mediaUrl(path.join(relativeDirectory, filename));
};

const migrateContainer = async (container, productId, cache) => {
  if (!container) return { changed: false, bytes: 0 };
  let changed = false;
  let bytes = 0;
  const folder = new Date().toISOString().slice(0, 7);
  const relativeDirectory = path.join("migrated-products", folder, String(productId));
  await fs.mkdir(path.join(uploadRoot, relativeDirectory), { recursive: true });

  const migrateMainImage = async (value) => {
    const parsed = parseDataUrl(value);
    if (!parsed?.mime.startsWith("image/")) return null;
    bytes += Buffer.byteLength(value);
    if (cache.has(value)) return cache.get(value);
    const basename = `${Date.now()}-${crypto.randomBytes(5).toString("hex")}`;
    const variants = Object.fromEntries(await Promise.all(Object.entries(productPresets).map(async ([name, preset]) => [name, await writeImage(parsed.buffer, relativeDirectory, basename, preset, name)])));
    const result = { url: variants.detail, variants };
    cache.set(value, result);
    return result;
  };

  const main = await migrateMainImage(container.mainImage);
  if (main) {
    container.mainImage = main.url;
    container.imageVariants = main.variants;
    changed = true;
  }

  if (container.imageVariants) {
    for (const [name, value] of Object.entries(container.imageVariants)) {
      const migrated = await migrateMainImage(value);
      if (migrated) {
        container.imageVariants[name] = migrated.variants[name] || migrated.url;
        changed = true;
      }
    }
  }

  for (const item of container.media || []) {
    const parsed = parseDataUrl(item.url);
    if (!parsed) continue;
    bytes += Buffer.byteLength(item.url);
    if (parsed.mime.startsWith("image/")) {
      const migrated = await migrateMainImage(item.url);
      item.url = migrated.url;
      changed = true;
    } else if (parsed.mime.startsWith("video/")) {
      const extension = { "video/mp4": ".mp4", "video/webm": ".webm", "video/quicktime": ".mov", "video/ogg": ".ogv" }[parsed.mime] || ".bin";
      const filename = `${Date.now()}-${crypto.randomBytes(5).toString("hex")}${extension}`;
      await fs.writeFile(path.join(uploadRoot, relativeDirectory, filename), parsed.buffer);
      item.url = mediaUrl(path.join(relativeDirectory, filename));
      changed = true;
    }
  }

  const video = parseDataUrl(container.videoUrl);
  if (video) {
    bytes += Buffer.byteLength(container.videoUrl);
    const extension = { "video/mp4": ".mp4", "video/webm": ".webm", "video/quicktime": ".mov", "video/ogg": ".ogv" }[video.mime] || ".bin";
    const filename = `${Date.now()}-${crypto.randomBytes(5).toString("hex")}${extension}`;
    await fs.writeFile(path.join(uploadRoot, relativeDirectory, filename), video.buffer);
    container.videoUrl = mediaUrl(path.join(relativeDirectory, filename));
    changed = true;
  }
  return { changed, bytes };
};

await mongoose.connect(process.env.MONGO_URI);
const products = mongoose.connection.collection("products");
const cursor = products.find({}, { projection: { name: 1, sku: 1, mainImage: 1, imageVariants: 1, media: 1, videoUrl: 1, pendingChanges: 1 } });
let affected = 0;
let estimatedBytes = 0;

for await (const product of cursor) {
  const auditBytes = embeddedBytes(product);
  if (!auditBytes) continue;
  if (!apply) {
    affected += 1;
    estimatedBytes += auditBytes;
    console.log(`Found ${product.sku || product._id}: ${Math.round(auditBytes / 1024 / 1024)} MB of embedded media`);
    continue;
  }
  const clone = structuredClone(product);
  const cache = new Map();
  const current = await migrateContainer(clone, product._id, cache);
  const pending = await migrateContainer(clone.pendingChanges, product._id, cache);
  if (!current.changed && !pending.changed) continue;
  affected += 1;
  estimatedBytes += current.bytes + pending.bytes;
  console.log(`Migrating ${product.sku || product._id}: ${Math.round((current.bytes + pending.bytes) / 1024 / 1024)} MB of embedded media`);
  await products.updateOne({ _id: product._id }, {
    $set: {
      mainImage: clone.mainImage,
      imageVariants: clone.imageVariants,
      media: clone.media,
      videoUrl: clone.videoUrl,
      ...(clone.pendingChanges ? { pendingChanges: clone.pendingChanges } : {})
    }
  });
}

console.log(`${apply ? "Migrated" : "Audit complete:"} ${affected} product(s), approximately ${Math.round(estimatedBytes / 1024 / 1024)} MB of Base64 fields.`);
if (!apply && affected) console.log("Review the audit, back up MongoDB, then run: npm run migrate:product-media");
await mongoose.disconnect();
