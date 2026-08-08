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

export default mongoose.model("StaffTeam", staffTeamSchema);
