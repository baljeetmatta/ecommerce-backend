import path from 'node:path';
import { stat } from 'node:fs/promises';

export const returnEvidenceCategories = ['Unboxing Photo', 'Unboxing Video', 'Product Damage Video', 'Product Label Photo'];
export async function validateReturnEvidence(evidence, origin, uploadRoot = path.resolve(process.env.UPLOAD_DIR || 'uploads')) {
  if (!Array.isArray(evidence) || !evidence.length || evidence.length > 10) throw new Error('Upload at least one return photo or video (maximum 10 files)');
  return Promise.all(evidence.map(async entry => {
    if (!returnEvidenceCategories.includes(entry?.category) || typeof entry.url !== 'string') throw new Error('Choose a valid return evidence category');
    let url;
    try { url = new URL(entry.url); } catch { throw new Error('Upload a valid evidence file'); }
    const base = new URL(origin);
    const prefix = `${base.pathname.replace(/\/$/, '')}/uploads/`;
    if (url.origin !== base.origin || !url.pathname.startsWith(prefix)) throw new Error('Evidence must be uploaded to this store');
    const relative = decodeURIComponent(url.pathname.slice(prefix.length));
    const filename = path.resolve(uploadRoot, relative);
    const extension = path.extname(filename).toLowerCase();
    const allowed = ['Unboxing Photo', 'Product Label Photo'].includes(entry.category) ? ['.webp', '.jpg', '.jpeg', '.png', '.avif'] : ['.mp4', '.webm', '.mov', '.ogv'];
    if (!filename.startsWith(path.resolve(uploadRoot) + path.sep) || !allowed.includes(extension)) throw new Error('Upload a photo or video matching the selected category');
    const file = await stat(filename).catch(() => null);
    if (!file?.isFile() || !file.size) throw new Error('Evidence file is missing; upload it again');
    return { category: entry.category, url: url.href };
  }));
}
