// Shared Constants for Cloud Drive

export const STORAGE = {
  TOTAL_QUOTA_GB: 2,
  MAX_FILE_SIZE_MB: 100,
  WARN_THRESHOLD_PERCENT: 80,
  DANGER_THRESHOLD_PERCENT: 95,
};

// Re-exports
export { HttpStatus, HttpMethods, HttpHeaders, HttpContentTypes } from "./httpConstants.js";
export { PAGINATION, TIMEOUTS, ItemTypes, Roles, QuotaStatus } from "./generalConstants.js";
