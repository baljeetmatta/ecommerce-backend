import TaxCategory from "../models/TaxCategory.js";
import asyncHandler from "../utils/asyncHandler.js";

export const listTaxCategories = asyncHandler(async (_req, res) => {
  const taxCategories = await TaxCategory.find().sort({ name: 1 });
  res.json(taxCategories);
});

export const createTaxCategory = asyncHandler(async (req, res) => {
  const taxCategory = await TaxCategory.create(req.body);
  res.status(201).json(taxCategory);
});

export const updateTaxCategory = asyncHandler(async (req, res) => {
  const taxCategory = await TaxCategory.findByIdAndUpdate(req.params.id, req.body, {
    new: true,
    runValidators: true
  });

  if (!taxCategory) {
    res.status(404);
    throw new Error("Tax category not found");
  }

  res.json(taxCategory);
});

export const deleteTaxCategory = asyncHandler(async (req, res) => {
  const taxCategory = await TaxCategory.findByIdAndDelete(req.params.id);
  if (!taxCategory) {
    res.status(404);
    throw new Error("Tax category not found");
  }
  res.json({ message: "Tax category deleted", id: req.params.id });
});
