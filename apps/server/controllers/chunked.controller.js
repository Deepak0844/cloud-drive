// Native modules
import fs from "fs";
import path from "path";
import mongoose from "mongoose";

// Models
import File from "../models/File.js";
import User from "../models/User.js";

// Services
import FileService from "../services/file.service.js";
import SocketService from "../services/socket.service.js";
import MetadataService from "../services/metadata.service.js";

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

  // Quota check — req.user already populated by auth middleware
  const { used_bytes, quota_bytes } = req.user;
  if (used_bytes + fileSize > quota_bytes) {
    return ResponseHelper.error(res, ErrorMessages.QUOTA_EXCEEDED, StatusCodes.BAD_REQUEST);
  }

  const uploadId = `${req.user.id}_${Date.now()}`;
  const chunkDir = path.join(FileService.getChunksDir(req.user.id), uploadId);

  await fs.promises.mkdir(chunkDir, { recursive: true });

  return ResponseHelper.success(res, { uploadId, totalChunks });
});

/**
 * @desc    Upload a single chunk as raw binary body
 * @route   POST /api/v1/files/upload/chunk
 * @access  Private
 *
 * Chunk metadata is passed via query params: ?uploadId=<id>&chunkIndex=<n>
 * Body is raw binary (application/octet-stream), parsed by express.raw().
 */
export const uploadChunk = asyncHandler(async (req, res) => {
  const { uploadId, chunkIndex } = req.query;

  if (!uploadId || chunkIndex === undefined) {
    return ResponseHelper.error(res, "uploadId and chunkIndex are required", StatusCodes.BAD_REQUEST);
  }

  const chunkBuffer = req.body;

  if (!Buffer.isBuffer(chunkBuffer) || chunkBuffer.length === 0) {
    return ResponseHelper.error(res, ErrorMessages.NO_CHUNK_FILE, StatusCodes.BAD_REQUEST);
  }

  const chunkDir = path.join(FileService.getChunksDir(req.user.id), uploadId);

  if (!fs.existsSync(chunkDir)) {
    return ResponseHelper.error(res, ErrorMessages.UPLOAD_NOT_FOUND, StatusCodes.NOT_FOUND);
  }

  const idx = parseInt(chunkIndex, 10);
  const chunkPath = path.join(chunkDir, `chunk_${idx}`);

  await fs.promises.writeFile(chunkPath, chunkBuffer);

  return ResponseHelper.success(res, { chunkIndex: idx, uploadId });
});

/**
 * @desc    Complete chunked upload — assemble all chunks into a stable ID-based path
 * @route   POST /api/v1/files/upload/finalize
 * @access  Private
 */
export const finalizeChunkedUpload = asyncHandler(async (req, res) => {
  const { uploadId, fileName: name, folderId, mimeType, totalSize } = req.body;
  const chunkDir = path.join(FileService.getChunksDir(req.user.id), uploadId);

  if (!fs.existsSync(chunkDir)) {
    return ResponseHelper.error(res, ErrorMessages.UPLOAD_NOT_FOUND, StatusCodes.NOT_FOUND);
  }

  const chunks = fs
    .readdirSync(chunkDir)
    .filter((f) => /^chunk_\d+$/.test(f))
    .sort((a, b) => {
      const idxA = parseInt(a.split("_")[1], 10);
      const idxB = parseInt(b.split("_")[1], 10);
      return idxA - idxB;
    });

  if (chunks.length === 0) {
    return ResponseHelper.error(res, "No chunks found for this upload", StatusCodes.BAD_REQUEST);
  }

  // Pre-generate a stable MongoDB ObjectId so we can name the file after it
  const fileId = new mongoose.Types.ObjectId();
  const extension = path.extname(name);
  const finalPath = FileService.getPhysicalFilePath(req.user.id, fileId.toString(), extension);

  // Assemble chunks directly into the final stable path
  try {
    if (chunks.length === 1) {
      // Copy+unlink instead of rename for cross-device safety
      await fs.promises.copyFile(path.join(chunkDir, chunks[0]), finalPath);
      await fs.promises.unlink(path.join(chunkDir, chunks[0]));
    } else {
      const fileHandle = await fs.promises.open(finalPath, "a");
      for (const chunk of chunks) {
        const chunkPath = path.join(chunkDir, chunk);
        const data = await fs.promises.readFile(chunkPath);
        await fileHandle.appendFile(data);
        await fs.promises.unlink(chunkPath);
      }
      await fileHandle.close();
    }

    const stats = fs.statSync(finalPath);

    // Robustness: Verification against client-reported totalSize if provided
    if (totalSize && stats.size !== parseInt(totalSize, 10)) {
      logger.error(`[Upload] Size mismatch for ${name}: Expected ${totalSize}, got ${stats.size}`);
      // Cleanup the failed assembly
      if (fs.existsSync(finalPath)) {
        await fs.promises.unlink(finalPath);
      }
      return ResponseHelper.error(res, "File assembly failed: Size mismatch", StatusCodes.INTERNAL_SERVER_ERROR);
    }

    const mime_type = mimeType || MimeUtils.getMimeType(name);
    const category = MetadataService.getCategory(mime_type, name);
    const ext = extension.replace(".", "") || "bin";
    const uniqueName = await FileService.getUniqueFilename(req.user.id, folderId, name);

    const file = await File.create({
      _id: fileId,
      user: req.user.id,
      folder: folderId || null,
      name: uniqueName,
      original_name: name,
      mime_type,
      extension: ext,
      category,
      size_bytes: stats.size,
      storage_path: finalPath,
      metadata: {},
    });

    await User.findByIdAndUpdate(req.user.id, { $inc: { used_bytes: stats.size } });
    const user = await User.findById(req.user.id);

    SocketService.emitToUser(req.user.id, "QUOTA_UPDATE", {
      quota_bytes: user.quota_bytes,
      used_bytes: user.used_bytes,
    });

    SocketService.emitToUser(req.user.id, "FILE_CHANGE", {
      action: "UPLOAD",
      fileId: file._id,
      folderId: folderId || null,
    });

    // Clean up the chunk directory
    await fs.promises.rmdir(chunkDir);

    return ResponseHelper.success(res, file, StatusCodes.CREATED);
  } catch (err) {
    logger.error(`[Upload] Finalization error for ${name}: ${err.message}`);
    if (fs.existsSync(finalPath)) {
      await fs.promises.unlink(finalPath);
    }
    return ResponseHelper.error(res, "Failed to finalize upload", StatusCodes.INTERNAL_SERVER_ERROR);
  }
});
