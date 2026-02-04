import express from "express";

// Middleware
import { protect } from "../middleware/auth.js";

// Controllers
import { register, login, getMe, forgotPassword, resetPassword, logout } from "../controllers/auth.controller.js";

const router = express.Router();

// @route
router.post("/register", register);
router.post("/login", login);
router.post("/logout", logout);
router.post("/forgot-password", forgotPassword);
router.put("/reset-password", resetPassword);
router.get("/me", protect, getMe);

export default router;
