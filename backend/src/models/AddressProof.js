import mongoose from 'mongoose';
export default mongoose.model('AddressProof', new mongoose.Schema({ role: String, owner: { type: mongoose.Schema.Types.ObjectId, required: true }, url: String, name: String, type: String }, { timestamps: true }));
