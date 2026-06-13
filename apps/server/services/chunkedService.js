// Native modules
import crypto from "crypto";
import fs from "fs";
import path from "path";
import mongoose from "mongoose";

// Models
import User from "#models/User.js";

// Services
import FileService from "#services/fileService.js";
import MetadataService from "#services/metadataService.js";

// Constants
import { HttpStatus } from "@shared-constants/constants";
import { ErrorMessages } from "#constants/generalConstants.js";

// Utils
import { AppError } from "#utils/errorUtils.js";
import MimeUtils from "#utils/mimeUtils.js";
import logger from "#utils/logger.js";

// ─── Private helpers ───────────────────────────────────────────────────────────

/**
 * Ensures the uploadId was issued to this user and the chunk directory exists.
 * Throws AppError on any violation so the controller needs no extra checks.
 *
 * @param {string} userId
 * @param {string} uploadId
 * @returns {string} Absolute path to the chunk directory
 */
function resolveChunkDir(userId, uploadId) {
  if (!uploadId || !uploadId.startsWith(`${userId}_`)) {
    throw new AppError(ErrorMessages.UPLOAD_NOT_FOUND, HttpStatus.NOT_FOUND);
  }

  const chunkDir = path.join(FileService.getChunksDir(userId), uploadId);

  if (!fs.existsSync(chunkDir)) {
    throw new AppError(ErrorMessages.UPLOAD_NOT_FOUND, HttpStatus.NOT_FOUND);
  }

  return chunkDir;
}

/**
 * Reads totalChunks from the meta.json written at init time.
 * Returns null if the file is absent or unparseable (non-fatal).
 *
 * @param {string} chunkDir
 * @returns {Promise<number|null>}
 */
async function readMeta(chunkDir) {
  const metaPath = path.join(chunkDir, "meta.json");
  if (!fs.existsSync(metaPath)) {
    return null;
  }
  try {
    const meta = JSON.parse(await fs.promises.readFile(metaPath, "utf-8"));
    return typeof meta.totalChunks === "number" ? meta.totalChunks : null;
  } catch {
    return null; // non-fatal
  }
}

/**
 * Returns an array of chunk filenames sorted by numeric index.
 *
 * @param {string} chunkDir
 * @returns {string[]}
 */
function listChunkFiles(chunkDir) {
  return fs
    .readdirSync(chunkDir)
    .filter((f) => /^chunk_\d+$/.test(f))
    .sort((a, b) => parseInt(a.split("_")[1], 10) - parseInt(b.split("_")[1], 10));
}

// ─── Service functions ─────────────────────────────────────────────────────────

/**
 * Initiates a chunked upload session.
 * Creates the chunk directory and persists session metadata.
 *
 * @param {string} userId
 * @param {number} fileSize   Total file size in bytes (used for quota pre-check)
 * @param {number} totalChunks
 * @returns {Promise<{ uploadId: string, totalChunks: number }>}
 */
async function initUpload(userId, fileSize, totalChunks) {
  const hasQuota = await FileService.checkQuota(userId, fileSize);
  if (!hasQuota) {
    throw new AppError(ErrorMessages.QUOTA_EXCEEDED, HttpStatus.FORBIDDEN);
  }

  const uploadId = `${userId}_${Date.now()}`;
  const chunkDir = path.join(FileService.getChunksDir(userId), uploadId);

  await fs.promises.mkdir(chunkDir, { recursive: true });
  await fs.promises.writeFile(path.join(chunkDir, "meta.json"), JSON.stringify({ totalChunks }));

  return { uploadId, totalChunks };
}

/**
 * Persists a single chunk buffer to disk and optionally verifies its SHA-256 hash.
 *
 * @param {string} userId
 * @param {string} uploadId
 * @param {number} chunkIndex
 * @param {Buffer} chunkBuffer
 * @param {string|undefined} chunkHash  Optional hex SHA-256 of the raw buffer
 * @returns {Promise<{ chunkIndex: number, uploadId: string }>}
 */
async function saveChunk(userId, uploadId, chunkIndex, chunkBuffer, chunkHash) {
  if (!Buffer.isBuffer(chunkBuffer) || chunkBuffer.length === 0) {
    throw new AppError(ErrorMessages.NO_CHUNK_FILE, HttpStatus.BAD_REQUEST);
  }

  const chunkDir = resolveChunkDir(userId, uploadId);
  const idx = parseInt(chunkIndex, 10);
  const chunkPath = path.join(chunkDir, `chunk_${idx}`);

  await fs.promises.writeFile(chunkPath, chunkBuffer);

  // Optional per-chunk integrity check
  if (chunkHash) {
    const computedHash = crypto.createHash("sha256").update(chunkBuffer).digest("hex");
    if (computedHash !== chunkHash) {
      await fs.promises.unlink(chunkPath).catch(() => {});
      throw new AppError(`${ErrorMessages.CHUNK_HASH_MISMATCH} (chunk ${idx})`, HttpStatus.BAD_REQUEST);
    }
  }

  return { chunkIndex: idx, uploadId };
}

/**
 * Returns the current state of an in-progress upload session.
 * Clients use this on page reload to resume without re-sending received chunks.
 *
 * @param {string} userId
 * @param {string} uploadId
 * @returns {Promise<{ uploadId: string, totalChunks: number|null, uploadedChunks: number[] }>}
 */
async function getUploadStatus(userId, uploadId) {
  const chunkDir = resolveChunkDir(userId, uploadId);
  const totalChunks = await readMeta(chunkDir);

  const uploadedChunks = listChunkFiles(chunkDir).map((f) => parseInt(f.split("_")[1], 10));

  return { uploadId, totalChunks, uploadedChunks };
}

/**
 * Assembles all chunks, verifies integrity, encrypts, and creates the File record.
 *
 * @param {string} userId
 * @param {string} uploadId
 * @param {{ name: string, folderId: string|undefined, mimeType: string|undefined, totalSize: number|undefined }} options
 * @returns {Promise<{ file: object, updatedUser: object }>}
 */
async function assembleAndFinalize(userId, uploadId, { name, folderId, mimeType, totalSize }) {
  const chunkDir = resolveChunkDir(userId, uploadId);
  const expectedTotalChunks = await readMeta(chunkDir);
  const chunks = listChunkFiles(chunkDir);

  // Verify chunk presence
  if (chunks.length === 0) {
    throw new AppError(ErrorMessages.NO_CHUNKS_FOUND, HttpStatus.BAD_REQUEST);
  }

  if (expectedTotalChunks !== null) {
    if (chunks.length !== expectedTotalChunks) {
      throw new AppError(
        `Upload incomplete: expected ${expectedTotalChunks} chunks but found ${chunks.length}`,
        HttpStatus.BAD_REQUEST
      );
    }
    const presentIndices = new Set(chunks.map((f) => parseInt(f.split("_")[1], 10)));
    for (let i = 0; i < expectedTotalChunks; i++) {
      if (!presentIndices.has(i)) {
        throw new AppError(`Upload incomplete: chunk ${i} is missing`, HttpStatus.BAD_REQUEST);
      }
    }
  }

  // Fetch user encryption key
  const user = await User.findById(userId).select("+encryption_key_wrapped");
  if (!user || !user.encryption_key_wrapped) {
    throw new AppError(ErrorMessages.ENCRYPTION_KEYS_MISSING, HttpStatus.INTERNAL_SERVER_ERROR);
  }

  const fileId = new mongoose.Types.ObjectId();
  const tempCombinedPath = path.join(chunkDir, "combined.tmp");

  // 1. Assemble chunks into temp file
  const tempFileHandle = await fs.promises.open(tempCombinedPath, "a");
  for (const chunk of chunks) {
    const data = await fs.promises.readFile(path.join(chunkDir, chunk));
    await tempFileHandle.appendFile(data);
    await fs.promises.unlink(path.join(chunkDir, chunk));
  }
  await tempFileHandle.close();

  const stats = fs.statSync(tempCombinedPath);

  // 2. Verify assembled size against client-reported totalSize
  if (totalSize && stats.size !== parseInt(totalSize, 10)) {
    logger.error(`[Upload] Size mismatch for ${name}: expected ${totalSize}, got ${stats.size}`);
    await fs.promises.unlink(tempCombinedPath).catch(() => {});
    throw new AppError(ErrorMessages.UPLOAD_SIZE_MISMATCH, HttpStatus.INTERNAL_SERVER_ERROR);
  }

  // 3. Re-check quota at finalize time (concurrent uploads may have consumed space)
  const hasQuota = await FileService.checkQuota(userId, stats.size);
  if (!hasQuota) {
    await fs.promises.unlink(tempCombinedPath).catch(() => {});
    throw new AppError(ErrorMessages.QUOTA_EXCEEDED, HttpStatus.FORBIDDEN);
  }

  const extension = path.extname(name).replace(".", "");
  const effectiveMimeType = mimeType || MimeUtils.getMimeType(name);
  const category = MetadataService.getCategory(effectiveMimeType, name);
  const hash = await MetadataService.calculateHash(tempCombinedPath);

  // 4. Run the shared finalization (encrypt + write to user storage + create DB record)
  const file = await FileService.finalizeUploadedFile({
    userId,
    folderId,
    tempFilePath: tempCombinedPath,
    originalName: name,
    mimeType: effectiveMimeType,
    size: stats.size,
    category,
    extension: extension || "bin",
    fileId,
    hash,
  });

  // 5. Cleanup chunk directory
  await fs.promises.rm(chunkDir, { recursive: true, force: true }).catch(() => {});

  // Return both the new file and the refreshed user (for quota socket event)
  const updatedUser = await User.findById(userId);
  return { file, updatedUser };
}

const ChunkedService = {
  initUpload,
  saveChunk,
  getUploadStatus,
  assembleAndFinalize,
};

export default ChunkedService;
