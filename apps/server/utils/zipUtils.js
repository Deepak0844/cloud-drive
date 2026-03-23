/**
 * zipUtils.js
 *
 * ZIP archive streaming — assembles and streams a ZIP of files/folders
 * while decrypting each file on-the-fly before adding it to the archive.
 */

// Native modules
import fs from "fs";

// Third-party modules
import archiver from "archiver";

// Utils
import logger from "#utils/logger.js";
import CryptoUtils from "#utils/cryptoUtils.js";

// ─── ZIP Streaming ─────────────────────────────────────────────────────────────

/**
 * Creates a ZIP archive from a list of items and pipes it to `outputStream`.
 * Each item may carry `userKey` + `iv` for on-the-fly decryption.
 *
 * @param {Array<{type:'file'|'folder', path:string, name:string, userKey?:Buffer, iv?:Buffer}>} items
 * @param {import('stream').Writable} outputStream - e.g. Express response
 * @returns {Promise<void>}
 */
function createZipStream(items, outputStream) {
  return new Promise((resolve, reject) => {
    const archive = archiver("zip", { zlib: { level: 5 } });

    archive.on("error", (err) => {
      logger.error("[ZIP] Archiver error:", err.message);
      reject(err);
    });

    archive.on("warning", (err) => {
      if (err.code === "ENOENT") {
        logger.warn("[ZIP] Archiver warning:", err.message);
      } else {
        reject(err);
      }
    });

    archive.pipe(outputStream);

    for (const item of items) {
      if (item.type === "file") {
        if (fs.existsSync(item.path)) {
          if (item.userKey && item.iv) {
            const decipher = CryptoUtils.getDecipherStream(item.userKey, item.iv);
            const sourceStream = fs.createReadStream(item.path);
            archive.append(sourceStream.pipe(decipher), { name: item.name });
          } else {
            archive.file(item.path, { name: item.name });
          }
        } else {
          logger.warn(`[ZIP] File not found, skipping: ${item.path}`);
        }
      } else if (item.type === "folder") {
        if (fs.existsSync(item.path)) {
          archive.directory(item.path, item.name);
        } else {
          logger.warn(`[ZIP] Folder not found, skipping: ${item.path}`);
        }
      }
    }

    archive.on("end", () => {
      logger.info(`[ZIP] Finished bundling ${items.length} items`);
      resolve();
    });

    archive.finalize();
  });
}

const ZipUtils = { createZipStream };

export default ZipUtils;
