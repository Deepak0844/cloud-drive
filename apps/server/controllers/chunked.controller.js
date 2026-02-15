import path from "path";
import fs from "fs";

// Constants
import ErrorMessages from "../constants/errorMessages.js";
import StatusCodes from "../constants/statusCodes.js";

// Utils
import MimeUtils from "../utils/mimeUtils.js";
import ResponseHelper from "../utils/responseHelper.js";

// Config
import Env from "../config/env.js";

// Models
import File from "../models/File.js";
import User from "../models/User.js";

// Services
import FileService from "../services/file.service.js";

// Middleware
import asyncHandler from "../middleware/asyncHandler.js";

// Schemas
import { initChunkedUploadSchema, uploadChunkSchema, finalizeChunkedUploadSchema } from "../schemas/chunked.schema.js";

/**
 * @desc    Initialize chunked upload
 * @route   POST /api/v1/files/upload/init
 */
export const initChunkedUpload = asyncHandler(async (req, res) => {
  initChunkedUploadSchema.parse({ body: req.body });

  const { totalChunks, fileSize } = req.body;

  const user = await User.findById(req.user.id);
  if (user.used_bytes + fileSize > user.quota_bytes) {
    return ResponseHelper.error(res, ErrorMessages.QUOTA_EXCEEDED, StatusCodes.FORBIDDEN);
  }

  const uploadId = Date.now().toString();
  const tempDir = path.join(Env.NAS_STORAGE_PATH, "temp", "uploads", uploadId);

  if (!fs.existsSync(tempDir)) {
    fs.mkdirSync(tempDir, { recursive: true });
  }

  return ResponseHelper.success(res, { uploadId, totalChunks });
});

/**
 * @desc    Upload a chunk
 * @route   POST /api/v1/files/upload/chunk
 */
export const uploadChunk = asyncHandler(async (req, res) => {
  uploadChunkSchema.parse({ body: req.body });

  const { uploadId, chunkIndex } = req.body;
  const chunkFile = req.file;

  if (!chunkFile) {
    return ResponseHelper.error(res, ErrorMessages.NO_CHUNK_FILE, StatusCodes.BAD_REQUEST);
  }

  const uploadDir = path.join(Env.NAS_STORAGE_PATH, "temp", "uploads", uploadId);
  const chunkPath = path.join(uploadDir, `chunk-${chunkIndex}`);

  if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir, { recursive: true });
  }

  await fs.promises.rename(chunkFile.path, chunkPath);

  return ResponseHelper.success(res, { chunkIndex, uploadId });
});

/**
 * @desc    Finalize chunked upload
 * @route   POST /api/v1/files/upload/finalize
 */
export const finalizeChunkedUpload = asyncHandler(async (req, res) => {
  finalizeChunkedUploadSchema.parse({ body: req.body });

  const { uploadId, fileName, folderId } = req.body;
  const tempDir = path.join(Env.NAS_STORAGE_PATH, "temp", "uploads", uploadId);
  const userDir = path.join(Env.NAS_STORAGE_PATH, "users", req.user.id, "files");
  const finalPath = path.join(userDir, `${Date.now()}-${fileName}`);

  if (!fs.existsSync(tempDir)) {
    return ResponseHelper.error(res, ErrorMessages.UPLOAD_NOT_FOUND, StatusCodes.NOT_FOUND);
  }

  if (!fs.existsSync(userDir)) {
    fs.mkdirSync(userDir, { recursive: true });
  }

  const chunks = fs
    .readdirSync(tempDir)
    .filter((f) => f.startsWith("chunk-"))
    .sort((a, b) => parseInt(a.split("-")[1]) - parseInt(b.split("-")[1]));

  if (chunks.length === 0) {
    return ResponseHelper.error(res, ErrorMessages.NO_CHUNKS_FOUND, StatusCodes.BAD_REQUEST);
  }

  const writeStream = fs.createWriteStream(finalPath);

  for (const chunk of chunks) {
    const chunkPath = path.join(tempDir, chunk);
    const data = fs.readFileSync(chunkPath);
    writeStream.write(data);
  }

  await new Promise((resolve, reject) => {
    writeStream.end();
    writeStream.on("finish", resolve);
    writeStream.on("error", reject);
  });

  fs.rmSync(tempDir, { recursive: true, force: true });

  const finalSize = fs.statSync(finalPath).size;
  const uniqueName = await FileService.getUniqueFilename(
    req.user.id,
    folderId && folderId !== "null" ? folderId : null,
    fileName
  );

  const file = await File.create({
    name: uniqueName,
    original_name: fileName,
    user: req.user.id,
    folder: folderId && folderId !== "null" ? folderId : null,
    mime_type: MimeUtils.getMimeType(fileName),
    size_bytes: finalSize,
    storage_path: finalPath,
  });

  await User.findByIdAndUpdate(req.user.id, { $inc: { used_bytes: finalSize } }, { new: true });

  return ResponseHelper.success(res, file, StatusCodes.CREATED);
});
