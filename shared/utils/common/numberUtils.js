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

const NumberUtils = {
  roundToNearestInteger,
  formatRoundedNumber,
  formatFixedDecimals,
  calculatePercentage,
};

export default NumberUtils;
