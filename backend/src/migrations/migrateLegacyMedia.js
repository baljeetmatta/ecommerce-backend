import "dotenv/config";
import crypto from "crypto";
import fs from "fs/promises";
import path from "path";
import mongoose from "mongoose";
import sharp from "sharp";

if (!process.env.MONGO_URI) throw new Error("MONGO_URI is required");
const apply = process.argv.includes("--apply");
const publicBase = String(process.env.PUBLIC_API_URL || "").replace(/\/+$/, "");
if (apply && !publicBase) throw new Error("PUBLIC_API_URL is required when applying the migration");
const uploadRoot = path.resolve(process.env.UPLOAD_DIR || "uploads");
const dataUrlPattern = /^data:([^;,]+);base64,(.+)$/s;
const targets = [
  { collection: "blogposts", fields: ["imageUrl", "imageVariants"] },
  { collection: "categories", fields: ["imageUrl"] },
  { collection: "partners", fields: ["profileImage", "kyc"] },
  { collection: "sellers", fields: ["profileImage", "kyc"] },
  { collection: "storefrontsettings", fields: ["logoUrl", "loadingLogoUrl", "footerLogoUrl", "hero", "promoBanner", "heroItems", "productBanners", "homeSections", "contentSections"] }
];

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
const publicUrl = (relative) => `${publicBase}/uploads/${relative.split(path.sep).map(encodeURIComponent).join("/")}`;

const writeDataUrl = async (value, collection, id) => {
  const parsed = parseDataUrl(value);
  if (!parsed) return value;
  const folder = new Date().toISOString().slice(0, 7);
  const relativeDirectory = path.join("migrated-media", collection, folder, String(id));
  const directory = path.join(uploadRoot, relativeDirectory);
  await fs.mkdir(directory, { recursive: true });
  const basename = `${Date.now()}-${crypto.randomBytes(6).toString("hex")}`;
  if (parsed.mime.startsWith("image/")) {
    const filename = `${basename}.webp`;
    await sharp(parsed.buffer).rotate().resize({ width: 1600, height: 1200, fit: "inside", withoutEnlargement: true }).webp({ quality: 78, effort: 5 }).toFile(path.join(directory, filename));
    return publicUrl(path.join(relativeDirectory, filename));
  }
  const extensions = { "application/pdf": ".pdf", "video/mp4": ".mp4", "video/webm": ".webm", "video/quicktime": ".mov", "video/ogg": ".ogv" };
  const filename = `${basename}${extensions[parsed.mime] || ".bin"}`;
  await fs.writeFile(path.join(directory, filename), parsed.buffer);
  return publicUrl(path.join(relativeDirectory, filename));
};

const migrateValue = async (value, collection, id) => {
  if (typeof value === "string") return writeDataUrl(value, collection, id);
  if (Array.isArray(value)) return Promise.all(value.map((item) => migrateValue(item, collection, id)));
  if (value instanceof Date || value?._bsontype) return value;
  if (value && typeof value === "object") {
    const entries = await Promise.all(Object.entries(value).map(async ([key, item]) => [key, await migrateValue(item, collection, id)]));
    return Object.fromEntries(entries);
  }
  return value;
};

await mongoose.connect(process.env.MONGO_URI);
let totalDocuments = 0;
let totalBytes = 0;
for (const target of targets) {
  const collection = mongoose.connection.collection(target.collection);
  const projection = Object.fromEntries(target.fields.map((field) => [field, 1]));
  for await (const document of collection.find({}, { projection })) {
    const bytes = target.fields.reduce((sum, field) => sum + embeddedBytes(document[field]), 0);
    if (!bytes) continue;
    totalDocuments += 1;
    totalBytes += bytes;
    console.log(`${apply ? "Migrating" : "Found"} ${target.collection}/${document._id}: ${Math.round(bytes / 1024)} KB`);
    if (!apply) continue;
    const updates = {};
    for (const field of target.fields) {
      if (embeddedBytes(document[field])) updates[field] = await migrateValue(document[field], target.collection, document._id);
    }
    await collection.updateOne({ _id: document._id }, { $set: updates });
  }
}
console.log(`${apply ? "Migrated" : "Audit complete:"} ${totalDocuments} document(s), approximately ${Math.round(totalBytes / 1024 / 1024)} MB of embedded media.`);
if (!apply && totalDocuments) console.log("Back up MongoDB, verify PUBLIC_API_URL and UPLOAD_DIR, then run: npm run migrate:legacy-media");
await mongoose.disconnect();
