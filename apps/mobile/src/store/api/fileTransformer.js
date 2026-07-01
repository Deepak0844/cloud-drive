// Config
import Config from "@config";

// Constants
import { FileUrls } from "@constants/serviceUrls";

// Utils
import { UrlUtils } from "@shared-utils/utils";

function normalizeItem(doc = {}) {
  const id = String(doc._id ?? doc.id);
  const folderId = doc.folderId ?? (doc.folder ? String(doc.folder._id ?? doc.folder) : null);
  return {
    ...doc,
    id,
    folderId,
    mimeType: doc.mimeType ?? doc.mime_type ?? null,
    size: doc.size ?? doc.size_bytes ?? null,
    isFavorite: doc.isFavorite ?? doc.is_favorite ?? false,
    downloadUrl: `${Config.API_SERVICE_URL}${UrlUtils.format(FileUrls.download, { id })}`,
    streamUrl: `${Config.API_SERVICE_URL}${UrlUtils.format(FileUrls.stream, { id })}`,
    thumbnailUrl: `${Config.API_SERVICE_URL}${UrlUtils.format(FileUrls.thumbnail, { id })}`,
    previewUrl: `${Config.API_SERVICE_URL}${UrlUtils.format(FileUrls.preview, { id })}`,
    hlsUrl: `${Config.API_SERVICE_URL}${UrlUtils.format(FileUrls.hls, { id })}`,
  };
}

function transformFileList(response = {}) {
  return {
    items: (response.data ?? []).map(normalizeItem),
    pagination: response.pagination ?? null,
  };
}

function transformFile(response = {}) {
  return normalizeItem(response.data ?? {});
}

const FileTransformer = { transformFileList, transformFile, normalizeItem };
export default FileTransformer;
