// Services
import ChunkedService from "#services/chunkedService.js";
import SocketService from "#services/socketService.js";

// Constants
import { HttpStatus } from "@shared-constants/constants";
import { SocketEvents } from "#constants/generalConstants.js";

// Middleware
import asyncHandler from "#middlewares/asyncHandler.js";

// Utils
import ResponseUtils from "#utils/responseUtils.js";

/**
 * @desc    Initiate chunked upload
 * @route   POST /api/v1/files/upload/init
 * @access  Private
 */
export const initChunkedUpload = asyncHandler(async (req, res) => {
  const { fileSize, totalChunks } = req.body;
  const result = await ChunkedService.initUpload(req.user.id, fileSize, totalChunks);
  return ResponseUtils.success(res, result);
});

/**
 * @desc    Upload a single chunk as raw binary body
 * @route   POST /api/v1/files/upload/chunk
 * @access  Private
 */
export const uploadChunk = asyncHandler(async (req, res) => {
  const { uploadId, chunkIndex, chunkHash } = req.query;
  const result = await ChunkedService.saveChunk(req.user.id, uploadId, chunkIndex, req.body, chunkHash);
  return ResponseUtils.success(res, result);
});

/**
 * @desc    Get the status of an in-progress chunked upload session
 * @route   GET /api/v1/files/upload/status
 * @access  Private
 */
export const getUploadStatus = asyncHandler(async (req, res) => {
  const { uploadId } = req.query;
  const result = await ChunkedService.getUploadStatus(req.user.id, uploadId);
  return ResponseUtils.success(res, result);
});

/**
 * @desc    Assemble all chunks and create the File record
 * @route   POST /api/v1/files/upload/finalize
 * @access  Private
 */
export const finalizeChunkedUpload = asyncHandler(async (req, res) => {
  const { uploadId, fileName: name, folderId, mimeType, totalSize } = req.body;

  const { file, updatedUser } = await ChunkedService.assembleAndFinalize(req.user.id, uploadId, {
    name,
    folderId,
    mimeType,
    totalSize,
  });

  SocketService.emitToUser(req.user.id, SocketEvents.QUOTA_UPDATE, {
    quota_bytes: updatedUser.quota_bytes,
    used_bytes: updatedUser.used_bytes,
  });

  return ResponseUtils.success(res, file, HttpStatus.CREATED);
});
