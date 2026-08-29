export const containsDataUrl = (value) => {
  if (typeof value === "string") return value.startsWith("data:");
  if (Array.isArray(value)) return value.some(containsDataUrl);
  if (value && typeof value === "object") return Object.values(value).some(containsDataUrl);
  return false;
};

export const rejectEmbeddedMedia = (schema, fields) => {
  schema.pre("validate", function validateServerMedia(next) {
    const document = this.toObject({ depopulate: true, virtuals: false });
    const changedFields = this.isNew ? fields : fields.filter((field) => this.isModified(field));
    const invalidField = changedFields.find((field) => containsDataUrl(field.split(".").reduce((value, key) => value?.[key], document)));
    if (invalidField) this.invalidate(invalidField, "Images and documents must be uploaded as server files, not embedded Base64 data.");
    next();
  });
};
