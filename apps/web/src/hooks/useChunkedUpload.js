import { useState, useRef, useCallback } from "react";
import axios from "axios";
import AuthUtils from "@/utils/authUtils";
import HttpClientFactory from "@/utils/httpClientFactory";
import fileApi, { useFinalizeChunkedUploadMutation } from "@/store/api/fileApi";
import { useDispatch } from "react-redux";

// Must match CHUNK_SIZE in UploadContext.jsx
export const CHUNK_SIZE = 10 * 1024 * 1024; // 10 MB

export const UploadStatus = {
  IDLE: "idle",
  UPLOADING: "uploading",
  PAUSED: "paused",
  SUCCESS: "success",
  ERROR: "error",
  CANCELLED: "cancelled",
};

/**
 * Send a single chunk as raw binary using XHR for real onUploadProgress events.
 * Metadata goes in query params — no FormData serialization.
 */
function uploadChunkRaw({ uploadId, chunkIndex, buffer, signal, onProgress, authToken }) {
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

/**
 * @param {File}     file
 * @param {string}   folderId
 * @param {Function} onComplete
 * @param {Promise}  initPromise  — pre-fired from UploadContext.addUpload(); resolves to
 *                                  { uploadId, totalChunks } or null for small files
 */
export function useChunkedUpload(file, folderId, onComplete, initPromise) {
  const [finalizeUploadMutation] = useFinalizeChunkedUploadMutation();
  const dispatch = useDispatch();
  const dispatchRef = useRef(dispatch);
  dispatchRef.current = dispatch;

  const [status, setStatus] = useState(UploadStatus.IDLE);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState(null);
  const [speed, setSpeed] = useState(0);
  const [eta, setEta] = useState(null);

  const abortControllerRef = useRef(null);
  const stateRef = useRef({
    uploadId: null,
    totalChunks: 0,
    currentChunkIndex: 0,
    uploadedBytes: 0,
  });

  // Rolling 5-second speed window
  const speedWindowRef = useRef([]);

  const updateSpeed = useCallback(
    (totalBytesUploadedSoFar) => {
      const now = Date.now();
      const window = speedWindowRef.current;
      window.push({ t: now, b: totalBytesUploadedSoFar });
      const cutoff = now - 5000;
      while (window.length > 1 && window[0].t < cutoff) window.shift();
      if (window.length >= 2) {
        const oldest = window[0];
        const newest = window[window.length - 1];
        const elapsed = (newest.t - oldest.t) / 1000;
        if (elapsed > 0) {
          const bps = (newest.b - oldest.b) / elapsed;
          setSpeed(bps);
          const remaining = file.size - totalBytesUploadedSoFar;
          setEta(bps > 0 ? Math.ceil(remaining / bps) : null);
        }
      }
    },
    [file.size]
  );

  const processUpload = useCallback(async () => {
    try {
      // Create a fresh abort controller for this run (handles resume correctly)
      abortControllerRef.current = new AbortController();

      const state = stateRef.current;
      const httpClient = HttpClientFactory.getInstance();
      const authToken = AuthUtils.getToken();

      // ── Branch 1: Small file (≤ CHUNK_SIZE) ──────────────────────────────
      if (file.size <= CHUNK_SIZE) {
        const formData = new FormData();
        formData.append("file", file);
        if (folderId) formData.append("folderId", folderId);
        speedWindowRef.current = [];

        await httpClient.post("/api/v1/files/upload", {}, formData, null, {
          signal: abortControllerRef.current.signal,
          onUploadProgress: (pe) => {
            if (pe.lengthComputable) {
              setProgress(Math.round((pe.loaded / file.size) * 100));
              updateSpeed(pe.loaded);
            }
          },
        });

        dispatchRef.current(
          fileApi.util.invalidateTags([
            { type: "Files" },
            { type: "Folders", id: "CONTENTS" },
            { type: "Files", id: "RECENT" },
          ])
        );

        setSpeed(0);
        setEta(null);
        setStatus(UploadStatus.SUCCESS);
        setProgress(100);
        if (onComplete) onComplete();
        return;
      }

      // ── Branch 2: Chunked upload ──────────────────────────────────────────

      // Resolve the pre-fired init promise (fired at file-selection time in UploadContext)
      // On first call: await the pre-init. On resume: uploadId is already in stateRef.
      if (!state.uploadId) {
        const initData = await initPromise; // already in-flight or resolved
        state.uploadId = initData.uploadId;
        state.totalChunks = initData.totalChunks;
      }

      // Upload chunks sequentially using raw XHR (no FormData)
      while (state.currentChunkIndex < state.totalChunks) {
        if (abortControllerRef.current?.signal.aborted) return;

        const start = state.currentChunkIndex * CHUNK_SIZE;
        const end = Math.min(start + CHUNK_SIZE, file.size);

        // file.slice() is lazy — reads only this chunk from disk when XHR sends it
        const blob = file.slice(start, end);
        const buffer = await blob.arrayBuffer();

        try {
          if (abortControllerRef.current?.signal.aborted) return;
          const bytesBeforeThisChunk = state.uploadedBytes;

          await uploadChunkRaw({
            uploadId: state.uploadId,
            chunkIndex: state.currentChunkIndex,
            buffer,
            signal: abortControllerRef.current.signal,
            authToken,
            onProgress: (loaded) => {
              const totalSoFar = bytesBeforeThisChunk + loaded;
              setProgress(Math.min(Math.round((totalSoFar / file.size) * 100), 99));
              updateSpeed(totalSoFar);
            },
          });
        } catch (err) {
          // If the failure was due to user clicking Pause/Cancel, stop immediately
          if (abortControllerRef.current?.signal.aborted || err.message === "canceled") {
            return;
          }

          throw err; // Let the outer catch block handle it (marking it ERROR)
        }

        state.currentChunkIndex++;
        state.uploadedBytes += end - start;
        setProgress(Math.round((state.uploadedBytes / file.size) * 100));
      }

      // Finalize
      setSpeed(0);
      setEta(null);
      await finalizeUploadMutation({
        uploadId: state.uploadId,
        fileName: file.name,
        folderId,
        mimeType: file.type,
      }).unwrap();

      setStatus(UploadStatus.SUCCESS);
      setProgress(100);
      if (onComplete) onComplete();
    } catch (err) {
      if (axios.isCancel(err) || err.message === "canceled") return;
      setError(err?.data?.message || err.message || "Upload failed");
      setStatus(UploadStatus.ERROR);
      setSpeed(0);
      setEta(null);
    }
  }, [file, folderId, onComplete, initPromise, finalizeUploadMutation, updateSpeed]);

  const start = useCallback(() => {
    if (status === UploadStatus.IDLE || status === UploadStatus.ERROR) {
      speedWindowRef.current = [];
      setStatus(UploadStatus.UPLOADING);
      setError(null);
      processUpload();
    }
  }, [status, processUpload]);

  const pause = useCallback(() => {
    if (status === UploadStatus.UPLOADING) {
      if (abortControllerRef.current) abortControllerRef.current.abort();
      setStatus(UploadStatus.PAUSED);
      setSpeed(0);
      setEta(null);
    }
  }, [status]);

  const resume = useCallback(() => {
    if (status === UploadStatus.PAUSED || status === UploadStatus.ERROR) {
      speedWindowRef.current = [];
      setStatus(UploadStatus.UPLOADING);
      setError(null);
      processUpload();
    }
  }, [status, processUpload]);

  const cancel = useCallback(() => {
    if (abortControllerRef.current) abortControllerRef.current.abort();
    stateRef.current = { uploadId: null, totalChunks: 0, currentChunkIndex: 0, uploadedBytes: 0 };
    setStatus(UploadStatus.CANCELLED);
    setSpeed(0);
    setEta(null);
  }, []);

  return { status, progress, error, speed, eta, start, pause, resume, cancel };
}
