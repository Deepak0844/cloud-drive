import fs from "fs";
import multer from "multer";
import path from "path";

// Constants
import ErrorMessages from "../constants/errorMessages.js";
import StatusCodes from "../constants/statusCodes.js";

// Utils
import DbUtils from "../utils/dbUtils.js";
import ResponseHelper from "../utils/responseHelper.js";
import logger from "../utils/logger.js";

// Models
import File from "../models/File.js";
import User from "../models/User.js";
import Folder from "../models/Folder.js";

// Controllers
import { createNotification } from "./notification.controller.js";

// Services
import FileService from "../services/file.service.js";
import SocketService from "../services/socket.service.js";

// Middleware
import asyncHandler from "../middleware/asyncHandler.js";

// Schemas
import { renameFileSchema, moveFileSchema, bulkDeleteSchema } from "../schemas/file.schema.js";

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
 */
export const uploadFile = asyncHandler(async (req, res) => {
  if (!req.file) {
    return ResponseHelper.error(res, "Please upload a file", StatusCodes.BAD_REQUEST);
  }

  const { folderId } = req.body;

  // Check quota via service
  const hasQuota = await FileService.checkQuota(req.user.id, req.file.size);
  if (!hasQuota) {
    if (fs.existsSync(req.file.path)) {
      fs.unlinkSync(req.file.path);
    }
    return ResponseHelper.error(res, ErrorMessages.QUOTA_EXCEEDED, StatusCodes.FORBIDDEN);
  }

  // Generate unique name
  const uniqueName = await FileService.getUniqueFilename(
    req.user.id,
    folderId === "null" || !folderId ? null : folderId,
    req.file.originalname
  );

  // Create database entry
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

  // Process thumbnails via service
  await FileService.processThumbnails(file);

  // Notify user
  await createNotification(
    req.user.id,
    "UPLOAD_COMPLETE",
    "Upload Successful",
    `File ${req.file.originalname} has been uploaded successfully.`
  );

  // Emit socket events
  SocketService.emitToUser(req.user.id, "QUOTA_UPDATE", {
    quota_bytes: user.quota_bytes,
    used_bytes: user.used_bytes,
  });
  SocketService.emitToUser(req.user.id, "FILE_CHANGE", {
    action: "UPLOAD",
    folderId: file.folder,
  });

  return ResponseHelper.success(res, file, StatusCodes.CREATED);
});

/**
 * @desc    Get files for current user
 * @route   GET /api/v1/files
 */
export const getFiles = asyncHandler(async (req, res) => {
  const folderId = req.query.folder || null;
  const search = req.query.search || null;

  const query = { user: req.user.id, is_deleted: false };

  if (search) {
    query.name = { $regex: search, $options: "i" };
    if (folderId) {
      query.folder = folderId;
    }
  } else {
    query.folder = folderId;
  }

  const files = await File.find(query);

  return ResponseHelper.success(res, files, StatusCodes.OK, { count: files.length });
});

/**
 * @desc    Download file
 * @route   GET /api/v1/files/:id/download
 */
export const downloadFile = asyncHandler(async (req, res) => {
  const file = await File.findOne({ _id: req.params.id, user: req.user.id });

  if (!file) {
    return ResponseHelper.error(res, ErrorMessages.FILE_NOT_FOUND, StatusCodes.NOT_FOUND);
  }

  if (!fs.existsSync(file.storage_path)) {
    return ResponseHelper.error(res, "Physical file not found on server", StatusCodes.NOT_FOUND);
  }

  return res.download(file.storage_path, file.name);
});

/**
 * @desc    Delete file (Soft delete)
 * @route   DELETE /api/v1/files/:id
 */
export const deleteFile = asyncHandler(async (req, res) => {
  await DbUtils.softDeleteRecursive("file", req.params.id, req.user.id, true);

  // Emit socket event
  SocketService.emitToUser(req.user.id, "FILE_CHANGE", {
    action: "DELETE",
    fileId: req.params.id,
  });

  return ResponseHelper.success(res, {});
});

/**
 * @desc    Get file preview or thumbnail
 * @route   GET /api/v1/files/:id/preview
 */
export const getFilePreview = asyncHandler(async (req, res) => {
  const file = await File.findOne({ _id: req.params.id, user: req.user.id });

  if (!file) {
    return ResponseHelper.error(res, ErrorMessages.FILE_NOT_FOUND, StatusCodes.NOT_FOUND);
  }

  const useThumb = req.query.thumbnail === "true";
  let filePath = useThumb && file.thumbnail_path ? file.thumbnail_path : file.storage_path;

  // Processing logic
  const isMov = file.mime_type === "video/quicktime" || file.name.toLowerCase().endsWith(".mov");
  if (!useThumb && isMov) {
    if (file.preview_path && fs.existsSync(file.preview_path)) {
      filePath = file.preview_path;
    } else {
      // Attempt on-the-fly preview generation
      try {
        const { generateVideoPreview } = (await import("../utils/mediaUtils.js")).default;
        const previewDir = FileService.getPreviewDir(file.user.toString());
        const previewPath = path.join(previewDir, `${file._id}.mp4`);
        await generateVideoPreview(file.storage_path, previewPath);

        file.preview_path = previewPath;
        await file.save();
        filePath = previewPath;
      } catch (e) {
        logger.error("On-the-fly video preview failed:", e);
      }
    }
  }

  if (!fs.existsSync(filePath)) {
    if (useThumb && fs.existsSync(file.storage_path)) {
      if (file.mime_type.startsWith("image/")) {
        filePath = file.storage_path;
      } else if (file.mime_type.startsWith("video/")) {
        try {
          const { generateVideoThumbnail } = (await import("../utils/mediaUtils.js")).default;
          const thumbDir = FileService.getThumbnailDir(file.user.toString());
          const thumbName = `${file._id}.jpg`;
          const generatedPath = await generateVideoThumbnail(file.storage_path, thumbDir, thumbName);

          file.thumbnail_path = generatedPath;
          await file.save();
          filePath = generatedPath;
        } catch (e) {
          logger.error("On-the-fly video thumbnail failed:", e);
          return ResponseHelper.error(res, "Thumbnail generation failed", StatusCodes.NOT_FOUND);
        }
      } else {
        return ResponseHelper.error(res, "Thumbnail not available", StatusCodes.NOT_FOUND);
      }
    } else {
      return ResponseHelper.error(res, "File not found", StatusCodes.NOT_FOUND);
    }
  }

  // HEIC conversion
  const isHeic = file.mime_type === "image/heic" || file.name.toLowerCase().endsWith(".heic");
  const isMissingThumb = useThumb && !file.thumbnail_path;
  if (isHeic && (!useThumb || isMissingThumb)) {
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
      logger.error("HEIC Conversion Error:", error);
    }
  }

  const absolutePath = path.resolve(filePath);
  let contentType = useThumb ? "image/jpeg" : file.mime_type;

  if (!useThumb && isMov && filePath.endsWith(".mp4")) {
    contentType = "video/mp4";
  }

  res.set("Content-Type", contentType);
  res.set("Accept-Ranges", "bytes");
  return res.sendFile(absolutePath);
});

/**
 * @desc    Rename file
 * @route   PATCH /api/v1/files/:id
 */
export const renameFile = asyncHandler(async (req, res) => {
  renameFileSchema.parse({ body: req.body });

  const { name } = req.body;
  const file = await File.findOne({ _id: req.params.id, user: req.user.id });

  if (!file) {
    return ResponseHelper.error(res, ErrorMessages.FILE_NOT_FOUND, StatusCodes.NOT_FOUND);
  }

  file.name = name;
  await file.save();

  return ResponseHelper.success(res, file);
});

/**
 * @desc    Move file
 * @route   POST /api/v1/files/:id/move
 */
export const moveFile = asyncHandler(async (req, res) => {
  moveFileSchema.parse({ body: req.body });

  const { folderId } = req.body;
  const destFolderId = folderId === "null" || !folderId ? null : folderId;

  const file = await File.findOne({ _id: req.params.id, user: req.user.id });
  if (!file) {
    return ResponseHelper.error(res, ErrorMessages.FILE_NOT_FOUND, StatusCodes.NOT_FOUND);
  }

  if (destFolderId) {
    const destFolder = await Folder.findOne({ _id: destFolderId, user: req.user.id });
    if (!destFolder) {
      return ResponseHelper.error(res, "Destination folder not found", StatusCodes.NOT_FOUND);
    }
  }

  file.folder = destFolderId;
  await file.save();

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
 */
export const copyFile = asyncHandler(async (req, res) => {
  const { folderId } = req.body;
  const destFolderId = folderId === "null" || !folderId ? null : folderId;

  const sourceFile = await File.findOne({ _id: req.params.id, user: req.user.id });
  if (!sourceFile) {
    return ResponseHelper.error(res, ErrorMessages.FILE_NOT_FOUND, StatusCodes.NOT_FOUND);
  }

  const hasQuota = await FileService.checkQuota(req.user.id, sourceFile.size_bytes);
  if (!hasQuota) {
    return ResponseHelper.error(res, ErrorMessages.QUOTA_EXCEEDED, StatusCodes.FORBIDDEN);
  }

  const destDir = FileService.getUserDir(req.user.id);
  const newFileName = `${Date.now()}-copy-${sourceFile.name}`;
  const newStoragePath = path.join(destDir, newFileName);

  fs.copyFileSync(sourceFile.storage_path, newStoragePath);

  const newFile = await File.create({
    name: `Copy of ${sourceFile.name}`,
    original_name: sourceFile.original_name,
    user: req.user.id,
    folder: destFolderId,
    mime_type: sourceFile.mime_type,
    size_bytes: sourceFile.size_bytes,
    storage_path: newStoragePath,
  });

  const user = await User.findById(req.user.id);
  user.used_bytes += sourceFile.size_bytes;
  await user.save();

  SocketService.emitToUser(req.user.id, "QUOTA_UPDATE", {
    quota_bytes: user.quota_bytes,
    used_bytes: user.used_bytes,
  });

  SocketService.emitToUser(req.user.id, "FILE_CHANGE", {
    action: "COPY",
    folderId: destFolderId,
  });

  return ResponseHelper.success(res, newFile, StatusCodes.CREATED);
});

/**
 * @desc    Bulk delete items (Soft delete)
 * @route   POST /api/v1/files/bulk-delete
 */
export const bulkDelete = asyncHandler(async (req, res) => {
  bulkDeleteSchema.parse({ body: req.body });

  const { items } = req.body;

  for (const item of items) {
    await DbUtils.softDeleteRecursive(item.type, item.id, req.user.id, true);
  }

  SocketService.emitToUser(req.user.id, "FILE_CHANGE", {
    action: "BULK_DELETE",
    items,
  });

  return ResponseHelper.success(res, {});
});
