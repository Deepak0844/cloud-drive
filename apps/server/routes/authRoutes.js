import express from "express";

// Controllers
import { getMe, login, logout, register, updateProfile } from "../controllers/authController.js";
import { forgotPassword, resetPassword, updatePassword } from "../controllers/passwordController.js";

// Middleware
import { protect } from "../middlewares/auth.js";
import validate from "../middlewares/validate.js";

// Schemas
import {
  forgotPasswordSchema,
  loginSchema,
  registerSchema,
  resetPasswordSchema,
  updateProfileSchema,
  updatePasswordSchema,
} from "../schemas/auth.schema.js";

const router = express.Router();

// Public routes
router.post("/register", validate(registerSchema), register);
router.post("/login", validate(loginSchema), login);
router.post("/logout", logout);
router.post("/forgot-password", validate(forgotPasswordSchema), forgotPassword);
router.put("/reset-password", validate(resetPasswordSchema), resetPassword);

// Protected routes
router.get("/me", protect, getMe);
router.put("/me", protect, validate(updateProfileSchema), updateProfile);
router.put("/password", protect, validate(updatePasswordSchema), updatePassword);

export default router;
