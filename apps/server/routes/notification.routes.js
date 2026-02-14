import express from "express";

// Controllers
import {
  getNotifications,
  markAsRead,
  markAllAsRead,
  registerPushToken,
} from "../controllers/notification.controller.js";

// Middleware
import { protect } from "../middleware/auth.js";

const router = express.Router();

router.use(protect);

router.get("/", getNotifications);
router.patch("/read-all", markAllAsRead);
router.patch("/:id/read", markAsRead);
router.post("/push-token", registerPushToken);

export default router;
