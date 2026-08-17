import mongoose from "mongoose";

export const assignmentActions = ["kyc", "registration", "products", "reviews", "orders", "returns", "customer_care", "support", "reports", "payouts"];
const workAssignmentSchema = new mongoose.Schema({
  entityType: { type: String, enum: ["Seller", "Partner", "Customer"], required: true, index: true },
  entity: { type: mongoose.Schema.Types.ObjectId, required: true, index: true, refPath: "entityType" },
  action: { type: String, enum: assignmentActions, required: true, index: true },
  team: { type: mongoose.Schema.Types.ObjectId, ref: "StaffTeam", required: true, index: true },
  teamLeader: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true },
  staff: { type: mongoose.Schema.Types.ObjectId, ref: "User", index: true },
  assignedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  active: { type: Boolean, default: true, index: true },
  notes: String,
  endedAt: Date,
  endedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" }
}, { timestamps: true });
workAssignmentSchema.index({ entityType: 1, entity: 1, action: 1, active: 1 });
export default mongoose.model("WorkAssignment", workAssignmentSchema);
