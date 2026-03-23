// Services
import NotificationService from "#services/notificationService.js";

// Constants
import { SuccessMessages } from "#constants/generalConstants.js";

// Middleware
import asyncHandler from "#middlewares/asyncHandler.js";

// Utils
import ResponseUtils from "#utils/responseUtils.js";

/**
 * @desc    Get user notifications
 * @route   GET /api/v1/notifications
 * @access  Private
 */
export const getNotifications = asyncHandler(async (req, res) => {
  const result = await NotificationService.getNotifications(req.user.id, req.query);
  return ResponseUtils.success(res, result);
});

/**
 * @desc    Mark notification as read
 * @route   PATCH /api/v1/notifications/:id/read
 * @access  Private
 */
export const markAsRead = asyncHandler(async (req, res) => {
  const notification = await NotificationService.markAsRead(req.params.id, req.user.id);
  return ResponseUtils.success(res, notification);
});

/**
 * @desc    Mark all notifications as read
 * @route   PATCH /api/v1/notifications/read-all
 * @access  Private
 */
export const markAllAsRead = asyncHandler(async (req, res) => {
  await NotificationService.markAllAsRead(req.user.id);
  return ResponseUtils.success(res, { message: SuccessMessages.NOTIFICATIONS_MARKED_READ });
});

/**
 * @desc    Delete a single notification
 * @route   DELETE /api/v1/notifications/:id
 * @access  Private
 */
export const deleteNotification = asyncHandler(async (req, res) => {
  await NotificationService.deleteNotification(req.params.id, req.user.id);
  return ResponseUtils.success(res, { message: SuccessMessages.NOTIFICATION_DELETED });
});

/**
 * @desc    Delete all notifications for the current user
 * @route   DELETE /api/v1/notifications
 * @access  Private
 */
export const deleteAllNotifications = asyncHandler(async (req, res) => {
  await NotificationService.deleteAllNotifications(req.user.id);
  return ResponseUtils.success(res, { message: SuccessMessages.ALL_NOTIFICATIONS_DELETED });
});

export const registerPushToken = asyncHandler(async (req, res) => {
  await NotificationService.registerPushToken(req.user.id, req.body.token);
  return ResponseUtils.success(res, { message: SuccessMessages.PUSH_TOKEN_REGISTERED });
});
