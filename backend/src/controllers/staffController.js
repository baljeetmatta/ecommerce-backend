import crypto from "crypto";
import User from "../models/User.js";
import StaffTeam from "../models/StaffTeam.js";
import WorkAssignment, { assignmentActions } from "../models/WorkAssignment.js";
import StaffAuditLog from "../models/StaffAuditLog.js";
import asyncHandler from "../utils/asyncHandler.js";

const isAdmin = (user) => user.role === "Super Admin";
const staffView = (user) => ({ _id: user._id, name: user.name, email: user.email, role: user.role, employeeCode: user.employeeCode, phone: user.phone, mobile: user.mobile, address: user.address, city: user.city, state: user.state, pinCode: user.pinCode, designation: user.designation, joiningDate: user.joiningDate, permissions: user.permissions, isActive: user.isActive, createdAt: user.createdAt });
const log = (req, entityType, entity, action, description, changes = {}) => StaffAuditLog.create({ actor: req.user._id, actorName: req.user.name, actorRole: req.user.role, entityType, entity, action, description, changes, request: { method: req.method, path: req.originalUrl, ip: req.ip } });

export const listStaff = asyncHandler(async (req, res) => { const query = { role: { $in: ["Staff", "Team Leader"] } }; if (!isAdmin(req.user)) { const teams = await StaffTeam.find({ leader: req.user._id }).select("members leader"); const ids = [...new Set(teams.flatMap((team) => [String(team.leader), ...team.members.map(String)]))]; query._id = { $in: ids }; } res.json((await User.find(query).sort({ createdAt: -1 })).map(staffView)); });
export const createStaff = asyncHandler(async (req, res) => {
  if (!["Staff", "Team Leader"].includes(req.body.role)) { res.status(400); throw new Error("Role must be Staff or Team Leader"); }
  const required = ["name", "employeeCode", "email", "mobile", "address"];
  if (required.some((field) => !String(req.body[field] || "").trim())) { res.status(400); throw new Error("Name, employee code, email, mobile and address are required"); }
  const temporaryPassword = String(req.body.password || `Hrs@${crypto.randomInt(100000, 1000000)}`);
  const user = await User.create({ ...req.body, email: String(req.body.email).trim().toLowerCase(), employeeCode: String(req.body.employeeCode).trim().toUpperCase(), password: temporaryPassword, permissions: [] });
  await log(req, "Staff", user._id, "staff_created", `${user.role} account ${user.employeeCode} created`, staffView(user));
  res.status(201).json({ staff: staffView(user), temporaryPassword });
});
export const updateStaff = asyncHandler(async (req, res) => {
  const allowed = ["name", "email", "role", "employeeCode", "phone", "mobile", "address", "city", "state", "pinCode", "designation", "joiningDate", "isActive"];
  const payload = Object.fromEntries(allowed.filter((field) => req.body[field] !== undefined).map((field) => [field, req.body[field]]));
  if (payload.role && !["Staff", "Team Leader"].includes(payload.role)) { res.status(400); throw new Error("Invalid staff role"); }
  const user = await User.findOneAndUpdate({ _id: req.params.id, role: { $in: ["Staff", "Team Leader"] } }, payload, { new: true, runValidators: true });
  if (!user) { res.status(404); throw new Error("Staff member not found"); }
  await log(req, "Staff", user._id, "staff_updated", `${user.employeeCode} profile updated`, payload); res.json(staffView(user));
});

export const listTeams = asyncHandler(async (req, res) => {
  const query = isAdmin(req.user) ? {} : req.user.role === "Team Leader" ? { leader: req.user._id } : { members: req.user._id };
  res.json(await StaffTeam.find(query).populate("leader members", "name email employeeCode role isActive").sort({ createdAt: -1 }));
});
export const createTeam = asyncHandler(async (req, res) => {
  const leader = await User.findOne({ _id: req.body.leader, role: "Team Leader", isActive: true });
  if (!leader) { res.status(400); throw new Error("Select an active Team Leader"); }
  const members = await User.find({ _id: { $in: req.body.members || [] }, role: "Staff", isActive: true }).distinct("_id");
  const team = await StaffTeam.create({ name: req.body.name, code: req.body.code, description: req.body.description, leader, members, createdBy: req.user._id });
  await log(req, "Team", team._id, "team_created", `Team ${team.name} created`, { leader: leader._id, members }); res.status(201).json(await team.populate("leader members", "name email employeeCode role"));
});
export const updateTeam = asyncHandler(async (req, res) => {
  const team = await StaffTeam.findById(req.params.id); if (!team) { res.status(404); throw new Error("Team not found"); }
  const beforeMembers = team.members.map(String); const members = req.body.members === undefined ? team.members : await User.find({ _id: { $in: req.body.members }, role: "Staff", isActive: true }).distinct("_id");
  if (req.body.leader) { const leader = await User.findOne({ _id: req.body.leader, role: "Team Leader", isActive: true }); if (!leader) { res.status(400); throw new Error("Select an active Team Leader"); } team.leader = leader._id; }
  ["name", "code", "description", "isActive"].forEach((field) => { if (req.body[field] !== undefined) team[field] = req.body[field]; }); team.members = members; await team.save();
  const removed = beforeMembers.filter((id) => !members.some((member) => String(member) === id));
  if (removed.length) await WorkAssignment.updateMany({ team: team._id, staff: { $in: removed }, active: true }, { active: false, endedAt: new Date(), endedBy: req.user._id });
  await log(req, "Team", team._id, "team_updated", `Team ${team.name} updated`, { members, removed }); res.json(await team.populate("leader members", "name email employeeCode role isActive"));
});
export const moveStaffBetweenTeams = asyncHandler(async (req, res) => {
  const { staff, fromTeam, toTeam } = req.body; if (!staff || !fromTeam || !toTeam || fromTeam === toTeam) { res.status(400); throw new Error("Select different source and destination teams"); }
  const [source, destination, user] = await Promise.all([StaffTeam.findById(fromTeam), StaffTeam.findById(toTeam), User.findOne({ _id: staff, role: "Staff", isActive: true })]);
  if (!source || !destination?.isActive || !user || !source.members.some((id) => String(id) === String(user._id))) { res.status(400); throw new Error("Staff move details are invalid"); }
  source.members.pull(user._id); if (!destination.members.some((id) => String(id) === String(user._id))) destination.members.push(user._id); await Promise.all([source.save(), destination.save()]);
  await WorkAssignment.updateMany({ team: source._id, staff: user._id, active: true }, { active: false, endedAt: new Date(), endedBy: req.user._id });
  await log(req, "Staff", user._id, "staff_moved", `${user.employeeCode} moved from ${source.name} to ${destination.name}`, { fromTeam, toTeam }); res.json({ message: "Staff moved and previous team access revoked" });
});

export const listAssignments = asyncHandler(async (req, res) => {
  const query = isAdmin(req.user) ? {} : req.user.role === "Team Leader" ? { teamLeader: req.user._id, active: true } : { staff: req.user._id, active: true };
  if (req.query.entityType) query.entityType = req.query.entityType; if (req.query.entity) query.entity = req.query.entity; if (req.query.action) query.action = req.query.action;
  res.json({ actions: assignmentActions, items: await WorkAssignment.find(query).populate("team", "name code").populate("teamLeader staff assignedBy", "name employeeCode role").populate("entity").sort({ createdAt: -1 }) });
});
export const assignWork = asyncHandler(async (req, res) => {
  const { entityType, entity, action, team: teamId, staff, notes } = req.body;
  if (!["Seller", "Partner", "Customer"].includes(entityType) || !assignmentActions.includes(action)) { res.status(400); throw new Error("Invalid entity or responsibility"); }
  const team = await StaffTeam.findById(teamId); if (!team?.isActive) { res.status(404); throw new Error("Active team not found"); }
  if (!isAdmin(req.user) && (req.user.role !== "Team Leader" || String(team.leader) !== String(req.user._id))) { res.status(403); throw new Error("You can assign work only within your own team"); }
  if (staff && !team.members.some((member) => String(member) === String(staff))) { res.status(400); throw new Error("Staff member is not part of this team"); }
  if (!isAdmin(req.user) && !await WorkAssignment.exists({ entityType, entity, action, team: team._id, teamLeader: req.user._id, active: true })) { res.status(403); throw new Error("Admin has not delegated this responsibility to your team"); }
  await WorkAssignment.updateMany({ entityType, entity, action, active: true }, { active: false, endedAt: new Date(), endedBy: req.user._id });
  const assignment = await WorkAssignment.create({ entityType, entity, action, team: team._id, teamLeader: team.leader, staff: staff || undefined, assignedBy: req.user._id, notes });
  await log(req, "Assignment", assignment._id, "work_assigned", `${entityType} ${action} assigned to ${staff ? "staff" : "team leader"}`, req.body);
  res.status(201).json(await assignment.populate("team teamLeader staff assignedBy entity"));
});
export const endAssignment = asyncHandler(async (req, res) => { const query = { _id: req.params.id, active: true, ...(isAdmin(req.user) ? {} : { teamLeader: req.user._id }) }; const item = await WorkAssignment.findOneAndUpdate(query, { active: false, endedAt: new Date(), endedBy: req.user._id }, { new: true }); if (!item) { res.status(404); throw new Error("Active assignment not found"); } await log(req, "Assignment", item._id, "assignment_ended", "Work assignment ended"); res.json(item); });
export const listAuditLogs = asyncHandler(async (req, res) => { const query = {}; if (req.query.entityType) query.entityType = req.query.entityType; if (req.query.entity) query.entity = req.query.entity; if (!isAdmin(req.user)) { const assignments = await WorkAssignment.find(req.user.role === "Team Leader" ? { teamLeader: req.user._id } : { staff: req.user._id }).distinct("entity"); query.$or = [{ actor: req.user._id }, { entity: { $in: assignments } }]; } const limit = Math.min(200, Math.max(1, Number(req.query.limit) || 50)); res.json(await StaffAuditLog.find(query).populate("actor", "name employeeCode role").sort({ occurredAt: -1 }).limit(limit)); });
