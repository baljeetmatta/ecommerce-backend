import BlogCategory from "../models/BlogCategory.js";
import BlogPost from "../models/BlogPost.js";
import asyncHandler from "../utils/asyncHandler.js";

const slugify = (value) =>
  value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");

export const listBlogCategories = asyncHandler(async (_req, res) => {
  const categories = await BlogCategory.find().populate("parent", "name slug").sort({ name: 1 });
  res.json(categories);
});

export const createBlogCategory = asyncHandler(async (req, res) => {
  const { name, slug, parent, description, isActive } = req.body;
  const category = await BlogCategory.create({
    name,
    slug: slug ? slugify(slug) : slugify(name),
    parent: parent || null,
    description,
    isActive
  });
  await category.populate("parent", "name slug");
  res.status(201).json(category);
});

export const updateBlogCategory = asyncHandler(async (req, res) => {
  const payload = { ...req.body };
  if (payload.slug) payload.slug = slugify(payload.slug);
  if (payload.parent === "") payload.parent = null;

  const category = await BlogCategory.findByIdAndUpdate(req.params.id, payload, {
    new: true,
    runValidators: true
  }).populate("parent", "name slug");

  if (!category) {
    res.status(404);
    throw new Error("Blog category not found");
  }

  res.json(category);
});

export const deleteBlogCategory = asyncHandler(async (req, res) => {
  const category = await BlogCategory.findByIdAndDelete(req.params.id);
  if (!category) {
    res.status(404);
    throw new Error("Blog category not found");
  }
  await BlogPost.updateMany({ category: req.params.id }, { $unset: { category: "" } });
  res.json({ message: "Blog category deleted", id: req.params.id });
});

export const listBlogPosts = asyncHandler(async (_req, res) => {
  const posts = await BlogPost.find().populate("category", "name slug parent").sort({ publishedAt: -1, createdAt: -1 });
  res.json(posts);
});

export const createBlogPost = asyncHandler(async (req, res) => {
  const { title, slug, category, excerpt, content, imageUrl, imageVariants, authorName, isActive, publishedAt } = req.body;
  const post = await BlogPost.create({
    title,
    slug: slug ? slugify(slug) : slugify(title),
    category: category || null,
    excerpt,
    content,
    imageUrl,
    imageVariants,
    authorName,
    isActive,
    publishedAt: publishedAt || Date.now()
  });
  await post.populate("category", "name slug parent");
  res.status(201).json(post);
});

export const updateBlogPost = asyncHandler(async (req, res) => {
  const payload = { ...req.body };
  if (payload.slug) payload.slug = slugify(payload.slug);
  if (payload.category === "") payload.category = null;

  const post = await BlogPost.findByIdAndUpdate(req.params.id, payload, {
    new: true,
    runValidators: true
  }).populate("category", "name slug parent");

  if (!post) {
    res.status(404);
    throw new Error("Blog post not found");
  }

  res.json(post);
});

export const deleteBlogPost = asyncHandler(async (req, res) => {
  const post = await BlogPost.findByIdAndDelete(req.params.id);
  if (!post) {
    res.status(404);
    throw new Error("Blog post not found");
  }
  res.json({ message: "Blog post deleted", id: req.params.id });
});

export const listStorefrontBlogPosts = () =>
  BlogPost.find({
    isActive: true,
    $or: [{ publishedAt: { $exists: false } }, { publishedAt: null }, { publishedAt: { $lte: new Date() } }]
  })
    .populate({ path: "category", select: "name slug parent isActive", match: { isActive: true } })
    .sort({ publishedAt: -1, createdAt: -1 })
    .limit(3)
    .select("title slug category excerpt imageUrl imageVariants authorName publishedAt");

export const getStorefrontBlogPost = asyncHandler(async (req, res) => {
  const post = await BlogPost.findOne({
    slug: req.params.slug,
    isActive: true,
    $or: [{ publishedAt: { $exists: false } }, { publishedAt: null }, { publishedAt: { $lte: new Date() } }]
  }).populate("category", "name slug");
  if (!post) {
    res.status(404);
    throw new Error("Blog post not found");
  }
  res.json(post);
});
