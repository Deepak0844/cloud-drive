// Native modules
import fs from "fs";
import path from "path";

// Packages
import multer from "multer";

// Models
import File from "../models/File.js";
import Folder from "../models/Folder.js";
import User from "../models/User.js";

// Services
import FileService from "../services/file.service.js";
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

/**
 * @desc    Get files in a folder
 * @route   GET /api/v1/files
 * @access  Private
 */
export const getFiles = asyncHandler(async (req, res) => {
  const folderId = req.query.folderId || null;
  const search = req.query.search || null;

  const query = { user: req.user.id, is_deleted: false };

  if (search) {
    // Case-insensitive search on file name
    query.name = { $regex: search, $options: "i" };
    // If folderId is provided, search within that folder, otherwise search globally
    if (folderId) {
      query.folder = folderId;
    }
  } else {
    query.folder = folderId;
  }

  const files = await File.find(query).sort("-createdAt");
  return ResponseHelper.success(res, files, StatusCodes.OK, { count: files.length });
});

// Configure Multer Storage
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const userDir = FileService.getUserDir(req.user.id);
    cb(null, userDir);
  },
  filename: (req, file, cb) => {
    cb(null, `${Date.now()}-${file.originalname}`);
  },
});

const upload = multer({ storage: storage });

export const uploadMiddleware = upload.single("file");

/**
 * @desc    Upload file
 * @route   POST /api/v1/files/upload
 * @access  Private
 */
export const uploadFile = asyncHandler(async (req, res) => {
  if (!req.file) {
    return ResponseHelper.error(res, ErrorMessages.FILE_REQUIRED, StatusCodes.BAD_REQUEST);
  }

  const { folderId } = req.body;

  // Check quota via service
  const hasQuota = await FileService.checkQuota(req.user.id, req.file.size);
  if (!hasQuota) {
    FileUtils.cleanupFile(req.file.path);
    return ResponseHelper.error(res, ErrorMessages.QUOTA_EXCEEDED, StatusCodes.FORBIDDEN);
  }

  // Generate unique name
  const uniqueName = await FileService.getUniqueFilename(req.user.id, folderId, req.file.originalname);

  const file = await File.create({
    name: uniqueName,
    original_name: req.file.originalname,
    user: req.user.id,
    folder: folderId === "null" || !folderId ? null : folderId,
    mime_type: req.file.mimetype,
    size_bytes: req.file.size,
    storage_path: req.file.path,
  });

  // Update user quota
  const user = await User.findById(req.user.id);
  user.used_bytes += req.file.size;
  await user.save();

  SocketService.emitToUser(req.user.id, "QUOTA_UPDATE", {
    quota_bytes: user.quota_bytes,
    used_bytes: user.used_bytes,
  });

  SocketService.emitToUser(req.user.id, "FILE_CHANGE", {
    action: "UPLOAD",
    fileId: file._id,
    folderId,
  });

  // Background processing for thumbnails
  FileService.processThumbnails(file);

  return ResponseHelper.success(res, file, StatusCodes.CREATED);
});

/**
 * @desc    Download file
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

  res.download(file.storage_path, file.name);
});

/**
 * @desc    Get file preview
 * @route   GET /api/v1/files/:id/preview
 * @access  Private
 */
export const getFilePreview = asyncHandler(async (req, res) => {
  const file = await File.findOne({ _id: req.params.id, user: req.user.id });

  if (!file) {
    return ResponseHelper.error(res, ErrorMessages.FILE_NOT_FOUND, StatusCodes.NOT_FOUND);
  }

  const useThumb = req.query.thumbnail === "true";
  let filePath = useThumb && file.thumbnail_path ? file.thumbnail_path : file.storage_path;

  // For non-thumbnails, check if we need a transcoded preview (e.g. for MOV)
  const isMov = file.mime_type === "video/quicktime" || file.name.toLowerCase().endsWith(".mov");
  if (!useThumb && isMov) {
    if (file.preview_path && fs.existsSync(file.preview_path)) {
      filePath = file.preview_path;
    } else {
      // Attempt on-the-fly preview generation
      try {
        const previewDir = FileService.getPreviewDir(file.user.toString());
        const previewPath = path.join(previewDir, `${file._id}.mp4`);
        await MediaUtils.generateVideoPreview(file.storage_path, previewPath);

        file.preview_path = previewPath;
        await file.save();
        filePath = previewPath;
      } catch (e) {
        // Fall back to original storage_path (might not play in browser)
        console.error("On-the-fly video preview failed:", e);
      }
    }
  }

  // Check if file exists
  if (!fs.existsSync(filePath)) {
    // If thumbnail requested but missing, try generating on-the-fly
    if (useThumb && fs.existsSync(file.storage_path)) {
      if (file.mime_type.startsWith("image/")) {
        try {
          const thumbnailDir = FileService.getThumbnailDir(file.user.toString());
          const thumbPath = path.join(thumbnailDir, `${file._id}.jpg`);
          await MediaUtils.generateImageThumbnail(file.storage_path, thumbPath);

          file.thumbnail_path = thumbPath;
          await file.save();
          filePath = thumbPath;
        } catch (e) {
          console.error("On-the-fly image thumbnail failed:", e);
          // Fallback to original for images
          filePath = file.storage_path;
        }
      } else if (file.mime_type.startsWith("video/")) {
        try {
          const thumbnailDir = FileService.getThumbnailDir(file.user.toString());
          const thumbName = `${file._id}.jpg`;
          const thumbPath = await MediaUtils.generateVideoThumbnail(file.storage_path, thumbnailDir, thumbName);

          file.thumbnail_path = thumbPath;
          await file.save();
          filePath = thumbPath;
        } catch (e) {
          console.error("On-the-fly video thumbnail failed:", e);
          return ResponseHelper.error(res, ErrorMessages.THUMBNAIL_FAILED, StatusCodes.NOT_FOUND);
        }
      } else {
        return ResponseHelper.error(res, ErrorMessages.THUMBNAIL_NOT_AVAILABLE, StatusCodes.NOT_FOUND);
      }
    } else {
      return ResponseHelper.error(res, ErrorMessages.FILE_NOT_FOUND, StatusCodes.NOT_FOUND);
    }
  }

  // Handle HEIC conversion on-the-fly
  const isHeic = file.name.toLowerCase().endsWith(".heic") || file.name.toLowerCase().endsWith(".heif");
  if (isHeic && !useThumb) {
    try {
      const heicConvert = (await import("heic-convert")).default;
      const inputBuffer = await fs.promises.readFile(file.storage_path);
      const outputBuffer = await heicConvert({
        buffer: inputBuffer,
        format: "JPEG",
        quality: 0.8,
      });
      res.set("Content-Type", "image/jpeg");
      res.set("Cache-Control", "public, max-age=3600");
      return res.send(outputBuffer);
    } catch (error) {
      console.error("HEIC Conversion Error:", error);
      // Fall through to standard file serving
    }
  }

  // Standard file serving
  const absolutePath = path.resolve(filePath);
  let contentType = useThumb ? "image/jpeg" : file.mime_type;

  // If serving a transcoded preview, it's always an mp4
  if (!useThumb && isMov && filePath.endsWith(".mp4")) {
    contentType = "video/mp4";
  }

  res.set("Content-Type", contentType);
  res.set("Accept-Ranges", "bytes");
  res.set("Cache-Control", "public, max-age=3600");
  res.sendFile(absolutePath);
});

/**
 * @desc    Rename file
 * @route   PATCH /api/v1/files/:id
 * @access  Private
 */
export const renameFile = asyncHandler(async (req, res) => {
  const { name } = req.body;
  const file = await File.findOneAndUpdate({ _id: req.params.id, user: req.user.id }, { name }, { new: true });

  if (!file) {
    return ResponseHelper.error(res, ErrorMessages.FILE_NOT_FOUND, StatusCodes.NOT_FOUND);
  }

  SocketService.emitToUser(req.user.id, "FILE_CHANGE", {
    action: "RENAME",
    fileId: file._id,
    name,
  });

  return ResponseHelper.success(res, file);
});

/**
 * @desc    Move file to folder
 * @route   POST /api/v1/files/:id/move
 * @access  Private
 */
export const moveFile = asyncHandler(async (req, res) => {
  const { folderId } = req.body;
  const destFolderId = folderId;

  // Verify folder exists
  if (destFolderId) {
    const folder = await Folder.findOne({ _id: destFolderId, user: req.user.id });
    if (!folder) {
      return ResponseHelper.error(res, ErrorMessages.FOLDER_NOT_FOUND, StatusCodes.NOT_FOUND);
    }
  }

  const file = await DbUtils.moveItem(ItemTypes.FILE, req.params.id, destFolderId, req.user.id);

  if (!file) {
    return ResponseHelper.error(res, ErrorMessages.FILE_NOT_FOUND, StatusCodes.NOT_FOUND);
  }

  SocketService.emitToUser(req.user.id, "FILE_CHANGE", {
    action: "MOVE",
    fileId: file._id,
    destFolderId,
  });

  return ResponseHelper.success(res, file);
});

/**
 * @desc    Copy file
 * @route   POST /api/v1/files/:id/copy
 * @access  Private
 */
export const copyFile = asyncHandler(async (req, res) => {
  const { folderId } = req.body;
  const destFolderId = folderId;

  const file = await DbUtils.copyRecursive(ItemTypes.FILE, req.params.id, destFolderId, req.user.id);

  if (!file) {
    return ResponseHelper.error(res, ErrorMessages.FILE_NOT_FOUND, StatusCodes.NOT_FOUND);
  }

  const user = await User.findById(req.user.id);

  SocketService.emitToUser(req.user.id, "QUOTA_UPDATE", {
    quota_bytes: user.quota_bytes,
    used_bytes: user.used_bytes,
  });

  SocketService.emitToUser(req.user.id, "FILE_CHANGE", {
    action: "COPY",
    folderId: destFolderId,
  });

  return ResponseHelper.success(res, file);
});

/**
 * @desc    Delete file
 * @route   DELETE /api/v1/files/:id
 * @access  Private
 */
export const deleteFile = asyncHandler(async (req, res) => {
  const file = await File.findOne({ _id: req.params.id, user: req.user.id });

  if (!file) {
    return ResponseHelper.error(res, ErrorMessages.FILE_NOT_FOUND, StatusCodes.NOT_FOUND);
  }

  await DbUtils.softDeleteRecursive(ItemTypes.FILE, req.params.id, req.user.id, true);

  SocketService.emitToUser(req.user.id, "FILE_CHANGE", {
    action: "DELETE",
    fileId: req.params.id,
  });

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

  SocketService.emitToUser(req.user.id, "FILE_CHANGE", {
    action: "BULK_DELETE",
    items,
  });

  return ResponseHelper.success(res, { message: "Items moved to trash" });
});
