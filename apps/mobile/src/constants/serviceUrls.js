const ApiV1 = "/api/v1";
const FilesBase = `${ApiV1}/files`;
const AuthBase = `${ApiV1}/auth`;
const FoldersBase = `${ApiV1}/folders`;
const AdminBase = `${ApiV1}/admin`;
const NotificationsBase = `${ApiV1}/notifications`;
const QuotaBase = `${ApiV1}/quota`;
const TrashBase = `${ApiV1}/trash`;

export const AuthUrls = {
  login: `${AuthBase}/login`,
  register: `${AuthBase}/register`,
  logout: `${AuthBase}/logout`,
  me: `${AuthBase}/me`,
  refresh: `${AuthBase}/refresh`,
  forgotPassword: `${AuthBase}/forgot-password`,
  changePassword: `${AuthBase}/password`,
};

export const FileUrls = {
  list: FilesBase,
  recent: `${FilesBase}/recent`,
  delete: `${FilesBase}/:id`,
  rename: `${FilesBase}/:id`,
  toggleFavorite: `${FilesBase}/:id/favorite`,
  move: `${FilesBase}/:id/move`,
  copy: `${FilesBase}/:id/copy`,
  download: `${FilesBase}/:id/download`,
  stream: `${FilesBase}/:id/stream`,
  preview: `${FilesBase}/:id/preview`,
  thumbnail: `${FilesBase}/:id/preview?thumbnail=true`,
  hls: `${FilesBase}/:id/hls/master.m3u8`,
  uploadInit: `${FilesBase}/upload/init`,
  uploadChunk: `${FilesBase}/upload/chunk`,
  uploadStatus: `${FilesBase}/upload/status`,
  uploadFinalize: `${FilesBase}/upload/finalize`,
};

export const FolderUrls = {
  list: FoldersBase,
  rootContents: `${FoldersBase}/root/contents`,
  contents: `${FoldersBase}/:id/contents`,
  details: `${FoldersBase}/:id`,
  create: FoldersBase,
  rename: `${FoldersBase}/:id`,
  delete: `${FoldersBase}/:id`,
  move: `${FoldersBase}/:id/move`,
};

export const TrashUrls = {
  list: TrashBase,
  restore: `${TrashBase}/restore`,
  permanentDelete: `${TrashBase}/permanent`,
  empty: `${TrashBase}/empty`,
};

export const BulkUrls = {
  delete: `${FilesBase}/bulk-delete`,
  move: `${FilesBase}/bulk-move`,
  copy: `${FilesBase}/bulk-copy`,
  download: `${FilesBase}/bulk-download`,
};

export const NotificationUrls = {
  list: NotificationsBase,
  markRead: `${NotificationsBase}/:id/read`,
  markAllRead: `${NotificationsBase}/read-all`,
  registerPushToken: `${NotificationsBase}/push-token`,
};

export const QuotaUrls = {
  usage: `${QuotaBase}/usage`,
  breakdown: `${QuotaBase}/breakdown`,
  request: `${QuotaBase}/request`,
};

export const AdminUrls = {
  users: `${AdminBase}/users`,
  userQuota: `${AdminBase}/users/:id/quota`,
  userStatus: `${AdminBase}/users/:id/status`,
  stats: `${AdminBase}/stats`,
  quotaRequests: `${AdminBase}/quota-requests`,
  quotaRequest: `${AdminBase}/quota-requests/:id`,
};
