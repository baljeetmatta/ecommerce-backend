import mongoose from "mongoose";

export const assignmentActions = ["profile", "kyc", "registration", "products", "reviews", "orders", "returns", "refunds", "cart", "customer_care", "support", "reports", "payouts"];
export const assignmentPermissions = ["VIEW", "CREATE", "EDIT", "PROCESS", "APPROVE", "REJECT", "COMMENT", "COMMUNICATE", "ASSIGN", "CLOSE", "DOWNLOAD", "UPLOAD"];
const workAssignmentSchema = new mongoose.Schema({
  entityType: { type: String, enum: ["Seller", "Partner", "Customer", "Reseller"], required: true, index: true },
  entity: { type: mongoose.Schema.Types.ObjectId, required: true, index: true, refPath: "entityType" },
  action: { type: String, enum: assignmentActions, required: true, index: true },
  permissions: { type: [{ type: String, enum: assignmentPermissions }], default: ["VIEW"] },
  parentAssignment: { type: mongoose.Schema.Types.ObjectId, ref: "WorkAssignment", default: null, index: true },
  team: { type: mongoose.Schema.Types.ObjectId, ref: "StaffTeam", required: true, index: true },
  teamLeader: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true },
  staff: { type: mongoose.Schema.Types.ObjectId, ref: "User", index: true },
  assignedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  active: { type: Boolean, default: true, index: true },
  status: { type: String, enum: ["ACTIVE", "PARTIALLY_REVOKED", "REVOKED", "EXPIRED", "CASCADE_REVOKED", "RELEASED", "SUSPENDED"], default: "ACTIVE", index: true },
  effectiveFrom: { type: Date, default: Date.now },
  effectiveUntil: Date,
  notes: String,
  endedAt: Date,
  endedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  endReason: String,
  revocationRemarks: String,
  permissionHistory: [{ previous: [String], next: [String], reason: String, remarks: String, changedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" }, changedAt: { type: Date, default: Date.now }, ip: String, userAgent: String }]
}, { timestamps: true });
workAssignmentSchema.index({ entityType: 1, entity: 1, action: 1, active: 1 });
export default mongoose.model("WorkAssignment", workAssignmentSchema);
