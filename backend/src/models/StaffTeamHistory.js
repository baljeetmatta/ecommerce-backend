import mongoose from "mongoose";

const staffTeamHistorySchema = new mongoose.Schema({
  staff: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true },
  team: { type: mongoose.Schema.Types.ObjectId, ref: "StaffTeam", required: true, index: true },
  teamLeader: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true },
  assignedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  assignedAt: { type: Date, default: Date.now },
  releasedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  releasedAt: Date,
  releaseType: { type: String, enum: ["LEADER_RELEASE", "ADMIN_FORCE_RELEASE"] },
  releaseReason: String,
  leaderRemarks: String,
  satisfactionRating: { type: Number, min: 0, max: 5 },
  pendingWorkConfirmed: Boolean,
  handoverNotes: String,
  workDisposition: { type: String, enum: ["RETURN_TO_LEADER", "ASSIGN_ANOTHER_STAFF", "TEAM_QUEUE"] },
  replacementStaff: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  status: { type: String, enum: ["ACTIVE", "RELEASED"], default: "ACTIVE", index: true }
}, { timestamps: true });
staffTeamHistorySchema.index({ staff: 1, status: 1 }, { unique: true, partialFilterExpression: { status: "ACTIVE" }, name: "one_active_staff_team_history" });
export default mongoose.model("StaffTeamHistory", staffTeamHistorySchema);
