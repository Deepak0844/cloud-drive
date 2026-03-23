/**
 * Socket.io event names
 */
export const SocketEvents = {
  NOTIFICATION: "notification",
  QUOTA_UPDATE: "QUOTA_UPDATE",
  ITEM_BULK_CHANGE: "ITEM_BULK_CHANGE",
  QUOTA_REQUEST: "QUOTA_REQUEST",
  FILE_CHANGE: "FILE_CHANGE",
  FOLDER_CHANGE: "FOLDER_CHANGE",
  STORAGE_SYNC_COMPLETE: "STORAGE_SYNC_COMPLETE",
  HARDWARE_STATS: "HARDWARE_STATS",
};

/**
 * System monitor configuration
 */
export const SystemMonitor = {
  STATS_INTERVAL_MS: 5000, // push hardware stats to admins every 5 seconds
};

/**
 * Socket action types sent inside event payloads
 */
export const SocketActions = {
  CREATE: "CREATE",
  RENAME: "RENAME",
  MOVE: "MOVE",
  COPY: "COPY",
  DELETE: "DELETE",
  BULK_DELETE: "BULK_DELETE",
  RESTORE: "RESTORE",
  PERMANENT_DELETE: "PERMANENT_DELETE",
  EMPTY_TRASH: "EMPTY_TRASH",
  UPLOAD: "UPLOAD",
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
  ALREADY_PENDING_REQUEST: "You already have a pending quota request",
  TOKEN_EXPIRED: "Your session has expired, please log in again",
  FILE_TYPE_NOT_ALLOWED: "This file type is not allowed",
  INVALID_MOVE: "Cannot move a folder into itself or its own descendant",
  ENCRYPTION_KEYS_MISSING: "Encryption keys missing",
  PREVIEW_NOT_SUPPORTED: "Preview not supported for this file type",
  STREAMING_NOT_SUPPORTED: "Streaming not supported for this file type",
  INCORRECT_PASSWORD: "Incorrect current password",
  CHUNK_HASH_MISMATCH: "Chunk integrity check failed: hash mismatch",
  UPLOAD_SIZE_MISMATCH: "File assembly failed: size mismatch",
  UPLOAD_FINALIZE_FAILED: "Failed to finalize upload",
};

/**
 * Common Success Messages
 */
export const SuccessMessages = {
  REGISTRATION_SUCCESS: "User registered successfully",
  LOGIN_SUCCESS: "Logged in successfully",
  LOGOUT_SUCCESS: "Logged out successfully",
  PROFILE_LOADED: "User profile loaded successfully",
  PROFILE_UPDATED: "User profile updated successfully",
  FOLDER_LOADED: "Folder details retrieved successfully",
  FOLDERS_LOADED: "Folders retrieved successfully",
  FOLDER_CONTENTS_LOADED: "Folder contents retrieved successfully",
  FOLDER_CREATED: "Folder created successfully",
  FOLDER_RENAMED: "Folder renamed successfully",
  FOLDER_MOVED: "Folder moved successfully",
  FOLDER_COPIED: "Folder copied successfully",
  FOLDER_DELETED: "Folder moved to trash",
  FOLDER_TAGS_UPDATED: "Folder tags updated successfully",
  FAVORITE_TOGGLED: "Favorite status updated",
  QUOTA_REQUEST_SUBMITTED: "Quota request submitted successfully.",
  NOTIFICATIONS_MARKED_READ: "All notifications marked as read",
  NOTIFICATION_DELETED: "Notification deleted",
  ALL_NOTIFICATIONS_DELETED: "All notifications deleted",
  TRASH_EMPTIED: "Trash emptied successfully",
  PUSH_TOKEN_REGISTERED: "Push token registered successfully",
  PASSWORD_UPDATED: "Password updated successfully",
  PASSWORD_RESET: "Password reset success",
  FILE_TRASHED: "File moved to trash",
  ITEMS_TRASHED: "Items moved to trash",
  ITEMS_MOVED: "Items moved successfully",
  ITEMS_COPIED: "Items copied successfully",
  ITEMS_RESTORED: "Items restored successfully",
  ITEMS_PERMANENTLY_DELETED: "Items permanently deleted",
  TRASH_ALREADY_EMPTY: "Trash is already empty",
};

/**
 * File Categories
 */
export const FileCategories = {
  IMAGE: "image",
  VIDEO: "video",
  AUDIO: "audio",
  DOCUMENT: "document",
  ARCHIVE: "archive",
  OTHER: "other",
};

/**
 * Video Constants
 */
export const VideoMimeTypes = {
  MP4: "video/mp4",
  WEBM: "video/webm",
  QUICKTIME: "video/quicktime",
  M4V: "video/x-m4v",
};

export const VideoExtensions = {
  MP4: "mp4",
  MOV: "mov",
  WEBM: "webm",
  M4V: "m4v",
};

/**
 * Bulk Actions
 */
export const BulkActions = {
  DELETE: "delete",
  RESTORE: "restore",
  PERMANENT_DELETE: "permanent_delete",
  MOVE: "move",
  COPY: "copy",
};

/**
 * Auth / Cookie Constants
 */
export const AUTH_COOKIE_NAME = "token";

export const CookieConfig = {
  HTTP_ONLY: true,
  SAME_SITE: "strict",
  MAX_AGE_MS: 7 * 24 * 60 * 60 * 1000, // 7 days
};

/**
 * HTTP Cache-Control durations (seconds)
 */
export const CacheDurations = {
  ONE_HOUR: 3600,
  ONE_DAY: 86400,
};

/**
 * HLS streaming configuration
 */
export const HlsConfig = {
  SEGMENT_DURATION: 6, // seconds per HLS segment
  CACHE_TTL_MS: 2 * 60 * 60 * 1000, // 2 hours TTL for cached segments
  MAX_CACHE_SIZE_BYTES: 2 * 1024 * 1024 * 1024, // 2 GB max cache
  CLEANUP_INTERVAL_MINUTES: 30, // background cleanup interval
  CACHE_SUBDIR: "hls-cache", // subdirectory under NAS_STORAGE_PATH
};

/**
 * Byte conversion multipliers
 */
export const ByteMultipliers = {
  KB: 1000,
  MB: 1000 * 1000,
  GB: 1000 * 1000 * 1000,
};

/**
 * Speed window cutoff for upload progress (ms)
 */
export const SPEED_WINDOW_MS = 5000;

/**
 * Default notification fallback values
 */
export const NotificationDefaults = {
  USED_PERCENTAGE: "80",
  TOTAL_QUOTA: "10GB",
};

/**
 * Percentage multiplier
 */
export const PERCENTAGE_MULTIPLIER = 100;
