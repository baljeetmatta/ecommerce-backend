import mongoose from "mongoose";

const staffTeamSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true, unique: true },
  code: { type: String, required: true, trim: true, uppercase: true, unique: true },
  leader: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true },
  members: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }],
  description: { type: String, trim: true },
  isActive: { type: Boolean, default: true },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true }
}, { timestamps: true });

staffTeamSchema.index({ members: 1 }, { unique: true, partialFilterExpression: { isActive: true }, name: "one_active_team_per_staff" });

export default mongoose.model("StaffTeam", staffTeamSchema);
