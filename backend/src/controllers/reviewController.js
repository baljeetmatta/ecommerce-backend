import Review from "../models/Review.js";
import WorkAssignment from "../models/WorkAssignment.js";
import asyncHandler from "../utils/asyncHandler.js";

const reviewScope = async (user) => {
  if (user.role === "Super Admin") return {};
  if (!["Team Leader", "Staff"].includes(user.role)) return { _id: null };
  const owner = user.role === "Team Leader" ? { teamLeader: user._id } : { staff: user._id };
  const assignments = await WorkAssignment.find({ ...owner, action: "reviews", active: true }).select("entityType entity").lean();
  const sellerIds = assignments.filter((item) => item.entityType === "Seller").map((item) => item.entity);
  const customerIds = assignments.filter((item) => item.entityType === "Customer").map((item) => item.entity);
  return { $or: [{ seller: { $in: sellerIds } }, { customer: { $in: customerIds } }] };
};

export const listReviewsForModeration = asyncHandler(async (req, res) => {
  const page = Math.max(1, Number.parseInt(req.query.page, 10) || 1);
  const limit = Math.min(50, Math.max(1, Number.parseInt(req.query.limit, 10) || 20));
  const requestedStatus = ["pending", "approved", "rejected"].includes(req.query.status) ? req.query.status : "pending";
  const status = requestedStatus === "pending" ? { $in: ["pending", null] } : requestedStatus;
  const filter = { ...(await reviewScope(req.user)), status };
  const [items, total] = await Promise.all([
    Review.find(filter).populate("product", "name sku mainImage imageVariants").populate("seller", "companyName sellerNumber").populate("customer", "name email profileImage").populate("order", "orderNumber").populate("moderatedBy", "name role").sort({ createdAt: -1 }).skip((page - 1) * limit).limit(limit),
    Review.countDocuments(filter)
  ]);
  res.json({ items, pagination: { page, limit, total, pages: Math.max(1, Math.ceil(total / limit)) } });
});

export const moderateReview = asyncHandler(async (req, res) => {
  if (!["approved", "rejected"].includes(req.body.status)) { res.status(400); throw new Error("Choose approved or rejected"); }
  const review = await Review.findOne({ _id: req.params.id, ...(await reviewScope(req.user)) });
  if (!review) { res.status(404); throw new Error("Review was not found or is outside your assignment"); }
  review.status = req.body.status;
  review.moderationNote = String(req.body.note || "").trim();
  review.moderatedAt = new Date();
  review.moderatedBy = req.user._id;
  await review.save();
  res.json(review);
});
