import express from 'express';
import multer from 'multer';
import { protect, authorize, protectSeller, protectReseller } from '../middleware/authMiddleware.js';
import { uploadProof, addressPinLookup, submitAddressChange, listAddressChanges, reviewAddressChange, retryAddressSync } from '../controllers/addressChangeController.js';
const router = express.Router();
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 15 * 1024 * 1024 }, fileFilter: (_req, file, done) => { const allowed = ['image/jpeg', 'image/png', 'image/webp', 'application/pdf'].includes(file.mimetype); done(allowed ? null : new Error('Upload a JPG, PNG, WebP or PDF address proof'), allowed); } });
for (const [role, guard] of [['seller', protectSeller], ['reseller', protectReseller]]) {
  router.get(`/${role}`, guard, listAddressChanges);
  router.post(`/${role}`, guard, submitAddressChange);
  router.post(`/${role}/document`, guard, upload.single('document'), uploadProof);
  router.get(`/${role}/pincode/:pinCode`, guard, addressPinLookup);
}
router.use('/admin', protect, authorize('Super Admin'));
router.get('/admin', listAddressChanges);
router.patch('/admin/:id', reviewAddressChange);
router.post('/admin/:id/sync', retryAddressSync);
export default router;
