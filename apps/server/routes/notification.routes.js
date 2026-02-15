import express from "express";

// Controllers
import {
  getNotifications,
  markAllAsRead,
  markAsRead,
  registerPushToken,
} from "../controllers/notification.controller.js";

// Middleware
import { protect } from "../middleware/auth.js";

const router = express.Router();

// All routes are protected
router.use(protect);

router.get("/", getNotifications);
router.patch("/read-all", markAllAsRead);
router.patch("/:id/read", markAsRead);
router.post("/push-token", registerPushToken);

export default router;
