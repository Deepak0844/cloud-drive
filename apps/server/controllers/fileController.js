// Native modules
import fs from "fs";
import path from "path";

// Packages

// Models
import File from "#models/File.js";
import Folder from "#models/Folder.js";
import User from "#models/User.js";

// Services
import FileService from "#services/fileService.js";
import SocketService from "#services/socketService.js";

// Constants
import { ErrorMessages, FileCategories, VideoMimeTypes } from "#constants/generalConstants.js";
import { HttpStatus, ItemTypes } from "@shared-constants/constants";

// Middleware
import asyncHandler from "#middlewares/asyncHandler.js";

// Utils
import ResponseUtils from "#utils/responseUtils.js";
import DbUtils from "#utils/dbUtils.js";
import MediaUtils from "#utils/mediaUtils.js";
import { applyAdvancedFilters } from "#utils/filterUtils.js";
import logger from "#utils/logger.js";
import { paginateQuery } from "#utils/paginationUtils.js";
import StreamingUtils from "#utils/streamingUtils.js";
import CryptoUtils from "#utils/cryptoUtils.js";

// ─── Controllers ──────────────────────────────────────────────────────────────

/**
 * @desc    Get files in a folder
 * @route   GET /api/v1/files
 * @access  Private
 */
export const getFiles = asyncHandler(async (req, res) => {
  const { folderId, search, extension, isFavorite, recursive } = req.query;

  let query = { user: req.user.id, is_deleted: false };

  if (search && search !== "null" && search !== "undefined") {
    query.name = { $regex: search, $options: "i" };
  }

  const isRecursive = recursive === "true" || recursive === true;
  const isFav = isFavorite === "true" || isFavorite === true;
  const category = req.query.category;

  if (folderId && folderId !== "null" && folderId !== "undefined") {
    if (!(search && isRecursive)) {
      query.folder = folderId;
    }
  } else if (!search && !isRecursive && !isFav && !category) {
    query.folder = null;
  }

  if (extension) {
    query.extension = extension.toLowerCase();
  }

  if (isFav) {
    query.is_favorite = true;
  }

  query = applyAdvancedFilters(query, req.query, false);

  const pg = req.query.pg || req.query.pn;
  const ps = req.query.ps;
  const sort = isFav ? "-favorited_at" : "-createdAt";

  const result = await paginateQuery(File, query, {
    pg,
    ps,
    sort,
    populate: { path: "folder", select: "name" },
  });

  return ResponseUtils.success(res, result);
});

/**
 * @desc    Upload file (small files ≤ 5 GB; chunked handled separately)
 * @route   POST /api/v1/files/upload
 * @access  Private
 */
export const uploadFile = asyncHandler(async (req, res) => {
  if (!req.file) {
    return ResponseUtils.error(res, ErrorMessages.FILE_REQUIRED, HttpStatus.BAD_REQUEST);
  }

  const { folderId } = req.body;

  try {
    const file = await FileService.processUpload(req.user.id, folderId, req.file);

    const updatedUser = await User.findById(req.user.id);
    SocketService.emitToUser(req.user.id, "QUOTA_UPDATE", {
      quota_bytes: updatedUser.quota_bytes,
      used_bytes: updatedUser.used_bytes,
    });

    SocketService.emitToUser(req.user.id, "FILE_CHANGE", {
      action: "UPLOAD",
      fileId: file._id,
      folderId,
    });

    return ResponseUtils.success(res, file, HttpStatus.CREATED);
  } catch (err) {
    if (err.message === ErrorMessages.QUOTA_EXCEEDED) {
      return ResponseUtils.error(res, err.message, HttpStatus.FORBIDDEN);
    }
    throw err;
  }
});

/**
 * @desc    Download original file (forces browser save-as)
 * @route   GET /api/v1/files/:id/download
 * @access  Private
 */
export const downloadFile = asyncHandler(async (req, res) => {
  const file = await File.findOne({ _id: req.params.id, user: req.user.id });

  if (!file) {
    return ResponseUtils.error(res, ErrorMessages.FILE_NOT_FOUND, HttpStatus.NOT_FOUND);
  }
  if (!fs.existsSync(file.storage_path)) {
    return ResponseUtils.error(res, ErrorMessages.PHYSICAL_FILE_NOT_FOUND, HttpStatus.NOT_FOUND);
  }

  const user = await User.findById(req.user.id).select("+encryption_key_wrapped");
  if (!user || !user.encryption_key_wrapped || !file.encryption_iv) {
    return ResponseUtils.error(res, "Encryption keys missing", HttpStatus.INTERNAL_SERVER_ERROR);
  }

  // Update last opened timestamp
  file.last_opened_at = new Date();
  await file.save();

  const plaintextKey = CryptoUtils.unwrapUserKey(user.encryption_key_wrapped);
  const iv = Buffer.from(file.encryption_iv, "hex");
  const decipherStream = CryptoUtils.getDecipherStream(plaintextKey, iv);

  // Set appropriate headers to force download
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

/**
 * @desc    Stream or preview a file inline (images, video, audio)
 * @route   GET /api/v1/files/:id/preview
 * @access  Private
 *
 * Query params:
 *   ?thumbnail=true  → serve a 300×300 JPEG thumbnail (generated lazily on first request)
 *
 * For videos (no ?thumbnail): serves via HTTP Range — browser plays inline without downloading.
 *   - Native formats (MP4, WebM): served directly from storage_path.
 *   - Non-native (MOV, AVI, MKV…): transcoded to MP4 once, cached in previews/, served via Range.
 */
export const getFilePreview = asyncHandler(async (req, res) => {
  const file = await File.findOne({ _id: req.params.id, user: req.user.id });
  if (!file) {
    return ResponseUtils.error(res, ErrorMessages.FILE_NOT_FOUND, HttpStatus.NOT_FOUND);
  }

  // Update last opened timestamp
  file.last_opened_at = new Date();
  await file.save();

  const isThumbnail = req.query.thumbnail === "true";
  const userId = file.user.toString();
  const fileId = file._id.toString();

  // ── Thumbnail request ────────────────────────────────────────────────────────
  if (isThumbnail) {
    const thumbDir = FileService.getThumbnailDir(userId);
    const thumbPath = path.join(thumbDir, `${fileId}.jpg`);

    if (!fs.existsSync(thumbPath)) {
      if (!fs.existsSync(file.storage_path)) {
        return res.status(HttpStatus.ACCEPTED).send(""); // original missing, no thumb possible
      }
      try {
        const user = await User.findById(req.user.id).select("+encryption_key_wrapped");
        if (!user || !user.encryption_key_wrapped || !file.encryption_iv) {
          throw new Error("Encryption keys missing");
        }
        const plaintextKey = CryptoUtils.unwrapUserKey(user.encryption_key_wrapped);
        const iv = Buffer.from(file.encryption_iv, "hex");
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

        // Verify temp file was actually created
        if (fs.existsSync(tempThumbPath)) {
          // Encrypt temp thumb to final path
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
          logger.warn(`[Preview] Thumbnail generation returned but file missing for ${fileId}`);
          return res.status(HttpStatus.ACCEPTED).send("");
        }
      } catch (err) {
        logger.warn(`[Preview] Thumbnail generation failed for ${fileId}: ${err.message}`);
        // Return 202 Accepted to signal "processing failed/retry" rather than 500
        return res.status(HttpStatus.ACCEPTED).send("");
      }
    }

    if (file.thumbnail_iv) {
      const user = await User.findById(req.user.id).select("+encryption_key_wrapped");
      if (!user || !user.encryption_key_wrapped) {
        return res.status(HttpStatus.INTERNAL_SERVER_ERROR).send("Encryption key missing");
      }
      const plaintextKey = CryptoUtils.unwrapUserKey(user.encryption_key_wrapped);
      const thumbIv = Buffer.from(file.thumbnail_iv, "hex");
      const decipherStream = CryptoUtils.getDecipherStream(plaintextKey, thumbIv);

      const stats = fs.statSync(thumbPath);
      res.set("Content-Type", "image/jpeg");
      res.set("Cache-Control", "private, max-age=86400");
      res.set("Content-Length", stats.size);

      const readStream = fs.createReadStream(thumbPath);
      readStream.on("error", () => res.end());
      decipherStream.on("error", () => res.end());

      return readStream.pipe(decipherStream).pipe(res);
    } else {
      // Backwards compat for old unencrypted thumbnails if any
      res.set("Content-Type", "image/jpeg");
      res.set("Cache-Control", "private, max-age=86400");
      return res.sendFile(path.resolve(thumbPath));
    }
  }

  // ── Video preview — direct Range stream (all formats) ───────────────────────
  if (file.category === FileCategories.VIDEO) {
    if (!fs.existsSync(file.storage_path)) {
      return ResponseUtils.error(res, ErrorMessages.PHYSICAL_FILE_NOT_FOUND, HttpStatus.NOT_FOUND);
    }

    const user = await User.findById(req.user.id).select("+encryption_key_wrapped");
    if (!user || !user.encryption_key_wrapped || !file.encryption_iv) {
      return ResponseUtils.error(res, "Encryption keys missing", HttpStatus.INTERNAL_SERVER_ERROR);
    }
    const plaintextKey = CryptoUtils.unwrapUserKey(user.encryption_key_wrapped);
    const iv = Buffer.from(file.encryption_iv, "hex");

    // Serve the original file directly via HTTP Range to support seeking.
    // Use video/mp4 for non-native containers (.mov, .avi, .mkv) to help browser compatibility.
    const mimeType = MediaUtils.needsVideoPreview(file.storage_path, file.mime_type)
      ? VideoMimeTypes.MP4
      : file.mime_type;
    return StreamingUtils.serveWithRange(res, file.storage_path, mimeType, req.headers.range, plaintextKey, iv);
  }

  // ── Audio preview/stream — HTTP Range ────────────────────────────────────────
  if (file.category === FileCategories.AUDIO) {
    if (!fs.existsSync(file.storage_path)) {
      return ResponseUtils.error(res, ErrorMessages.PHYSICAL_FILE_NOT_FOUND, HttpStatus.NOT_FOUND);
    }

    const user = await User.findById(req.user.id).select("+encryption_key_wrapped");
    if (!user || !user.encryption_key_wrapped || !file.encryption_iv) {
      return ResponseUtils.error(res, "Encryption keys missing", HttpStatus.INTERNAL_SERVER_ERROR);
    }
    const plaintextKey = CryptoUtils.unwrapUserKey(user.encryption_key_wrapped);
    const iv = Buffer.from(file.encryption_iv, "hex");

    return StreamingUtils.serveWithRange(res, file.storage_path, file.mime_type, req.headers.range, plaintextKey, iv);
  }

  // ── Image preview — inline serve ─────────────────────────────────────────────
  if (file.mime_type?.startsWith("image/")) {
    if (!fs.existsSync(file.storage_path)) {
      return ResponseUtils.error(res, ErrorMessages.PHYSICAL_FILE_NOT_FOUND, HttpStatus.NOT_FOUND);
    }

    const ext = path.extname(file.storage_path).toLowerCase();
    const isHeic = ext === ".heic" || ext === ".heif";

    if (isHeic) {
      try {
        const inputBuffer = await fs.promises.readFile(file.storage_path);
        const heicConvert = (await import("heic-convert")).default;
        const outputBuffer = await heicConvert({ buffer: inputBuffer, format: "JPEG", quality: 0.8 });
        res.set("Content-Type", "image/jpeg");
        res.set("Cache-Control", "private, max-age=3600");
        return res.send(Buffer.from(outputBuffer));
      } catch (err) {
        logger.error(`[Preview] HEIC conversion failed for ${fileId}: ${err.message}`);
        // Fall through to direct serve
      }
    }

    const user = await User.findById(req.user.id).select("+encryption_key_wrapped");
    if (!user || !user.encryption_key_wrapped || !file.encryption_iv) {
      return ResponseUtils.error(res, "Encryption keys missing", HttpStatus.INTERNAL_SERVER_ERROR);
    }
    const plaintextKey = CryptoUtils.unwrapUserKey(user.encryption_key_wrapped);
    const iv = Buffer.from(file.encryption_iv, "hex");

    res.set("Content-Type", file.mime_type);
    res.set("Cache-Control", "private, max-age=3600");
    res.set("Content-Disposition", "inline");
    res.set("Content-Length", file.size_bytes);

    const readStream = fs.createReadStream(file.storage_path);
    const decipherStream = CryptoUtils.getDecipherStream(plaintextKey, iv);

    readStream.on("error", () => res.end());
    decipherStream.on("error", () => res.end());

    return readStream.pipe(decipherStream).pipe(res);
  }

  // ── Other file types: not previewable ────────────────────────────────────────
  return ResponseUtils.error(res, "Preview not supported for this file type", HttpStatus.BAD_REQUEST);
});

/**
 * @desc    Stream file — direct Range for native formats, on-the-fly ffmpeg pipe for non-native
 * @route   GET /api/v1/files/:id/stream
 * @access  Private
 *
 * This endpoint is the fallback: the frontend calls /preview first (direct bytes).
 * If the browser can't play the format, it retries here for an on-the-fly MP4 transcode.
 */
export const streamFile = asyncHandler(async (req, res) => {
  const file = await File.findOne({ _id: req.params.id, user: req.user.id });
  if (!file) {
    return ResponseUtils.error(res, ErrorMessages.FILE_NOT_FOUND, HttpStatus.NOT_FOUND);
  }

  if (file.category !== FileCategories.VIDEO && file.category !== FileCategories.AUDIO) {
    return ResponseUtils.error(res, "Streaming not supported for this file type", HttpStatus.BAD_REQUEST);
  }

  if (!fs.existsSync(file.storage_path)) {
    return ResponseUtils.error(res, ErrorMessages.PHYSICAL_FILE_NOT_FOUND, HttpStatus.NOT_FOUND);
  }

  const user = await User.findById(req.user.id).select("+encryption_key_wrapped");
  if (!user || !user.encryption_key_wrapped || !file.encryption_iv) {
    return ResponseUtils.error(res, "Encryption keys missing", HttpStatus.INTERNAL_SERVER_ERROR);
  }

  const plaintextKey = CryptoUtils.unwrapUserKey(user.encryption_key_wrapped);
  const iv = Buffer.from(file.encryption_iv, "hex");

  // Non-native video: on-the-fly transcode via ffmpeg pipe (zero disk usage)
  if (file.category === FileCategories.VIDEO && MediaUtils.needsVideoPreview(file.storage_path, file.mime_type)) {
    logger.info(`[Stream] On-the-fly transcode ${file.mime_type} → MP4 pipe for file ${file._id}`);
    res.writeHead(200, {
      "Content-Type": "video/mp4",
      "Content-Disposition": "inline",
      "Cache-Control": "private, no-store",
    });

    // We create a decrypted stream to pipe to MediaUtils (which connects it to ffmpeg)
    const decipherStream = CryptoUtils.getDecipherStream(plaintextKey, iv);
    const sourceStream = fs.createReadStream(file.storage_path).pipe(decipherStream);

    return MediaUtils.pipeTranscodeStream(sourceStream, res);
  }

  // Native format (MP4, WebM) or audio: serve directly via Range
  return StreamingUtils.serveWithRange(res, file.storage_path, file.mime_type, req.headers.range, plaintextKey, iv);
});

/**
 * @desc    Rename file (display name only — physical path never changes)
 * @route   PATCH /api/v1/files/:id
 * @access  Private
 */
export const renameFile = asyncHandler(async (req, res) => {
  const { name } = req.body;
  const file = await File.findOneAndUpdate({ _id: req.params.id, user: req.user.id }, { name }, { new: true });

  if (!file) {
    return ResponseUtils.error(res, ErrorMessages.FILE_NOT_FOUND, HttpStatus.NOT_FOUND);
  }

  SocketService.emitToUser(req.user.id, "FILE_CHANGE", { action: "RENAME", fileId: file._id, name });

  return ResponseUtils.success(res, file);
});

/**
 * @desc    Move file to folder
 * @route   POST /api/v1/files/:id/move
 * @access  Private
 */
export const moveFile = asyncHandler(async (req, res) => {
  const { folderId } = req.body;

  if (folderId) {
    const folder = await Folder.findOne({ _id: folderId, user: req.user.id });
    if (!folder) {
      return ResponseUtils.error(res, ErrorMessages.FOLDER_NOT_FOUND, HttpStatus.NOT_FOUND);
    }
  }

  const file = await DbUtils.moveItem(ItemTypes.FILE, req.params.id, folderId, req.user.id);
  if (!file) {
    return ResponseUtils.error(res, ErrorMessages.FILE_NOT_FOUND, HttpStatus.NOT_FOUND);
  }

  SocketService.emitToUser(req.user.id, "FILE_CHANGE", { action: "MOVE", fileId: file._id, destFolderId: folderId });

  return ResponseUtils.success(res, file);
});

/**
 * @desc    Copy file
 * @route   POST /api/v1/files/:id/copy
 * @access  Private
 */
export const copyFile = asyncHandler(async (req, res) => {
  const { folderId } = req.body;
  const file = await DbUtils.copyRecursive(ItemTypes.FILE, req.params.id, folderId, req.user.id);
  if (!file) {
    return ResponseUtils.error(res, ErrorMessages.FILE_NOT_FOUND, HttpStatus.NOT_FOUND);
  }

  const user = await User.findById(req.user.id);
  SocketService.emitToUser(req.user.id, "QUOTA_UPDATE", { quota_bytes: user.quota_bytes, used_bytes: user.used_bytes });
  SocketService.emitToUser(req.user.id, "FILE_CHANGE", { action: "COPY", folderId });

  return ResponseUtils.success(res, file);
});

/**
 * @desc    Soft-delete file (moves to trash)
 * @route   DELETE /api/v1/files/:id
 * @access  Private
 */
export const deleteFile = asyncHandler(async (req, res) => {
  const file = await File.findOne({ _id: req.params.id, user: req.user.id });
  if (!file) {
    return ResponseUtils.error(res, ErrorMessages.FILE_NOT_FOUND, HttpStatus.NOT_FOUND);
  }

  await DbUtils.softDeleteRecursive(ItemTypes.FILE, req.params.id, req.user.id, true);

  SocketService.emitToUser(req.user.id, "FILE_CHANGE", { action: "DELETE", fileId: req.params.id });

  return ResponseUtils.success(res, { message: "File moved to trash" });
});

/**
 * @desc    Bulk delete files
 * @route   POST /api/v1/files/bulk-delete
 * @access  Private
 */
export const bulkDelete = asyncHandler(async (req, res) => {
  const { items } = req.body;
  for (const item of items) {
    await DbUtils.softDeleteRecursive(item.type, item.id, req.user.id, true);
  }
  SocketService.emitToUser(req.user.id, "FILE_CHANGE", { action: "BULK_DELETE", items });
  return ResponseUtils.success(res, { message: "Items moved to trash" });
});

/**
 * @desc    Get recent files
 * @route   GET /api/v1/files/recent
 * @access  Private
 */
/**
 * @desc    Get recent files and folders
 * @route   GET /api/v1/files/recent
 * @access  Private
 */
export const getRecentFiles = asyncHandler(async (req, res) => {
  const { limit, search } = req.query;

  let query = { user: req.user.id, is_deleted: false };

  if (search && search !== "null" && search !== "undefined") {
    query.name = { $regex: search, $options: "i" };
  }

  query = applyAdvancedFilters(query, req.query, false);

  const pg = req.query.pg || req.query.pn;
  const ps = req.query.ps;
  // Fallback to limit if provided (backward compatibility)
  const pageSize = ps || limit || 50;

  const result = await paginateQuery(File, query, {
    pg,
    ps: pageSize,
    sort: "-last_opened_at",
    populate: { path: "folder", select: "name" },
  });

  // Maintain backward compatibility by returning array if no pg is provided
  if (!pg) {
    const mappedFiles = result.data.map((f) => ({ ...f.toObject(), type: ItemTypes.FILE }));
    return ResponseUtils.success(res, mappedFiles);
  }

  return ResponseUtils.success(res, result);
});

/**
 * @desc    Touch a file (update last_opened_at)
 * @route   POST /api/v1/files/:id/touch
 * @access  Private
 */
export const touchFile = asyncHandler(async (req, res) => {
  const file = await File.findOne({ _id: req.params.id, user: req.user.id });
  if (!file) {
    return ResponseUtils.error(res, ErrorMessages.FILE_NOT_FOUND, HttpStatus.NOT_FOUND);
  }

  file.last_opened_at = new Date();
  await file.save();

  return ResponseUtils.success(res, { message: "File touched" });
});

/**
 * @desc    Toggle favorite status
 * @route   PATCH /api/v1/files/:id/favorite
 * @access  Private
 */
export const toggleFavorite = asyncHandler(async (req, res) => {
  const file = await File.findOne({ _id: req.params.id, user: req.user.id });
  if (!file) {
    return ResponseUtils.error(res, ErrorMessages.FILE_NOT_FOUND, HttpStatus.NOT_FOUND);
  }

  file.is_favorite = !file.is_favorite;
  file.favorited_at = file.is_favorite ? new Date() : null;
  await file.save();

  return ResponseUtils.success(res, file);
});

/**
 * @desc    Update file tags
 * @route   PATCH /api/v1/files/:id/tags
 * @access  Private
 */
export const updateFileTags = asyncHandler(async (req, res) => {
  const { tags } = req.body;
  const file = await File.findOneAndUpdate({ _id: req.params.id, user: req.user.id }, { tags }, { new: true });
  if (!file) {
    return ResponseUtils.error(res, ErrorMessages.FILE_NOT_FOUND, HttpStatus.NOT_FOUND);
  }
  return ResponseUtils.success(res, file);
});

/**
 * @desc    Download multiple files/folders as a ZIP
 * @route   POST /api/v1/files/bulk-download
 * @access  Private
 */
export const downloadAsZip = asyncHandler(async (req, res) => {
  let { items } = req.body;
  const { payload } = req.body;

  if (!items && payload) {
    try {
      const parsed = JSON.parse(payload);
      items = parsed.items;
    } catch (_err) {
      return ResponseUtils.error(res, "Invalid payload format", HttpStatus.BAD_REQUEST);
    }
  }

  if (!items || !items.length) {
    return ResponseUtils.error(res, "No items selected for download", HttpStatus.BAD_REQUEST);
  }

  const zipItems = await FileService.prepareZipPayload(req.user.id, items);

  if (zipItems.length === 0) {
    return ResponseUtils.error(res, "No valid files found for download", HttpStatus.NOT_FOUND);
  }

  res.attachment(`cloud-drive-download-${Date.now()}.zip`);
  await MediaUtils.createZipStream(zipItems, res);
});

/**
 * @desc    Bulk move items
 * @route   POST /api/v1/files/bulk-move
 * @access  Private
 */
export const bulkMove = asyncHandler(async (req, res) => {
  const { items, targetFolderId } = req.body;
  if (targetFolderId) {
    const folder = await Folder.findOne({ _id: targetFolderId, user: req.user.id });
    if (!folder) {
      return ResponseUtils.error(res, ErrorMessages.FOLDER_NOT_FOUND, HttpStatus.NOT_FOUND);
    }
  }

  await FileService.bulkMove(req.user.id, items, targetFolderId);
  SocketService.emitToUser(req.user.id, "ITEM_BULK_CHANGE", { action: "MOVE", items, targetFolderId });
  return ResponseUtils.success(res, { message: "Items moved successfully" });
});

/**
 * @desc    Bulk copy items
 * @route   POST /api/v1/files/bulk-copy
 * @access  Private
 */
export const bulkCopy = asyncHandler(async (req, res) => {
  const { items, targetFolderId } = req.body;
  if (targetFolderId) {
    const folder = await Folder.findOne({ _id: targetFolderId, user: req.user.id });
    if (!folder) {
      return ResponseUtils.error(res, ErrorMessages.FOLDER_NOT_FOUND, HttpStatus.NOT_FOUND);
    }
  }

  await FileService.bulkCopy(req.user.id, items, targetFolderId);
  const user = await User.findById(req.user.id);

  SocketService.emitToUser(req.user.id, "QUOTA_UPDATE", { quota_bytes: user.quota_bytes, used_bytes: user.used_bytes });
  SocketService.emitToUser(req.user.id, "ITEM_BULK_CHANGE", { action: "COPY", targetFolderId });
  return ResponseUtils.success(res, { message: "Items copied successfully" });
});
