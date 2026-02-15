import express from "express";

// Controllers
import { forgotPassword, getMe, login, logout, register, resetPassword } from "../controllers/auth.controller.js";

// Middleware
import { protect } from "../middleware/auth.js";

const router = express.Router();

// Public routes
router.post("/register", register);
router.post("/login", login);
router.post("/logout", logout);
router.post("/forgot-password", forgotPassword);
router.put("/reset-password", resetPassword);

// Protected routes
router.get("/me", protect, getMe);

export default router;
