/**
 * Pagination Defaults
 */
export const STORAGE_KEYS = {
  TOKEN: "AuthToken",
  USER: "User",
};

/**
 * Pagination Defaults
 */
export const DefaultPagination = {
  pageNumber: 1,
  pageSize: 20,
  totalCount: 0,
  maxPageSize: 1000,
};

/**
 * Query Parameter Keys
 */
export const QUERY_PARAMS_KEYS = {
  PAGE_NO: "pn",
  PAGE_SIZE: "ps",
  SEARCH: "q",
  SORT_BY: "sb",
  SORT_ORDER: "so",
  CATEGORY: "cat",
  START_DATE: "sd",
  END_DATE: "ed",
  MIN_SIZE: "min",
  MAX_SIZE: "max",
  TAG: "tag",
  FOLDER_ID: "folder",
};

/**
 * Timeout Durations (milliseconds)
 */
export const TIMEOUTS = {
  DEBOUNCE_MS: 300,
  API_REQUEST_MS: 10000,
  TOAST_MS: 3000,
  TOAST_PERSIST_MS: 5000,
  NOTIFICATION_POLL_MS: 60000,
  DOUBLE_CLICK_MS: 250,
};

/**
 * Item Types
 */
export const ItemTypes = {
  FILE: "file",
  FOLDER: "folder",
};

/**
 * User Roles
 */
export const Roles = {
  ADMIN: "ADMIN",
  USER: "USER",
};

/**
 * Quota Request Statuses
 */
export const QuotaStatus = {
  PENDING: "PENDING",
  APPROVED: "APPROVED",
  REJECTED: "REJECTED",
};

/**
 * Notification Types
 */
export const NotificationTypes = {
  STORAGE_ALERT: "STORAGE_ALERT",
  SECURITY_ALERT: "SECURITY_ALERT",
  QUOTA_APPROVED: "QUOTA_APPROVED",
  QUOTA_REJECTED: "QUOTA_REJECTED",
  QUOTA_CHANGE: "QUOTA_CHANGE",
  QUOTA_REQUEST: "QUOTA_REQUEST",
  TRASH_CLEANUP: "TRASH_CLEANUP",
  SYSTEM_ALERT: "SYSTEM_ALERT",
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
 * Icon Sizes
 */
export const ICON_SIZE = {
  small: 16,
  medium: 20,
  large: 24,
  xlarge: 32,
};
/**
 * File Upload Constants
 */
export const UPLOAD_CHUNK_SIZE = 10 * 1000 * 1000; // 10 MB

/**
 * Byte conversion multipliers
 */
export const ByteMultipliers = {
  KB: 1000,
  MB: 1000 * 1000,
  GB: 1000 * 1000 * 1000,
};

/**
 * Speed calculation window for upload progress (ms)
 */
export const SPEED_WINDOW_MS = 5000;

/**
 * Delay before removing completed upload items (ms)
 */
export const UPLOAD_COMPLETE_DELAY_MS = 3000;

/**
 * Percentage multiplier
 */
export const PERCENTAGE_MULTIPLIER = 100;

/**
 * Default sort configuration
 */
export const DefaultSort = {
  FIELD: "updatedAt",
  ORDER: "desc",
};
