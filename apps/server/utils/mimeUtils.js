/**
 * Simple MIME type detection utility
 * @param {string} filename - Name of the file with extension
 * @returns {string} - MIME type string
 */
function getMimeType(filename) {
  if (!filename) {
    return "application/octet-stream";
  }

  const ext = filename.split(".").pop().toLowerCase();

  const mimeMap = {
    // Images
    jpg: "image/jpeg",
    jpeg: "image/jpeg",
    png: "image/png",
    gif: "image/gif",
    webp: "image/webp",
    avif: "image/avif",
    heic: "image/heic",
    heif: "image/heif",
    tiff: "image/tiff",
    tif: "image/tiff",
    bmp: "image/bmp",
    svg: "image/svg+xml",
    ico: "image/x-icon",

    // Video
    mp4: "video/mp4",
    webm: "video/webm",
    mov: "video/quicktime",
    avi: "video/x-msvideo",
    mkv: "video/x-matroska",
    wmv: "video/x-ms-wmv",
    flv: "video/x-flv",
    "3gp": "video/3gpp",
    m4v: "video/mp4",

    // Audio
    mp3: "audio/mpeg",
    wav: "audio/wav",
    ogg: "audio/ogg",
    m4a: "audio/mp4",
    flac: "audio/flac",
    aac: "audio/aac",
    opus: "audio/opus",
    wma: "audio/x-ms-wma",
    aiff: "audio/x-aiff",
    aif: "audio/x-aiff",

    // Documents
    pdf: "application/pdf",
    doc: "application/msword",
    docx: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    xls: "application/vnd.ms-excel",
    xlsx: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    ppt: "application/vnd.ms-powerpoint",
    pptx: "application/vnd.openxmlformats-officedocument.presentationml.presentation",
    txt: "text/plain",
    csv: "text/csv",
    md: "text/markdown",

    // Archives
    zip: "application/zip",
    rar: "application/x-rar-compressed",
    tar: "application/x-tar",
    gz: "application/gzip",
    "7z": "application/x-7z-compressed",

    // Code
    js: "text/javascript",
    json: "application/json",
    html: "text/html",
    css: "text/css",
  };

  return mimeMap[ext] || "application/octet-stream";
}

// Exports
const MimeUtils = {
  getMimeType,
};

export default MimeUtils;
