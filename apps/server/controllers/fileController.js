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

  const userId = file.user.toString();
  const fileId = file._id.toString();

  // ── Thumbnail request ────────────────────────────────────────────────────────
  if (isThumbnail) {
    const thumbDir = FileService.getThumbnailDir(userId);
    const thumbPath = path.join(thumbDir, `${fileId}.jpg`);
    const MIN_THUMB_BYTES = 2000;

    const thumbSize = fs.existsSync(thumbPath) ? fs.statSync(thumbPath).size : 0;
    const thumbExistsAndValid = thumbSize >= MIN_THUMB_BYTES && !!file.thumbnail_iv;

    if (!thumbExistsAndValid && fs.existsSync(thumbPath)) {
      fs.unlinkSync(thumbPath);
      if (file.thumbnail_path || file.thumbnail_iv) {
        file.thumbnail_path = null;
        file.thumbnail_iv = null;
        await file.save();
      }
    }

    if (!thumbExistsAndValid) {
      if (!fs.existsSync(file.storage_path)) {
        return res.status(HttpStatus.ACCEPTED).send("");
      }
      try {
        const thumbIv = CryptoUtils.generateFileIv();
        const tempThumbPath = `${thumbPath}.tmp`;

        if (file.category === FileCategories.IMAGE || file.mime_type?.startsWith("image/")) {
          await MediaUtils.generateImageThumbnail(file.storage_path, tempThumbPath, plaintextKey, iv);
        } else if (file.category === FileCategories.VIDEO || file.mime_type?.startsWith("video/")) {
          await MediaUtils.generateVideoThumbnail(file.storage_path, thumbDir, `${fileId}.jpg.tmp`, plaintextKey, iv);
        } else if (file.category === FileCategories.AUDIO || file.mime_type?.startsWith("audio/")) {
          await MediaUtils.extractAudioAlbumArt(file.storage_path, tempThumbPath, plaintextKey, iv);
        } else {
          return res.status(HttpStatus.ACCEPTED).send("");
        }

        const tempThumbSize = fs.existsSync(tempThumbPath) ? fs.statSync(tempThumbPath).size : 0;
        if (tempThumbSize >= MIN_THUMB_BYTES) {
          const cipher = CryptoUtils.getCipherStream(plaintextKey, thumbIv);
          await new Promise((resolve, reject) => {
            const readStream = fs.createReadStream(tempThumbPath);
            const writeStream = fs.createWriteStream(thumbPath);
            readStream.pipe(cipher).pipe(writeStream).on("finish", resolve).on("error", reject);
          });

          await fs.promises.unlink(tempThumbPath).catch(() => {});
          file.thumbnail_path = thumbPath;
          file.thumbnail_iv = thumbIv.toString("hex");
          await file.save();
        } else {
          if (fs.existsSync(tempThumbPath)) {
            fs.unlinkSync(tempThumbPath);
          }
          logger.warn(
            `[Preview] Thumbnail generation produced undersized output (${tempThumbSize}B < ${MIN_THUMB_BYTES}B min) for ${fileId}`
          );
          return res.status(HttpStatus.ACCEPTED).send("");
        }
      } catch (err) {
        logger.warn(`[Preview] Thumbnail generation failed for ${fileId}: ${err.message}`);
        return res.status(HttpStatus.ACCEPTED).send("");
      }
    }

    if (file.thumbnail_iv) {
      const thumbIv = Buffer.from(file.thumbnail_iv, "hex");
      const decipherStream = CryptoUtils.getDecipherStream(plaintextKey, thumbIv);
      const stats = fs.statSync(thumbPath);

      if (stats.size < MIN_THUMB_BYTES) {
        fs.unlinkSync(thumbPath);
        file.thumbnail_path = null;
        file.thumbnail_iv = null;
        await file.save();
        return res.status(HttpStatus.ACCEPTED).send("");
      }

      res.set("Content-Type", "image/jpeg");
      res.set("Cache-Control", `private, max-age=${CacheDurations.ONE_DAY}`);
      res.set("Content-Length", stats.size);

      const readStream = fs.createReadStream(thumbPath);
      readStream.on("error", () => res.end());
      decipherStream.on("error", () => res.end());
      return readStream.pipe(decipherStream).pipe(res);
    } else {
      res.set("Content-Type", "image/jpeg");
      res.set("Cache-Control", `private, max-age=${CacheDurations.ONE_DAY}`);
      return res.sendFile(path.resolve(thumbPath));
    }
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
  const baseStoragePath = config.NAS_STORAGE_PATH;
  const outputDir = HlsCacheUtils.getCacheDir(baseStoragePath, fileId);
  const isAudioOnly = file.category === FileCategories.AUDIO;

  let mediaInfo;
  try {
    mediaInfo = await MediaUtils.probeEncryptedMedia(file.storage_path, plaintextKey, iv);
  } catch (err) {
    logger.error(`[HLS Playlist] Probe failed for ${fileId}: ${err.message}`);
    return ResponseUtils.error(res, ErrorMessages.MEDIA_METADATA_FAILED, HttpStatus.INTERNAL_SERVER_ERROR);
  }

  const alreadyTranscoded = await HlsCacheUtils.isPlaylistCached(baseStoragePath, fileId);
  const durationUnknown = mediaInfo.duration === 0;

  if (!alreadyTranscoded) {
    if (durationUnknown) {
      logger.info(`[HLS Playlist] Unknown duration — synchronous transcode for ${fileId}`);
      try {
        await MediaUtils.transcodeToHls(
          file.storage_path,
          plaintextKey,
          iv,
          outputDir,
          HlsConfig.SEGMENT_DURATION,
          isAudioOnly
        );
      } catch (err) {
        logger.error(`[HLS Playlist] Sync transcode failed for ${fileId}: ${err.message}`);
        return ResponseUtils.error(res, "HLS transcode failed", HttpStatus.INTERNAL_SERVER_ERROR);
      }
    } else {
      logger.info(`[HLS Playlist] Starting background transcode for file ${fileId}`);
      MediaUtils.transcodeToHls(
        file.storage_path,
        plaintextKey,
        iv,
        outputDir,
        HlsConfig.SEGMENT_DURATION,
        isAudioOnly
      ).catch((err) => logger.error(`[HLS Playlist] Background transcode failed for ${fileId}: ${err.message}`));
    }
  }

  const realPlaylistReady = durationUnknown || alreadyTranscoded;
  if (realPlaylistReady) {
    try {
      const playlistPath = HlsCacheUtils.getPlaylistPath(baseStoragePath, fileId);
      let rawPlaylist = await fs.promises.readFile(playlistPath, "utf8");
      const hasSegments = /^seg-\d+\.ts$/m.test(rawPlaylist);
      if (!hasSegments) {
        logger.warn(`[HLS Playlist] Cached playlist for ${fileId} has 0 segments — purging and re-transcoding`);
        await fs.promises.rm(outputDir, { recursive: true, force: true }).catch(() => {});
        try {
          await MediaUtils.transcodeToHls(
            file.storage_path,
            plaintextKey,
            iv,
            outputDir,
            HlsConfig.SEGMENT_DURATION,
            isAudioOnly
          );
        } catch (err) {
          logger.error(`[HLS Playlist] Re-transcode after empty cache failed for ${fileId}: ${err.message}`);
          return ResponseUtils.error(res, "HLS transcode failed", HttpStatus.INTERNAL_SERVER_ERROR);
        }
        rawPlaylist = await fs.promises.readFile(playlistPath, "utf8");
      }

      let translated = rawPlaylist.replace(/^(seg-\d+\.ts)$/gm, `/api/v1/files/${fileId}/hls/$1`);
      if (!translated.includes("#EXT-X-PLAYLIST-TYPE")) {
        translated = translated.replace("#EXTM3U", "#EXTM3U\n#EXT-X-PLAYLIST-TYPE:VOD");
      }

      res.set("Content-Type", "application/vnd.apple.mpegurl");
      res.set("Cache-Control", "no-cache");
      return res.send(translated);
    } catch (err) {
      logger.error(`[HLS Playlist] Failed to read real playlist for ${fileId}: ${err.message}`);
      return ResponseUtils.error(res, "HLS playlist unavailable", HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  const { duration } = mediaInfo;
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

  const alreadyCached = await HlsCacheUtils.isSegmentCached(baseStoragePath, fileId, segmentIndex);
  if (alreadyCached) {
    const buffer = await HlsCacheUtils.readSegment(baseStoragePath, fileId, segmentIndex);
    res.set("Content-Type", "video/mp2t");
    res.set("Cache-Control", `private, max-age=${CacheDurations.ONE_HOUR}`);
    return res.send(buffer);
  }

  const isAudioOnly = file.category === FileCategories.AUDIO;
  const outputDir = HlsCacheUtils.getCacheDir(baseStoragePath, fileId);

  MediaUtils.transcodeToHls(
    file.storage_path,
    plaintextKey,
    iv,
    outputDir,
    HlsConfig.SEGMENT_DURATION,
    isAudioOnly
  ).catch((err) => logger.error(`[HLS Segment] Transcode error for ${fileId}: ${err.message}`));

  const POLL_INTERVAL_MS = 300;
  const POLL_TIMEOUT_MS = 120_000;
  const deadline = Date.now() + POLL_TIMEOUT_MS;

  while (Date.now() < deadline) {
    await new Promise((r) => setTimeout(r, POLL_INTERVAL_MS));
    const ready = await HlsCacheUtils.isSegmentCached(baseStoragePath, fileId, segmentIndex);
    if (ready) {
      const segmentBuffer = await HlsCacheUtils.readSegment(baseStoragePath, fileId, segmentIndex);
      res.set("Content-Type", "video/mp2t");
      res.set("Cache-Control", `private, max-age=${CacheDurations.ONE_HOUR}`);
      return res.send(segmentBuffer);
    }
  }

  logger.error(`[HLS Segment] Timed out waiting for seg-${segmentIndex}.ts for file ${fileId}`);
  return ResponseUtils.error(res, "HLS segment timed out", HttpStatus.INTERNAL_SERVER_ERROR);
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
