import mongoose from 'mongoose';
const proofSchema = new mongoose.Schema({ url: String, name: String, type: { type: String } }, { _id: false });
const address = new mongoose.Schema({ houseNumber: String, roadArea: String, address: String, city: String, state: String, pinCode: String, pickupSameAsBusiness: Boolean, pickupAddress: String, pickupCity: String, pickupState: String, pickupPinCode: String }, { _id: false });
const schema = new mongoose.Schema({
  role: { type: String, enum: ['seller', 'reseller'], required: true }, owner: { type: mongoose.Schema.Types.ObjectId, required: true },
  accountId: String, accountName: String, email: String,
  previous: address, proposed: address, previousVersion: { type: Number, default: 0 },
  proof: { type: proofSchema, required: true },
  status: { type: String, enum: ['pending', 'approved', 'rejected'], default: 'pending' },
  reviewNote: String, reviewedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }, reviewedAt: Date,
  profileAppliedAt: Date, syncStatus: { type: String, enum: ['not_started', 'synced', 'failed', 'superseded'], default: 'not_started' }, syncError: String, pickupAlias: String, syncedAt: Date
}, { timestamps: true });
schema.index({ role: 1, owner: 1 }, { unique: true, partialFilterExpression: { status: 'pending' } });
schema.index({ role: 1, owner: 1, createdAt: -1 });
export default mongoose.model('AddressChange', schema);
