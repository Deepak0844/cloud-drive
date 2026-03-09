/**
 * Send a single chunk as raw binary using XHR for real onUploadProgress events.
 * Metadata goes in query params — no FormData serialization.
 */
export function uploadChunkRaw({ uploadId, chunkIndex, buffer, signal, onProgress, authToken }) {
  return new Promise((resolve, reject) => {
    if (signal?.aborted) return reject(new Error("canceled"));

    const xhr = new XMLHttpRequest();
    const url = `/api/v1/files/upload/chunk?uploadId=${encodeURIComponent(uploadId)}&chunkIndex=${chunkIndex}`;

    xhr.open("POST", url);
    xhr.setRequestHeader("Authorization", `Bearer ${authToken}`);
    xhr.setRequestHeader("Content-Type", "application/octet-stream");

    xhr.upload.onprogress = (e) => {
      if (e.lengthComputable && onProgress) onProgress(e.loaded, e.total);
    };

    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        try {
          resolve(JSON.parse(xhr.responseText));
        } catch {
          resolve({});
        }
      } else {
        reject(new Error(`Chunk ${chunkIndex} failed: HTTP ${xhr.status} ${xhr.statusText}`));
      }
    };

    xhr.onerror = () => reject(new Error(`Network error on chunk ${chunkIndex}`));
    xhr.onabort = () => reject(new Error("canceled"));

    if (signal) signal.addEventListener("abort", () => xhr.abort(), { once: true });

    xhr.send(buffer);
  });
}
