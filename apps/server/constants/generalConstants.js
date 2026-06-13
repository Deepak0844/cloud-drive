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
  INVALID_PAYLOAD_FORMAT: "Invalid payload format",
  NO_ITEMS_SELECTED: "No items selected for download",
  NO_VALID_FILES: "No valid files found for download",
  MEDIA_METADATA_FAILED: "Could not read media file metadata",
  INVALID_SEGMENT: "Invalid segment identifier",
  PLAYBACK_TYPE_UNSUPPORTED: "Playback info is only available for video and audio files",
  UNKNOWN_ERROR: "Unknown error",
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
  FILE_TOUCHED: "File touched",
  STORAGE_ANALYSIS_COMPLETE: "Full deep storage re-analysis completed successfully",
};

/**
 * Notification & email content strings
 * Used by services that create notifications or send emails.
 */
export const NotificationMessages = {
  QUOTA_INCREASED: "Quota Increased",
  QUOTA_DECREASED: "Quota Decreased",
  QUOTA_REQUEST_APPROVED: "Quota Request Approved",
  QUOTA_REQUEST_REJECTED: "Quota Request Rejected",
  TRASH_CLEANUP_COMPLETE: "Trash Cleanup Complete",
  STORAGE_ALMOST_FULL: "Storage Almost Full",
  DUPLICATE_FILES_FOUND: "Duplicate Files Found",
  WELCOME_SUBJECT: "Welcome to Cloud Drive!",
  NEW_LOGIN_TITLE: "New login to your Cloud Drive account",
  NEW_LOGIN_BODY:
    "We noticed a new login to your Cloud Drive account. If this was you, you can safely ignore this email. If you did not log in, please reset your password immediately and contact support.",
  TRASH_EMAIL_SUBJECT: "Your storage has been optimized 🧹",
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

  // ── Session-based transcoding (see work/plans/2026-06-11-robust-hls-streaming.md) ──
  MAX_CONCURRENT_TRANSCODE_SESSIONS: 2, // Pi-safe cap on live ffmpeg sessions
  SEGMENT_WAIT_MS: 25_000, // bounded wait before returning 503; cold-start headroom for one segment on a Pi
  SEGMENT_POLL_MS: 250, // cache-dir poll interval while waiting for a segment
  LOOKAHEAD_SEGMENTS: 4, // how far ahead of highestWritten a request still waits vs. restarts the session
  SESSION_IDLE_TIMEOUT_MS: 60_000, // kill a session with no segment access for 60s
  SESSION_REAP_INTERVAL_MS: 15_000, // idle-reaper tick interval
  TRANSCODE_PRESET: "veryfast", // libx264 preset — keeps a Pi closer to realtime than "fast"
  // Note: source resolution is preserved (no downscale) per ratified sub-decision §7.1;
  // sessions only normalize to even dimensions, which libx264 requires.
};

/**
 * Default notification fallback values
 */
export const NotificationDefaults = {
  USED_PERCENTAGE: "80",
  TOTAL_QUOTA: "10GB",
};

/**
 * Media processing constants — thumbnail dimensions, quality levels, and transcode settings.
 * Centralised here so changing a single value updates all thumbnail/transcode code paths.
 */
export const MediaProcessing = {
  // Thumbnail output — square JPEG at this dimension (pixels)
  THUMBNAIL_SIZE: 300,
  // sharp JPEG quality (0-100)
  THUMBNAIL_JPEG_QUALITY: 85,
  // heic-convert quality (0-1 float)
  HEIC_CONVERT_QUALITY: 0.85,
  // Maximum stdout buffer for execFile ffmpeg calls (10 MB)
  FFMPEG_MAX_BUFFER: 10 * 1024 * 1024,
  // Timeout for external thumbnailer processes (ms)
  FFMPEG_TIMEOUT_MS: 15000,
  // Minimum size (bytes) for a JPEG to be considered valid (rejects black frames)
  MIN_VALID_JPEG_BYTES: 2000,
  // Fraction of video duration to seek for thumbnail
  VIDEO_SEEK_FRACTION: 0.1,
  // Floor seek time (seconds) — avoid pure black intro frames
  VIDEO_SEEK_MIN_S: 0.5,
  // Ceiling seek time (seconds) — avoid nearly-end credits
  VIDEO_SEEK_MAX_S: 30,
  // H.264 Constant Rate Factor (lower = better quality, larger file; 23 = visually lossless)
  TRANSCODE_CRF: "23",
  // Audio bitrate for all transcode outputs
  TRANSCODE_AUDIO_BITRATE: "128k",
  // Timeout for the moov-atom relocation pass (5 minutes — large files can be slow)
  MOOV_RELOCATION_TIMEOUT_MS: 300_000,
};
