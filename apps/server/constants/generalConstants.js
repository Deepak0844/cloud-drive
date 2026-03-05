/**
 * Item types in the system
 */
export const ItemTypes = {
  FILE: "file",
  FOLDER: "folder",
};

/**
 * Socket.io event names
 */
export const SocketEvents = {
  NOTIFICATION: "notification",
  QUOTA_UPDATE: "QUOTA_UPDATE",
  ITEM_BULK_CHANGE: "ITEM_BULK_CHANGE",
  QUOTA_REQUEST: "QUOTA_REQUEST",
};

/**
 * Notification types
 */
export const NotificationTypes = {
  QUOTA_APPROVED: "QUOTA_APPROVED",
  QUOTA_REJECTED: "QUOTA_REJECTED",
  QUOTA_REQUEST: "QUOTA_REQUEST",
  QUOTA_CHANGE: "QUOTA_CHANGE",
  SYSTEM_ALERT: "SYSTEM_ALERT",
  STORAGE_ALERT: "STORAGE_ALERT",
  SECURITY_ALERT: "SECURITY_ALERT",
  UPLOAD_COMPLETE: "UPLOAD_COMPLETE",
  TRASH_CLEANUP: "TRASH_CLEANUP",
};

/**
 * Quota request statuses
 */
export const QuotaStatus = {
  PENDING: "PENDING",
  APPROVED: "APPROVED",
  REJECTED: "REJECTED",
};

/**
 * User Roles
 */
export const Roles = {
  ADMIN: "ADMIN",
  USER: "USER",
};

/**
 * HTTP Status Codes
 */
export const StatusCodes = {
  OK: 200,
  CREATED: 201,
  PARTIAL_CONTENT: 206,
  NO_CONTENT: 204,
  ACCEPTED: 202,
  BAD_REQUEST: 400,
  UNAUTHORIZED: 401,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  UNPROCESSABLE_ENTITY: 422,
  INTERNAL_SERVER_ERROR: 500,
};

/**
 * Common Error Messages
 */
export const ErrorMessages = {
  SERVER_ERROR: "Server Error",
  NOT_AUTHORIZED: "Not authorized to access this route",
  INVALID_CREDENTIALS: "Invalid credentials",
  USER_NOT_FOUND: "User not found",
  UPLOAD_NOT_FOUND: "Upload session not found",
  NO_CHUNKS_FOUND: "No chunks found for this upload",
  FILE_NOT_FOUND: "File not found",
  FOLDER_NOT_FOUND: "Folder not found",
  QUOTA_EXCEEDED: "Storage quota exceeded",
  INVALID_STATUS: "Invalid status",
  TOKEN_REQUIRED: "Token is required",
  INVALID_TOKEN: "Invalid or expired token",
  EMAIL_NOT_SENT: "Email could not be sent",
  RESOURCE_NOT_FOUND: "Resource not found",
  NOT_FOUND: "Resource not found",
  NOTIFICATION_NOT_FOUND: "Notification not found",
  QUOTA_REQUEST_NOT_FOUND: "Quota request not found",
  REQUEST_ALREADY_PROCESSED: "Request already processed",
  ITEM_NOT_FOUND: "Item not found",
  BAD_REQUEST: "Please provide required fields",
  NO_CHUNK_FILE: "No chunk file provided",
  INVALID_CHUNK_PARAMETERS: "Invalid chunk upload parameters",
  USER_ALREADY_EXISTS: "User with this email already exists",
  ACCOUNT_DEACTIVATED: "Your account has been deactivated",
  FILE_REQUIRED: "Please upload a file",
  PHYSICAL_FILE_NOT_FOUND: "Physical file not found on server",
  THUMBNAIL_FAILED: "Thumbnail generation failed",
  THUMBNAIL_NOT_AVAILABLE: "Thumbnail not available",
  FOLDER_ALREADY_EXISTS: "Folder with this name already exists",
  TOKEN_EXPIRED: "Your session has expired, please log in again",
  FILE_TYPE_NOT_ALLOWED: "This file type is not allowed",
  INVALID_MOVE: "Cannot move a folder into itself or its own descendant",
};

/**
 * Common Success Messages
 */
export const SuccessMessages = {
  REGISTRATION_SUCCESS: "User registered successfully",
  LOGIN_SUCCESS: "Logged in successfully",
  LOGOUT_SUCCESS: "Logged out successfully",
  QUOTA_REQUEST_SUBMITTED: "Quota request submitted successfully.",
  NOTIFICATIONS_MARKED_READ: "All notifications marked as read",
  PUSH_TOKEN_REGISTERED: "Push token registered successfully",
  TRASH_EMPTIED: "Trash emptied successfully",
};
