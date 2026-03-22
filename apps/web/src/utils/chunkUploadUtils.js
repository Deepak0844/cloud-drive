// Constants
import { ApiBasePath, FileServiceUrls } from "@constants/serviceUrls";
import { UPLOAD_CHUNK_SIZE } from "@shared-constants/constants";

/**
 * Compute SHA-256 of an ArrayBuffer and return a lowercase hex string.
 * Uses the browser's built-in Web Crypto API (no external dependency).
 */
async function sha256Hex(buffer) {
  const hashBuffer = await crypto.subtle.digest("SHA-256", buffer);
  return Array.from(new Uint8Array(hashBuffer))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

/**
 * Send a single chunk as raw binary using XHR for real onUploadProgress events.
 * Metadata goes in query params — no FormData serialization.
 */
export function uploadChunkRaw({ uploadId, chunkIndex, chunkHash, buffer, signal, onProgress, authToken }) {
  return new Promise((resolve, reject) => {
    if (signal?.aborted) return reject(new Error("canceled"));

    const xhr = new XMLHttpRequest();
    const hashParam = chunkHash ? `&chunkHash=${chunkHash}` : "";
    const url = `${ApiBasePath}${FileServiceUrls.uploadChunk}?uploadId=${encodeURIComponent(
      uploadId
    )}&chunkIndex=${chunkIndex}${hashParam}`;

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

/**
 * Perform a single file upload using HttpClient (Axios) with progress tracking.
 */
export async function uploadSingleFile({ httpClient, file, folderId, signal, onProgressFn }) {
  const formData = new FormData();
  formData.append("file", file);
  if (folderId) formData.append("folderId", folderId);

  await httpClient.post(`${ApiBasePath}${FileServiceUrls.uploadFile}`, {}, formData, null, {
    signal,
    onUploadProgress: (pe) => {
      if (pe.lengthComputable && onProgressFn) {
        const progress = Math.round((pe.loaded / file.size) * 100);
        onProgressFn(progress, pe.loaded);
      }
    },
  });

  if (onProgressFn) onProgressFn(100, file.size);
}

/**
 * Orchestrate the chunked upload of a file.
 * Handles slicing, calling uploadChunkRaw, and updating state.
 */
export async function uploadFileInChunks({
  file,
  state,
  signal,
  authToken,
  onProgressFn,
  chunkSize = UPLOAD_CHUNK_SIZE,
}) {
  // On resume, state.uploadedChunkSet contains indices already confirmed by the server;
  // skip those chunks entirely so only missing chunks are re-sent.
  const uploadedChunkSet = state.uploadedChunkSet instanceof Set ? state.uploadedChunkSet : new Set();

  while (state.currentChunkIndex < state.totalChunks) {
    if (signal?.aborted) throw new Error("canceled");

    const start = state.currentChunkIndex * chunkSize;
    const end = Math.min(start + chunkSize, file.size);

    // ── Resume fast-forward ──────────────────────────────────────────────
    if (uploadedChunkSet.has(state.currentChunkIndex)) {
      state.uploadedBytes += end - start;
      state.currentChunkIndex++;
      const overallProg = Math.min(Math.round((state.uploadedBytes / file.size) * 100), 99);
      if (onProgressFn) onProgressFn(overallProg, state.uploadedBytes);
      continue;
    }
    // ────────────────────────────────────────────────────────────────────

    const blob = file.slice(start, end);
    const buffer = await blob.arrayBuffer();

    const bytesBeforeThisChunk = state.uploadedBytes;

    const chunkHash = await sha256Hex(buffer);

    await uploadChunkRaw({
      uploadId: state.uploadId,
      chunkIndex: state.currentChunkIndex,
      chunkHash,
      buffer,
      signal,
      authToken,
      onProgress: (loaded) => {
        const totalSoFar = bytesBeforeThisChunk + loaded;
        const prog = Math.min(Math.round((totalSoFar / file.size) * 100), 99);
        if (onProgressFn) onProgressFn(prog, totalSoFar);
      },
    });

    state.currentChunkIndex++;
    state.uploadedBytes += end - start;
    const overallProg = Math.round((state.uploadedBytes / file.size) * 100);
    if (onProgressFn) onProgressFn(overallProg, state.uploadedBytes);
  }
}
