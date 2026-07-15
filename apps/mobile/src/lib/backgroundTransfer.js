import * as FileSystem from "expo-file-system/legacy";
import * as MediaLibrary from "expo-media-library/legacy";
import * as Notifications from "expo-notifications";
import * as TaskManager from "expo-task-manager";
import axios from "axios";
import { Buffer } from "buffer";
import uuid from "react-native-uuid";

// Lib
import nativeTransfer from "@lib/nativeTransfer";
import { totalChunksFor } from "@lib/nativeTransfer/chunkPlan";

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

/**
 * Hands the download to the native BackgroundChunkTransfer module (single request, no
 * chunking — server-side Range support plus the OS's native resumability handle resume) so it
 * survives backgrounding, mirroring _uploadViaNative. Resolves on "complete" (to the local file
 * uri, preserving download()'s existing Promise-resolves-to-uri contract) or "paused"/"cancelled"
 * (both resolve to null — not failures), rejects on "failed".
 */
function _downloadViaNative({ transferId, fileId, url, destPath, fileName, baseUrl }) {
  return new Promise((resolve, reject) => {
    const unsubscribe = nativeTransfer.addTransferListener((event) => {
      if (event.transferId !== transferId) return;
      if (event.status === "complete") {
        unsubscribe();
        resolve(event.localUri);
      } else if (event.status === "failed") {
        unsubscribe();
        reject(new Error(`Download failed for transfer ${transferId}`));
      } else if (event.status === "paused" || event.status === "cancelled") {
        unsubscribe();
        resolve(null);
      }
    });

    nativeTransfer.startDownload({ transferId, fileId, url, destPath, fileName, baseUrl });
  });
}

async function download(fileId, url, fileName) {
  const existing = (await transfersRepository.getByStatus(["paused", "pending", "active"])).find(
    (r) => r.fileId === fileId && r.type === "download"
  );
  const transferId = existing?.id ?? uuid.v4();
  // A resumed download must keep using the SAME destination path/name it started with —
  // mirrors upload()'s resume trusting row.uploadId/row.uploadedChunks over fresh call
  // arguments, since the partial file (or, on iOS, the transferId-keyed resumeData) is only
  // valid for the original path.
  const resolvedFileName = existing?.name ?? fileName;
  const destDir = `${FileSystem.documentDirectory}downloads/${fileId}`;
  const destPath = existing?.dest ?? `${destDir}/${resolvedFileName}`;

  // Runs on every call, including resumes, so the download self-heals if the
  // directory was ever removed (e.g. OS storage cleanup between app launches).
  await FileSystem.makeDirectoryAsync(destDir, { intermediates: true }).catch(() => {});

  if (!existing) {
    await transfersRepository.upsertTransfer({
      id: transferId,
      fileId,
      type: "download",
      status: "active",
      url,
      dest: destPath,
      name: resolvedFileName,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });
  } else {
    // Resuming a paused/pending row — flip it back to "active" (mirrors upload()'s resume
    // branch). Native only ever touches progress/uploaded_chunks/updated_at, never status, so
    // without this the row would stay stuck showing "paused" for the rest of the transfer.
    await transfersRepository.upsertTransfer({
      ...existing,
      status: "active",
      updatedAt: new Date().toISOString(),
    });
  }

  const localUri = await _downloadViaNative({
    transferId,
    fileId,
    url,
    destPath,
    fileName: resolvedFileName,
    baseUrl: Config.API_SERVICE_URL,
  });

  if (localUri !== null) {
    await transfersRepository.markComplete(transferId);
  }
  return localUri;
}

// ─── Upload ───────────────────────────────────────────────────────────────────

const CHUNK_SIZE = 5 * 1024 * 1024;

/**
 * Runs the photo-backup completion bookkeeping and cache invalidation shared by both the
 * native (Android) and legacy JS (iOS) upload paths, once a file has genuinely finalized.
 */
async function _onUploadComplete(transferId, cloudFileId) {
  const alreadyBacked = await photoBackupsRepository.isAlreadyBacked(transferId).catch(() => false);
  if (!alreadyBacked && cloudFileId) {
    await photoBackupsRepository.markBackedUp(transferId, cloudFileId).catch(() => {});
    Store.dispatch(setLastBackupTimestamp(Date.now()));
  }
  Store.dispatch(api.util.invalidateTags([ApiTagTypes.FILES, ApiTagTypes.FOLDERS, ApiTagTypes.QUOTA]));
}

/**
 * Android: hands the chunk loop to the native BackgroundChunkTransfer module (see
 * apps/mobile/modules/background-chunk-transfer) so it survives backgrounding — init/status
 * stay in JS (a fresh upload always starts foregrounded), finalize is native (the last chunk can
 * land while backgrounded). Resolves on "complete"/"paused"/"cancelled" (paused/cancelled aren't
 * failures — the row just goes back to "pending"/"paused" for a later drainQueue() to pick up),
 * rejects on "failed" so uploadQueue.js's existing try/catch keeps working unchanged.
 */
function _uploadViaNative({
  transferId,
  localUri,
  fileName,
  mimeType,
  folderId,
  baseUrl,
  uploadId,
  totalChunks,
  startChunk,
  retryCount,
}) {
  return new Promise((resolve, reject) => {
    const unsubscribe = nativeTransfer.addTransferListener((event) => {
      if (event.transferId !== transferId) return;
      if (event.status === "complete") {
        unsubscribe();
        resolve(event.cloudFileId);
      } else if (event.status === "failed") {
        unsubscribe();
        reject(new Error(`Upload failed for transfer ${transferId}`));
      } else if (event.status === "paused" || event.status === "cancelled") {
        unsubscribe();
        resolve(null);
      }
    });

    nativeTransfer.startUpload({
      transferId,
      localUri,
      fileName,
      mimeType,
      folderId,
      baseUrl,
      uploadId,
      totalChunks,
      startChunk,
      retryCount,
    });
  });
}

async function upload(transferId, localUri, fileName, mimeType) {
  const [row] = await transfersRepository.getById(transferId);

  const token = await TokenStorage.getAccessToken();
  const baseUrl = Config.API_SERVICE_URL;

  const fileInfo = await FileSystem.getInfoAsync(localUri, { size: true });
  const totalSize = fileInfo.size;
  const totalChunks = totalChunksFor(totalSize);

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

  if (nativeTransfer.isNativeAvailable) {
    const cloudFileId = await _uploadViaNative({
      transferId,
      localUri,
      fileName,
      mimeType,
      folderId: row?.folderId ?? null,
      baseUrl,
      uploadId,
      totalChunks,
      startChunk,
      retryCount: row?.retryCount ?? 0,
    });
    if (cloudFileId !== null) {
      await _onUploadComplete(transferId, cloudFileId);
    }
    return;
  }

  // Legacy JS chunk-loop path — unreachable now that both platforms are native (isNativeAvailable
  // is always true), kept only as the fallback this plan's Phase 7 note describes; removal is
  // deliberately deferred until the native path has been stable for a full release cycle.
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
  await _onUploadComplete(transferId, cloudFileId);

  // Notification failures here must not undo the upload success recorded above.
  try {
    await Notifications.dismissNotificationAsync(notifId);
    await _showCompleteNotification(`Uploaded ${fileName}`);
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

const backgroundTransfer = { download, upload, downloadZip, saveToGallery };

export default backgroundTransfer;
