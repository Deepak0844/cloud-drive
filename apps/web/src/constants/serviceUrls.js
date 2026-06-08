export const ApiBasePath = "/api/v1";

/**
 * Sentinel ID used to represent the root folder throughout the web app.
 */
export const ROOT_FOLDER_ID = "root";
const FilesBasePath = "/files";
const AuthBasePath = "/auth";
const FoldersBasePath = "/folders";
const AdminBasePath = "/admin";
const NotificationsBasePath = "/notifications";
const QuotaBasePath = "/quota";
const ItemsBasePath = "/items";
const TrashBasePath = "/trash";

// File Service Urls
export const FileServiceUrls = {
  getFileList: `${FilesBasePath}`,
  getRecentFileList: `${FilesBasePath}/recent`,
  initChunkedUpload: `${FilesBasePath}/upload/init`,
  finalizeChunkedUpload: `${FilesBasePath}/upload/finalize`,
  uploadFile: `${FilesBasePath}/upload`,
  deleteFile: `${FilesBasePath}/:id`,
  renameFile: `${FilesBasePath}/:id`,
  toggleFavorite: `${FilesBasePath}/:id/favorite`,
  moveFile: `${FilesBasePath}/:id/move`,
  copyFile: `${FilesBasePath}/:id/copy`,
  updateFileTags: `${FilesBasePath}/:id/tags`,
  touchFile: `${FilesBasePath}/:id/touch`,
  downloadFile: `${FilesBasePath}/:id/download`,
  preview: `${FilesBasePath}/:id/preview`,
  stream: `${FilesBasePath}/:id/stream`,
  thumbnail: `${FilesBasePath}/:id/preview?thumbnail=true`,
  playbackInfo: `${FilesBasePath}/:id/playback-info`,
  hlsPlaylist: `${FilesBasePath}/:id/hls/master.m3u8`,
  initUpload: `${FilesBasePath}/upload/init`,
  uploadChunk: `${FilesBasePath}/upload/chunk`,
  uploadChunkStatus: `${FilesBasePath}/upload/status`,
};

// Bulk Service Urls
export const BulkServiceUrls = {
  bulkDelete: `${FilesBasePath}/bulk-delete`,
  bulkMove: `${FilesBasePath}/bulk-move`,
  bulkCopy: `${FilesBasePath}/bulk-copy`,
  bulkDownload: `${FilesBasePath}/bulk-download`,
};

// Auth Service Urls
export const AuthServiceUrls = {
  login: `${AuthBasePath}/login`,
  register: `${AuthBasePath}/register`,
  logout: `${AuthBasePath}/logout`,
  getMe: `${AuthBasePath}/me`,
  updateProfile: `${AuthBasePath}/me`,
  updatePassword: `${AuthBasePath}/password`,
  forgotPassword: `${AuthBasePath}/forgot-password`,
  resetPassword: `${AuthBasePath}/reset-password`,
};

// Folder Service Urls
export const FolderServiceUrls = {
  getFolderList: `${FoldersBasePath}`,
  getRootFolderContents: `${FoldersBasePath}/root/contents`,
  getFolderContents: `${FoldersBasePath}/:id/contents`,
  getFolderDetails: `${FoldersBasePath}/:id`,
  createFolder: `${FoldersBasePath}`,
  renameFolder: `${FoldersBasePath}/:id`,
  deleteFolder: `${FoldersBasePath}/:id`,
  toggleFavorite: `${FoldersBasePath}/:id/favorite`,
  moveFolder: `${FoldersBasePath}/:id/move`,
  copyFolder: `${FoldersBasePath}/:id/copy`,
  updateFolderTags: `${FoldersBasePath}/:id/tags`,
};

// Admin Service Urls
export const AdminServiceUrls = {
  getUsers: `${AdminBasePath}/users`,
  updateUserQuota: `${AdminBasePath}/users/:id/quota`,
  updateUserStatus: `${AdminBasePath}/users/:id/status`,
  getSystemStats: `${AdminBasePath}/stats`,
  getAllQuotaRequests: `${AdminBasePath}/quota-requests`,
  handleQuotaRequest: `${AdminBasePath}/quota-requests/:id`,
  runStorageReanalysis: `${AdminBasePath}/storage/re-analyze`,
};

// Notification Service Urls
export const NotificationServiceUrls = {
  getNotificationList: `${NotificationsBasePath}`,
  markAsRead: `${NotificationsBasePath}/:id/read`,
  markAllAsRead: `${NotificationsBasePath}/read-all`,
};

// Quota Service Urls
export const QuotaServiceUrls = {
  getQuotaUsage: `${QuotaBasePath}/usage`,
  getQuotaBreakdown: `${QuotaBasePath}/breakdown`,
  requestQuotaIncrease: `${QuotaBasePath}/request`,
};

// Item Service Urls
export const ItemServiceUrls = {
  performBulkOperation: `${ItemsBasePath}/bulk-operation`,
};

// CSRF Service Urls
export const CsrfServiceUrls = {
  getToken: "/csrf-token",
};

// Trash Service Urls
export const TrashServiceUrls = {
  getTrashItems: `${TrashBasePath}`,
  restoreItems: `${TrashBasePath}/restore`,
  permanentlyDeleteItems: `${TrashBasePath}/permanent`,
  emptyTrash: `${TrashBasePath}/empty`,
};
