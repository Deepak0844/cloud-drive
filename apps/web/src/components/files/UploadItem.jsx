// React core & third-party libraries
import PropTypes from "prop-types";
import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";

// Utils
import UploadSessionStore from "@utils/uploadSessionStore";
import { getFileIcon, formatSpeed, formatEta } from "@utils/uploadItemUtils.jsx";

// Constants
import { UPLOAD_CHUNK_SIZE, SPEED_WINDOW_MS, UPLOAD_COMPLETE_DELAY_MS } from "@shared-constants/constants";
import { DEFAULT_CHUNK_SIZE, UploadStatus } from "@constants/uiConstants";

// Hooks
import { useUploadDetails } from "@contexts/UploadContext";

// Services (RTK Query hooks)
import { useUploadFileChunkedMutation } from "@services/api/fileApi";

// Components
import UploadItemView from "@components/files/UploadItemView";

function UploadItem({ upload }) {
  // Local state
  const [error, setError] = useState(null);
  const [eta, setEta] = useState(null);
  const [progress, setProgress] = useState(0);
  const [speed, setSpeed] = useState(0);
  const [status, setStatus] = useState(UploadStatus.IDLE);

  // RTK Query hooks
  const [uploadFileChunked] = useUploadFileChunkedMutation();

  // Custom & shared hooks
  const { id, file, folderId, initPromise, fingerprint } = upload;
  const { removeUpload } = useUploadDetails();

  const hasStartedRef = useRef(false);
  const speedWindowRef = useRef([]);
  const uploadPromiseRef = useRef(null);

  const stateRef = useRef({
    uploadId: null,
    totalChunks: 0,
    currentChunkIndex: 0,
    uploadedBytes: 0,
  });

  // Event handlers
  const updateSpeed = useCallback(
    function updateSpeed(totalBytesUploadedSoFar) {
      const now = Date.now();
      const window = speedWindowRef.current;
      window.push({ t: now, b: totalBytesUploadedSoFar });

      const cutoff = now - SPEED_WINDOW_MS;
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

  const executeUpload = useCallback(
    async function executeUpload() {
      try {
        let initData = null;
        const safeChunkSize = UPLOAD_CHUNK_SIZE || DEFAULT_CHUNK_SIZE;
        if (!stateRef.current.uploadId && file.size > safeChunkSize) {
          initData = await initPromise;
        }

        const promise = uploadFileChunked({
          file,
          folderId,
          initData,
          state: stateRef.current,
          onProgressFn: (pct, loaded) => {
            setProgress(pct);
            updateSpeed(loaded);
          },
          onSpeedEtaUpdate: (s, e) => {
            setSpeed(s);
            setEta(e);
          },
        });

        uploadPromiseRef.current = promise;
        const res = await promise.unwrap();

        if (res?.success) {
          if (fingerprint) UploadSessionStore.clearUploadSession(fingerprint);
          setStatus(UploadStatus.SUCCESS);
          setProgress(100);
          setSpeed(0);
          setEta(null);
          setTimeout(() => removeUpload(id), UPLOAD_COMPLETE_DELAY_MS);
        }
      } catch (err) {
        if (err.name === "AbortError" || err.message === "canceled" || err.message === "Aborted") {
          // Paused or cancelled, do nothing
        } else {
          const message = err?.data?.message || err.message || "Upload failed";
          const isQuotaError = message.toLowerCase().includes("quota");
          if (isQuotaError) {
            toast.error("Storage quota exceeded", {
              description:
                "You don't have enough storage space for this file. Free up space or request a quota increase.",
              duration: 6000,
            });
          }
          setError(message);
          setStatus(UploadStatus.ERROR);
          setSpeed(0);
          setEta(null);
        }
      }
    },
    [file, fingerprint, folderId, id, initPromise, removeUpload, updateSpeed, uploadFileChunked]
  );

  const start = useCallback(
    function start() {
      if (status === UploadStatus.IDLE || status === UploadStatus.ERROR) {
        speedWindowRef.current = [];
        setStatus(UploadStatus.UPLOADING);
        setError(null);
        executeUpload();
      }
    },
    [status, executeUpload]
  );

  const pause = useCallback(
    function pause() {
      if (status === UploadStatus.UPLOADING) {
        if (uploadPromiseRef.current) uploadPromiseRef.current.abort();
        setStatus(UploadStatus.PAUSED);
        setSpeed(0);
        setEta(null);
      }
    },
    [status]
  );

  const resume = useCallback(
    function resume() {
      if (status === UploadStatus.PAUSED || status === UploadStatus.ERROR) {
        speedWindowRef.current = [];
        setStatus(UploadStatus.UPLOADING);
        setError(null);
        executeUpload();
      }
    },
    [status, executeUpload]
  );

  const cancel = useCallback(
    function cancel() {
      if (uploadPromiseRef.current) uploadPromiseRef.current.abort();
      // Explicit cancel = user does not want to resume, so remove the persisted session.
      // Pause does NOT call cancel, so paused sessions remain resumable.
      if (fingerprint) UploadSessionStore.clearUploadSession(fingerprint);
      stateRef.current = { uploadId: null, totalChunks: 0, currentChunkIndex: 0, uploadedBytes: 0 };
      setStatus(UploadStatus.CANCELLED);
      setSpeed(0);
      setEta(null);
    },
    [fingerprint]
  );

  function handleCancel() {
    cancel();
    removeUpload(id);
  }

  // useEffect
  useEffect(() => {
    if (!hasStartedRef.current) {
      hasStartedRef.current = true;
      start();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Derived / computed variables
  const fileIcon = useMemo(() => getFileIcon(file.type), [file.type]);

  const isUploading = status === UploadStatus.UPLOADING;
  const isPaused = status === UploadStatus.PAUSED;
  const isError = status === UploadStatus.ERROR;
  const isSuccess = status === UploadStatus.SUCCESS;

  const speedLabel = formatSpeed(speed);
  const etaLabel = formatEta(eta);

  return (
    <UploadItemView
      file={file}
      progress={progress}
      isSuccess={isSuccess}
      isError={isError}
      isUploading={isUploading}
      isPaused={isPaused}
      error={error}
      speedLabel={speedLabel}
      etaLabel={etaLabel}
      fileIcon={fileIcon}
      onPause={pause}
      onResume={resume}
      onCancel={handleCancel}
    />
  );
}

UploadItem.propTypes = {
  upload: PropTypes.object.isRequired,
};

export default UploadItem;
