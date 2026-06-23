/**
 * ------------------------------------------------------------------------------
 * convertSecondsToMinutes - Convert seconds to minutes (rounded up)
 * @param {number|null} seconds - Total seconds
 * @returns {number|string} Minutes or empty string if seconds is null
 */
function convertSecondsToMinutes(seconds = null) {
  if (seconds === null) {
    return "";
  }

  return Math.ceil(seconds / 60);
}

/**
 * ------------------------------------------------------------------------------
 * convertSecondsToTimeText - Convert seconds to human-readable time text
 * @param {number|null} seconds - Total seconds
 * @returns {string} Time in format like "1 hr 5 mins 30 secs" or empty string if seconds is null
 */
function convertSecondsToTimeText(seconds = null) {
  if (seconds === null) {
    return "";
  }

  const totalSeconds = Number(seconds);
  const hrs = Math.floor(totalSeconds / 3600);
  const mins = Math.floor((totalSeconds % 3600) / 60);
  const secs = totalSeconds % 60;

  const parts = [];
  if (hrs > 0) parts.push(`${hrs} hr${hrs !== 1 ? "s" : ""}`);
  if (mins > 0) parts.push(`${mins} min${mins !== 1 ? "s" : ""}`);
  if (secs > 0 || parts.length === 0) parts.push(`${secs} sec${secs !== 1 ? "s" : ""}`);

  return parts.join(" ");
}

function delay(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// Exports
const TimeUtils = {
  convertSecondsToMinutes,
  convertSecondsToTimeText,
  delay,
};

export default TimeUtils;
