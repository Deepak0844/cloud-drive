import express from "express";

// Controllers
import { getNotifications, markAllAsRead, markAsRead, registerPushToken } from "#controllers/notificationController.js";

// Middleware
import { protect } from "#middlewares/auth.js";
import validate from "#middlewares/validate.js";

// Schemas
import { registerPushTokenSchema, notificationIdParamSchema } from "#schemas/common.schema.js";

const router = express.Router();

// All routes are protected
router.use(protect);

router.get("/", getNotifications);
router.patch("/read-all", markAllAsRead);
router.patch("/:id/read", validate(notificationIdParamSchema), markAsRead);
router.post("/push-token", validate(registerPushTokenSchema), registerPushToken);

export default router;
