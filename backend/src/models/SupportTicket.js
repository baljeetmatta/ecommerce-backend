import mongoose from "mongoose";

const messageSchema = new mongoose.Schema({
  authorType: { type: String, enum: ["Customer", "Seller", "Partner", "User"], required: true },
  author: { type: mongoose.Schema.Types.ObjectId, required: true, refPath: "authorType" },
  authorName: String,
  message: { type: String, required: true, trim: true },
  attachments: [String],
  createdAt: { type: Date, default: Date.now }
}, { _id: true });
const historySchema = new mongoose.Schema({
  action: { type: String, required: true }, from: String, to: String, note: String,
  actorType: { type: String, enum: ["Customer", "Seller", "Partner", "User", "System"], required: true },
  actor: mongoose.Schema.Types.ObjectId, actorName: String, createdAt: { type: Date, default: Date.now }
}, { _id: true });
const supportTicketSchema = new mongoose.Schema({
  ticketNumber: { type: String, required: true, unique: true, index: true },
  requesterType: { type: String, enum: ["Customer", "Seller", "Partner"], required: true, index: true },
  requester: { type: mongoose.Schema.Types.ObjectId, required: true, refPath: "requesterType", index: true },
  subject: { type: String, required: true, trim: true },
  category: { type: String, enum: ["general", "order", "payment", "return", "kyc", "product", "payout", "account", "other"], default: "general" },
  order: { type: mongoose.Schema.Types.ObjectId, ref: "Order" },
  priority: { type: String, enum: ["low", "normal", "high", "urgent"], default: "normal" },
  status: { type: String, enum: ["Open", "Assigned", "In Progress", "Waiting for Customer", "Resolved", "Closed"], default: "Open", index: true },
  assignedTeam: { type: mongoose.Schema.Types.ObjectId, ref: "StaffTeam", index: true },
  assignedTeamLeader: { type: mongoose.Schema.Types.ObjectId, ref: "User", index: true },
  assignedStaff: { type: mongoose.Schema.Types.ObjectId, ref: "User", index: true },
  routedToAdmin: { type: Boolean, default: false, index: true },
  messages: [messageSchema], history: [historySchema], resolvedAt: Date, closedAt: Date,
  lastActivityAt: { type: Date, default: Date.now, index: true }
}, { timestamps: true });
supportTicketSchema.index({ requesterType: 1, requester: 1, createdAt: -1 });
export default mongoose.model("SupportTicket", supportTicketSchema);
