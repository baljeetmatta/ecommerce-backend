import bcrypt from "bcryptjs";
import mongoose from "mongoose";

const userSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    password: { type: String, required: true, minlength: 8, select: false },
    role: {
      type: String,
      enum: ["Super Admin", "Team Leader", "Staff", "Inventory Clerk", "Customer Support", "Marketing Manager", "Analyst"],
      default: "Customer Support"
    },
    permissions: [{ type: String }],
    employeeCode: { type: String, unique: true, sparse: true, uppercase: true, trim: true },
    phone: { type: String, trim: true },
    mobile: { type: String, trim: true },
    address: { type: String, trim: true },
    city: { type: String, trim: true },
    state: { type: String, trim: true },
    pinCode: { type: String, trim: true },
    designation: { type: String, trim: true },
    joiningDate: Date,
    isActive: { type: Boolean, default: true },
    passwordResetToken: { type: String, select: false },
    passwordResetExpires: { type: Date, select: false }
  },
  { timestamps: true }
);

userSchema.pre("save", async function hashPassword(next) {
  if (!this.isModified("password")) return next();
  this.password = await bcrypt.hash(this.password, 12);
  next();
});

userSchema.methods.matchPassword = function matchPassword(password) {
  return bcrypt.compare(password, this.password);
};

export default mongoose.model("User", userSchema);
