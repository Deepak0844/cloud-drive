/**
 * Format bytes to human-readable storage size
 * @param {number} bytes - Number of bytes
 * @param {number} decimals - Number of decimal places (default: 2)
 * @returns {string} Formatted string (e.g., "1.50 GB")
 */
export function formatStorageSize(bytes, decimals = 2) {
  if (bytes === 0) {
    return "0 B";
  }

  const units = ["B", "KB", "MB", "GB", "TB", "PB"];
  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;

  const i = Math.floor(Math.log(bytes) / Math.log(k));
  const size = bytes / Math.pow(k, i);

  return `${size.toFixed(dm)} ${units[i]}`;
}

/**
 * Convert bytes to gigabytes
 * @param {number} bytes - Number of bytes
 * @param {number} decimals - Number of decimal places (default: 2)
 * @returns {number} Size in GB
 */
export function bytesToGB(bytes, decimals = 2) {
  const gb = bytes / (1024 * 1024 * 1024);
  return Number(gb.toFixed(decimals));
}

/**
 * Convert bytes to megabytes
 * @param {number} bytes - Number of bytes
 * @param {number} decimals - Number of decimal places (default: 2)
 * @returns {number} Size in MB
 */
export function bytesToMB(bytes, decimals = 2) {
  const mb = bytes / (1024 * 1024);
  return Number(mb.toFixed(decimals));
}

/**
 * Convert gigabytes to bytes
 * @param {number} gb - Size in gigabytes
 * @returns {number} Size in bytes
 */
export function gbToBytes(gb) {
  return gb * 1024 * 1024 * 1024;
}

/**
 * Format date to readable string
 * @param {Date|string} date - Date to format
 * @param {string} format - Format type ('short', 'long', 'iso')
 * @returns {string} Formatted date string
 */
export function formatDate(date, format = "short") {
  const d = new Date(date);

  if (format === "iso") {
    return d.toISOString();
  }

  if (format === "long") {
    return d.toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  }

  // Default: short format
  return d.toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

// Exports
const FormatUtils = {
  formatStorageSize,
  bytesToGB,
  bytesToMB,
  gbToBytes,
  formatDate,
};

export default FormatUtils;
