import jwt from "jsonwebtoken";

export const createToken = (user, options = {}) =>
  jwt.sign(
    {
      id: user._id,
      role: user.role,
      ...(options.claims || {})
    },
    process.env.JWT_SECRET,
    { expiresIn: options.expiresIn || process.env.JWT_EXPIRES_IN || "7d" }
  );
