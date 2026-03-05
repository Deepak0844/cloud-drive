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

const NumberUtils = {
  roundToNearestInteger,
  formatRoundedNumber,
  formatFixedDecimals,
};

export default NumberUtils;
