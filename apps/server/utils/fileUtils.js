// Native modules
import fs from "fs";

// Utils
import logger from "#utils/logger.js";

// ─── Helpers ──────────────────────────────────────────────────────────────────

/**
 * Safely delete a file if it exists
 * @param {string} filePath - Path to the file to delete
 * @returns {boolean} True if file was deleted, false if it didn't exist
 */
export function cleanupFile(filePath) {
  try {
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
      return true;
    }
    return false;
  } catch (error) {
    logger.error(`Error cleaning up file ${filePath}:`, error.message);
    return false;
  }
}

/**
 * Safely delete multiple files
 * @param {string[]} filePaths - Array of file paths to delete
 * @returns {number} Number of files successfully deleted
 */
export function cleanupFiles(filePaths) {
  let deletedCount = 0;
  for (const filePath of filePaths) {
    if (cleanupFile(filePath)) {
      deletedCount++;
    }
  }
  return deletedCount;
}

/**
 * Check if a file exists
 * @param {string} filePath - Path to check
 * @returns {boolean} True if file exists
 */
export function fileExists(filePath) {
  try {
    return fs.existsSync(filePath);
  } catch (_error) {
    return false;
  }
}

/**
 * Ensure a file exists, throw error if not
 * @param {string} filePath - Path to check
 * @param {string} errorMessage - Custom error message
 * @throws {Error} If file doesn't exist
 */
export function ensureFileExists(filePath, errorMessage = "File not found") {
  if (!fileExists(filePath)) {
    throw new Error(errorMessage);
  }
}

/**
 * Sanitize filename to remove dangerous characters
 * @param {string} filename - Original filename
 * @returns {string} Sanitized filename
 */
export function sanitizeFilename(filename) {
  return filename
    .replace(/[/\\?%*:|"<>]/g, "_")
    .replace(/\s+/g, "_")
    .replace(/_{2,}/g, "_")
    .trim();
}

/**
 * Get file extension from filename
 * @param {string} filename - Filename to parse
 * @returns {string} File extension (lowercase, without dot)
 */
export function getFileExtension(filename) {
  const lastDot = filename.lastIndexOf(".");
  if (lastDot === -1 || lastDot === 0) {
    return "";
  }
  return filename.substring(lastDot + 1).toLowerCase();
}

/**
 * Get filename without extension
 * @param {string} filename - Full filename
 * @returns {string} Filename without extension
 */
export function getFilenameWithoutExtension(filename) {
  const lastDot = filename.lastIndexOf(".");
  if (lastDot === -1 || lastDot === 0) {
    return filename;
  }
  return filename.substring(0, lastDot);
}

// Exports
const FileUtils = {
  cleanupFile,
  cleanupFiles,
  fileExists,
  ensureFileExists,
  sanitizeFilename,
  getFileExtension,
  getFilenameWithoutExtension,
};

export default FileUtils;
