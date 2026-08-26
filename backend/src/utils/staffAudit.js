import StaffAuditLog from "../models/StaffAuditLog.js";

export const recordStaffAction = (req, entityType, entity, action, description, changes = {}) => {
  if (!req.user) return Promise.resolve();
  return StaffAuditLog.create({ actor: req.user._id, actorName: req.user.name, actorRole: req.user.role, entityType, entity, action, description, changes, request: { method: req.method, path: req.originalUrl, ip: req.ip } });
};
