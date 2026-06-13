// Native modules
import fs from "fs";
import path from "path";

// Services
import FileService from "#services/fileService.js";
import SocketService from "#services/socketService.js";

// Constants
import {
  ErrorMessages,
  SuccessMessages,
  VideoMimeTypes,
  SocketEvents,
  SocketActions,
  CacheDurations,
  HlsConfig,
} from "#constants/generalConstants.js";
import { HttpStatus, ItemTypes, FileCategories } from "@shared-constants/constants";

// Middleware
import asyncHandler from "#middlewares/asyncHandler.js";

// Utils
import ResponseUtils from "#utils/responseUtils.js";
import MediaUtils from "#utils/mediaUtils.js";
import StreamingUtils from "#utils/streamingUtils.js";
import CryptoUtils from "#utils/cryptoUtils.js";
import HlsCacheUtils from "#utils/hlsCacheUtils.js";
import HlsSessionUtils from "#utils/hlsSessionUtils.js";
import { decryptToTemp } from "#utils/mediaCore.js";
import logger from "#utils/logger.js";
import config from "#config/env.js";

// ─── Controllers ──────────────────────────────────────────────────────────────

export const getFiles = asyncHandler(async (req, res) => {
  const result = await FileService.getFiles(req.user.id, req.query);
  return ResponseUtils.success(res, result);
});

export const uploadFile = asyncHandler(async (req, res) => {
  if (!req.file) {
    return ResponseUtils.error(res, ErrorMessages.FILE_REQUIRED, HttpStatus.BAD_REQUEST);
  }

  const file = await FileService.processUpload(req.user.id, req.body.folderId, req.file);

  const { quota_bytes, used_bytes } = await FileService.getUserQuota(req.user.id);
  SocketService.emitToUser(req.user.id, SocketEvents.QUOTA_UPDATE, { quota_bytes, used_bytes });
  SocketService.emitToUser(req.user.id, SocketEvents.FILE_CHANGE, {
    action: SocketActions.UPLOAD,
    fileId: file._id,
    folderId: req.body.folderId,
  });

  return ResponseUtils.success(res, file, HttpStatus.CREATED);
});

export const downloadFile = asyncHandler(async (req, res) => {
  const { file, plaintextKey, iv } = await FileService.getFileWithKey(req.user.id, req.params.id);

  if (!fs.existsSync(file.storage_path)) {
    return ResponseUtils.error(res, ErrorMessages.PHYSICAL_FILE_NOT_FOUND, HttpStatus.NOT_FOUND);
  }

  file.last_opened_at = new Date();
  await file.save();

  const decipherStream = CryptoUtils.getDecipherStream(plaintextKey, iv);
  const encodedName = encodeURIComponent(file.original_name || file.name);
  res.setHeader("Content-Type", file.mime_type || "application/octet-stream");
  res.setHeader("Content-Disposition", `attachment; filename*=UTF-8''${encodedName}`);
  res.setHeader("Content-Length", file.size_bytes);

  const readStream = fs.createReadStream(file.storage_path);
  readStream.on("error", (err) => {
    logger.error(`[Download] Read stream error for ${file._id}: ${err.message}`);
    if (!res.headersSent) {
      res.status(500).end();
    }
  });
  decipherStream.on("error", (err) => {
    logger.error(`[Download] Decipher error for ${file._id}: ${err.message}`);
    if (!res.headersSent) {
      res.status(500).end();
    }
  });

  readStream.pipe(decipherStream).pipe(res);
});

export const getFilePreview = asyncHandler(async (req, res) => {
  const { file, plaintextKey, iv } = await FileService.getFileWithKey(req.user.id, req.params.id);

  const isThumbnail = req.query.thumbnail === "true";
  if (!isThumbnail) {
    file.last_opened_at = new Date();
    await file.save();
  }

  const fileId = file._id.toString();

  // ── Thumbnail request ────────────────────────────────────────────────────────
  if (isThumbnail) {
    const thumb = await FileService.getOrGenerateThumbnail(file, plaintextKey, iv);
    if (!thumb) {
      return res.status(HttpStatus.ACCEPTED).send("");
    }

    const stats = fs.statSync(thumb.thumbPath);
    const decipherStream = CryptoUtils.getDecipherStream(plaintextKey, thumb.thumbIv);
    res.set("Content-Type", "image/jpeg");
    res.set("Cache-Control", `private, max-age=${CacheDurations.ONE_DAY}`);
    res.set("Content-Length", stats.size);

    const readStream = fs.createReadStream(thumb.thumbPath);
    readStream.on("error", () => res.end());
    decipherStream.on("error", () => res.end());
    return readStream.pipe(decipherStream).pipe(res);
  }

  // ── Video preview ─────────────────────────────────────────────────────────
  if (file.category === FileCategories.VIDEO) {
    if (!fs.existsSync(file.storage_path)) {
      return ResponseUtils.error(res, ErrorMessages.PHYSICAL_FILE_NOT_FOUND, HttpStatus.NOT_FOUND);
    }
    const mimeType = MediaUtils.needsVideoPreview(file.storage_path, file.mime_type, file.metadata?.codec)
      ? VideoMimeTypes.MP4
      : file.mime_type;
    return StreamingUtils.serveWithRange(res, file.storage_path, mimeType, req.headers.range, plaintextKey, iv);
  }

  // ── Audio preview ─────────────────────────────────────────────────────────
  if (file.category === FileCategories.AUDIO) {
    if (!fs.existsSync(file.storage_path)) {
      return ResponseUtils.error(res, ErrorMessages.PHYSICAL_FILE_NOT_FOUND, HttpStatus.NOT_FOUND);
    }
    return StreamingUtils.serveWithRange(res, file.storage_path, file.mime_type, req.headers.range, plaintextKey, iv);
  }

  // ── Image preview ─────────────────────────────────────────────────────────
  if (file.mime_type?.startsWith("image/")) {
    if (!fs.existsSync(file.storage_path)) {
      return ResponseUtils.error(res, ErrorMessages.PHYSICAL_FILE_NOT_FOUND, HttpStatus.NOT_FOUND);
    }

    const ext = path.extname(file.storage_path).toLowerCase();
    const isHeic = ext === ".heic" || ext === ".heif";

    if (isHeic) {
      try {
        const encryptedBuffer = await fs.promises.readFile(file.storage_path);
        const decipher = CryptoUtils.getDecipherStream(plaintextKey, iv);
        const decryptedBuffer = Buffer.concat([decipher.update(encryptedBuffer), decipher.final()]);
        const heicConvert = (await import("heic-convert")).default;
        const outputBuffer = await heicConvert({ buffer: decryptedBuffer, format: "JPEG", quality: 0.8 });
        res.set("Content-Type", "image/jpeg");
        res.set("Cache-Control", `private, max-age=${CacheDurations.ONE_HOUR}`);
        return res.send(Buffer.from(outputBuffer));
      } catch (err) {
        logger.error(`[Preview] HEIC conversion failed for ${fileId}: ${err.message}`);
      }
    }

    res.set("Content-Type", file.mime_type);
    res.set("Cache-Control", `private, max-age=${CacheDurations.ONE_HOUR}`);
    res.set("Content-Disposition", "inline");
    res.set("Content-Length", file.size_bytes);

    const readStream = fs.createReadStream(file.storage_path);
    const decipherStream = CryptoUtils.getDecipherStream(plaintextKey, iv);
    readStream.on("error", () => res.end());
    decipherStream.on("error", () => res.end());
    return readStream.pipe(decipherStream).pipe(res);
  }

  return ResponseUtils.error(res, ErrorMessages.PREVIEW_NOT_SUPPORTED, HttpStatus.BAD_REQUEST);
});

export const streamFile = asyncHandler(async (req, res) => {
  const { file, plaintextKey, iv } = await FileService.getFileWithKey(req.user.id, req.params.id);

  if (file.category !== FileCategories.VIDEO && file.category !== FileCategories.AUDIO) {
    return ResponseUtils.error(res, ErrorMessages.STREAMING_NOT_SUPPORTED, HttpStatus.BAD_REQUEST);
  }
  if (!fs.existsSync(file.storage_path)) {
    return ResponseUtils.error(res, ErrorMessages.PHYSICAL_FILE_NOT_FOUND, HttpStatus.NOT_FOUND);
  }

  if (
    file.category === FileCategories.VIDEO &&
    MediaUtils.needsVideoPreview(file.storage_path, file.mime_type, file.metadata?.codec)
  ) {
    logger.info(`[Stream] On-the-fly transcode ${file.mime_type} → MP4 pipe for file ${file._id}`);
    res.writeHead(HttpStatus.OK, {
      "Content-Type": "video/mp4",
      "Content-Disposition": "inline",
      "Cache-Control": "private, no-store",
    });
    const decipherStream = CryptoUtils.getDecipherStream(plaintextKey, iv);
    const sourceStream = fs.createReadStream(file.storage_path).pipe(decipherStream);
    return MediaUtils.pipeTranscodeStream(sourceStream, res);
  }

  return StreamingUtils.serveWithRange(res, file.storage_path, file.mime_type, req.headers.range, plaintextKey, iv);
});

export const renameFile = asyncHandler(async (req, res) => {
  const file = await FileService.renameFile(req.user.id, req.params.id, req.body.name);
  SocketService.emitToUser(req.user.id, SocketEvents.FILE_CHANGE, {
    action: SocketActions.RENAME,
    fileId: file._id,
    name: req.body.name,
  });
  return ResponseUtils.success(res, file);
});

export const moveFile = asyncHandler(async (req, res) => {
  const file = await FileService.moveFile(req.user.id, req.params.id, req.body.folderId);
  SocketService.emitToUser(req.user.id, SocketEvents.FILE_CHANGE, {
    action: SocketActions.MOVE,
    fileId: file._id,
    destFolderId: req.body.folderId,
  });
  return ResponseUtils.success(res, file);
});

export const copyFile = asyncHandler(async (req, res) => {
  const file = await FileService.copyFile(req.user.id, req.params.id, req.body.folderId);
  const { quota_bytes, used_bytes } = await FileService.getUserQuota(req.user.id);
  SocketService.emitToUser(req.user.id, SocketEvents.QUOTA_UPDATE, { quota_bytes, used_bytes });
  SocketService.emitToUser(req.user.id, SocketEvents.FILE_CHANGE, {
    action: SocketActions.COPY,
    folderId: req.body.folderId,
  });
  return ResponseUtils.success(res, file);
});

export const deleteFile = asyncHandler(async (req, res) => {
  await FileService.deleteFile(req.user.id, req.params.id);
  SocketService.emitToUser(req.user.id, SocketEvents.FILE_CHANGE, {
    action: SocketActions.DELETE,
    fileId: req.params.id,
  });
  return ResponseUtils.success(res, { message: SuccessMessages.FILE_TRASHED });
});

export const bulkDelete = asyncHandler(async (req, res) => {
  await FileService.bulkDelete(req.user.id, req.body.items);
  SocketService.emitToUser(req.user.id, SocketEvents.FILE_CHANGE, {
    action: SocketActions.BULK_DELETE,
    items: req.body.items,
  });
  return ResponseUtils.success(res, { message: SuccessMessages.ITEMS_TRASHED });
});

export const getRecentFiles = asyncHandler(async (req, res) => {
  const result = await FileService.getRecentFiles(req.user.id, req.query);

  if (!req.query.pg) {
    const mappedFiles = result.data.map((f) => ({ ...f.toObject(), type: ItemTypes.FILE }));
    return ResponseUtils.success(res, mappedFiles);
  }

  return ResponseUtils.success(res, result);
});

export const touchFile = asyncHandler(async (req, res) => {
  await FileService.touchFile(req.user.id, req.params.id);
  return ResponseUtils.success(res, { message: SuccessMessages.FILE_TOUCHED });
});

export const toggleFavorite = asyncHandler(async (req, res) => {
  const file = await FileService.toggleFileFavorite(req.user.id, req.params.id);
  return ResponseUtils.success(res, file);
});

export const updateFileTags = asyncHandler(async (req, res) => {
  const file = await FileService.updateFileTags(req.user.id, req.params.id, req.body.tags);
  return ResponseUtils.success(res, file);
});

export const downloadAsZip = asyncHandler(async (req, res) => {
  let { items } = req.body;
  const { payload } = req.body;

  if (!items && payload) {
    try {
      items = JSON.parse(payload).items;
    } catch (_err) {
      return ResponseUtils.error(res, ErrorMessages.INVALID_PAYLOAD_FORMAT, HttpStatus.BAD_REQUEST);
    }
  }

  if (!items || !items.length) {
    return ResponseUtils.error(res, ErrorMessages.NO_ITEMS_SELECTED, HttpStatus.BAD_REQUEST);
  }

  const zipItems = await FileService.prepareZipPayload(req.user.id, items);
  if (zipItems.length === 0) {
    return ResponseUtils.error(res, ErrorMessages.NO_VALID_FILES, HttpStatus.NOT_FOUND);
  }

  res.attachment(`cloud-drive-download-${Date.now()}.zip`);
  await MediaUtils.createZipStream(zipItems, res);
});

export const bulkMove = asyncHandler(async (req, res) => {
  await FileService.bulkMove(req.user.id, req.body.items, req.body.targetFolderId);
  SocketService.emitToUser(req.user.id, SocketEvents.ITEM_BULK_CHANGE, {
    action: SocketActions.MOVE,
    items: req.body.items,
    targetFolderId: req.body.targetFolderId,
  });
  return ResponseUtils.success(res, { message: SuccessMessages.ITEMS_MOVED });
});

export const getPlaybackInfo = asyncHandler(async (req, res) => {
  const info = await FileService.getPlaybackInfo(req.user.id, req.params.id);
  return ResponseUtils.success(res, info);
});

export const getHlsPlaylist = asyncHandler(async (req, res) => {
  const { file, plaintextKey, iv } = await FileService.getFileWithKey(req.user.id, req.params.id);

  if (file.category !== FileCategories.VIDEO && file.category !== FileCategories.AUDIO) {
    return ResponseUtils.error(res, ErrorMessages.STREAMING_NOT_SUPPORTED, HttpStatus.BAD_REQUEST);
  }
  if (!fs.existsSync(file.storage_path)) {
    return ResponseUtils.error(res, ErrorMessages.PHYSICAL_FILE_NOT_FOUND, HttpStatus.NOT_FOUND);
  }

  const fileId = file._id.toString();

  // Probe duration to build the fixed segment grid. Individual segments are produced on
  // demand by anchored transcode sessions (see getHlsSegment) — no full-file transcode
  // happens here, so the playlist is available immediately and the whole timeline is seekable.
  let mediaInfo;
  try {
    mediaInfo = await MediaUtils.probeEncryptedMedia(file.storage_path, plaintextKey, iv);
  } catch (err) {
    logger.error(`[HLS Playlist] Probe failed for ${fileId}: ${err.message}`);
    return ResponseUtils.error(res, ErrorMessages.MEDIA_METADATA_FAILED, HttpStatus.SERVER_ERROR);
  }

  const { duration } = mediaInfo;
  if (!duration || duration <= 0) {
    // No known duration => cannot build a fixed segment grid (rare: corrupt or streaming-only
    // container). 503 + Retry-After; there is no HttpStatus.SERVICE_UNAVAILABLE constant.
    logger.warn(`[HLS Playlist] Unknown duration for ${fileId} — cannot build HLS grid`);
    res.set("Retry-After", "2");
    return ResponseUtils.error(res, ErrorMessages.MEDIA_METADATA_FAILED, 503);
  }

  const segDur = HlsConfig.SEGMENT_DURATION;
  const segmentCount = Math.ceil(duration / segDur);

  const lines = [
    "#EXTM3U",
    "#EXT-X-PLAYLIST-TYPE:VOD",
    "#EXT-X-VERSION:3",
    `#EXT-X-TARGETDURATION:${segDur}`,
    "#EXT-X-MEDIA-SEQUENCE:0",
  ];
  for (let i = 0; i < segmentCount; i++) {
    const isLast = i === segmentCount - 1;
    const segActualDuration = isLast ? (duration - i * segDur).toFixed(3) : segDur.toFixed(3);
    lines.push(`#EXTINF:${segActualDuration},`, `/api/v1/files/${fileId}/hls/seg-${i}.ts`);
  }
  lines.push("#EXT-X-ENDLIST");

  res.set("Content-Type", "application/vnd.apple.mpegurl");
  res.set("Cache-Control", "no-cache");
  return res.send(lines.join("\n") + "\n");
});

export const getHlsSegment = asyncHandler(async (req, res) => {
  const { file, plaintextKey, iv } = await FileService.getFileWithKey(req.user.id, req.params.id);

  if (file.category !== FileCategories.VIDEO && file.category !== FileCategories.AUDIO) {
    return ResponseUtils.error(res, ErrorMessages.STREAMING_NOT_SUPPORTED, HttpStatus.BAD_REQUEST);
  }
  if (!fs.existsSync(file.storage_path)) {
    return ResponseUtils.error(res, ErrorMessages.PHYSICAL_FILE_NOT_FOUND, HttpStatus.NOT_FOUND);
  }

  const match = req.params.segment?.match(/^seg-(\d+)\.ts$/);
  if (!match) {
    return ResponseUtils.error(res, ErrorMessages.INVALID_SEGMENT, HttpStatus.BAD_REQUEST);
  }

  const segmentIndex = parseInt(match[1], 10);
  const fileId = file._id.toString();
  const baseStoragePath = config.NAS_STORAGE_PATH;
  const isAudioOnly = file.category === FileCategories.AUDIO;

  // Decrypt to a seekable temp file only when a new session must start. The session
  // (inside ensureSegment) owns the returned path's lifetime and unlinks it on exit.
  const getSource = () => decryptToTemp(file.storage_path, plaintextKey, iv);

  let result;
  try {
    result = await HlsSessionUtils.ensureSegment(baseStoragePath, fileId, segmentIndex, getSource, isAudioOnly);
  } catch (err) {
    logger.error(`[HLS Segment] Failed to produce seg-${segmentIndex}.ts for ${fileId}: ${err.message}`);
    return ResponseUtils.error(res, "HLS segment generation failed", HttpStatus.SERVER_ERROR);
  }

  if (!result.ready) {
    // Not ready within the budget (timeout / no free transcode slot / session died). 503 +
    // Retry-After lets the hls.js client re-request while the session keeps producing.
    logger.info(`[HLS Segment] seg-${segmentIndex}.ts not ready for ${fileId} (${result.reason}) — 503`);
    res.set("Retry-After", "2");
    return ResponseUtils.error(res, "HLS segment not ready", 503);
  }

  const buffer = await HlsCacheUtils.readSegment(baseStoragePath, fileId, segmentIndex);
  res.set("Content-Type", "video/mp2t");
  res.set("Cache-Control", `private, max-age=${CacheDurations.ONE_HOUR}`);
  return res.send(buffer);
});

export const bulkCopy = asyncHandler(async (req, res) => {
  await FileService.bulkCopy(req.user.id, req.body.items, req.body.targetFolderId);
  const { quota_bytes, used_bytes } = await FileService.getUserQuota(req.user.id);
  SocketService.emitToUser(req.user.id, SocketEvents.QUOTA_UPDATE, { quota_bytes, used_bytes });
  SocketService.emitToUser(req.user.id, SocketEvents.ITEM_BULK_CHANGE, {
    action: SocketActions.COPY,
    targetFolderId: req.body.targetFolderId,
  });
  return ResponseUtils.success(res, { message: SuccessMessages.ITEMS_COPIED });
});
