import mongoose from "mongoose";
import bcrypt from "bcryptjs";

// Config
import Env from "../config/env.js";

// Constants
import Roles from "../constants/roles.js";

const userSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      trim: true,
    },
    email: {
      type: String,
      required: [true, "Please provide an email"],
      unique: true,
      lowercase: true,
      match: [/^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,10})+$/, "Please provide a valid email"],
      index: true,
    },
    password: {
      type: String,
      required: [true, "Please provide a password"],
      minlength: 6,
      select: false,
    },
    role: {
      type: String,
      enum: [Roles.USER, Roles.ADMIN],
      default: Roles.USER,
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
        trim: true,
      },
    ],
    is_active: {
      type: Boolean,
      default: true,
    },
  },
  { timestamps: true }
);

userSchema.pre("save", async function () {
  if (!this.isModified("password")) {
    return;
  }

  this.password = await bcrypt.hash(this.password, 10);
});

userSchema.methods.matchPassword = function (enteredPassword) {
  return bcrypt.compare(enteredPassword, this.password);
};

export default mongoose.model("User", userSchema);
