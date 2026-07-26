import fs from "fs";

// Utils
import logger from "#utils/logger.js";
import CryptoUtils from "#utils/cryptoUtils.js";

/**
 * Serve a file using HTTP 206 Partial Content (YouTube-style progressive streaming)
 * with on-the-fly AES-256-CTR decryption!
 *
 * @param {object} res - Express response
 * @param {string} filePath - Absolute path to the encrypted file to serve
 * @param {string} mimeType - MIME type to set on the response
 * @param {string|null} rangeHeader - Value of the request Range header (may be undefined)
 * @param {Buffer} userKey - The unwrapped plaintext user key (32 bytes)
 * @param {Buffer} iv - The 16-byte IV for the file
 */
function serveWithRange(res, filePath, mimeType, rangeHeader, userKey, iv) {
  const stat = fs.statSync(filePath);
  const fileSize = stat.size;

  const sharedHeaders = {
    "Content-Type": mimeType,
    "Content-Disposition": "inline",
    "Accept-Ranges": "bytes",
    "Cache-Control": "private, no-store", // no-store prevents caching error responses
    // iOS's URLSessionDownloadTask.cancel(byProducingResumeData:) silently refuses to produce
    // resume data unless the response carries an ETag or Last-Modified — without one, a paused
    // background download on iOS restarts from byte 0 instead of resuming. no-store above means
    // these headers only serve that validation purpose here, not actual response caching.
    ETag: `"${fileSize}-${stat.mtimeMs}"`,
    "Last-Modified": stat.mtime.toUTCString(),
  };

  let fileStream;
  let decipherStream;

  if (rangeHeader) {
    const parts = rangeHeader.replace(/bytes=/, "").split("-");
    const start = parseInt(parts[0], 10) || 0;
    // Guard against empty end (e.g. "bytes=0-") → use fileSize - 1
    const end = parts[1] && parts[1].trim() !== "" ? parseInt(parts[1], 10) : fileSize - 1;
    const chunkSize = end - start + 1;

    res.writeHead(206, {
      ...sharedHeaders,
      "Content-Range": `bytes ${start}-${end}/${fileSize}`,
      "Content-Length": chunkSize,
    });

    fileStream = fs.createReadStream(filePath, { start, end });
    decipherStream = CryptoUtils.getDecipherForRange(userKey, iv, start);
  } else {
    res.writeHead(200, {
      ...sharedHeaders,
      "Content-Length": fileSize,
    });
    fileStream = fs.createReadStream(filePath);
    decipherStream = CryptoUtils.getDecipherStream(userKey, iv);
  }

  // Guard against stream errors after headers are sent (e.g. file deleted mid-stream)
  fileStream.on("error", (err) => {
    logger.error(`[Stream] Read stream error for ${filePath}: ${err.message}`);
    if (!res.writableEnded) {
      res.end();
    }
  });

  decipherStream.on("error", (err) => {
    logger.error(`[Stream] Decipher error for ${filePath}: ${err.message}`);
    if (!res.writableEnded) {
      res.end();
    }
  });

  fileStream.pipe(decipherStream).pipe(res);
}

const StreamingUtils = {
  serveWithRange,
};

export default StreamingUtils;
