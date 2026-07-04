import StringUtils from "./stringUtils.js";

/**
 * ------------------------------------------------------------------------------
 * roundToNearestInteger - roundToNearestInteger
 * @param {number|null} value
 * @returns {number} value rounded to the nearest integer
 */
function roundToNearestInteger(value = null) {
  if (value === null) {
    return "";
  }

  return Math.round(value);
}

/**
 * ------------------------------------------------------------------------------
 * formatRoundedNumber - formatRoundedNumber
 * @param {number|null} value
 * @returns {string} Number rounded and formatted with locale separators
 * Example: 12756.78 ==> "12,757"
 */
function formatRoundedNumber(value = null) {
  if (value === null) {
    return "";
  }

  return StringUtils.toLocaleString(roundToNearestInteger(value));
}

/**
 * ------------------------------------------------------------------------------
 * formatFixedDecimals - formatFixedDecimals
 * @param {number} value : Input number
 * @param {number} decimals : Number of decimal places to keep (default: 2)
 * @returns {string|number} Number formatted with fixed decimals
 */
function formatFixedDecimals(value, decimals = 2) {
  if (typeof value !== "number") {
    return value;
  }

  return value.toFixed(decimals);
}

/**
 * Returns the percentage of `used` out of `total`, clamped to [0, 100].
 * Returns 0 when total is falsy to avoid division by zero.
 */
function calculatePercentage(used, total) {
  if (!total) return 0;
  return Math.min(100, Math.round((used / total) * 100));
}

/**
 * ------------------------------------------------------------------------------
 * formatBytes - formatBytes
 * @param {number} bytes
 * @param {number} decimals : Number of decimal places to keep (default: 2)
 * @returns {string} Human-readable byte size, e.g. "270.67 MB"
 */
function formatBytes(bytes, decimals = 2) {
  if (bytes === undefined || bytes === null || isNaN(bytes)) return "0 B";
  if (bytes === 0) return "0 B";

  // Google Drive and modern OSs use decimal (1000) instead of binary (1024)
  const k = 1000;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ["B", "KB", "MB", "GB", "TB", "PB", "EB", "ZB", "YB"];

  const i = Math.floor(Math.log(bytes) / Math.log(k));

  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(dm))} ${sizes[i]}`;
}

const NumberUtils = {
  roundToNearestInteger,
  formatRoundedNumber,
  formatFixedDecimals,
  calculatePercentage,
  formatBytes,
};

export default NumberUtils;
