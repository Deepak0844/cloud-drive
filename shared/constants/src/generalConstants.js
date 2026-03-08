/**
 * Pagination Defaults
 */
export const PAGINATION = {
  DEFAULT_PAGE: 1,
  DEFAULT_PAGE_SIZE: 20,
  MAX_PAGE_SIZE: 100,
};

/**
 * Timeout Durations (milliseconds)
 */
export const TIMEOUTS = {
  DEBOUNCE_MS: 300,
  API_REQUEST_MS: 10000,
  TOAST_MS: 3000,
  NOTIFICATION_POLL_MS: 60000,
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
