// Native modules
import fs from "fs";
import path from "path";

// Models
import File from "../models/File.js";
import User from "../models/User.js";

// Services
import FileService from "../services/file.service.js";
import MetadataService from "../services/metadata.service.js";
import SocketService from "../services/socket.service.js";

// Constants
import { ErrorMessages, StatusCodes } from "../constants/generalConstants.js";

// Middleware
import asyncHandler from "../middleware/asyncHandler.js";

// Utils
import ResponseHelper from "../utils/responseHelper.js";
import MimeUtils from "../utils/mimeUtils.js";
import logger from "../utils/logger.js";

/**
 * @desc    Initiate chunked upload
 * @route   POST /api/v1/files/upload/init
 * @access  Private
 */
export const initChunkedUpload = asyncHandler(async (req, res) => {
  const { fileSize, totalChunks } = req.body;

  // Quota check
  const canUpload = await FileService.checkQuota(req.user.id, fileSize);
  if (!canUpload) {
    return ResponseHelper.error(res, ErrorMessages.QUOTA_EXCEEDED, StatusCodes.BAD_REQUEST);
  }

  const uploadId = `${req.user.id}_${Date.now()}`;
  const chunkDir = path.join(FileService.getUserDir(req.user.id), ".chunks", uploadId);

  if (!fs.existsSync(chunkDir)) {
    fs.mkdirSync(chunkDir, { recursive: true });
  }

  return ResponseHelper.success(res, { uploadId, totalChunks });
});

/**
 * @desc    Upload chunk
 * @route   POST /api/v1/files/upload/chunk
 * @access  Private
 */
export const uploadChunk = asyncHandler(async (req, res) => {
  const { uploadId, chunkIndex } = req.body;
  const chunkFile = req.files?.file; // Adjusted to match schema expectations if needed, but Multer/Middleware usually handles this

  if (!chunkFile) {
    return ResponseHelper.error(res, ErrorMessages.NO_CHUNK_FILE, StatusCodes.BAD_REQUEST);
  }

  const chunkDir = path.join(FileService.getUserDir(req.user.id), ".chunks", uploadId);
  const chunkPath = path.join(chunkDir, `chunk_${chunkIndex}`);

  await chunkFile.mv(chunkPath);

  return ResponseHelper.success(res, { chunkIndex, uploadId });
});

/**
 * @desc    Complete chunked upload
 * @route   POST /api/v1/files/upload/finalize
 * @access  Private
 */
export const finalizeChunkedUpload = asyncHandler(async (req, res) => {
  const { uploadId, name, folderId, mimeType } = req.body;
  const chunkDir = path.join(FileService.getUserDir(req.user.id), ".chunks", uploadId);

  if (!fs.existsSync(chunkDir)) {
    return ResponseHelper.error(res, ErrorMessages.UPLOAD_NOT_FOUND, StatusCodes.NOT_FOUND);
  }

  const chunks = fs.readdirSync(chunkDir).sort((a, b) => {
    const idxA = parseInt(a.split("_")[1]);
    const idxB = parseInt(b.split("_")[1]);
    return idxA - idxB;
  });

  const uniqueName = await FileService.getUniqueFilename(req.user.id, folderId, name);
  const finalPath = path.join(FileService.getUserDir(req.user.id), uniqueName);
  const writeStream = fs.createWriteStream(finalPath);

  for (const chunk of chunks) {
    const chunkPath = path.join(chunkDir, chunk);
    const data = fs.readFileSync(chunkPath);
    writeStream.write(data);
    fs.unlinkSync(chunkPath);
  }

  writeStream.end();

  writeStream.on("finish", async () => {
    fs.rmdirSync(chunkDir);

    const stats = fs.statSync(finalPath);
    const extension = path.extname(name).toLowerCase().replace(".", "");
    const mime_type = mimeType || MimeUtils.getMimeType(name);
    const category = MetadataService.getCategory(mime_type, name);
    const metadata = await MetadataService.extractMetadata(finalPath, category);

    const file = await File.create({
      user: req.user.id,
      folder: folderId || null,
      name: uniqueName,
      original_name: name,
      mime_type,
      extension: extension || "bin",
      category,
      size_bytes: stats.size,
      storage_path: finalPath,
      metadata,
    });

    const user = await User.findById(req.user.id);
    user.used_bytes += stats.size;
    await user.save();

    SocketService.emitToUser(req.user.id, "QUOTA_UPDATE", {
      quota_bytes: user.quota_bytes,
      used_bytes: user.used_bytes,
    });

    SocketService.emitToUser(req.user.id, "FILE_CHANGE", {
      action: "UPLOAD",
      fileId: file._id,
      folderId: folderId || null,
    });

    FileService.processThumbnails(file);
    return ResponseHelper.success(res, file, StatusCodes.CREATED);
  });

  writeStream.on("error", (err) => {
    logger.error("Error writing final file:", err);
    return ResponseHelper.error(res, ErrorMessages.SERVER_ERROR, StatusCodes.INTERNAL_SERVER_ERROR);
  });
});
