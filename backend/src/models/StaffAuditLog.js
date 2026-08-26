import mongoose from "mongoose";

const staffAuditLogSchema = new mongoose.Schema({
  actor: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true },
  actorName: String,
  actorRole: String,
  entityType: { type: String, enum: ["Seller", "Partner", "Customer", "Reseller", "Staff", "Team", "Assignment", "System"], required: true, index: true },
  entity: { type: mongoose.Schema.Types.ObjectId, index: true },
  action: { type: String, required: true, index: true },
  description: { type: String, required: true },
  changes: mongoose.Schema.Types.Mixed,
  request: { method: String, path: String, ip: String, userAgent: String, deviceId: String, sessionId: String, requestId: String },
  occurredAt: { type: Date, default: Date.now, index: true }
}, { timestamps: true });
staffAuditLogSchema.index({ entityType: 1, entity: 1, occurredAt: -1 });
for (const operation of ["updateOne", "updateMany", "findOneAndUpdate", "deleteOne", "deleteMany", "findOneAndDelete"]) staffAuditLogSchema.pre(operation, function immutableAudit(next) { next(new Error("Audit logs are immutable")); });
export default mongoose.model("StaffAuditLog", staffAuditLogSchema);
