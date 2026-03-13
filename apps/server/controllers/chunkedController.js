// Native modules
import fs from "fs";
import path from "path";
import mongoose from "mongoose";

// Models
import User from "#models/User.js";

// Services
import FileService from "#services/fileService.js";
import SocketService from "#services/socketService.js";
import MetadataService from "#services/metadataService.js";

// Constants
import { HttpStatus } from "@shared-constants/constants";
import { ErrorMessages, SocketEvents } from "#constants/generalConstants.js";

// Middleware
import asyncHandler from "#middlewares/asyncHandler.js";

// Utils
import ResponseUtils from "#utils/responseUtils.js";
import MimeUtils from "#utils/mimeUtils.js";
import logger from "#utils/logger.js";

/**
 * @desc    Initiate chunked upload
 * @route   POST /api/v1/files/upload/init
 * @access  Private
 */
export const initChunkedUpload = asyncHandler(async (req, res) => {
  const { fileSize, totalChunks } = req.body;

  // Fresh DB quota check — avoids relying on req.user which was populated at
  // auth time and may be stale if a concurrent upload just consumed quota.
  const hasQuota = await FileService.checkQuota(req.user.id, fileSize);
  if (!hasQuota) {
    return ResponseUtils.error(res, ErrorMessages.QUOTA_EXCEEDED, HttpStatus.FORBIDDEN);
  }

  const uploadId = `${req.user.id}_${Date.now()}`;
  const chunkDir = path.join(FileService.getChunksDir(req.user.id), uploadId);

  await fs.promises.mkdir(chunkDir, { recursive: true });

  return ResponseUtils.success(res, { uploadId, totalChunks });
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

  // Ownership guard: uploadId is generated as `<userId>_<timestamp>` in initChunkedUpload.
  // Reject any ID that doesn't belong to the authenticated user.
  if (!uploadId.startsWith(`${req.user.id}_`)) {
    return ResponseUtils.error(res, ErrorMessages.UPLOAD_NOT_FOUND, HttpStatus.NOT_FOUND);
  }

  const chunkBuffer = req.body;

  if (!Buffer.isBuffer(chunkBuffer) || chunkBuffer.length === 0) {
    return ResponseUtils.error(res, ErrorMessages.NO_CHUNK_FILE, HttpStatus.BAD_REQUEST);
  }

  const chunkDir = path.join(FileService.getChunksDir(req.user.id), uploadId);

  if (!fs.existsSync(chunkDir)) {
    return ResponseUtils.error(res, ErrorMessages.UPLOAD_NOT_FOUND, HttpStatus.NOT_FOUND);
  }

  const idx = parseInt(chunkIndex, 10);
  const chunkPath = path.join(chunkDir, `chunk_${idx}`);

  await fs.promises.writeFile(chunkPath, chunkBuffer);

  return ResponseUtils.success(res, { chunkIndex: idx, uploadId });
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
    return ResponseUtils.error(res, ErrorMessages.UPLOAD_NOT_FOUND, HttpStatus.NOT_FOUND);
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
    return ResponseUtils.error(res, "No chunks found for this upload", HttpStatus.BAD_REQUEST);
  }

  const user = await User.findById(req.user.id).select("+encryption_key_wrapped");
  if (!user || !user.encryption_key_wrapped) {
    return ResponseUtils.error(res, "Encryption key missing", HttpStatus.INTERNAL_SERVER_ERROR);
  }

  // Pre-generate a stable MongoDB ObjectId so we can name the file after it
  const fileId = new mongoose.Types.ObjectId();
  const tempCombinedPath = path.join(chunkDir, "combined.tmp");

  // Assemble chunks directly into the final temp file
  try {
    // 1. Assemble all chunks into a temporary file
    const tempFileHandle = await fs.promises.open(tempCombinedPath, "a");
    for (const chunk of chunks) {
      const chunkPath = path.join(chunkDir, chunk);
      const data = await fs.promises.readFile(chunkPath);
      await tempFileHandle.appendFile(data);
      await fs.promises.unlink(chunkPath); // delete chunk after appending
    }
    await tempFileHandle.close();

    const stats = fs.statSync(tempCombinedPath);

    // Robustness: Verification against client-reported totalSize if provided
    if (totalSize && stats.size !== parseInt(totalSize, 10)) {
      logger.error(`[Upload] Size mismatch for ${name}: Expected ${totalSize}, got ${stats.size}`);
      // Cleanup the failed assembly
      if (fs.existsSync(tempCombinedPath)) {
        await fs.promises.unlink(tempCombinedPath);
      }
      return ResponseUtils.error(res, "File assembly failed: Size mismatch", HttpStatus.INTERNAL_SERVER_ERROR);
    }

    const totalSizeFinal = stats.size;
    const extension = path.extname(name).replace(".", "");
    const effectiveMimeType = mimeType || MimeUtils.getMimeType(name);
    const category = MetadataService.getCategory(effectiveMimeType, name);

    // Use the shared finalization logic
    const file = await FileService.finalizeUploadedFile({
      userId: req.user.id,
      folderId,
      tempFilePath: tempCombinedPath,
      originalName: name,
      mimeType: effectiveMimeType,
      size: totalSizeFinal,
      category,
      extension: extension || "bin",
      fileId,
    });

    // Notify about quota and file change (though finalizeUploadedFile does some of this,
    // chunked upload might need specific events if they differ, but we synced them)
    const updatedUser = await User.findById(req.user.id);
    SocketService.emitToUser(req.user.id, SocketEvents.QUOTA_UPDATE, {
      quota_bytes: updatedUser.quota_bytes,
      used_bytes: updatedUser.used_bytes,
    });

    // Clean up the chunk directory
    await fs.promises.rm(chunkDir, { recursive: true, force: true }).catch(() => {});

    return ResponseUtils.success(res, file, HttpStatus.CREATED);
  } catch (err) {
    logger.error(`[Upload] Finalization error for ${name}: ${err.message}`);
    // Cleanup of physical final file is handled inside finalizeUploadedFile for most cases,
    // but we should ensure tempCombinedPath is cleared if it still exists.
    if (fs.existsSync(tempCombinedPath)) {
      await fs.promises.unlink(tempCombinedPath).catch(() => {});
    }
    return ResponseUtils.error(res, "Failed to finalize upload", HttpStatus.INTERNAL_SERVER_ERROR);
  }
});
