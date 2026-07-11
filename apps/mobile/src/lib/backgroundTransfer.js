import * as FileSystem from "expo-file-system/legacy";
import * as MediaLibrary from "expo-media-library/legacy";
import * as Notifications from "expo-notifications";
import * as TaskManager from "expo-task-manager";
import axios from "axios";
import { Buffer } from "buffer";
import uuid from "react-native-uuid";

// Db
import transfersRepository from "@db/repositories/transfersRepository";
import photoBackupsRepository from "@db/repositories/photoBackupsRepository";
import Store from "@store";

// Rtk
import { api } from "@rtkQuery/api";

// Actions
import { setLastBackupTimestamp } from "@redux-slices/photoBackupSlice";

// Constants
import { FileUrls, BulkUrls } from "@constants/serviceUrls";
import { ApiTagTypes } from "@constants/generalConstants";

// Utils
import TokenStorage from "@utils/tokenStorage";

// Config
import Config from "@config";

const UPLOAD_TASK = "background-upload-task";
export const MAX_ZIP_ITEMS = 20;

// Map of fileId → DownloadResumable for in-progress downloads.
const _activeDownloads = new Map();

// ─── Notification helpers ─────────────────────────────────────────────────────

function _showProgressNotification(title, progress) {
  return Notifications.scheduleNotificationAsync({
    content: { title, data: {}, sticky: true, progress: { max: 100, current: progress } },
    trigger: null,
  });
}

async function _updateProgressNotification(id, progress) {
  await Notifications.dismissNotificationAsync(id);
  return Notifications.scheduleNotificationAsync({
    identifier: id,
    content: { title: "Transfer in progress…", sticky: true, progress: { max: 100, current: progress } },
    trigger: null,
  });
}

function _showCompleteNotification(title) {
  return Notifications.scheduleNotificationAsync({
    content: { title, body: "Tap to open" },
    trigger: null,
  });
}

// ─── Gallery publish ────────────────────────────────────────────────────────────

/**
 * Publish an already-downloaded image/video into the device's public Gallery.
 * No-op for non-media mime types — there's no Gallery equivalent for documents.
 * @param {string} uri local file uri returned by download()
 * @param {string} mimeType
 */
async function saveToGallery(uri, mimeType) {
  const isMedia = mimeType?.startsWith("image/") || mimeType?.startsWith("video/");
  if (!isMedia) {
    return;
  }

  const { status } = await MediaLibrary.requestPermissionsAsync(true);
  if (status !== "granted") {
    throw new Error("MEDIA_LIBRARY_PERMISSION_DENIED");
  }

  await MediaLibrary.saveToLibraryAsync(uri);
}

// ─── Download ─────────────────────────────────────────────────────────────────

async function download(fileId, url, fileName) {
  const destDir = `${FileSystem.documentDirectory}downloads/${fileId}`;
  const dest = `${destDir}/${fileName}`;
  const headers = TokenStorage.getAuthHeaders();

  // Runs on every call, including resumes, so the download self-heals if the
  // directory was ever removed (e.g. OS storage cleanup between app launches).
  await FileSystem.makeDirectoryAsync(destDir, { intermediates: true }).catch(() => {});

  const existing = (await transfersRepository.getByStatus(["paused", "pending"])).find(
    (r) => r.fileId === fileId && r.type === "download"
  );

  const notifId = await _showProgressNotification(`Downloading ${fileName}`, 0);
  const transferId = existing?.id ?? uuid.v4();

  let resumable;

  if (existing?.resumeData) {
    resumable = FileSystem.createDownloadResumable(
      url,
      dest,
      { headers },
      (evt) => _onDownloadProgress(transferId, notifId, resumable, evt),
      JSON.parse(existing.resumeData)
    );
  } else {
    await transfersRepository.upsertTransfer({
      id: transferId,
      fileId,
      type: "download",
      status: "active",
      url,
      dest,
      name: fileName,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });
    resumable = FileSystem.createDownloadResumable(url, dest, { headers }, (evt) =>
      _onDownloadProgress(transferId, notifId, resumable, evt)
    );
  }

  _activeDownloads.set(fileId, resumable);

  try {
    const result = await resumable.downloadAsync();
    _activeDownloads.delete(fileId);
    if (!result) {
      // Paused mid-flight (e.g. app backgrounded via pauseAll()) — leave the
      // transfer row as-is so it can resume later; this isn't a failure.
      await Notifications.dismissNotificationAsync(notifId);
      return null;
    }
    await transfersRepository.markComplete(transferId);
    await Notifications.dismissNotificationAsync(notifId);
    await _showCompleteNotification(`Downloaded ${fileName}`);
    return result.uri;
  } catch (ex) {
    _activeDownloads.delete(fileId);
    await transfersRepository.markFailed(transferId, (existing?.retryCount ?? 0) + 1);
    await Notifications.dismissNotificationAsync(notifId);
    throw ex;
  }
}

async function _onDownloadProgress(transferId, notifId, resumable, { totalBytesWritten, totalBytesExpectedToWrite }) {
  const pct = totalBytesExpectedToWrite > 0 ? Math.round((totalBytesWritten / totalBytesExpectedToWrite) * 100) : 0;
  const snapshot = resumable.savable ? JSON.stringify(resumable.savable()) : null;
  await transfersRepository.updateProgress(transferId, pct, snapshot);
  await _updateProgressNotification(notifId, pct);
}

// ─── Upload ───────────────────────────────────────────────────────────────────

async function upload(transferId, localUri, fileName, mimeType) {
  const [row] = await transfersRepository.getById(transferId);

  const token = await TokenStorage.getAccessToken();
  const baseUrl = Config.API_SERVICE_URL;
  const CHUNK_SIZE = 5 * 1024 * 1024;

  const fileInfo = await FileSystem.getInfoAsync(localUri, { size: true });
  const totalSize = fileInfo.size;
  const totalChunks = Math.ceil(totalSize / CHUNK_SIZE);

  let uploadId = row?.uploadId;
  let startChunk = row?.uploadedChunks ?? 0;

  if (!uploadId) {
    const initRes = await axios.post(
      `${baseUrl}${FileUrls.uploadInit}`,
      { fileName, mimeType, fileSize: totalSize, totalChunks, folderId: row?.folderId ?? null },
      { headers: { Authorization: `Bearer ${token}`, "X-Platform": "mobile" } }
    );
    uploadId = initRes.data.data.uploadId;
    await transfersRepository.upsertTransfer({
      ...row,
      uploadId,
      totalChunks,
      status: "active",
      updatedAt: new Date().toISOString(),
    });
  } else {
    const statusRes = await axios.get(`${baseUrl}${FileUrls.uploadStatus}?uploadId=${uploadId}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    startChunk = statusRes.data.data.uploadedChunks ?? startChunk;
  }

  // Register iOS background task so the OS grants extended execution time.
  TaskManager.defineTask(UPLOAD_TASK, () => TaskManager.TaskManagerTaskResult.SUCCESS);

  const notifId = await _showProgressNotification(
    `Uploading ${fileName}`,
    Math.round((startChunk / totalChunks) * 100)
  );

  for (let i = startChunk; i < totalChunks; i++) {
    const offset = i * CHUNK_SIZE;
    const chunkData = await FileSystem.readAsStringAsync(localUri, {
      encoding: FileSystem.EncodingType.Base64,
      position: offset,
      length: CHUNK_SIZE,
    });

    // Server's rawChunkMiddleware requires raw binary — NOT multipart/form-data.
    const binary = Buffer.from(chunkData, "base64");

    const chunkUrl = `${baseUrl}${FileUrls.uploadChunk}?uploadId=${encodeURIComponent(uploadId)}&chunkIndex=${i}`;
    await axios.post(chunkUrl, binary, {
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/octet-stream",
      },
    });

    await transfersRepository.updateUploadChunks(row.id, i + 1);
    const pct = Math.round(((i + 1) / totalChunks) * 100);
    await _updateProgressNotification(notifId, pct);
  }

  const finalizeRes = await axios.post(
    `${baseUrl}${FileUrls.uploadFinalize}`,
    { uploadId, fileName, folderId: row?.folderId ?? null, mimeType, totalSize },
    { headers: { Authorization: `Bearer ${token}` } }
  );
  const cloudFileId = finalizeRes.data?.data?._id ?? finalizeRes.data?.data?.id ?? null;

  await transfersRepository.markComplete(row.id);

  const alreadyBacked = await photoBackupsRepository.isAlreadyBacked(transferId).catch(() => false);
  if (!alreadyBacked && cloudFileId) {
    await photoBackupsRepository.markBackedUp(transferId, cloudFileId).catch(() => {});
    Store.dispatch(setLastBackupTimestamp(Date.now()));
  }

  // Notification/cache-refresh failures here must not undo the upload success recorded above.
  try {
    await Notifications.dismissNotificationAsync(notifId);
    await _showCompleteNotification(`Uploaded ${fileName}`);
    Store.dispatch(api.util.invalidateTags([ApiTagTypes.FILES, ApiTagTypes.FOLDERS, ApiTagTypes.QUOTA]));
  } catch {
    // best-effort — upload already succeeded and is recorded as complete
  }
}

// ─── Bulk zip download ────────────────────────────────────────────────────────

/**
 * POST the selected items to /files/bulk-download and write the zip response
 * to the downloads directory. The zip is buffered in memory (axios arraybuffer),
 * so callers cap the selection size.
 * @param {{id: string, type: string}[]} items
 * @returns {Promise<string>} local file URI of the written zip
 */
async function downloadZip(items) {
  if (items.length > MAX_ZIP_ITEMS) throw new Error("TOO_MANY_ITEMS");
  const token = await TokenStorage.getAccessToken();
  const notifId = await _showProgressNotification("Preparing zip…", 0);

  try {
    const res = await axios.post(
      `${Config.API_SERVICE_URL}${BulkUrls.download}`,
      { items },
      { headers: { Authorization: `Bearer ${token}` }, responseType: "arraybuffer" }
    );

    const dest = `${FileSystem.documentDirectory}downloads/bulk-${Date.now()}.zip`;
    await FileSystem.makeDirectoryAsync(`${FileSystem.documentDirectory}downloads`, { intermediates: true }).catch(
      () => {}
    );
    await FileSystem.writeAsStringAsync(dest, Buffer.from(res.data).toString("base64"), {
      encoding: FileSystem.EncodingType.Base64,
    });

    await Notifications.dismissNotificationAsync(notifId);
    await _showCompleteNotification("Zip ready");
    return dest;
  } catch (ex) {
    await Notifications.dismissNotificationAsync(notifId);
    throw ex;
  }
}

// ─── pauseAll ─────────────────────────────────────────────────────────────────

async function pauseAll() {
  for (const [fileId, resumable] of _activeDownloads.entries()) {
    try {
      await resumable.pauseAsync();
      const snapshot = resumable.savable();
      const rows = await transfersRepository.getByStatus(["active"]);
      const row = rows.find((r) => r.fileId === fileId);
      if (row) {
        await transfersRepository.updateProgress(row.id, row.progress, JSON.stringify(snapshot));
      }
    } catch (_ex) {
      // already complete or failed — pause on a finished download throws, safe to ignore
    }
  }
}

const backgroundTransfer = { download, upload, downloadZip, saveToGallery, pauseAll };

export default backgroundTransfer;
