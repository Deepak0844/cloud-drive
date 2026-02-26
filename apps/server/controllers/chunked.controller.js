// Native modules
import fs from "fs";
import path from "path";
import { pipeline } from "stream/promises";

// Packages
import multer from "multer";

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

/**
 * Dedicated multer middleware for the regular (non-chunked) upload route.
 * Still used by /upload/init for the init flow (no file body).
 */
const chunkStorage = multer({ storage: multer.memoryStorage() });
export const chunkUploadMiddleware = chunkStorage.single("file");

/**
 * @desc    Initiate chunked upload
 * @route   POST /api/v1/files/upload/init
 * @access  Private
 */
export const initChunkedUpload = asyncHandler(async (req, res) => {
  const { fileSize, totalChunks } = req.body;

  // Quota check — req.user is already populated by auth middleware, no extra DB query needed
  const { used_bytes, quota_bytes } = req.user;
  if (used_bytes + fileSize > quota_bytes) {
    return ResponseHelper.error(res, ErrorMessages.QUOTA_EXCEEDED, StatusCodes.BAD_REQUEST);
  }

  const uploadId = `${req.user.id}_${Date.now()}`;
  const chunkDir = path.join(FileService.getUserDir(req.user.id), ".chunks", uploadId);

  // Use async mkdir — avoids blocking the event loop
  await fs.promises.mkdir(chunkDir, { recursive: true });

  return ResponseHelper.success(res, { uploadId, totalChunks });
});

/**
 * @desc    Upload a single chunk as raw binary body
 * @route   POST /api/v1/files/upload/chunk
 * @access  Private
 *
 * Chunk metadata is passed via query params:
 *   ?uploadId=<id>&chunkIndex=<n>
 * Body is raw binary (application/octet-stream), parsed by express.raw().
 */
export const uploadChunk = asyncHandler(async (req, res) => {
  const { uploadId, chunkIndex } = req.query;

  if (!uploadId || chunkIndex === undefined) {
    return ResponseHelper.error(res, "uploadId and chunkIndex are required", StatusCodes.BAD_REQUEST);
  }

  const chunkBuffer = req.body; // Buffer from express.raw()

  if (!Buffer.isBuffer(chunkBuffer) || chunkBuffer.length === 0) {
    return ResponseHelper.error(res, ErrorMessages.NO_CHUNK_FILE, StatusCodes.BAD_REQUEST);
  }

  const chunkDir = path.join(FileService.getUserDir(req.user.id), ".chunks", uploadId);

  if (!fs.existsSync(chunkDir)) {
    return ResponseHelper.error(res, ErrorMessages.UPLOAD_NOT_FOUND, StatusCodes.NOT_FOUND);
  }

  const idx = parseInt(chunkIndex, 10);
  const chunkPath = path.join(chunkDir, `chunk_${idx}`);

  // Write the raw buffer directly to disk — no multer, no temp file, no FormData overhead
  await fs.promises.writeFile(chunkPath, chunkBuffer);

  return ResponseHelper.success(res, { chunkIndex: idx, uploadId });
});

/**
 * @desc    Complete chunked upload — assemble all chunks asynchronously
 * @route   POST /api/v1/files/upload/finalize
 * @access  Private
 */
export const finalizeChunkedUpload = asyncHandler(async (req, res) => {
  const { uploadId, fileName: name, folderId, mimeType } = req.body;
  const chunkDir = path.join(FileService.getUserDir(req.user.id), ".chunks", uploadId);

  if (!fs.existsSync(chunkDir)) {
    return ResponseHelper.error(res, ErrorMessages.UPLOAD_NOT_FOUND, StatusCodes.NOT_FOUND);
  }

  const chunks = fs
    .readdirSync(chunkDir)
    .filter((name) => /^chunk_\d+$/.test(name))
    .sort((a, b) => {
      const idxA = parseInt(a.split("_")[1], 10);
      const idxB = parseInt(b.split("_")[1], 10);
      return idxA - idxB;
    });

  if (chunks.length === 0) {
    return ResponseHelper.error(res, "No chunks found for this upload", StatusCodes.BAD_REQUEST);
  }

  const uniqueName = await FileService.getUniqueFilename(req.user.id, folderId, name);
  const finalPath = path.join(FileService.getUserDir(req.user.id), uniqueName);

  // Stream each chunk sequentially into the final file — non-blocking
  // Increase highWaterMark from default 64KB to 2MB for dramatically faster disk merging
  const writeStream = fs.createWriteStream(finalPath, { highWaterMark: 2 * 1024 * 1024 });

  for (const chunk of chunks) {
    const chunkPath = path.join(chunkDir, chunk);
    const readStream = fs.createReadStream(chunkPath, { highWaterMark: 2 * 1024 * 1024 });
    await pipeline(readStream, writeStream, { end: false });
    await fs.promises.unlink(chunkPath);
  }

  await new Promise((resolve, reject) => {
    writeStream.end();
    writeStream.on("finish", resolve);
    writeStream.on("error", reject);
  });

  await fs.promises.rmdir(chunkDir);

  const stats = fs.statSync(finalPath);
  const extension = path.extname(name).toLowerCase().replace(".", "");
  const mime_type = mimeType || MimeUtils.getMimeType(name);
  const category = MetadataService.getCategory(mime_type, name);

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
    metadata: {}, // Empty initially, populated in background
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

  // Return success instantly so UI completes, process metadata in background
  const response = ResponseHelper.success(res, file, StatusCodes.CREATED);

  // --- BACKGROUND METADATA EXTRACTION ---
  (async () => {
    try {
      const { metadata } = await MetadataService.extractMetadata(finalPath, category);
      file.metadata = metadata;
      await file.save();

      // Emit another socket event to trigger UI metadata updates if the user is looking at details
      SocketService.emitToUser(req.user.id, "FILE_CHANGE", {
        action: "UPDATE",
        fileId: file._id,
        folderId: folderId || null,
      });

      FileService.processThumbnails(file);
    } catch (err) {
      console.error("Background metadata extraction failed:", err);
    }
  })();

  return response;
});
