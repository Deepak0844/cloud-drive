/**
 * RTK Query Cache Tag Types
 */
export const TagTypes = {
  FILES: "Files",
  FOLDERS: "Folders",
  AUTH: "Auth",
  TRASH: "Trash",
  NOTIFICATIONS: "Notifications",
  ADMIN_USERS: "AdminUsers",
  ADMIN_STATS: "AdminStats",
  ADMIN_QUOTA_REQUESTS: "AdminQuotaRequests",
  QUOTA: "Quota",
};

/**
 * RTK Query Cache Tag Sub-IDs
 * Used to identify specific list variations or state segments (e.g., recent files, components inside a folder, etc.)
 */
export const TagIds = {
  LIST: "LIST",
  RECENT: "RECENT",
  CONTENTS: "CONTENTS",
};
