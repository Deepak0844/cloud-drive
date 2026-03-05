import dayjs from "dayjs";

/**
 * ------------------------------------------------------------------------------
 * getTimestampDifferenceInDays
 * @param {number} startTimestamp - Start timestamp in milliseconds.
 * @param {number} endTimestamp - End timestamp in milliseconds.
 * @returns {number} - Difference in days.
 */
function getTimestampDifferenceInDays(startTimestamp = "", endTimestamp = "") {
  const diff = endTimestamp - startTimestamp;
  const baseTimestamp = 24 * 60 * 60 * 1000;

  return Math.ceil(diff / baseTimestamp);
}

/**
 * ------------------------------------------------------------------------------
 * getDateDifferenceInDays
 * @param {Date} startDate - Start date.
 * @param {Date} endDate - End date.
 * @returns {number} - Difference in days.
 */
function getDateDifferenceInDays(startDate = "", endDate = "") {
  if (!startDate || !endDate) {
    return 0;
  }

  return dayjs(endDate).diff(dayjs(startDate), "day");
}

/**
 * ------------------------------------------------------------------------------
 * compareDates
 * @param {Date} date1 - First date.
 * @param {Date} date2 - Second date.
 * @returns {number} - 1 (date1 > date2), -1 (date1 < date2), 0 (equal), or null (invalid).
 */
function compareDates(date1 = "", date2 = "") {
  if (!date1 || !date2) {
    return null;
  }

  const d1 = dayjs(date1).startOf("day");
  const d2 = dayjs(date2).startOf("day");

  if (d1.isAfter(d2)) {
    return 1;
  }

  if (d1.isBefore(d2)) {
    return -1;
  }

  return 0;
}

/**
 * ------------------------------------------------------------------------------
 * constructDateString
 * @param {Date} startDate - Start date.
 * @param {Date} endDate - End date.
 * @param {string} format - Date format (e.g., "DD/MM/YYYY").
 * @returns {string} - Formatted date range string.
 */
function constructDateString(startDate = "", endDate = "", format = "") {
  const startDateObj = dayjs(startDate);
  const endDateObj = dayjs(endDate);

  if (!startDateObj.isValid()) {
    return "";
  }

  if (!endDateObj.isValid()) {
    return `${startDateObj.format(format)}`;
  }

  return `${startDateObj.format(format)} - ${endDateObj.format(format)}`;
}

/**
 * ------------------------------------------------------------------------------
 * convertTimestampToDateFormat
 * @param {number} timestamp - Timestamp in milliseconds.
 * @param {string} format - Desired date format (default: "YYYY-MM-DD").
 * @returns {string} - Formatted date string.
 */
function convertTimestampToDateFormat(timestamp = "", format = "YYYY-MM-DD") {
  if (!timestamp) {
    return "";
  }

  return dayjs(timestamp).format(format);
}

/**
 * ------------------------------------------------------------------------------
 * getTimeInHoursAndMinutes
 * @param {number} timestamp - Timestamp in milliseconds.
 * @param {boolean} is12HourFormat - Whether to use 12-hour format.
 * @returns {string} - Time string.
 */
function getTimeInHoursAndMinutes(timestamp = "", is12HourFormat = false) {
  if (!timestamp) {
    return "";
  }

  const format = is12HourFormat ? "hh:mm a" : "HH:mm";
  return dayjs(timestamp).format(format);
}

/**
 * ------------------------------------------------------------------------------
 * formatTimestampToMonthDayYear
 * @param {number} timestamp - Timestamp in milliseconds.
 * @returns {string} - Date string like "Dec 21, 2024".
 */
function formatTimestampToMonthDayYear(timestamp = "") {
  if (!timestamp) {
    return "";
  }

  const date = new Date(timestamp);
  const monthAndDay = date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
  });
  const year = date.toLocaleDateString("en-US", { year: "numeric" });

  return `${monthAndDay}, ${year}`;
}

/**
 * ------------------------------------------------------------------------------
 * extractDateParts
 * @param {Date} date - Date to extract parts from.
 * @param {string} monthFormat - Month format ("M", "MM", "MMM", "MMMM").
 * @returns {day: string, month: string, year: string} - Extracted date parts.
 */
function extractDateParts(date = "", monthFormat = "MMM") {
  if (!date) {
    return { day: "", month: "", year: "" };
  }

  const dateObj = dayjs(date);

  return {
    day: dateObj.format("D"),
    month: dateObj.format(monthFormat),
    year: dateObj.format("YYYY"),
  };
}

/**
 * ------------------------------------------------------------------------------
 * getMonthName
 * @param {number} month - Month number (1-12).
 * @returns {string} - Full month name.
 */
function getMonthName(month = "") {
  const date = new Date();

  if (month != null) {
    date.setMonth(month - 1);
  }

  return date.toLocaleString("en-US", { month: "long" });
}

/**
 * ------------------------------------------------------------------------------
 * generateYears
 * @param {number} startYear - Starting year (e.g., 2023).
 * @returns {number[]} - Array of years up to the current year.
 */
function generateYears(startYear = "") {
  if (!startYear) {
    return [];
  }

  const currentYear = new Date().getFullYear();
  const years = [];

  for (let i = startYear; i <= currentYear; i++) {
    years.push(i);
  }

  return years;
}

/**
 * ------------------------------------------------------------------------------
 * toTimestamp
 * @param {Date} date - Date to convert.
 * @returns {number} - Timestamp in milliseconds.
 */
function toTimestamp(date = "") {
  if (!date) {
    return "";
  }

  return Date.parse(date) || "";
}

/**
 * ------------------------------------------------------------------------------
 * parseDateForDatePicker
 * @param {string} dateString - Date string (e.g., "10/06/2025").
 * @param {string} expectedFormat - Expected date format (e.g., "DD/MM/YYYY").
 * @returns {dayjs.Dayjs|undefined} - Parsed Dayjs object or undefined if invalid.
 */
function parseDateForDatePicker(dateString = "", expectedFormat = "") {
  if (!dateString) {
    return undefined;
  }

  const parsedDate = dayjs(dateString, expectedFormat, true);
  if (parsedDate.isValid()) {
    return parsedDate;
  }

  const fallbackParsedDate = dayjs(dateString);
  if (fallbackParsedDate.isValid()) {
    return fallbackParsedDate;
  }
  return undefined;
}

/**
 * ------------------------------------------------------------------------------
 * getAdjustedDateTimestampFromNow
 * @param {number} amount - Number of units to adjust.
 * @param {"add"|"subtract"} operation - Operation type.
 * @param {"day"|"week"|"month"|"quarter"|"year"|"hour"|"minute"|"second"|"millisecond"} unit - Time unit.
 * @returns {number} - Adjusted timestamp in milliseconds.
 */
function getAdjustedDateTimestampFromNow(amount = 0, operation = "add", unit = "month") {
  const allowedOperations = ["add", "subtract"];
  const allowedUnits = ["day", "week", "month", "quarter", "year", "hour", "minute", "second", "millisecond"];

  const updatedOperation = allowedOperations.includes(operation) ? operation : "add";
  const updatedUnits = allowedUnits.includes(unit) ? unit : "month";

  const currentDate = dayjs();

  if (updatedOperation === "add") {
    return currentDate.add(amount, updatedUnits).valueOf();
  }
  return currentDate.subtract(amount, updatedUnits).valueOf();
}

/**
 * ------------------------------------------------------------------------------
 * getStartOfDayEpoch
 * @returns {number} - Timestamp for start of the current day.
 */
function getStartOfDayEpoch() {
  const now = new Date();
  const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());

  return startOfDay.getTime();
}

/**
 * ------------------------------------------------------------------------------
 * getCurrentEpoch
 * @returns {number} - Current timestamp in milliseconds.
 */
function getCurrentEpoch() {
  const now = new Date();
  return now.getTime();
}

// Exports
// ------------------------------------------------------------------------------
const DateUtils = {
  getTimeInHoursAndMinutes,
  getDateDifferenceInDays,
  convertTimestampToDateFormat,
  constructDateString,
  compareDates,
  getTimestampDifferenceInDays,
  formatTimestampToMonthDayYear,
  extractDateParts,
  getMonthName,
  generateYears,
  toTimestamp,
  parseDateForDatePicker,
  getAdjustedDateTimestampFromNow,
  getStartOfDayEpoch,
  getCurrentEpoch,
};

export default DateUtils;
