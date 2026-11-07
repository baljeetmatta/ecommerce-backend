import crypto from "crypto";
import AdminDeletionOtp from "../models/AdminDeletionOtp.js";
import Order from "../models/Order.js";
import Product from "../models/Product.js";
import Reseller from "../models/Reseller.js";
import ResellerLink from "../models/ResellerLink.js";
import Seller from "../models/Seller.js";
import SellerImpersonation from "../models/SellerImpersonation.js";
import StaffAuditLog from "../models/StaffAuditLog.js";
import StaffTeam from "../models/StaffTeam.js";
import StaffTeamHistory from "../models/StaffTeamHistory.js";
import SupportTicket from "../models/SupportTicket.js";
import WorkAssignment from "../models/WorkAssignment.js";
import User from "../models/User.js";
import { sendEmail } from "../utils/email.js";
import asyncHandler from "../utils/asyncHandler.js";

const entityModels = { seller: Seller, reseller: Reseller, order: Order, staff: User };
const entityLabels = { seller: "seller account", reseller: "reseller account", order: "order", staff: "staff account" };
const hashCode = (code) => crypto.createHash("sha256").update(String(code)).digest("hex");
const validOtp = (expected, supplied) => {
  const left = Buffer.from(expected || "");
  const right = Buffer.from(hashCode(supplied));
  return left.length === right.length && crypto.timingSafeEqual(left, right);
};
const maskEmail = (email) => {
  const [name, domain] = String(email).split("@");
  return `${name.slice(0, 1)}${"*".repeat(Math.min(Math.max(name.length - 1, 3), 8))}@${domain}`;
};

const findEntity = async (type, id) => type === "staff"
  ? User.findOne({ _id: id, role: { $in: ["Staff", "Team Leader"] } })
  : entityModels[type].findById(id);

const removeEntity = async (type, id, req) => {
  if (type === "seller") {
    const seller = await Seller.findById(id);
    if (!seller) return null;
    await Promise.all([
      Product.updateMany({ seller: id }, { $set: { status: "archived", sellerEnabled: false } }),
      WorkAssignment.deleteMany({ entityType: "Seller", entity: id }),
      SellerImpersonation.deleteMany({ seller: id })
    ]);
    await seller.deleteOne();
    return { id, message: "Seller deleted. Their products were archived; order and settlement history was retained." };
  }
  if (type === "reseller") {
    const reseller = await Reseller.findById(id);
    if (!reseller) return null;
    await Promise.all([
      ResellerLink.deleteMany({ reseller: id }),
      WorkAssignment.deleteMany({ entityType: "Reseller", entity: id })
    ]);
    await reseller.deleteOne();
    return { id, message: "Reseller deleted. Order and withdrawal history was retained." };
  }
  if (type === "staff") {
    const staff = await findEntity("staff", id);
    if (!staff) return null;

    const teams = await StaffTeam.find({ $or: [{ leader: id }, { members: id }] }).select("_id leader members");
    const ledTeams = teams.filter((team) => String(team.leader) === String(id));
    const ledTeamIds = ledTeams.map((team) => team._id);
    const affectedMemberIds = [...new Set(ledTeams.flatMap((team) => team.members.map(String)))];
    const endedAt = new Date();
    const releaseChanges = {
      status: "RELEASED",
      releasedBy: req.user._id,
      releasedAt: endedAt,
      releaseType: "ADMIN_FORCE_RELEASE",
      releaseReason: "Staff account deleted by Super Admin",
      leaderRemarks: "Team membership closed during account deletion",
      pendingWorkConfirmed: true,
      handoverNotes: "Open work returned to the team queue",
      workDisposition: "TEAM_QUEUE"
    };

    await Promise.all([
      StaffTeam.updateMany({ _id: { $in: teams.filter((team) => String(team.leader) !== String(id)).map((team) => team._id) } }, { $pull: { members: id } }),
      ledTeamIds.length
        ? StaffTeam.updateMany({ _id: { $in: ledTeamIds } }, { $set: { isActive: false }, $pull: { members: { $in: affectedMemberIds } } })
        : Promise.resolve(),
      affectedMemberIds.length
        ? User.updateMany({ _id: { $in: affectedMemberIds }, role: "Staff" }, { $set: { staffStatus: "FREE", currentTeamLeader: null } })
        : Promise.resolve(),
      StaffTeamHistory.updateMany({ staff: id, status: "ACTIVE" }, { $set: releaseChanges }),
      ledTeamIds.length && affectedMemberIds.length
        ? StaffTeamHistory.updateMany({ team: { $in: ledTeamIds }, staff: { $in: affectedMemberIds }, status: "ACTIVE" }, { $set: releaseChanges })
        : Promise.resolve(),
      WorkAssignment.updateMany(
        { active: true, $or: [{ staff: id }, { teamLeader: id }, { team: { $in: ledTeamIds } }] },
        { $set: { active: false, status: "RELEASED", endedAt, endedBy: req.user._id, endReason: "Staff account deleted by Super Admin" } }
      ),
      staff.role === "Team Leader"
        ? SupportTicket.updateMany(
          { status: { $nin: ["Resolved", "Closed"] }, $or: [{ assignedTeamLeader: id }, ...(ledTeamIds.length ? [{ assignedTeam: { $in: ledTeamIds } }] : [])] },
          { $set: { status: "Open", routedToAdmin: true }, $unset: { assignedTeam: "", assignedTeamLeader: "", assignedStaff: "" } }
        )
        : SupportTicket.updateMany(
          { assignedStaff: id, status: { $nin: ["Resolved", "Closed"] } },
          { $set: { status: "Open", routedToAdmin: true }, $unset: { assignedTeam: "", assignedTeamLeader: "", assignedStaff: "" } }
        )
    ]);

    await StaffAuditLog.create({
      actor: req.user._id,
      actorName: req.user.name,
      actorRole: req.user.role,
      entityType: "Staff",
      entity: staff._id,
      action: "staff_deleted",
      description: `${staff.role} account ${staff.employeeCode || staff.email} deleted`,
      changes: { role: staff.role, email: staff.email },
      request: { method: req.method, path: req.originalUrl, ip: req.ip, userAgent: req.get("user-agent") }
    });
    await staff.deleteOne();
    return { id, message: "Staff account deleted. Active assignments were revoked and team history was retained." };
  }
  const order = await Order.findByIdAndDelete(id);
  return order ? { id, message: "Order deleted." } : null;
};

export const requestAdminDeletionOtp = asyncHandler(async (req, res) => {
  const { entityType, id } = req.params;
  if (!entityModels[entityType] || !/^[a-f\d]{24}$/i.test(id)) {
    res.status(400);
    throw new Error("Invalid deletion target");
  }
  const [entity, admin] = await Promise.all([
    findEntity(entityType, id),
    User.findById(req.user._id).select("name email")
  ]);
  if (!entity) { res.status(404); throw new Error("Record not found"); }
  if (!admin?.email) { res.status(409); throw new Error("Your admin account needs an email address before deletion can be confirmed"); }

  const code = crypto.randomInt(0, 1_000_000).toString().padStart(6, "0");
  await AdminDeletionOtp.deleteMany({ entityType, entityId: id, admin: admin._id });
  const challenge = await AdminDeletionOtp.create({
    entityType,
    entityId: id,
    admin: admin._id,
    codeHash: hashCode(code),
    expiresAt: new Date(Date.now() + 10 * 60 * 1000)
  });
  try {
    await sendEmail({
      to: admin.email,
      subject: "Admin deletion confirmation code",
      text: `Hello ${admin.name || "Admin"},\n\nYour confirmation code to delete ${entityLabels[entityType]} ${entity.orderNumber || entity.companyName || entity.fullName || entity.name || entity.employeeCode || ""} is ${code}. The code expires in 10 minutes and can be used once.\n\nIf you did not request this, ignore this email.`
    });
  } catch (error) {
    await challenge.deleteOne();
    res.status(502);
    throw new Error(`Could not send the confirmation email: ${error.message}`);
  }
  res.json({ challengeId: challenge._id, email: maskEmail(admin.email), expiresInSeconds: 600 });
});

export const deleteAdminRecord = asyncHandler(async (req, res) => {
  const { entityType, id } = req.params;
  const otp = String(req.body.otp || "");
  const challengeId = String(req.body.challengeId || "");
  if (!entityModels[entityType] || !/^[a-f\d]{24}$/i.test(id) || !/^[a-f\d]{24}$/i.test(challengeId) || !/^\d{6}$/.test(otp)) {
    res.status(400);
    throw new Error("Enter the 6-digit email code");
  }
  const filter = { _id: challengeId, entityType, entityId: id, admin: req.user._id, expiresAt: { $gt: new Date() } };
  const challenge = await AdminDeletionOtp.findOne(filter);
  if (!challenge || challenge.attempts >= 5) { res.status(400); throw new Error("Confirmation code is invalid or expired"); }
  if (!validOtp(challenge.codeHash, otp)) {
    challenge.attempts += 1;
    if (challenge.attempts >= 5) await challenge.deleteOne();
    else await challenge.save();
    res.status(400);
    throw new Error("Confirmation code is invalid or expired");
  }
  const consumed = await AdminDeletionOtp.findOneAndDelete({ ...filter, codeHash: challenge.codeHash, attempts: { $lt: 5 } });
  if (!consumed) { res.status(400); throw new Error("Confirmation code is invalid or expired"); }
  const result = await removeEntity(entityType, id, req);
  if (!result) { res.status(404); throw new Error("Record not found"); }
  res.json(result);
});