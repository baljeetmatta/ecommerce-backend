import { api } from "../services/api.js";

export const optimizeImage = async (file, options = {}) => {
  const uploaded = await api.uploadImage(file, options.purpose || "general");
  return { ...uploaded, name: file.name };
};
