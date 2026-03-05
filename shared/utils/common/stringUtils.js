/**
 * ------------------------------------------------------------------------------
 * toLocaleString - Converts a number to a localized string format (e.g., 140000 → "1,40,000").
 * @param {number} value - Number to format.
 * @returns {number} Localized string or the original value if zero.
 */
function toLocaleString(value = 0) {
  if (Number(value) === 0) {
    return value;
  }
  return value ? value.toLocaleString("en-IN") : "";
}

/**
 * ------------------------------------------------------------------------------
 * toPascalCaseString - Capitalizes the first letter of the string, rest lowercase.
 * @param {string} string - Input string.
 * @returns {string} Pascal case string or null if empty.
 */
function toPascalCaseString(string = "") {
  if (!string) {
    return null;
  }

  return string[0].toUpperCase() + string.slice(1).toLowerCase();
}

/**
 * ------------------------------------------------------------------------------
 * formatText - formatText
 * @param {string} value : any string, number or value
 * @param {string} formattedText : replaced text
 * @returns : formatted value if input value is not present
 */
function formatText(value = "", formattedText = "--") {
  return value ? value : formattedText;
}

/**
 * ------------------------------------------------------------------------------
 * concatenateStrings - Joins an array of strings with a given symbol.
 * @param {string[]} strings - Array of strings.
 * @param {string} [symbol=" - "] - Separator symbol.
 * @returns {string} Joined string or empty string if invalid input.
 */
function concatenateStrings(strings = [], symbol = " - ") {
  const finalSymbol = symbol === "" ? "" : symbol;

  if (!Array.isArray(strings)) {
    return "";
  }

  return strings.join(finalSymbol);
}

/**
 * ------------------------------------------------------------------------------
 * getAlphabetSerialNo - Returns the alphabet-based serial number (a–z, a1–z1, ...).
 * @param {number} value - Index for the serial number.
 * @returns {string} Alphabet serial number.
 */
function getAlphabetSerialNo(value = 0) {
  const alphabets = "abcdefghijklmnopqrstuvwxyz";

  const letter = alphabets[value % 26];
  const number = value > 25 && Math.floor(value / 26);

  return number ? `${letter}${number}` : letter;
}

/**
 * ------------------------------------------------------------------------------
 * maskCharacter - Masks part of a string or number with a specified character.
 * @param {string|number} initialValue - The value to mask.
 * @param {number} - Number of characters to leave unmasked from the end.
 * @param {string} - Character used for masking.
 * @returns {string} - Masked string (e.g., ****3765).
 */
function maskCharacter(initialValue = "", unMaskedCharCount = 4, maskCharacter = "*") {
  // Converting value into string for processing
  const processValue = typeof initialValue !== "string" ? initialValue?.toString() : initialValue;

  // length of "processValue"
  const processValueLength = processValue?.length;

  // if length is Zero || undefined then return "3 times star"
  if (!processValueLength || processValueLength === 0) {
    // default mask value
    const maskValue = `${maskCharacter}${maskCharacter}${maskCharacter}`;
    return maskValue;
  }

  // unMasked Char Count From Last
  const unMaskedCharCountFromLast = unMaskedCharCount ? unMaskedCharCount : Math.floor(processValueLength / 2);

  // Slice the value and replace with maskChar then add remaining string
  return (
    ("" + processValue).slice(0, -unMaskedCharCountFromLast).replace(/./g, "*") +
    ("" + processValue).slice(-unMaskedCharCountFromLast)
  );
}

/**
 * ------------------------------------------------------------------------------
 * convertStringToBooleanOrNumber - Converts a string to a boolean, number, or returns the original string based on the data type.
 * @param {string} dataValueType - The type of data ("BOOLEAN", number type, or other).
 * @param {string|number|boolean} value - The input value to convert.
 * @returns {boolean|number|string|null} - The converted value or null if empty.
 */
function convertStringToBooleanOrNumber(dataValueType = "", value = "") {
  const dataTypes = ["INTEGER", "DOUBLE"];

  // If value is null, undefined, or an empty string
  if (value === null || value === undefined || value === "") {
    return null;
  }

  if (dataValueType === "BOOLEAN") {
    return value === true;
  }

  if (dataTypes.includes(dataValueType)) {
    return parseFloat(value);
  }

  return value;
}

/**
 * ------------------------------------------------------------------------------
 * formatBooleanValue - Formats a value as "Yes" or "No" if it's a BOOLEAN type.
 * @param {string} dataType - Type of the data (e.g., "BOOLEAN", "STRING").
 * @param {string|boolean|number} value - The value to format.
 * @returns {string} Formatted value.
 */
function formatBooleanValue(dataType = "", value = "") {
  if (dataType === "BOOLEAN") {
    return value ? "Yes" : "No";
  }

  return formatText(value);
}

// Exports
// --------------------------------------------------------------------
const StringUtils = {
  toLocaleString,
  toPascalCaseString,
  formatText,
  concatenateStrings,
  getAlphabetSerialNo,
  maskCharacter,
  convertStringToBooleanOrNumber,
  formatBooleanValue,
};

export default StringUtils;
