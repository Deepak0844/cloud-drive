import express from "express";

// Controllers
import { finalizeChunkedUpload, initChunkedUpload, uploadChunk } from "../controllers/chunkedController.js";
import {
  bulkDelete,
  copyFile,
  deleteFile,
  downloadFile,
  getFilePreview,
  getFiles,
  getRecentFiles,
  moveFile,
  renameFile,
  streamFile,
  toggleFavorite,
  touchFile,
  updateFileTags,
  uploadFile,
  downloadAsZip,
  bulkMove,
  bulkCopy,
} from "../controllers/fileController.js";

// Middleware
import { protect } from "../middlewares/auth.js";
import validate from "../middlewares/validate.js";
import uploadMiddleware from "../middlewares/uploadMiddleware.js";

// Schemas
import { finalizeChunkedUploadSchema, initChunkedUploadSchema } from "../schemas/chunked.schema.js";
import {
  moveFileSchema,
  renameFileSchema,
  copyFileSchema,
  bulkDeleteSchema,
  uploadFileSchema,
  getFilesSchema,
  getRecentFilesSchema,
  idParamSchema,
  favoriteFileSchema,
  updateTagsSchema,
  bulkMoveSchema,
  bulkCopySchema,
  bulkDownloadSchema,
} from "../schemas/file.schema.js";

const router = express.Router();

// All routes are protected
router.use(protect);

// File upload routes
router.post("/upload", uploadMiddleware, validate(uploadFileSchema), uploadFile);
router.post("/upload/init", validate(initChunkedUploadSchema), initChunkedUpload);
// Raw binary middleware for chunk uploads — bypasses FormData serialization so
// the browser can stream each chunk immediately without pre-reading the full file.
const rawChunkMiddleware = express.raw({ type: "*/*", limit: "25mb" });
router.post("/upload/chunk", rawChunkMiddleware, uploadChunk);
router.post("/upload/finalize", validate(finalizeChunkedUploadSchema), finalizeChunkedUpload);

// File operation routes
router.get("/", validate(getFilesSchema), getFiles);
router.get("/recent", validate(getRecentFilesSchema), getRecentFiles);
router.get("/:id/download", validate(idParamSchema), downloadFile);
router.get("/:id/preview", validate(idParamSchema), getFilePreview);
router.patch("/:id", validate(renameFileSchema), renameFile);
router.patch("/:id/favorite", validate(favoriteFileSchema), toggleFavorite);
router.post("/:id/touch", validate(idParamSchema), touchFile);
router.patch("/:id/tags", validate(updateTagsSchema), updateFileTags);
router.get("/:id/stream", validate(idParamSchema), streamFile);
router.post("/:id/move", validate(moveFileSchema), moveFile);
router.post("/:id/copy", validate(copyFileSchema), copyFile);
router.post("/bulk-delete", validate(bulkDeleteSchema), bulkDelete);
router.post("/bulk-move", validate(bulkMoveSchema), bulkMove);
router.post("/bulk-copy", validate(bulkCopySchema), bulkCopy);
router.post("/bulk-download", validate(bulkDownloadSchema), downloadAsZip);
router.delete("/:id", validate(idParamSchema), deleteFile);

export default router;
