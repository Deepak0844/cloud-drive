import * as FileSystem from "expo-file-system";
import * as Notifications from "expo-notifications";
import * as TaskManager from "expo-task-manager";
import axios from "axios";
import { Buffer } from "buffer";
import transfersRepository from "@db/repositories/transfersRepository";
import TokenStorage from "@utils/tokenStorage";
import Config from "@config";
import uuid from "react-native-uuid";

const UPLOAD_TASK = "background-upload-task";

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

// ─── Download ─────────────────────────────────────────────────────────────────

async function download(fileId, url, fileName) {
  const dest = `${FileSystem.documentDirectory}downloads/${fileId}/${fileName}`;

  const existing = (await transfersRepository.getByStatus(["paused", "pending"])).find(
    (r) => r.fileId === fileId && r.type === "download"
  );

  const notifId = await _showProgressNotification(`Downloading ${fileName}`, 0);
  const transferId = existing?.id ?? uuid.v4();

  let resumable;

  if (existing?.resumeData) {
    resumable = await FileSystem.createDownloadResumable(
      url,
      dest,
      {},
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
    resumable = FileSystem.createDownloadResumable(url, dest, {}, (evt) =>
      _onDownloadProgress(transferId, notifId, resumable, evt)
    );
  }

  _activeDownloads.set(fileId, resumable);

  const result = await resumable.downloadAsync();
  _activeDownloads.delete(fileId);
  await transfersRepository.markComplete(transferId);
  await Notifications.dismissNotificationAsync(notifId);
  await _showCompleteNotification(`Downloaded ${fileName}`);
  return result.uri;
}

async function _onDownloadProgress(transferId, notifId, resumable, { totalBytesWritten, totalBytesExpectedToWrite }) {
  const pct = totalBytesExpectedToWrite > 0 ? Math.round((totalBytesWritten / totalBytesExpectedToWrite) * 100) : 0;
  const snapshot = resumable.savable ? JSON.stringify(resumable.savable()) : null;
  await transfersRepository.updateProgress(transferId, pct, snapshot);
  await _updateProgressNotification(notifId, pct);
}

// ─── Upload ───────────────────────────────────────────────────────────────────

async function upload(transferId, localUri, fileName, mimeType) {
  const rows = await transfersRepository.getByStatus(["pending", "paused", "active"]);
  const row = rows.find((r) => r.id === transferId);

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
      `${baseUrl}/files/upload/init`,
      { fileName, mimeType, totalSize, totalChunks },
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
    const statusRes = await axios.get(`${baseUrl}/files/upload/status?uploadId=${uploadId}`, {
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

    await axios.post(`${baseUrl}/files/upload/chunk`, binary, {
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/octet-stream",
        "X-Upload-Id": uploadId,
        "X-Chunk-Index": i,
      },
    });

    await transfersRepository.updateUploadChunks(row.id, i + 1);
    const pct = Math.round(((i + 1) / totalChunks) * 100);
    await _updateProgressNotification(notifId, pct);
  }

  await axios.post(`${baseUrl}/files/upload/finalize`, { uploadId }, { headers: { Authorization: `Bearer ${token}` } });

  await transfersRepository.markComplete(row.id);
  await Notifications.dismissNotificationAsync(notifId);
  await _showCompleteNotification(`Uploaded ${fileName}`);
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
    } catch {
      // already complete or failed — ignore
    }
  }
}

const backgroundTransfer = { download, upload, pauseAll };

export default backgroundTransfer;
