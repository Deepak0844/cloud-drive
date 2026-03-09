import fs from "fs";

// Utils
import logger from "#utils/logger.js";

/**
 * Serve a file using HTTP 206 Partial Content (YouTube-style progressive streaming).
 * The browser requests only the bytes it needs right now; seeks trigger new Range requests.
 * Always sets Content-Disposition: inline so the browser plays inline, never prompts download.
 *
 * @param {object} res - Express response
 * @param {string} filePath - Absolute path to the file to serve
 * @param {string} mimeType - MIME type to set on the response
 * @param {string|null} rangeHeader - Value of the request Range header (may be undefined)
 */
function serveWithRange(res, filePath, mimeType, rangeHeader) {
  const stat = fs.statSync(filePath);
  const fileSize = stat.size;

  const sharedHeaders = {
    "Content-Type": mimeType,
    "Content-Disposition": "inline",
    "Accept-Ranges": "bytes",
    "Cache-Control": "private, no-store", // no-store prevents caching error responses
  };

  let stream;

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
    stream = fs.createReadStream(filePath, { start, end });
  } else {
    res.writeHead(200, {
      ...sharedHeaders,
      "Content-Length": fileSize,
    });
    stream = fs.createReadStream(filePath);
  }

  // Guard against stream errors after headers are sent (e.g. file deleted mid-stream)
  stream.on("error", (err) => {
    logger.error(`[Stream] Read stream error for ${filePath}: ${err.message}`);
    if (!res.writableEnded) {
      res.end();
    }
  });

  stream.pipe(res);
}

const StreamingUtils = {
  serveWithRange,
};

export default StreamingUtils;
