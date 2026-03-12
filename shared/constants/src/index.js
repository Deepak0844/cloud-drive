// Shared Constants for Cloud Drive

export const STORAGE = {
  TOTAL_QUOTA_GB: 2,
  MAX_FILE_SIZE_MB: 100,
  WARN_THRESHOLD_PERCENT: 80,
  DANGER_THRESHOLD_PERCENT: 95,
};

// Re-exports
export { HttpStatus, HttpMethods, HttpHeaders, HttpContentTypes } from "./httpConstants.js";
export {
  DefaultPagination,
  TIMEOUTS,
  ItemTypes,
  Roles,
  QuotaStatus,
  STORAGE_KEYS,
  ICON_SIZE,
  NotificationTypes,
  QUERY_PARAMS_KEYS,
  FileCategories,
  BulkActions,
  UPLOAD_CHUNK_SIZE,
  ByteMultipliers,
  SPEED_WINDOW_MS,
  UPLOAD_COMPLETE_DELAY_MS,
  PERCENTAGE_MULTIPLIER,
  DefaultSort,
} from "./generalConstants.js";
