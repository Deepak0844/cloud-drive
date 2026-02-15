import express from "express";

// Controllers
import { initChunkedUpload, uploadChunk, finalizeChunkedUpload } from "../controllers/chunked.controller.js";
import {
  bulkDelete,
  copyFile,
  deleteFile,
  downloadFile,
  getFilePreview,
  getFiles,
  moveFile,
  renameFile,
  uploadFile,
  uploadMiddleware,
} from "../controllers/file.controller.js";

// Middleware
import { protect } from "../middleware/auth.js";

const router = express.Router();

// All routes are protected
router.use(protect);

// File upload routes
router.post("/upload", uploadMiddleware, uploadFile);
router.post("/upload/init", initChunkedUpload);
router.post("/upload/chunk", uploadMiddleware, uploadChunk);
router.post("/upload/finalize", finalizeChunkedUpload);

// File operation routes
router.get("/", getFiles);
router.get("/:id/download", downloadFile);
router.get("/:id/preview", getFilePreview);
router.patch("/:id", renameFile);
router.post("/:id/move", moveFile);
router.post("/:id/copy", copyFile);
router.post("/bulk-delete", bulkDelete);
router.delete("/:id", deleteFile);

export default router;
