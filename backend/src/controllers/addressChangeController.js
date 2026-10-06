import mongoose from 'mongoose';
import AddressChange from '../models/AddressChange.js';
import AddressProof from '../models/AddressProof.js';
import Seller from '../models/Seller.js';
import Reseller from '../models/Reseller.js';
import ShipRocketSetting from '../models/ShipRocketSetting.js';
import asyncHandler from '../utils/asyncHandler.js';
import { addressSnapshot, validateAddress, escapedSearch } from '../utils/addressChange.js';
import { uploadDocument, uploadImage } from './uploadController.js';
import { ensureSellerPickup } from '../services/sellerPickupService.js';
import { shiprocketToken } from '../services/shiprocketService.js';
import { lookupPincode } from '../services/pincodeService.js';
const identity = req => ({ role: req.reseller ? 'reseller' : 'seller', account: req.reseller || req.seller });
const fail = (res, status, message) => { res.status(status); throw new Error(message); };
export const uploadProof = asyncHandler(async (req, res) => {
  const { role, account } = identity(req);
  if (await AddressChange.exists({ role, owner: account._id, status: 'pending' })) return fail(res, 409, 'You already have an address change request awaiting admin review. Submit another request after admin approves or rejects it.');
  if (!req.file) return fail(res, 400, 'Upload an address proof document');
  const uploaded = await new Promise((resolve, reject) => (req.file.mimetype.startsWith("image/") ? uploadImage : uploadDocument)(req, { status() { return this; }, json: resolve }, reject));
  const proof = await AddressProof.create({ role, owner: account._id, url: uploaded.url, name: req.file.originalname.slice(0, 200), type: req.file.mimetype });
  res.status(201).json({ id: proof._id, url: proof.url, name: proof.name });
});
export const addressPinLookup = asyncHandler(async (req, res) => { try { res.json(await lookupPincode(String(req.params.pinCode))); } catch (error) { res.status(error.status || 502); throw error; } });
export const submitAddressChange = asyncHandler(async (req, res) => {
  const { role, account } = identity(req);
  if (await AddressChange.exists({ role, owner: account._id, status: 'pending' })) return fail(res, 409, 'You already have an address change request awaiting admin review. Submit another request after admin approves or rejects it.');
  let proposed;
  try { proposed = validateAddress(req.body.address, role); } catch (error) { return fail(res, 400, error.message); }
  if (!mongoose.isValidObjectId(req.body.proofId)) return fail(res, 400, 'Upload an address proof document');
  const proof = await AddressProof.findOne({ _id: req.body.proofId, role, owner: account._id });
  if (!proof) return fail(res, 400, 'Upload your own address proof document');
  if (await AddressChange.exists({ role, owner: account._id, status: 'approved', profileAppliedAt: null })) return fail(res, 409, 'A previously approved address is still being applied. Contact admin.');
  try {
    const item = await AddressChange.create({ role, owner: account._id, accountId: account.sellerNumber || account.resellerId, accountName: account.companyName || account.fullName, email: account.email, previous: addressSnapshot(account), proposed, previousVersion: account.addressVersion || 0, proof: { url: proof.url, name: proof.name, type: proof.type } });
    res.status(201).json(item);
  } catch (error) { if (error.code === 11000) return fail(res, 409, 'You already have an address change awaiting review'); throw error; }
});
export const listAddressChanges = asyncHandler(async (req, res) => {
  const query = {};
  if (req.seller || req.reseller) { const { role, account } = identity(req); query.role = role; query.owner = account._id; }
  else if (['seller', 'reseller'].includes(req.query.role)) query.role = req.query.role;
  if (['pending', 'approved', 'rejected'].includes(req.query.status)) query.status = req.query.status;
  const search = escapedSearch(req.query.search);
  if (search) query.$or = ['accountId', 'accountName', 'email', 'previous.address', 'previous.city', 'previous.state', 'previous.pinCode', 'previous.pickupAddress', 'proposed.address', 'proposed.city', 'proposed.state', 'proposed.pinCode', 'proposed.pickupAddress', 'reviewNote'].map(field => ({ [field]: { $regex: search, $options: 'i' } }));
  const page = Math.max(1, Math.min(100000, parseInt(req.query.page, 10) || 1));
  const [items, total] = await Promise.all([AddressChange.find(query).populate('reviewedBy', 'name').sort({ createdAt: -1 }).skip((page - 1) * 20).limit(20), AddressChange.countDocuments(query)]);
  res.json({ items, total, page, pages: Math.ceil(total / 20) });
});
export async function applyApprovedAddress(item) {
  const Model = item.role === 'seller' ? Seller : Reseller;
  let account = await Model.findById(item.owner);
  if (!account) throw new Error('Account no longer exists');
  if (!item.profileAppliedAt) {
    if (String(account.addressChangeRequestId) !== String(item._id)) {
      const conditions = { _id: item.owner, ...addressSnapshot(item.previous.toObject()), $or: [{ addressVersion: item.previousVersion }, ...(item.previousVersion === 0 ? [{ addressVersion: { $exists: false } }] : [])] };
      account = await Model.findOneAndUpdate(conditions, { $set: { ...item.proposed.toObject(), addressChangeRequestId: item._id }, $inc: { addressVersion: 1 } }, { new: true, runValidators: true });
      if (!account) throw new Error('The profile address changed since this request. Review the current profile before proceeding.');
    }
    item.profileAppliedAt = new Date(); await item.save();
  }
  if (String(account.addressChangeRequestId) !== String(item._id)) { item.syncStatus = 'superseded'; item.syncError = 'A newer approved address is in use.'; await item.save(); return item; }
  try {
    const settings = await ShipRocketSetting.findOne({ singleton: 'shiprocket', isActive: true });
    if (!settings) throw new Error('Shiprocket is not configured. Configure it and retry sync.');
    const pickupAccount = item.role === 'seller' ? account : { ...account.toObject(), sellerNumber: account.resellerId, name: account.fullName, companyName: account.businessName || account.fullName, pickupSameAsBusiness: true };
    const result = await ensureSellerPickup(pickupAccount, await shiprocketToken(settings));
    item.syncStatus = 'synced'; item.syncError = ''; item.pickupAlias = result.alias; item.syncedAt = new Date();
  } catch (error) { item.syncStatus = 'failed'; item.syncError = error.message; }
  await item.save(); return item;
}
export const reviewAddressChange = asyncHandler(async (req, res) => {
  if (!mongoose.isValidObjectId(req.params.id)) return fail(res, 400, 'Invalid request ID');
  if (!['approved', 'rejected'].includes(req.body.status)) return fail(res, 400, 'Choose approve or reject');
  const note = String(req.body.note || '').trim().slice(0, 1000);
  if (req.body.status === 'rejected' && !note) return fail(res, 400, 'Add a rejection reason');
  const item = await AddressChange.findOneAndUpdate({ _id: req.params.id, status: 'pending' }, { $set: { status: req.body.status, reviewNote: note, reviewedBy: req.user._id, reviewedAt: new Date() } }, { new: true });
  if (!item) return fail(res, 409, 'This request has already been reviewed');
  if (item.status === 'approved') { try { await applyApprovedAddress(item); } catch (error) { item.syncStatus = 'failed'; item.syncError = error.message; await item.save(); } }
  res.json(item);
});
export const retryAddressSync = asyncHandler(async (req, res) => {
  if (!mongoose.isValidObjectId(req.params.id)) return fail(res, 400, 'Invalid request ID');
  const item = await AddressChange.findOne({ _id: req.params.id, status: 'approved' });
  if (!item) return fail(res, 404, 'Approved request not found');
  try { res.json(await applyApprovedAddress(item)); } catch (error) { return fail(res, 409, error.message); }
});
