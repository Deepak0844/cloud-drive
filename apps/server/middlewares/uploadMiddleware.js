import os from "os";
import path from "path";
import multer from "multer";

// Constants
import { ErrorMessages } from "#constants/generalConstants.js";

// ─── Allowed MIME Types ───────────────────────────────────────────────────────

export const ALLOWED_MIME_TYPES = new Set([
  // Images
  "image/jpeg",
  "image/png",
  "image/gif",
  "image/webp",
  "image/avif",
  "image/tiff",
  "image/bmp",
  "image/svg+xml",
  "image/heic",
  "image/heif",
  // Videos
  "video/mp4",
  "video/webm",
  "video/quicktime",
  "video/x-msvideo",
  "video/vnd.avi", // file-type v22 returns this for AVI, not video/x-msvideo
  "video/x-matroska",
  "video/matroska", // file-type v22 returns this for MKV, not video/x-matroska
  "video/x-flv",
  "video/mpeg",
  "video/3gpp",
  "video/ogg",
  "video/x-ms-wmv",
  "video/x-ms-asf", // file-type v22 returns this for WMV/ASF containers
  "video/mp2t",
  // Audio
  "audio/mpeg",
  "audio/flac",
  "audio/ogg",
  "audio/wav",
  "audio/aac",
  "audio/mp4",
  "audio/x-m4a",
  "audio/opus",
  "audio/webm",
  "audio/x-aiff",
  "audio/aiff", // file-type v22 returns this for AIFF, not audio/x-aiff
  "audio/x-ms-wma",
  "audio/x-ms-asf", // file-type v22 returns this for WMA/ASF containers
  // Documents
  "application/pdf",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/vnd.ms-excel",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "application/vnd.ms-powerpoint",
  "application/vnd.openxmlformats-officedocument.presentationml.presentation",
  "text/plain",
  "text/csv",
  "text/markdown",
  // Archives
  "application/zip",
  "application/x-rar-compressed",
  "application/x-7z-compressed",
  "application/x-tar",
  "application/gzip",
]);

// ─── Multer — writes to OS temp dir; we rename to stable path after DB insert ─

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, os.tmpdir()),
  filename: (_req, file, cb) => {
    const sanitized = path.basename(file.originalname);
    cb(null, `${Date.now()}-${sanitized}`);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 5 * 1000 * 1000 * 1000 }, // 5 GB cap
  fileFilter: (_req, file, cb) => {
    if (ALLOWED_MIME_TYPES.has(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error(ErrorMessages.FILE_TYPE_NOT_ALLOWED), false);
    }
  },
});

export const uploadMiddleware = upload.single("file");
export default uploadMiddleware;
