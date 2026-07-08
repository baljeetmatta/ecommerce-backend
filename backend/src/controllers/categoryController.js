import Category from "../models/Category.js";
import asyncHandler from "../utils/asyncHandler.js";

const slugify = (value) =>
  value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");

export const listCategories = asyncHandler(async (_req, res) => {
  const categories = await Category.find().populate("parent", "name slug").sort({ name: 1 });
  res.json(categories);
});

export const createCategory = asyncHandler(async (req, res) => {
  const { name, slug, parent, description, imageUrl, isActive } = req.body;
  const category = await Category.create({
    name,
    slug: slug ? slugify(slug) : slugify(name),
    parent: parent || null,
    description,
    imageUrl,
    isActive
  });

  res.status(201).json(category);
});

export const updateCategory = asyncHandler(async (req, res) => {
  const payload = { ...req.body };
  if (payload.slug) payload.slug = slugify(payload.slug);
  if (payload.parent === "") payload.parent = null;

  const category = await Category.findByIdAndUpdate(req.params.id, payload, {
    new: true,
    runValidators: true
  }).populate("parent", "name slug");

  if (!category) {
    res.status(404);
    throw new Error("Category not found");
  }

  res.json(category);
});

export const deleteCategory = asyncHandler(async (req, res) => {
  const category = await Category.findByIdAndDelete(req.params.id);
  if (!category) {
    res.status(404);
    throw new Error("Category not found");
  }
  res.json({ message: "Category deleted", id: req.params.id });
});
