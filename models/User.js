const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");
const { userRoles } = require("../constants/enum");

const userSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    email: { type: String, required: true, unique: true },
    password: { type: String, required: true },
    phone: { type: String, required: true },
    address: { type: String },
    nationalId: { type: String },
    gender: { type: String, enum: ["male", "female"], required: true },
    role: {
      type: String,
      enum: userRoles,
      default: "user",
    },
    image: { type: String, default: "" },
    isVerified: { type: Boolean, default: false },
  },
  {
    timestamps: true,
  }
);

userSchema.pre("save", async function (next) {
  if (!this.isModified("password")) return next();
  this.password = await bcrypt.hash(this.password, 12);
  next();
});

module.exports = mongoose.model("User", userSchema);
