// Native modules
import fs from "fs";
import os from "os";
import path from "path";

// Packages
import multer from "multer";

// Models
import File from "../models/File.js";
import Folder from "../models/Folder.js";
import User from "../models/User.js";

// Services
import FileService from "../services/file.service.js";
import MetadataService from "../services/metadata.service.js";
import SocketService from "../services/socket.service.js";

// Constants
import { ErrorMessages, StatusCodes, ItemTypes } from "../constants/generalConstants.js";

// Middleware
import asyncHandler from "../middleware/asyncHandler.js";

// Utils
import ResponseHelper from "../utils/responseHelper.js";
import DbUtils from "../utils/dbUtils.js";
import MediaUtils from "../utils/mediaUtils.js";
import FileUtils from "../utils/fileUtils.js";
import logger from "../utils/logger.js";

// ─── Range Streaming Helper ───────────────────────────────────────────────────

/**
 * Serve a file using HTTP 206 Partial Content (YouTube-style progressive streaming).
 * The browser requests only the bytes it needs right now; seeks trigger new Range requests.
 * Always sets Content-Disposition: inline so the browser plays inline, never prompts download.
 *
 * @param {object} res - Express response
 * @param {string} filePath - Absolute path to the file to serve
 * @param {string} mimeType - MIME type to set on the response
 * @param {string|null} rangeHeader - Value of the request Range header (may be undefined)
 */
function serveWithRange(res, filePath, mimeType, rangeHeader) {
  const stat = fs.statSync(filePath);
  const fileSize = stat.size;

  const sharedHeaders = {
    "Content-Type": mimeType,
    "Content-Disposition": "inline",
    "Accept-Ranges": "bytes",
    "Cache-Control": "private, no-store", // no-store prevents caching error responses
  };

  let stream;

  if (rangeHeader) {
    const parts = rangeHeader.replace(/bytes=/, "").split("-");
    const start = parseInt(parts[0], 10) || 0;
    // Guard against empty end (e.g. "bytes=0-") → use fileSize - 1
    const end = parts[1] && parts[1].trim() !== "" ? parseInt(parts[1], 10) : fileSize - 1;
    const chunkSize = end - start + 1;

    res.writeHead(206, {
      ...sharedHeaders,
      "Content-Range": `bytes ${start}-${end}/${fileSize}`,
      "Content-Length": chunkSize,
    });
    stream = fs.createReadStream(filePath, { start, end });
  } else {
    res.writeHead(200, {
      ...sharedHeaders,
      "Content-Length": fileSize,
    });
    stream = fs.createReadStream(filePath);
  }

  // Guard against stream errors after headers are sent (e.g. file deleted mid-stream)
  stream.on("error", (err) => {
    logger.error(`[Stream] Read stream error for ${filePath}: ${err.message}`);
    if (!res.writableEnded) {
      res.end();
    }
  });

  stream.pipe(res);
}

// ─── Allowed MIME Types ───────────────────────────────────────────────────────

const ALLOWED_MIME_TYPES = new Set([
  // Images
  "image/jpeg",
  "image/png",
  "image/gif",
  "image/webp",
  "image/avif",
  "image/tiff",
  "image/bmp",
  "image/svg+xml",
  "image/heic",
  "image/heif",
  // Videos
  "video/mp4",
  "video/webm",
  "video/quicktime",
  "video/x-msvideo",
  "video/x-matroska",
  "video/x-flv",
  "video/mpeg",
  "video/3gpp",
  "video/ogg",
  "video/x-ms-wmv",
  "video/mp2t",
  // Audio
  "audio/mpeg",
  "audio/flac",
  "audio/ogg",
  "audio/wav",
  "audio/aac",
  "audio/mp4",
  "audio/x-m4a",
  "audio/opus",
  "audio/webm",
  "audio/x-aiff",
  "audio/x-ms-wma",
  // Documents
  "application/pdf",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/vnd.ms-excel",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "application/vnd.ms-powerpoint",
  "application/vnd.openxmlformats-officedocument.presentationml.presentation",
  "text/plain",
  "text/csv",
  "text/markdown",
  // Archives
  "application/zip",
  "application/x-rar-compressed",
  "application/x-7z-compressed",
  "application/x-tar",
  "application/gzip",
  // Chunked uploads
  "application/octet-stream",
]);

// ─── Multer — writes to OS temp dir; we rename to stable path after DB insert ─

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, os.tmpdir()),
  filename: (_req, file, cb) => {
    const sanitized = path.basename(file.originalname);
    cb(null, `${Date.now()}-${sanitized}`);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 * 1024 }, // 5 GB cap
  fileFilter: (_req, file, cb) => {
    if (ALLOWED_MIME_TYPES.has(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error(ErrorMessages.FILE_TYPE_NOT_ALLOWED), false);
    }
  },
});

export const uploadMiddleware = upload.single("file");

// ─── Controllers ──────────────────────────────────────────────────────────────

/**
 * @desc    Get files in a folder
 * @route   GET /api/v1/files
 * @access  Private
 */
export const getFiles = asyncHandler(async (req, res) => {
  const { folderId, search, category, extension, isFavorite, minSize, maxSize, startDate, endDate, recursive, tag } =
    req.query;

  const query = { user: req.user.id, is_deleted: false };

  if (search) {
    query.name = { $regex: search, $options: "i" };
  }

  if (folderId && folderId !== "null") {
    if (!(search && recursive)) {
      query.folder = folderId;
    }
  } else if (!search || !recursive) {
    query.folder = null;
  }

  if (category) {
    query.category = category;
  }
  if (extension) {
    query.extension = extension.toLowerCase();
  }
  if (isFavorite) {
    query.is_favorite = true;
  }

  if (minSize || maxSize) {
    query.size_bytes = {};
    if (minSize) {
      query.size_bytes.$gte = parseInt(minSize);
    }
    if (maxSize) {
      query.size_bytes.$lte = parseInt(maxSize);
    }
  }

  if (startDate || endDate) {
    query.createdAt = {};
    if (startDate) {
      query.createdAt.$gte = new Date(startDate);
    }
    if (endDate) {
      query.createdAt.$lte = new Date(endDate);
    }
  }

  if (tag) {
    query.tags = tag;
  }

  const page = Math.max(1, parseInt(req.query.pn) || 1);
  const limit = Math.min(200, Math.max(1, parseInt(req.query.ps) || 50));
  const skip = (page - 1) * limit;

  const [files, total] = await Promise.all([
    File.find(query).sort("-createdAt").skip(skip).limit(limit),
    File.countDocuments(query),
  ]);

  return ResponseHelper.success(res, files, StatusCodes.OK, {
    count: files.length,
    total,
    page,
    pages: Math.ceil(total / limit),
  });
});

/**
 * @desc    Upload file (small files ≤ 5 GB; chunked handled separately)
 * @route   POST /api/v1/files/upload
 * @access  Private
 */
export const uploadFile = asyncHandler(async (req, res) => {
  if (!req.file) {
    return ResponseHelper.error(res, ErrorMessages.FILE_REQUIRED, StatusCodes.BAD_REQUEST);
  }

  const { folderId } = req.body;

  const hasQuota = await FileService.checkQuota(req.user.id, req.file.size);
  if (!hasQuota) {
    FileUtils.cleanupFile(req.file.path);
    return ResponseHelper.error(res, ErrorMessages.QUOTA_EXCEEDED, StatusCodes.FORBIDDEN);
  }

  const sanitizedOriginalName = path.basename(req.file.originalname);
  const uniqueName = await FileService.getUniqueFilename(req.user.id, folderId, sanitizedOriginalName);
  const extension = FileUtils.getFileExtension(req.file.originalname);
  const category = MetadataService.getCategory(req.file.mimetype, req.file.originalname);

  const [{ metadata, extra }, hash] = await Promise.all([
    MetadataService.extractMetadata(req.file.path, category),
    MetadataService.calculateHash(req.file.path),
  ]);

  // Create DB record first to obtain a stable _id
  const file = await File.create({
    name: uniqueName,
    original_name: sanitizedOriginalName,
    user: req.user.id,
    folder: folderId === "null" || !folderId ? null : folderId,
    mime_type: req.file.mimetype,
    extension,
    category,
    size_bytes: req.file.size,
    storage_path: "pending", // will be updated below
    metadata,
    hash,
    ...extra,
  });

  // Copy+unlink instead of rename (cross-device safe: tmpdir and NAS are different mount points)
  const stablePath = FileService.getPhysicalFilePath(req.user.id, file._id.toString(), `.${extension}`);
  await fs.promises.copyFile(req.file.path, stablePath);
  await fs.promises.unlink(req.file.path);
  file.storage_path = stablePath;
  await file.save();

  await User.findByIdAndUpdate(req.user.id, { $inc: { used_bytes: req.file.size } });
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

  // No background processing — all derivatives are lazy
  return ResponseHelper.success(res, file, StatusCodes.CREATED);
});

/**
 * @desc    Download original file (forces browser save-as)
 * @route   GET /api/v1/files/:id/download
 * @access  Private
 */
export const downloadFile = asyncHandler(async (req, res) => {
  const file = await File.findOne({ _id: req.params.id, user: req.user.id });

  if (!file) {
    return ResponseHelper.error(res, ErrorMessages.FILE_NOT_FOUND, StatusCodes.NOT_FOUND);
  }
  if (!fs.existsSync(file.storage_path)) {
    return ResponseHelper.error(res, ErrorMessages.PHYSICAL_FILE_NOT_FOUND, StatusCodes.NOT_FOUND);
  }

  // Force download with the original display name
  res.download(file.storage_path, file.original_name || file.name);
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
    return ResponseHelper.error(res, ErrorMessages.FILE_NOT_FOUND, StatusCodes.NOT_FOUND);
  }

  const useThumb = req.query.thumbnail === "true";
  const userId = file.user.toString();
  const fileId = file._id.toString();

  // ── Thumbnail request ────────────────────────────────────────────────────────
  if (useThumb) {
    const thumbDir = FileService.getThumbnailDir(userId);
    const thumbPath = path.join(thumbDir, `${fileId}.jpg`);

    if (!fs.existsSync(thumbPath)) {
      if (!fs.existsSync(file.storage_path)) {
        return res.status(StatusCodes.ACCEPTED).send(""); // original missing, no thumb possible
      }
      try {
        if (file.mime_type.startsWith("image/")) {
          await MediaUtils.generateImageThumbnail(file.storage_path, thumbPath);
        } else if (file.mime_type.startsWith("video/")) {
          await MediaUtils.generateVideoThumbnail(file.storage_path, thumbDir, `${fileId}.jpg`);
        } else if (file.category === "audio" || file.mime_type.startsWith("audio/")) {
          await MediaUtils.extractAudioAlbumArt(file.storage_path, thumbPath);
        } else {
          return res.status(StatusCodes.ACCEPTED).send("");
        }

        file.thumbnail_path = thumbPath;
        await file.save();
      } catch (err) {
        logger.warn(`[Preview] Thumbnail generation failed for ${fileId}: ${err.message}`);
        return res.status(StatusCodes.ACCEPTED).send("");
      }
    }

    res.set("Content-Type", "image/jpeg");
    res.set("Cache-Control", "private, max-age=86400");
    return res.sendFile(path.resolve(thumbPath));
  }

  // ── Video preview — direct Range stream (all formats) ───────────────────────
  if (file.category === "video") {
    if (!fs.existsSync(file.storage_path)) {
      return ResponseHelper.error(res, ErrorMessages.PHYSICAL_FILE_NOT_FOUND, StatusCodes.NOT_FOUND);
    }

    // Serve the original file directly via HTTP Range.
    // Use video/mp4 for non-native containers (.mov, .avi, .mkv) to help browser compatibility.
    const mimeType = MediaUtils.needsVideoPreview(file.storage_path, file.mime_type) ? "video/mp4" : file.mime_type;
    return serveWithRange(res, file.storage_path, mimeType, req.headers.range);
  }

  // ── Audio preview/stream — HTTP Range ────────────────────────────────────────
  if (file.category === "audio") {
    if (!fs.existsSync(file.storage_path)) {
      return ResponseHelper.error(res, ErrorMessages.PHYSICAL_FILE_NOT_FOUND, StatusCodes.NOT_FOUND);
    }
    return serveWithRange(res, file.storage_path, file.mime_type, req.headers.range);
  }

  // ── Image preview — inline serve ─────────────────────────────────────────────
  if (file.mime_type.startsWith("image/")) {
    if (!fs.existsSync(file.storage_path)) {
      return ResponseHelper.error(res, ErrorMessages.PHYSICAL_FILE_NOT_FOUND, StatusCodes.NOT_FOUND);
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

    res.set("Content-Type", file.mime_type);
    res.set("Cache-Control", "private, max-age=3600");
    res.set("Content-Disposition", "inline");
    return res.sendFile(path.resolve(file.storage_path));
  }

  // ── Other file types: not previewable ────────────────────────────────────────
  return ResponseHelper.error(res, "Preview not supported for this file type", StatusCodes.BAD_REQUEST);
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
    return ResponseHelper.error(res, ErrorMessages.FILE_NOT_FOUND, StatusCodes.NOT_FOUND);
  }

  if (file.category !== "video" && file.category !== "audio") {
    return ResponseHelper.error(res, "Streaming not supported for this file type", StatusCodes.BAD_REQUEST);
  }

  if (!fs.existsSync(file.storage_path)) {
    return ResponseHelper.error(res, ErrorMessages.PHYSICAL_FILE_NOT_FOUND, StatusCodes.NOT_FOUND);
  }

  // Non-native video: on-the-fly transcode via ffmpeg pipe (zero disk usage)
  if (file.category === "video" && MediaUtils.needsVideoPreview(file.storage_path, file.mime_type)) {
    logger.info(`[Stream] On-the-fly transcode ${file.mime_type} → MP4 pipe for file ${file._id}`);
    res.writeHead(200, {
      "Content-Type": "video/mp4",
      "Content-Disposition": "inline",
      "Cache-Control": "private, no-store",
    });
    return MediaUtils.pipeTranscode(file.storage_path, res);
  }

  // Native format (MP4, WebM) or audio: serve directly via Range
  return serveWithRange(res, file.storage_path, file.mime_type, req.headers.range);
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
    return ResponseHelper.error(res, ErrorMessages.FILE_NOT_FOUND, StatusCodes.NOT_FOUND);
  }

  SocketService.emitToUser(req.user.id, "FILE_CHANGE", { action: "RENAME", fileId: file._id, name });

  return ResponseHelper.success(res, file);
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
      return ResponseHelper.error(res, ErrorMessages.FOLDER_NOT_FOUND, StatusCodes.NOT_FOUND);
    }
  }

  const file = await DbUtils.moveItem(ItemTypes.FILE, req.params.id, folderId, req.user.id);
  if (!file) {
    return ResponseHelper.error(res, ErrorMessages.FILE_NOT_FOUND, StatusCodes.NOT_FOUND);
  }

  SocketService.emitToUser(req.user.id, "FILE_CHANGE", { action: "MOVE", fileId: file._id, destFolderId: folderId });

  return ResponseHelper.success(res, file);
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
    return ResponseHelper.error(res, ErrorMessages.FILE_NOT_FOUND, StatusCodes.NOT_FOUND);
  }

  const user = await User.findById(req.user.id);
  SocketService.emitToUser(req.user.id, "QUOTA_UPDATE", { quota_bytes: user.quota_bytes, used_bytes: user.used_bytes });
  SocketService.emitToUser(req.user.id, "FILE_CHANGE", { action: "COPY", folderId });

  return ResponseHelper.success(res, file);
});

/**
 * @desc    Soft-delete file (moves to trash)
 * @route   DELETE /api/v1/files/:id
 * @access  Private
 */
export const deleteFile = asyncHandler(async (req, res) => {
  const file = await File.findOne({ _id: req.params.id, user: req.user.id });
  if (!file) {
    return ResponseHelper.error(res, ErrorMessages.FILE_NOT_FOUND, StatusCodes.NOT_FOUND);
  }

  await DbUtils.softDeleteRecursive(ItemTypes.FILE, req.params.id, req.user.id, true);

  SocketService.emitToUser(req.user.id, "FILE_CHANGE", { action: "DELETE", fileId: req.params.id });

  return ResponseHelper.success(res, { message: "File moved to trash" });
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
  return ResponseHelper.success(res, { message: "Items moved to trash" });
});

/**
 * @desc    Get recent files
 * @route   GET /api/v1/files/recent
 * @access  Private
 */
export const getRecentFiles = asyncHandler(async (req, res) => {
  const { limit } = req.query;
  const files = await File.find({ user: req.user.id, is_deleted: false }).sort("-createdAt").limit(limit);
  return ResponseHelper.success(res, files);
});

/**
 * @desc    Toggle favorite status
 * @route   PATCH /api/v1/files/:id/favorite
 * @access  Private
 */
export const toggleFavorite = asyncHandler(async (req, res) => {
  const file = await File.findOne({ _id: req.params.id, user: req.user.id });
  if (!file) {
    return ResponseHelper.error(res, ErrorMessages.FILE_NOT_FOUND, StatusCodes.NOT_FOUND);
  }

  file.is_favorite = !file.is_favorite;
  await file.save();

  return ResponseHelper.success(res, file);
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
    return ResponseHelper.error(res, ErrorMessages.FILE_NOT_FOUND, StatusCodes.NOT_FOUND);
  }
  return ResponseHelper.success(res, file);
});

/**
 * @desc    Download multiple files/folders as a ZIP
 * @route   POST /api/v1/files/bulk-download
 * @access  Private
 */
export const downloadAsZip = asyncHandler(async (req, res) => {
  const { items } = req.body;
  if (!items || !items.length) {
    return ResponseHelper.error(res, "No items selected for download", StatusCodes.BAD_REQUEST);
  }

  const zipItems = [];
  for (const item of items) {
    if (item.type === "file") {
      const file = await File.findOne({ _id: item.id, user: req.user.id });
      if (file && fs.existsSync(file.storage_path)) {
        zipItems.push({ path: file.storage_path, name: file.original_name || file.name, type: "file" });
      }
    } else if (item.type === "folder") {
      await collectFolderFiles(item.id, req.user.id, "", zipItems);
    }
  }

  if (zipItems.length === 0) {
    return ResponseHelper.error(res, "No valid files found for download", StatusCodes.NOT_FOUND);
  }

  res.attachment(`cloud-drive-download-${Date.now()}.zip`);
  await MediaUtils.createZipStream(zipItems, res);
});

async function collectFolderFiles(folderId, userId, parentPath, zipItems) {
  const folder = await Folder.findOne({ _id: folderId, user: userId });
  if (!folder) {
    return;
  }

  const currentPath = parentPath ? `${parentPath}/${folder.name}` : folder.name;

  const files = await File.find({ folder: folderId, user: userId, is_deleted: false });
  for (const f of files) {
    if (fs.existsSync(f.storage_path)) {
      zipItems.push({ path: f.storage_path, name: `${currentPath}/${f.original_name || f.name}`, type: "file" });
    }
  }

  const subfolders = await Folder.find({ parent: folderId, user: userId, is_deleted: false });
  for (const sf of subfolders) {
    await collectFolderFiles(sf._id, userId, currentPath, zipItems);
  }
}

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
      return ResponseHelper.error(res, ErrorMessages.FOLDER_NOT_FOUND, StatusCodes.NOT_FOUND);
    }
  }

  await FileService.bulkMove(req.user.id, items, targetFolderId);
  SocketService.emitToUser(req.user.id, "ITEM_BULK_CHANGE", { action: "MOVE", items, targetFolderId });
  return ResponseHelper.success(res, { message: "Items moved successfully" });
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
      return ResponseHelper.error(res, ErrorMessages.FOLDER_NOT_FOUND, StatusCodes.NOT_FOUND);
    }
  }

  await FileService.bulkCopy(req.user.id, items, targetFolderId);
  const user = await User.findById(req.user.id);

  SocketService.emitToUser(req.user.id, "QUOTA_UPDATE", { quota_bytes: user.quota_bytes, used_bytes: user.used_bytes });
  SocketService.emitToUser(req.user.id, "ITEM_BULK_CHANGE", { action: "COPY", targetFolderId });
  return ResponseHelper.success(res, { message: "Items copied successfully" });
});
