import path from "path";
import fs from "fs";

// Constants
import ErrorMessages from "../constants/errorMessages.js";
import StatusCodes from "../constants/statusCodes.js";

// Utils
import MimeUtils from "../utils/mimeUtils.js";

// Config
import config from "../config/env.js";

// Models
import File from "../models/File.js";
import User from "../models/User.js";

// Services
import * as fileService from "../services/file.service.js";

/**
 * @desc    Initialize chunked upload
 * @route   POST /api/v1/files/upload/init
 * @access  Private
 * @param {Object} req - Express request object
 * @param {Object} req.body - Request body
 * @param {string} req.body.fileName - Name of file
 * @param {number} req.body.totalChunks - Total chunks
 * @param {number} req.body.fileSize - File size in bytes
 * @param {string} req.body.folderId - Folder ID (optional)
 * @param {Object} req.user - Authenticated user
 * @param {Object} res - Express response object
 */
export async function initChunkedUpload(req, res) {
  try {
    const { fileName: _fileName, totalChunks, fileSize, folderId: _folderId } = req.body;

    const user = await User.findById(req.user.id);
    // Check if user has enough quota for the upload
    if (user.used_bytes + fileSize > user.quota_bytes) {
      return res.status(StatusCodes.FORBIDDEN).json({
        success: false,
        error: ErrorMessages.QUOTA_EXCEEDED,
      });
    }

    // Generate a unique upload ID and create a temp directory for the chunks
    const uploadId = Date.now().toString();
    const tempDir = path.join(config.NAS_STORAGE_PATH, "temp", "uploads", uploadId);

    // Ensure the temp directory exists
    if (!fs.existsSync(tempDir)) {
      fs.mkdirSync(tempDir, { recursive: true });
    }

    res.status(StatusCodes.OK).json({
      success: true,
      data: { uploadId, totalChunks },
    });
  } catch (_err) {
    res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
      success: false,
      error: ErrorMessages.SERVER_ERROR,
    });
  }
}

/**
 * @desc    Upload a chunk
 * @route   POST /api/v1/files/upload/chunk
 * @access  Private
 * @param {Object} req - Express request object
 * @param {Object} req.body - Request body
 * @param {string} req.body.uploadId - Upload session ID
 * @param {number} req.body.chunkIndex - Chunk index
 * @param {Object} req.file - Uploaded chunk file
 * @param {Object} res - Express response object
 */
export async function uploadChunk(req, res) {
  try {
    const { uploadId, chunkIndex } = req.body;
    const chunkFile = req.file;

    if (!chunkFile) {
      return res.status(StatusCodes.BAD_REQUEST).json({
        success: false,
        error: ErrorMessages.NO_CHUNK_FILE,
      });
    }

    if (!uploadId || chunkIndex === undefined) {
      return res.status(StatusCodes.BAD_REQUEST).json({
        success: false,
        error: ErrorMessages.INVALID_CHUNK_PARAMETERS,
      });
    }

    const uploadDir = path.join(config.NAS_STORAGE_PATH, "temp", "uploads", uploadId);
    const chunkPath = path.join(uploadDir, `chunk-${chunkIndex}`);

    // Ensure directory exists
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }

    // Move chunk to final location
    await fs.promises.rename(chunkFile.path, chunkPath);

    res.status(StatusCodes.OK).json({
      success: true,
      data: { chunkIndex, uploadId },
    });
  } catch (err) {
    console.error("=== Upload Chunk Error ===");
    console.error("Error message:", err.message);
    console.error("Request body:", req.body);

    res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
      success: false,
      error: ErrorMessages.SERVER_ERROR,
      details: err.message,
    });
  }
}

/**
 * @desc    Finalize chunked upload
 * @route   POST /api/v1/files/upload/finalize
 * @access  Private
 * @param {Object} req - Express request object
 * @param {Object} req.body - Request body
 * @param {string} req.body.uploadId - Upload session ID
 * @param {string} req.body.fileName - Original file name
 * @param {string} req.body.folderId - Target folder ID (optional)
 * @param {Object} req.user - Authenticated user
 * @param {Object} res - Express response object
 */
export async function finalizeChunkedUpload(req, res) {
  try {
    const { uploadId, fileName, folderId } = req.body;
    const tempDir = path.join(config.NAS_STORAGE_PATH, "temp", "uploads", uploadId);
    const userDir = path.join(config.NAS_STORAGE_PATH, "users", req.user.id, "files");
    const finalPath = path.join(userDir, `${Date.now()}-${fileName}`);

    // Validate uploadId and fileName
    if (!uploadId || !fileName) {
      return res.status(StatusCodes.BAD_REQUEST).json({
        success: false,
        error: ErrorMessages.INVALID_CHUNK_PARAMETERS,
      });
    }

    // Check if temp directory exists
    if (!fs.existsSync(tempDir)) {
      return res.status(StatusCodes.NOT_FOUND).json({
        success: false,
        error: ErrorMessages.UPLOAD_NOT_FOUND,
      });
    }

    if (!fs.existsSync(userDir)) {
      fs.mkdirSync(userDir, { recursive: true });
    }

    // Get and sort chunks
    const chunks = fs
      .readdirSync(tempDir)
      .filter((f) => f.startsWith("chunk-"))
      .sort((a, b) => parseInt(a.split("-")[1]) - parseInt(b.split("-")[1]));

    if (chunks.length === 0) {
      return res.status(StatusCodes.BAD_REQUEST).json({
        success: false,
        error: ErrorMessages.NO_CHUNKS_FOUND,
      });
    }

    // Write chunks to final file
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

    // Cleanup temp files
    fs.rmSync(tempDir, { recursive: true, force: true });

    // Create file record
    const finalSize = fs.statSync(finalPath).size;
    const uniqueName = await fileService.getUniqueFilename(
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

    // Update user quota
    await User.findByIdAndUpdate(req.user.id, { $inc: { used_bytes: finalSize } }, { new: true });

    res.status(StatusCodes.CREATED).json({ success: true, data: file });
  } catch (err) {
    console.error("=== Finalize Chunked Upload Error ===", err);
    res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
      success: false,
      error: ErrorMessages.SERVER_ERROR,
    });
  }
}
