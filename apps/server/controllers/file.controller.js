import fs from "fs";
import multer from "multer";
import path from "path";

// Constants
import ErrorMessages from "../constants/errorMessages.js";
import StatusCodes from "../constants/statusCodes.js";

// Utils
import DbUtils from "../utils/dbUtils.js";

// Models
import File from "../models/File.js";
import User from "../models/User.js";
import Folder from "../models/Folder.js";

// Controllers
import { createNotification } from "./notification.controller.js";

// Services
import FileService from "../services/file.service.js";
import SocketService from "../services/socket.service.js";

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
 * @param   {Object} req - The request object
 * @param   {Object} res - The response object
 * @returns {Object} - Response object with success status and file data
 */
export async function uploadFile(req, res) {
  try {
    if (!req.file) {
      return res.status(StatusCodes.BAD_REQUEST).json({
        success: false,
        error: "Please upload a file",
      });
    }

    const { folderId } = req.body;

    // Check quota via service
    const hasQuota = await FileService.checkQuota(req.user.id, req.file.size);
    if (!hasQuota) {
      if (fs.existsSync(req.file.path)) {
        fs.unlinkSync(req.file.path);
      }
      return res.status(StatusCodes.FORBIDDEN).json({
        success: false,
        error: ErrorMessages.QUOTA_EXCEEDED,
      });
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

    res.status(StatusCodes.CREATED).json({
      success: true,
      data: file,
    });
  } catch (err) {
    console.error(err);
    // Cleanup physical file if it was uploaded but DB/Quota failed
    if (req.file && fs.existsSync(req.file.path)) {
      try {
        fs.unlinkSync(req.file.path);
      } catch (e) {
        console.error("Failed to cleanup file after error:", e.message);
      }
    }
    res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
      success: false,
      error: ErrorMessages.SERVER_ERROR,
    });
  }
}

/**
 * @desc    Get files for current user
 * @route   GET /api/v1/files
 * @access  Private
 */
export async function getFiles(req, res) {
  try {
    const folderId = req.query.folder || null;
    const search = req.query.search || null;

    const query = { user: req.user.id, is_deleted: false };

    if (search) {
      // If searching, ignore folder structure unless specifically scoped
      query.name = { $regex: search, $options: "i" };
      // If we want search to be recursive/global, we remove `folder: folderId`.
      if (folderId) {
        query.folder = folderId;
      }
    } else {
      query.folder = folderId;
    }

    const files = await File.find(query);

    res.status(StatusCodes.OK).json({
      success: true,
      count: files.length,
      data: files,
    });
  } catch (_err) {
    res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
      success: false,
      error: ErrorMessages.SERVER_ERROR,
    });
  }
}

/**
 * @desc    Download file
 * @route   GET /api/v1/files/:id/download
 * @access  Private
 */
export async function downloadFile(req, res) {
  try {
    const file = await File.findOne({ _id: req.params.id, user: req.user.id });

    if (!file) {
      return res.status(StatusCodes.NOT_FOUND).json({
        success: false,
        error: ErrorMessages.FILE_NOT_FOUND,
      });
    }

    if (!fs.existsSync(file.storage_path)) {
      return res.status(StatusCodes.NOT_FOUND).json({
        success: false,
        error: "Physical file not found on server",
      });
    }

    res.download(file.storage_path, file.name);
  } catch (_err) {
    res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
      success: false,
      error: ErrorMessages.SERVER_ERROR,
    });
  }
}

/**
 * @desc    Delete file (Soft delete)
 * @route   DELETE /api/v1/files/:id
 * @access  Private
 */
export async function deleteFile(req, res) {
  try {
    await DbUtils.softDeleteRecursive("file", req.params.id, req.user.id, true);

    // Emit socket event
    SocketService.emitToUser(req.user.id, "FILE_CHANGE", {
      action: "DELETE",
      fileId: req.params.id,
    });

    res.status(StatusCodes.OK).json({
      success: true,
      data: {},
    });
  } catch (_err) {
    res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
      success: false,
      error: ErrorMessages.SERVER_ERROR,
    });
  }
}

/**
 * @desc    Get file preview or thumbnail
 * @route   GET /api/v1/files/:id/preview
 * @access  Private
 */
export async function getFilePreview(req, res) {
  try {
    const file = await File.findOne({ _id: req.params.id, user: req.user.id });

    if (!file) {
      return res.status(StatusCodes.NOT_FOUND).json({
        success: false,
        error: ErrorMessages.FILE_NOT_FOUND,
      });
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
          const { generateVideoPreview } = require("../utils/media.utils");
          const FileService = require("../services/file.service");
          const previewDir = FileService.getPreviewDir(file.user.toString());
          const previewPath = path.join(previewDir, `${file._id}.mp4`);
          await generateVideoPreview(file.storage_path, previewPath);

          file.preview_path = previewPath;
          await file.save();
          filePath = previewPath;
        } catch (e) {
          console.error("On-the-fly video preview failed:", e);
          // Fall back to original storage_path (might still be blank in browser)
        }
      }
    }

    if (!fs.existsSync(filePath)) {
      // If thumbnail requested but missing, try falling back or generating
      if (useThumb && fs.existsSync(file.storage_path)) {
        if (file.mime_type.startsWith("image/")) {
          filePath = file.storage_path; // Fallback to original for images
        } else if (file.mime_type.startsWith("video/")) {
          // Attempt on-the-fly video thumbnail
          try {
            const { generateVideoThumbnail } = require("../utils/media.utils");
            const FileService = require("../services/file.service");
            const thumbDir = FileService.getThumbnailDir(file.user.toString());
            const thumbName = `${file._id}.jpg`;
            const generatedPath = await generateVideoThumbnail(file.storage_path, thumbDir, thumbName);

            // Update file record for future hits
            file.thumbnail_path = generatedPath;
            await file.save();

            filePath = generatedPath;
          } catch (e) {
            console.error("On-the-fly video thumbnail failed:", e);
            return res.status(StatusCodes.NOT_FOUND).send("Thumbnail generation failed");
          }
        } else {
          return res.status(StatusCodes.NOT_FOUND).send("Thumbnail not available");
        }
      } else {
        return res.status(StatusCodes.NOT_FOUND).send("File not found");
      }
    }

    // Serves the file
    const isHeic = file.mime_type === "image/heic" || file.name.toLowerCase().endsWith(".heic");
    const isMissingThumb = useThumb && !file.thumbnail_path;
    if (isHeic && (!useThumb || isMissingThumb)) {
      try {
        const heicConvert = require("heic-convert");
        const inputBuffer = await fs.promises.readFile(file.storage_path);
        const outputBuffer = await heicConvert({
          buffer: inputBuffer,
          format: "JPEG",
          quality: 0.8,
        });
        res.set("Content-Type", "image/jpeg");
        res.set("Cache-Control", "public, max-age=3600");
        res.send(outputBuffer);
        return;
      } catch (error) {
        console.error("HEIC Conversion Error:", error);
      }
    }

    // Standard local file serving
    const absolutePath = path.resolve(filePath);
    let contentType = useThumb ? "image/jpeg" : file.mime_type;

    // If serving a transcoded preview, it's always an mp4
    if (!useThumb && isMov && filePath.endsWith(".mp4")) {
      contentType = "video/mp4";
    }

    res.set("Content-Type", contentType);
    res.set("Accept-Ranges", "bytes");
    res.sendFile(absolutePath);
  } catch (err) {
    console.error("Error serving file:", err);
    res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
      success: false,
      error: ErrorMessages.SERVER_ERROR,
    });
  }
}

/**
 * @desc    Rename file
 * @route   PATCH /api/v1/files/:id
 * @access  Private
 */
export async function renameFile(req, res) {
  try {
    const { name } = req.body;
    if (!name) {
      return res.status(StatusCodes.BAD_REQUEST).json({
        success: false,
        error: "Please provide a name",
      });
    }

    const file = await File.findOne({ _id: req.params.id, user: req.user.id });
    if (!file) {
      return res.status(StatusCodes.NOT_FOUND).json({
        success: false,
        error: ErrorMessages.FILE_NOT_FOUND,
      });
    }

    file.name = name;
    await file.save();

    res.status(StatusCodes.OK).json({ success: true, data: file });
  } catch (err) {
    console.error("Error renaming file:", err);
    res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
      success: false,
      error: ErrorMessages.SERVER_ERROR,
    });
  }
}

/**
 * @desc    Move file
 * @route   POST /api/v1/files/:id/move
 * @access  Private
 */
export async function moveFile(req, res) {
  try {
    const { folderId } = req.body;
    const destFolderId = folderId === "null" || !folderId ? null : folderId;

    const file = await File.findOne({ _id: req.params.id, user: req.user.id });
    if (!file) {
      return res.status(StatusCodes.NOT_FOUND).json({
        success: false,
        error: ErrorMessages.FILE_NOT_FOUND,
      });
    }

    if (destFolderId) {
      const destFolder = await Folder.findOne({
        _id: destFolderId,
        user: req.user.id,
      });
      if (!destFolder) {
        return res.status(StatusCodes.NOT_FOUND).json({
          success: false,
          error: "Destination folder not found",
        });
      }
    }

    file.folder = destFolderId;
    await file.save();

    // Emit socket event
    SocketService.emitToUser(req.user.id, "FILE_CHANGE", {
      action: "MOVE",
      fileId: file._id,
      destFolderId,
    });

    res.status(StatusCodes.OK).json({ success: true, data: file });
  } catch (err) {
    console.error("Move file error:", err);
    res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
      success: false,
      error: ErrorMessages.SERVER_ERROR,
    });
  }
}

/**
 * @desc    Copy file
 * @route   POST /api/v1/files/:id/copy
 * @access  Private
 */
export async function copyFile(req, res) {
  try {
    const { folderId } = req.body;
    const destFolderId = folderId === "null" || !folderId ? null : folderId;

    const sourceFile = await File.findOne({
      _id: req.params.id,
      user: req.user.id,
    });
    if (!sourceFile) {
      return res.status(StatusCodes.NOT_FOUND).json({
        success: false,
        error: ErrorMessages.FILE_NOT_FOUND,
      });
    }

    // Check quota via service
    const hasQuota = await FileService.checkQuota(req.user.id, sourceFile.size_bytes);
    if (!hasQuota) {
      return res.status(StatusCodes.FORBIDDEN).json({
        success: false,
        error: ErrorMessages.QUOTA_EXCEEDED,
      });
    }

    const destDir = FileService.getUserDir(req.user.id);

    const newFileName = `${Date.now()}-copy-${sourceFile.name}`;
    const newStoragePath = path.join(destDir, newFileName);

    // Physically copy file
    fs.copyFileSync(sourceFile.storage_path, newStoragePath);

    // Create database entry
    const newFile = await File.create({
      name: `Copy of ${sourceFile.name}`,
      original_name: sourceFile.original_name,
      user: req.user.id,
      folder: destFolderId,
      mime_type: sourceFile.mime_type,
      size_bytes: sourceFile.size_bytes,
      storage_path: newStoragePath,
    });

    // Update user quota
    const user = await User.findById(req.user.id);
    user.used_bytes += sourceFile.size_bytes;
    await user.save();

    // Emit socket events
    SocketService.emitToUser(req.user.id, "QUOTA_UPDATE", {
      quota_bytes: user.quota_bytes,
      used_bytes: user.used_bytes,
    });

    SocketService.emitToUser(req.user.id, "FILE_CHANGE", {
      action: "COPY",
      folderId: destFolderId,
    });

    res.status(StatusCodes.CREATED).json({ success: true, data: newFile });
  } catch (err) {
    console.error("Error copying file:", err);
    res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
      success: false,
      error: ErrorMessages.SERVER_ERROR,
    });
  }
}

/**
 * @desc    Bulk delete items (Soft delete)
 * @route   POST /api/v1/files/bulk-delete
 * @access  Private
 */
export async function bulkDelete(req, res) {
  try {
    const { items } = req.body;
    if (!items || !Array.isArray(items)) {
      return res.status(StatusCodes.BAD_REQUEST).json({
        success: false,
        error: "Items array is required",
      });
    }

    for (const item of items) {
      await DbUtils.softDeleteRecursive(item.type, item.id, req.user.id, true);
    }

    // Emit socket event
    SocketService.emitToUser(req.user.id, "FILE_CHANGE", {
      action: "BULK_DELETE",
      items,
    });

    res.status(StatusCodes.OK).json({ success: true, data: {} });
  } catch (err) {
    console.error("Bulk delete error:", err);
    res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
      success: false,
      error: ErrorMessages.SERVER_ERROR,
    });
  }
}
