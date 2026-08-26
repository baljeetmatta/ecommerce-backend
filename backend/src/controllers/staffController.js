import crypto from "crypto";
import mongoose from "mongoose";
import User from "../models/User.js";
import StaffTeam from "../models/StaffTeam.js";
import WorkAssignment, { assignmentActions, assignmentPermissions } from "../models/WorkAssignment.js";
import StaffAuditLog from "../models/StaffAuditLog.js";
import StaffTeamHistory from "../models/StaffTeamHistory.js";
import ModuleMaster from "../models/ModuleMaster.js";
import PermissionMaster from "../models/PermissionMaster.js";
import SupportTicket from "../models/SupportTicket.js";
import Product from "../models/Product.js";
import asyncHandler from "../utils/asyncHandler.js";

const isAdmin = (user) => user.role === "Super Admin";
const staffView = (user) => ({ _id: user._id, name: user.name, email: user.email, role: user.role, employeeCode: user.employeeCode, phone: user.phone, mobile: user.mobile, address: user.address, city: user.city, state: user.state, pinCode: user.pinCode, designation: user.designation, department: user.department, joiningDate: user.joiningDate, permissions: user.permissions, staffStatus: user.staffStatus || (user.currentTeamLeader ? "ASSIGNED" : "FREE"), currentTeamLeader: user.currentTeamLeader, maximumStaffCapacity: user.maximumStaffCapacity, maximumEntityCapacity: user.maximumEntityCapacity, isActive: user.isActive, createdAt: user.createdAt });
const log = (req, entityType, entity, action, description, changes = {}, session) => StaffAuditLog.create([{ actor: req.user._id, actorName: req.user.name, actorRole: req.user.role, entityType, entity, action, description, changes, request: { method: req.method, path: req.originalUrl, ip: req.ip, userAgent: req.get("user-agent") } }], session ? { session } : {}).then(rows => rows[0]);

export const listStaff = asyncHandler(async (req, res) => { const query = { role: { $in: ["Staff", "Team Leader"] } }; if (!isAdmin(req.user)) { const teams = await StaffTeam.find({ leader: req.user._id }).select("members leader"); const ids = [...new Set(teams.flatMap((team) => [String(team.leader), ...team.members.map(String)]))]; query._id = { $in: ids }; } res.json((await User.find(query).sort({ createdAt: -1 })).map(staffView)); });
export const createStaff = asyncHandler(async (req, res) => {
  if (!["Staff", "Team Leader"].includes(req.body.role)) { res.status(400); throw new Error("Role must be Staff or Team Leader"); }
  const required = ["name", "employeeCode", "email", "mobile", "address"];
  if (required.some((field) => !String(req.body[field] || "").trim())) { res.status(400); throw new Error("Name, employee code, email, mobile and address are required"); }
  const temporaryPassword = String(req.body.password || `Hrs@${crypto.randomInt(100000, 1000000)}`);
  const user = await User.create({ ...req.body, email: String(req.body.email).trim().toLowerCase(), employeeCode: String(req.body.employeeCode).trim().toUpperCase(), password: temporaryPassword, permissions: req.body.permissions || [], staffStatus: req.body.role === "Staff" ? "FREE" : undefined, currentTeamLeader: null });
  await log(req, "Staff", user._id, "staff_created", `${user.role} account ${user.employeeCode} created`, staffView(user));
  res.status(201).json({ staff: staffView(user), temporaryPassword });
});
export const updateStaff = asyncHandler(async (req, res) => {
  const allowed = ["name", "email", "role", "employeeCode", "phone", "mobile", "address", "city", "state", "pinCode", "designation", "department", "joiningDate", "isActive", "staffStatus", "maximumStaffCapacity", "maximumEntityCapacity", "permissions"];
  const payload = Object.fromEntries(allowed.filter((field) => req.body[field] !== undefined).map((field) => [field, req.body[field]]));
  if (payload.role && !["Staff", "Team Leader"].includes(payload.role)) { res.status(400); throw new Error("Invalid staff role"); }
  const user = await User.findOneAndUpdate({ _id: req.params.id, role: { $in: ["Staff", "Team Leader"] } }, payload, { new: true, runValidators: true });
  if (!user) { res.status(404); throw new Error("Staff member not found"); }
  await log(req, "Staff", user._id, "staff_updated", `${user.employeeCode} profile updated`, payload); res.json(staffView(user));
});

export const listTeams = asyncHandler(async (req, res) => {
  const query = isAdmin(req.user) ? {} : req.user.role === "Team Leader" ? { leader: req.user._id } : { members: req.user._id };
  res.json(await StaffTeam.find(query).populate("leader members", "name email employeeCode role isActive staffStatus currentTeamLeader department joiningDate").sort({ createdAt: -1 }));
});
export const createTeam = asyncHandler(async (req, res) => {
  const leader = await User.findOne({ _id: req.body.leader, role: "Team Leader", isActive: true });
  if (!leader) { res.status(400); throw new Error("Select an active Team Leader"); }
  const members = await User.find({ _id: { $in: req.body.members || [] }, role: "Staff", isActive: true }).distinct("_id");
  if (leader.maximumStaffCapacity > 0 && members.length > leader.maximumStaffCapacity) { res.status(409); throw new Error(`This Team Leader can manage at most ${leader.maximumStaffCapacity} staff members`); }
  if (await User.exists({ _id: { $in: members }, $or: [{ staffStatus: { $in: ["ASSIGNED", "SUSPENDED", "INACTIVE"] } }, { currentTeamLeader: { $exists: true, $ne: null } }] })) { res.status(409); throw new Error("Only FREE staff may be assigned to a Team Leader"); }
  const alreadyAssigned = await StaffTeam.findOne({ isActive: true, members: { $in: members } }).populate("leader", "name employeeCode");
  if (alreadyAssigned) { res.status(409); throw new Error(`A selected staff member already works under ${alreadyAssigned.leader?.name || "another Team Leader"}. Relieve the staff member before assigning a new team.`); }
  const team = await StaffTeam.create({ name: req.body.name, code: req.body.code, description: req.body.description, leader, members, createdBy: req.user._id });
  if (members.length) { await User.updateMany({ _id: { $in: members } }, { $set: { staffStatus: "ASSIGNED", currentTeamLeader: leader._id, updatedBy: req.user._id } }); await StaffTeamHistory.insertMany(members.map(staff => ({ staff, team: team._id, teamLeader: leader._id, assignedBy: req.user._id }))); }
  await log(req, "Team", team._id, "team_created", `Team ${team.name} created`, { leader: leader._id, members }); res.status(201).json(await team.populate("leader members", "name email employeeCode role"));
});
export const updateTeam = asyncHandler(async (req, res) => {
  const team = await StaffTeam.findById(req.params.id); if (!team) { res.status(404); throw new Error("Team not found"); }
  const beforeMembers = team.members.map(String); const members = req.body.members === undefined ? team.members : await User.find({ _id: { $in: req.body.members }, role: "Staff", isActive: true }).distinct("_id");
  const conflict = await StaffTeam.findOne({ _id: { $ne: team._id }, isActive: true, members: { $in: members } }).populate("leader", "name employeeCode");
  if (conflict) { res.status(409); throw new Error(`A selected staff member already works under ${conflict.leader?.name || "another Team Leader"}. Relieve them first.`); }
  const removed = beforeMembers.filter((id) => !members.some((member) => String(member) === id));
  if (removed.length) { res.status(409); throw new Error("Staff cannot be removed through team editing. Complete the release assessment instead."); }
  if (req.body.leader && String(req.body.leader) !== String(team.leader) && team.members.length) { res.status(409); throw new Error("Release all staff before changing the Team Leader"); }
  if (req.body.leader) { const leader = await User.findOne({ _id: req.body.leader, role: "Team Leader", isActive: true }); if (!leader) { res.status(400); throw new Error("Select an active Team Leader"); } team.leader = leader._id; }
  ["name", "code", "description", "isActive"].forEach((field) => { if (req.body[field] !== undefined) team[field] = req.body[field]; }); team.members = members; await team.save();
  const added = members.filter(member => !beforeMembers.includes(String(member)));
  if (added.length) { if (await User.exists({ _id: { $in: added }, $or: [{ staffStatus: { $in: ["ASSIGNED", "SUSPENDED", "INACTIVE"] } }, { currentTeamLeader: { $exists: true, $ne: null } }] })) { res.status(409); throw new Error("Only FREE staff may be added"); } await User.updateMany({ _id: { $in: added } }, { $set: { staffStatus: "ASSIGNED", currentTeamLeader: team.leader, updatedBy: req.user._id } }); await StaffTeamHistory.insertMany(added.map(staff => ({ staff, team: team._id, teamLeader: team.leader, assignedBy: req.user._id }))); }
  await log(req, "Team", team._id, "team_updated", `Team ${team.name} updated`, { members, removed }); res.json(await team.populate("leader members", "name email employeeCode role isActive"));
});
export const moveStaffBetweenTeams = asyncHandler(async (req, res) => {
  res.status(409);
  throw new Error("Direct team moves are disabled. The existing Team Leader must first relieve the staff member, which revokes all permissions; Admin can then add the staff member to the new team.");
});

export const relieveStaff = asyncHandler(async (req, res) => {
  const team = await StaffTeam.findById(req.params.teamId).populate("leader", "name employeeCode");
  if (!team) { res.status(404); throw new Error("Team not found"); }
  if (!isAdmin(req.user) && (req.user.role !== "Team Leader" || String(team.leader._id) !== String(req.user._id))) { res.status(403); throw new Error("Only this Team Leader or Admin can relieve the staff member"); }
  const staff = await User.findOne({ _id: req.params.staffId, role: "Staff" });
  if (!staff || !team.members.some(member => String(member) === String(staff._id))) { res.status(404); throw new Error("Staff member is not part of this team"); }
  const force = isAdmin(req.user) && req.body.force === true; const rating = Number(req.body.satisfactionRating); const reason = String(req.body.reason || "").trim(); const remarks = String(req.body.leaderRemarks || "").trim();
  if (!reason || !remarks || (!force && (!Number.isFinite(rating) || rating < 0 || rating > 5)) || req.body.pendingWorkConfirmed !== true) { res.status(400); throw new Error("Release reason, leader remarks, pending-work confirmation and a 0–5 satisfaction rating are required"); }
  if (req.body.workDisposition === "ASSIGN_ANOTHER_STAFF" && (!req.body.replacementStaff || !team.members.some(member => String(member) === String(req.body.replacementStaff)) || String(req.body.replacementStaff) === String(staff._id))) { res.status(400); throw new Error("Select another active staff member from this team for the handover"); }
  const session = await mongoose.startSession(); const relievedAt = new Date(); let revokedAssignments = 0;
  try { await session.withTransaction(async () => {
    const activeAssignments = await WorkAssignment.find({ team: team._id, staff: staff._id, active: true }).session(session); revokedAssignments = activeAssignments.length;
    await WorkAssignment.updateMany({ team: team._id, staff: staff._id, active: true }, { $set: { active: false, status: "RELEASED", endedAt: relievedAt, endedBy: req.user._id, endReason: reason, revocationRemarks: remarks } }, { session });
    const ticketUpdate = req.body.workDisposition === "ASSIGN_ANOTHER_STAFF" ? { $set: { assignedStaff: req.body.replacementStaff, assignedTeamLeader: team.leader._id, assignedTeam: team._id, status: "Assigned" } } : { $unset: { assignedStaff: 1 }, $set: { assignedTeamLeader: team.leader._id, assignedTeam: team._id, status: "Assigned" } };
    await SupportTicket.updateMany({ assignedStaff: staff._id, status: { $nin: ["Resolved", "Closed"] } }, ticketUpdate, { session });
    team.members.pull(staff._id); await team.save({ session });
    staff.staffStatus = "FREE"; staff.currentTeamLeader = null; staff.updatedBy = req.user._id; await staff.save({ session, validateModifiedOnly: true });
    await StaffTeamHistory.findOneAndUpdate({ staff: staff._id, team: team._id, status: "ACTIVE" }, { status: "RELEASED", releasedBy: req.user._id, releasedAt: relievedAt, releaseType: force ? "ADMIN_FORCE_RELEASE" : "LEADER_RELEASE", releaseReason: reason, leaderRemarks: remarks, satisfactionRating: Number.isFinite(rating) ? rating : undefined, pendingWorkConfirmed: true, handoverNotes: req.body.handoverNotes, workDisposition: req.body.workDisposition || "TEAM_QUEUE", replacementStaff: req.body.replacementStaff }, { session });
    await log(req, "Staff", staff._id, force ? "STAFF_FORCE_RELEASED" : "STAFF_RELEASED", `${staff.employeeCode} relieved from ${team.name}; ${activeAssignments.length} active permission(s) revoked`, { team: team._id, previousLeader: team.leader._id, revokedAssignments: activeAssignments.map(item => ({ assignment: item._id, entityType: item.entityType, entity: item.entity, action: item.action, permissions: item.permissions })), reason, remarks, rating, handoverNotes: req.body.handoverNotes, workDisposition: req.body.workDisposition }, session);
  }); } finally { await session.endSession(); }
  res.json({ message: "Staff relieved from team and all active permissions revoked", revokedAssignments, relievedAt });
});

export const listAssignments = asyncHandler(async (req, res) => {
  const query = isAdmin(req.user) ? {} : req.user.role === "Team Leader" ? { teamLeader: req.user._id, active: true } : { staff: req.user._id, active: true };
  if (req.query.entityType) query.entityType = req.query.entityType; if (req.query.entity) query.entity = req.query.entity; if (req.query.action) query.action = req.query.action;
  res.json({ actions: assignmentActions, permissions: assignmentPermissions, items: await WorkAssignment.find(query).populate("team", "name code").populate("teamLeader staff assignedBy", "name employeeCode role").populate("parentAssignment").populate("entity").sort({ createdAt: -1 }) });
});
export const assignWork = asyncHandler(async (req, res) => {
  const { entityType, entity, action, team: teamId, staff, notes } = req.body; const permissions = [...new Set((req.body.permissions?.length ? req.body.permissions : ["VIEW"]).map(value => String(value).toUpperCase()))];
  if (!["Seller", "Partner", "Customer", "Reseller"].includes(entityType) || !assignmentActions.includes(action)) { res.status(400); throw new Error("Invalid entity or responsibility"); }
  const team = await StaffTeam.findById(teamId); if (!team?.isActive) { res.status(404); throw new Error("Active team not found"); }
  if (!isAdmin(req.user) && (req.user.role !== "Team Leader" || String(team.leader) !== String(req.user._id))) { res.status(403); throw new Error("You can assign work only within your own team"); }
  if (staff && !team.members.some((member) => String(member) === String(staff))) { res.status(400); throw new Error("Staff member is not part of this team"); }
  if (isAdmin(req.user) && staff) { res.status(400); throw new Error("Admin assigns entity permissions to the Team Leader. The Team Leader must delegate a permitted subset to staff."); }
  if (!isAdmin(req.user) && !staff) { res.status(400); throw new Error("Select one of your staff members for delegation"); }
  if (permissions.some(permission => !assignmentPermissions.includes(permission))) { res.status(400); throw new Error("Invalid assignment permission"); }
  if (permissions.some(permission => ["APPROVE", "REJECT"].includes(permission)) && !String(notes || "").trim()) { res.status(400); throw new Error("A reason is required when granting high-risk approval permissions"); }
  let parentAssignment = null;
  if (!isAdmin(req.user)) { parentAssignment = await WorkAssignment.findOne({ entityType, entity, action, team: team._id, teamLeader: req.user._id, staff: { $exists: false }, active: true, status: { $in: ["ACTIVE", "PARTIALLY_REVOKED"] }, effectiveFrom: { $lte: new Date() }, $or: [{ effectiveUntil: null }, { effectiveUntil: { $gt: new Date() } }] }); if (!parentAssignment) { res.status(403); throw new Error("Admin has not delegated this module to your team"); } if (permissions.some(permission => !parentAssignment.permissions.includes(permission))) { res.status(403); throw new Error("You cannot delegate a permission that Admin has not granted to you"); } }
  const target = { entityType, entity, action, team: team._id, staff: staff || { $exists: false }, active: true }; await WorkAssignment.updateMany(target, { active: false, status: "REVOKED", endedAt: new Date(), endedBy: req.user._id, endReason: "Replaced by a new assignment" });
  const assignment = await WorkAssignment.create({ entityType, entity, action, permissions, parentAssignment: parentAssignment?._id, team: team._id, teamLeader: team.leader, staff: staff || undefined, assignedBy: req.user._id, notes, effectiveFrom: req.body.effectiveFrom || new Date(), effectiveUntil: req.body.effectiveUntil || undefined });
  await log(req, "Assignment", assignment._id, "work_assigned", `${entityType} ${action} assigned to ${staff ? "staff" : "team leader"}`, req.body);
  res.status(201).json(await assignment.populate("team teamLeader staff assignedBy entity"));
});
export const endAssignment = asyncHandler(async (req, res) => { const query = { _id: req.params.id, active: true, ...(isAdmin(req.user) ? {} : { teamLeader: req.user._id }) }; const item = await WorkAssignment.findOneAndUpdate(query, { active: false, endedAt: new Date(), endedBy: req.user._id }, { new: true }); if (!item) { res.status(404); throw new Error("Active assignment not found"); } await log(req, "Assignment", item._id, "assignment_ended", "Work assignment ended"); res.json(item); });
export const updateAssignmentPermissions = asyncHandler(async (req, res) => { const item = await WorkAssignment.findOne({ _id: req.params.id, active: true }); if (!item) { res.status(404); throw new Error("Active assignment not found"); } if (!isAdmin(req.user) && (req.user.role !== "Team Leader" || String(item.teamLeader) !== String(req.user._id) || !item.staff)) { res.status(403); throw new Error("You cannot change this assignment"); } const next = [...new Set((req.body.permissions || []).map(value => String(value).toUpperCase()))]; if (next.some(value => !assignmentPermissions.includes(value))) { res.status(400); throw new Error("Invalid permission"); } if (item.parentAssignment) { const parent = await WorkAssignment.findOne({ _id: item.parentAssignment, active: true }); if (!parent || next.some(value => !parent.permissions.includes(value))) { res.status(403); throw new Error("Selected permissions exceed the active Team Leader assignment"); } } const previous = [...item.permissions]; item.permissions = next; item.status = next.length ? (next.length < previous.length ? "PARTIALLY_REVOKED" : "ACTIVE") : "REVOKED"; if (!next.length) { item.active = false; item.endedAt = new Date(); item.endedBy = req.user._id; } item.permissionHistory.push({ previous, next, reason: req.body.reason, remarks: req.body.remarks, changedBy: req.user._id, ip: req.ip, userAgent: req.get("user-agent") }); await item.save(); const removed = previous.filter(value => !next.includes(value)); if (!item.staff && removed.length) { const children = await WorkAssignment.find({ parentAssignment: item._id, active: true }); for (const child of children) { const childPrevious = [...child.permissions]; child.permissions = child.permissions.filter(value => next.includes(value)); child.permissionHistory.push({ previous: childPrevious, next: child.permissions, reason: "PARENT_PERMISSION_REVOKED", remarks: req.body.remarks, changedBy: req.user._id, ip: req.ip, userAgent: req.get("user-agent") }); if (!child.permissions.length) { child.active = false; child.status = "CASCADE_REVOKED"; child.endedAt = new Date(); child.endedBy = req.user._id; } else child.status = "PARTIALLY_REVOKED"; await child.save(); await log(req, "Assignment", child._id, "PERMISSION_CASCADE_REVOKED", "Staff permission reduced after parent revocation", { previous: childPrevious, next: child.permissions, removed }); } } await log(req, "Assignment", item._id, removed.length ? "PERMISSION_REVOKED" : "PERMISSION_GRANTED", "Assignment permissions changed", { previous, next, reason: req.body.reason, remarks: req.body.remarks }); res.json(item); });

export const assignmentMetadata = asyncHandler(async (_req, res) => { const moduleRows = [
  ["Customer","profile","Customer Profile"],["Customer","kyc","KYC"],["Customer","cart","Cart"],["Customer","orders","Orders"],["Customer","returns","Returns"],["Customer","refunds","Refunds"],["Customer","support","Support Tickets"],
  ["Seller","registration","Seller Profile"],["Seller","kyc","Seller KYC"],["Seller","products","Product Approval & Management"],["Seller","orders","Orders"],["Seller","returns","Returns"],["Seller","refunds","Refunds"],["Seller","payouts","Settlement & Withdrawals"],["Seller","support","Support Tickets"],
  ["Reseller","registration","Reseller Profile"],["Reseller","kyc","KYC"],["Reseller","orders","Orders"],["Reseller","reports","Commission & Settlement"],["Reseller","payouts","Withdrawal Requests"],["Reseller","support","Support Tickets"],
  ["Partner","registration","Partner Profile"],["Partner","kyc","KYC"],["Partner","reports","Transactions & Settlement"],["Partner","payouts","Withdrawal Requests"],["Partner","support","Support Tickets"]
]; await Promise.all(moduleRows.map(([entityType,action,name]) => ModuleMaster.updateOne({ code: `${entityType}_${action}`.toUpperCase() }, { $setOnInsert: { code: `${entityType}_${action}`.toUpperCase(), entityType, action, name } }, { upsert: true }))); await Promise.all(assignmentPermissions.map(code => PermissionMaster.updateOne({ code }, { $setOnInsert: { code, name: code.charAt(0)+code.slice(1).toLowerCase(), riskLevel: ["APPROVE","REJECT"].includes(code) ? "HIGH" : ["EDIT","PROCESS","COMMUNICATE","ASSIGN","CLOSE","UPLOAD"].includes(code) ? "MEDIUM" : "LOW" } }, { upsert: true }))); res.json({ modules: await ModuleMaster.find({ active: true }).sort({ entityType: 1, name: 1 }), permissions: await PermissionMaster.find({ active: true }).sort({ riskLevel: 1, name: 1 }) }); });
export const staffHistory = asyncHandler(async (req, res) => { const query = req.params.staffId ? { staff: req.params.staffId } : {}; if (!isAdmin(req.user)) query.teamLeader = req.user._id; res.json(await StaffTeamHistory.find(query).populate("staff teamLeader assignedBy releasedBy", "name employeeCode role").populate("team", "name code").sort({ assignedAt: -1 })); });
export const workDashboard = asyncHandler(async (req, res) => { const scope = req.user.role === "Team Leader" ? { teamLeader: req.user._id } : { staff: req.user._id }; const now = new Date(); const assignments = await WorkAssignment.find({ ...scope, active: true, status: { $in: ["ACTIVE", "PARTIALLY_REVOKED"] }, effectiveFrom: { $lte: now }, $or: [{ effectiveUntil: null }, { effectiveUntil: { $gt: now } }] }).populate("entity", "name fullName companyName businessName email sellerNumber resellerId registrationNumber").populate("team staff teamLeader", "name employeeCode role").sort({ createdAt: -1 }); const entityCounts = ["Customer","Seller","Reseller","Partner"].reduce((result,type)=>({ ...result, [type]: new Set(assignments.filter(item=>item.entityType===type).map(item=>String(item.entity?._id||item.entity))).size }),{}); const teams = req.user.role === "Team Leader" ? await StaffTeam.find({ leader: req.user._id, isActive: true }).populate("members", "name employeeCode staffStatus isActive") : await StaffTeam.find({ members: req.user._id, isActive: true }).populate("leader", "name employeeCode"); const assignedStaffIds = req.user.role === "Team Leader" ? teams.flatMap(team=>team.members.map(member=>member._id)) : [req.user._id]; const ticketScope = req.user.role === "Team Leader" ? { assignedTeamLeader: req.user._id } : { assignedStaff: req.user._id }; const [openTickets, overdueTickets, pendingProducts] = await Promise.all([SupportTicket.countDocuments({ ...ticketScope, status: { $nin: ["Resolved","Closed"] } }), SupportTicket.countDocuments({ ...ticketScope, status: { $nin: ["Resolved","Closed"] }, updatedAt: { $lt: new Date(Date.now()-24*60*60*1000) } }), Product.countDocuments({ seller: { $in: assignments.filter(item=>item.entityType==="Seller"&&item.action==="products").map(item=>item.entity?._id||item.entity) }, approvalStatus: { $in: ["pending_new","pending_update"] } })]); res.json({ role: req.user.role, entityCounts, activeAssignments: assignments.length, openTickets, overdueItems: overdueTickets, pendingProductApprovals: pendingProducts, teamCount: teams.length, staffCount: assignedStaffIds.length, teams, assignments: assignments.slice(0,100), expiringSoon: assignments.filter(item=>item.effectiveUntil&&item.effectiveUntil<=new Date(Date.now()+7*24*60*60*1000)).length }); });
export const listAuditLogs = asyncHandler(async (req, res) => { const query = {}; if (req.query.entityType) query.entityType = req.query.entityType; if (req.query.entity) query.entity = req.query.entity; if (!isAdmin(req.user)) { const assignments = await WorkAssignment.find(req.user.role === "Team Leader" ? { teamLeader: req.user._id } : { staff: req.user._id }).distinct("entity"); query.$or = [{ actor: req.user._id }, { entity: { $in: assignments } }]; } const limit = Math.min(200, Math.max(1, Number(req.query.limit) || 50)); res.json(await StaffAuditLog.find(query).populate("actor", "name employeeCode role").sort({ occurredAt: -1 }).limit(limit)); });
