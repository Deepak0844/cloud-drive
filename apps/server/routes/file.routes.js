import express from "express";
import {
  uploadFile,
  uploadMiddleware,
  getFiles,
  downloadFile,
  deleteFile,
  renameFile,
  moveFile,
  copyFile,
  getFilePreview,
  bulkDelete,
} from "../controllers/file.controller.js";
import { initChunkedUpload, uploadChunk, finalizeChunkedUpload } from "../controllers/chunked.controller.js";
import { protect } from "../middleware/auth.js";

const router = express.Router();

router.use(protect);

router.post("/upload", uploadMiddleware, uploadFile);
router.post("/upload/init", initChunkedUpload);
router.post("/upload/chunk", uploadMiddleware, uploadChunk);
router.post("/upload/finalize", finalizeChunkedUpload);
router.get("/", getFiles);
router.get("/:id/download", downloadFile);
router.get("/:id/preview", getFilePreview);
router.patch("/:id", renameFile);
router.post("/:id/move", moveFile);
router.post("/:id/copy", copyFile);
router.post("/bulk-delete", bulkDelete);
router.delete("/:id", deleteFile);

export default router;
