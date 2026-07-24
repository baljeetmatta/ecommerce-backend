export const containsDataUrl = (value) => {
  if (typeof value === "string") return value.startsWith("data:");
  if (Array.isArray(value)) return value.some(containsDataUrl);
  if (value && typeof value === "object") return Object.values(value).some(containsDataUrl);
  return false;
};

export const rejectEmbeddedMedia = (schema, fields) => {
  schema.pre("validate", function validateServerMedia(next) {
    const document = this.toObject({ depopulate: true, virtuals: false });
    const values = fields.map((field) => field.split(".").reduce((value, key) => value?.[key], document));
    if (containsDataUrl(values)) this.invalidate(fields[0], "Images and documents must be uploaded as server files, not embedded Base64 data.");
    next();
  });
};
