import express from "express";

// Controllers
import {
  deleteAllNotifications,
  deleteNotification,
  getNotifications,
  markAllAsRead,
  markAsRead,
  registerPushToken,
  registerWebPushSubscription,
} from "#controllers/notificationController.js";

// Middleware
import { protect } from "#middlewares/auth.js";
import validate from "#middlewares/validate.js";

// Schemas
import { registerPushTokenSchema, notificationIdParamSchema, webPushSubscribeSchema } from "#schemas/common.schema.js";

const router = express.Router();

// All routes are protected
router.use(protect);

router.get("/", getNotifications);
router.delete("/", deleteAllNotifications);
router.patch("/read-all", markAllAsRead);
router.patch("/:id/read", validate(notificationIdParamSchema), markAsRead);
router.delete("/:id", validate(notificationIdParamSchema), deleteNotification);
router.post("/push-token", validate(registerPushTokenSchema), registerPushToken);
router.post("/web-push-subscribe", validate(webPushSubscribeSchema), registerWebPushSubscription);

export default router;
