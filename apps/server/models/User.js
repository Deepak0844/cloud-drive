import mongoose from "mongoose";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import crypto from "crypto";

// Config
import Env from "../config/env.js";

// Constants
import { Roles } from "@shared-constants/constants";

const userSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      trim: true,
    },
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
    },
    password: {
      type: String,
      required: true,
      minlength: 6,
      select: false,
    },
    role: {
      type: String,
      enum: Object.values(Roles),
      default: Roles.USER,
    },
    is_active: {
      type: Boolean,
      default: true,
    },
    quota_bytes: {
      type: Number,
      default: Env.DEFAULT_QUOTA_BYTES,
      min: 0,
    },
    used_bytes: {
      type: Number,
      default: 0,
      min: 0,
    },
    push_tokens: [
      {
        type: String,
      },
    ],
    notification_preferences: {
      email_notifications: { type: Boolean, default: true },
      storage_alerts: { type: Boolean, default: true },
      security_alerts: { type: Boolean, default: true },
    },
    preferences: {},
    resetPasswordToken: String,
    resetPasswordExpire: Date,
  },
  { timestamps: true }
);

// Encrypt password using bcrypt
userSchema.pre("save", async function () {
  if (!this.isModified("password")) {
    return;
  }

  const salt = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(this.password, salt);
});

// Sign JWT and return
userSchema.methods.getSignedJwtToken = function () {
  return jwt.sign({ id: this._id }, Env.JWT_SECRET, {
    expiresIn: Env.JWT_EXPIRES_IN,
  });
};

// Match user entered password to hashed password in database
userSchema.methods.matchPassword = function (enteredPassword) {
  return bcrypt.compare(enteredPassword, this.password);
};

// Generate and hash password token
userSchema.methods.getResetPasswordToken = function () {
  // Generate token
  const resetToken = crypto.randomBytes(20).toString("hex");

  // Hash token and set to resetPasswordToken field
  this.resetPasswordToken = crypto.createHash("sha256").update(resetToken).digest("hex");

  // Set expire
  this.resetPasswordExpire = Date.now() + 10 * 60 * 1000; // 10 minutes

  return resetToken;
};

// Find user by plain reset password token
userSchema.statics.findByResetToken = function (resetToken) {
  // Hash token
  const hashedToken = crypto.createHash("sha256").update(resetToken).digest("hex");

  // Find user and check expiry
  return this.findOne({
    resetPasswordToken: hashedToken,
    resetPasswordExpire: { $gt: Date.now() },
  });
};

export default mongoose.model("User", userSchema);
