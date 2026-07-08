import bcrypt from "bcryptjs";
import mongoose from "mongoose";

const customerSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    password: { type: String, minlength: 8, select: false },
    phone: String,
    status: { type: String, enum: ["active", "vip", "at-risk", "blocked"], default: "active" },
    storeCredit: { type: Number, default: 0, min: 0 },
    notes: String,
    addresses: [
      {
        label: String,
        line1: String,
        city: String,
        state: String,
        postalCode: String,
        country: String
      }
    ],
    tags: [{ type: String }]
  },
  { timestamps: true }
);

customerSchema.pre("save", async function hashPassword(next) {
  if (!this.isModified("password") || !this.password) return next();
  this.password = await bcrypt.hash(this.password, 12);
  next();
});

customerSchema.methods.matchPassword = function matchPassword(password) {
  if (!this.password) return false;
  return bcrypt.compare(password, this.password);
};

export default mongoose.model("Customer", customerSchema);
