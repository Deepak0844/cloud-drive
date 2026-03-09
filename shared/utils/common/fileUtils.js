// Utils
import UrlUtils from "./urlUtils";

/**
 * ------------------------------------------------------------------------------
 * convertBinaryToBlobUrl - Convert binary data to a Base64 string for embedding (PDF example)
 * @param {string} binaryString - Binary data string
 * @returns {string} Base64 string or empty string if input is invalid
 */
function convertBinaryToBlobUrl(binaryString = "") {
  if (!binaryString) {
    return "";
  }

  const blob = new Blob([binaryString], { type: "application/pdf" });
  const blobUrl = URL.createObjectURL(blob);
  return blobUrl;
}

/**
 * ------------------------------------------------------------------------------
 * blobToBase64 - Convert a Blob to a Base64 string
 * Reference Link : https://stackoverflow.com/questions/18650168/convert-blob-to-base64
 * @param {Blob} blob - Blob object to convert
 * @returns {Promise<string>} Promise resolving to Base64 string
 */
function blobToBase64(blob) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = () => resolve(reader.result);
    reader.onerror = (err) => reject(err);

    reader.readAsDataURL(blob);
  });
}

/**
 * ------------------------------------------------------------------------------
 * base64ToFile - Convert a Base64 string to a File object
 * @param {string} base64String - Base64 encoded data
 * @param {string} fileName - Name of the file to create
 * @returns {File|string} File object or empty string if input is invalid
 */
function base64ToFile(base64String = "", fileName = "") {
  if (!base64String) {
    return "";
  }

  const arr = base64String.split(",");
  const mime = arr[0].match(/:(.*?);/)[1];
  const bstr = atob(arr[1]);
  let n = bstr.length;
  const u8arr = new Uint8Array(n);

  while (n--) {
    u8arr[n] = bstr.charCodeAt(n);
  }

  return new File([u8arr], fileName, { type: mime });
}

/**
 * ------------------------------------------------------------------------------
 * convertBinaryToBase64StringImage - Convert binary image data to a Base64 string (PNG example)
 * @param {Blob} binaryString - Binary image data as a Blob
 * @returns {Promise<string>} Promise resolving to Base64 string or empty string if input is invalid
 */
async function convertBinaryToBase64StringImage(binaryString = "") {
  if (!binaryString) {
    return "";
  }

  const correctedBlob = binaryString.slice(0, binaryString.size, "image/png");
  const data = await blobToBase64(correctedBlob);
  return data;
}

/**
 * ------------------------------------------------------------------------------
 * startFileDownload - Trigger browser download for a file by id
 * @param {{id?: string, _id?: string, name?: string}} file - File metadata
 * @param {string} downloadUrlTemplate - URL template including :id
 * @returns {void}
 */
function startFileDownload(file = {}, downloadUrlTemplate = "") {
  const fileId = file.id || file._id;
  if (!fileId || !downloadUrlTemplate) return;

  const downloadUrl = UrlUtils.format(downloadUrlTemplate, { id: fileId });
  const anchor = document.createElement("a");
  anchor.href = downloadUrl;
  anchor.download = file.name || "download";
  document.body.appendChild(anchor);
  anchor.click();
  document.body.removeChild(anchor);
}

// Exports
// --------------------------------------------------------------------
const FileUtils = {
  convertBinaryToBlobUrl,
  blobToBase64,
  base64ToFile,
  convertBinaryToBase64StringImage,
  startFileDownload,
};

export default FileUtils;
