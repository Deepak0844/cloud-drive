/**
 * ------------------------------------------------------------------------------
 * format - Format the Given URL with path/request parameters substituted with the passed values
 * @param {string} inUrlStr
 * @param {object} argVals
 * @param {object} queryVals
 * @returns {string} - URL with updated values and query params
 */
function format(inUrlStr = "", argVals = {}, queryVals = {}) {
  if (!inUrlStr) {
    return "";
  }

  // Iterate over args and substitute values
  let url = inUrlStr;
  for (const [key, value] of Object.entries(argVals)) {
    const pathParam = ":" + key;
    url = url.replace(pathParam, value);
  }

  let queryString = "";
  for (const [key, value] of Object.entries(queryVals)) {
    queryString = queryString ? `${queryString}&${key}=${value}` : `${key}=${value}`;
  }

  if (queryString) {
    url = `${url}?${queryString}`;
  }

  return url;
}

/**
 * ------------------------------------------------------------------------------
 * getEmbeddedYoutubeVideoUrl - Converts a YouTube video link into an embeddable URL format.
 * Supports both `youtube.com` and `youtu.be` link formats.
 * @param {string} url - The full YouTube video URL (e.g., https://youtu.be/abc123 or https://www.youtube.com/watch?v=abc123).
 * @returns {string} The embeddable YouTube video URL (e.g., https://www.youtube.com/embed/abc123),
 *                   or an empty string if the URL is invalid or the video ID cannot be extracted.
 */
function getEmbeddedYoutubeVideoUrl(url) {
  const youtubeRegex =
    /(?:https?:\/\/)?(?:www\.)?(?:youtube\.com\/(?:[^/\n\s]*\S+\/\S+|(?:v|e(?:mbed)?)\/(\S+))|youtu\.be\/(\S+))/;
  const match = url.match(youtubeRegex);
  const videoId = match && (match[1] || match[2]);

  if (videoId) {
    return `https://www.youtube.com/embed/${videoId}`;
  } else {
    return "";
  }
}

const UrlUtils = {
  format,
  getEmbeddedYoutubeVideoUrl,
};

// Export
export default UrlUtils;
