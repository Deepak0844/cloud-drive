// React core & third-party libraries
import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  CheckCircle2,
  XCircle,
  AlertCircle,
  FileText,
  FileImage,
  FileArchive,
  FileVideo,
  FileAudio,
  File as FileIcon,
  Pause,
  Play,
  RotateCw,
} from "lucide-react";
import { motion } from "framer-motion";
import { toast } from "sonner";

// Utils
import { formatBytes } from "@shared-utils/utils";
import { cn } from "@lib/utils";
import UploadSessionStore from "@utils/uploadSessionStore";

// Constants
import { UPLOAD_CHUNK_SIZE, SPEED_WINDOW_MS, UPLOAD_COMPLETE_DELAY_MS } from "@shared-constants/constants";
import { DEFAULT_CHUNK_SIZE, UploadStatus } from "@constants/uiConstants";

// Hooks
import { useUploadDetails } from "@contexts/UploadContext";

// Services (RTK Query hooks)
import { useUploadFileChunkedMutation } from "@services/api/fileApi";

// Components
import { Progress } from "@components/ui/progress";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@components/ui/tooltip";

/* ─── helpers ─────────────────────────────────────────────────────────── */

const getFileIcon = (fileType) => {
  if (!fileType) return <FileIcon className="text-label-tertiary" />;
  if (fileType.startsWith("image/")) return <FileImage className="text-blue-500" />;
  if (fileType === "application/pdf") return <FileText className="text-red-500" />;
  if (fileType.startsWith("text/")) return <FileText className="text-green-500" />;
  if (fileType.startsWith("video/")) return <FileVideo className="text-purple-500" />;
  if (fileType.startsWith("audio/")) return <FileAudio className="text-pink-500" />;
  if (fileType.includes("zip") || fileType.includes("compressed") || fileType.includes("tar"))
    return <FileArchive className="text-orange-500" />;
  return <FileIcon className="text-label-tertiary" />;
};

/**
 * Format bytes/s → human-readable speed string (e.g. "12.4 MB/s")
 */
const formatSpeed = (bps) => {
  if (!bps || bps <= 0) return null;
  if (bps >= 1000 * 1000) return `${(bps / 1000 / 1000).toFixed(1)} MB/s`;
  if (bps >= 1000) return `${(bps / 1000).toFixed(0)} KB/s`;
  return `${Math.round(bps)} B/s`;
};

/**
 * Format seconds → "42 s" or "3 min 12 s"
 */
const formatEta = (seconds) => {
  if (!seconds || seconds <= 0) return null;
  if (seconds >= 60) {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `~${m} min${s > 0 ? ` ${s} s` : ""}`;
  }
  return `~${seconds} s`;
};

/* ─── component ───────────────────────────────────────────────────────── */

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
    [file, folderId, id, initPromise, removeUpload, updateSpeed, uploadFileChunked]
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

  // Render
  return (
    <TooltipProvider>
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className={cn(
          "p-4 rounded-2xl border transition-all duration-300",
          isError
            ? "bg-destructive/5 border-destructive/20"
            : isSuccess
              ? "bg-green-500/5 border-green-500/20"
              : "bg-surface border-white/5 shadow-sm"
        )}
      >
        <div className="flex items-center gap-4">
          {/* Progress / Status Circle/Icon */}
          <div className="relative flex items-center justify-center shrink-0">
            <div
              className={cn(
                "w-10 h-10 rounded-xl flex items-center justify-center transition-all",
                isError ? "bg-destructive/10" : isSuccess ? "bg-green-500/10" : "bg-surface-alt"
              )}
            >
              {isSuccess ? (
                <CheckCircle2 size={20} className="text-green-500" />
              ) : isError ? (
                <AlertCircle size={20} className="text-destructive" />
              ) : (
                fileIcon
              )}
            </div>
          </div>

          {/* File Info */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between mb-1">
              <span className="text-sm font-bold text-label truncate" title={file.name}>
                {file.name}
              </span>
              <span className="text-[10px] font-black text-label-tertiary opacity-50 ml-2">
                {formatBytes(file.size)}
              </span>
            </div>

            {/* Progress Bar */}
            {!isSuccess && (
              <div className="flex items-center gap-3">
                <Progress
                  value={progress}
                  className="h-1.5 flex-1"
                  indicatorClassName={cn(
                    "transition-all duration-300",
                    isError ? "bg-destructive" : isPaused ? "bg-warning" : "bg-primary"
                  )}
                />
                <span
                  className={cn(
                    "text-[10px] font-black w-7 text-right",
                    isError ? "text-destructive" : isPaused ? "text-warning" : "text-primary"
                  )}
                >
                  {Math.round(progress)}%
                </span>
              </div>
            )}

            {/* Status Footer */}
            <div className="flex items-center justify-between mt-2">
              <div className="flex items-center gap-2">
                {isUploading && (
                  <>
                    <span className="text-[10px] font-bold text-primary flex items-center gap-1">
                      <span className="w-1 h-1 rounded-full bg-primary animate-pulse" />
                      {speedLabel || "Calculating..."}
                    </span>
                    {etaLabel && <span className="text-[10px] font-medium text-label-tertiary">{etaLabel} left</span>}
                  </>
                )}
                {isPaused && (
                  <span className="text-[10px] font-bold text-warning uppercase tracking-widest">Paused</span>
                )}
                {isError && (
                  <span className="text-[10px] font-bold text-destructive truncate max-w-[150px]">
                    {error || "Failed"}
                  </span>
                )}
                {isSuccess && (
                  <span className="text-[10px] font-bold text-green-500 uppercase tracking-widest">Complete</span>
                )}
              </div>

              {/* Actions */}
              <div className="flex items-center gap-1">
                {isUploading && (
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <button
                        onClick={pause}
                        className="p-1 rounded-lg hover:bg-warning/10 text-warning transition-colors"
                      >
                        <Pause size={14} className="fill-current" />
                      </button>
                    </TooltipTrigger>
                    <TooltipContent>Pause</TooltipContent>
                  </Tooltip>
                )}
                {(isPaused || isError) && (
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <button
                        onClick={resume}
                        className="p-1 rounded-lg hover:bg-primary/10 text-primary transition-colors"
                      >
                        {isError ? <RotateCw size={14} /> : <Play size={14} className="fill-current" />}
                      </button>
                    </TooltipTrigger>
                    <TooltipContent>{isError ? "Retry" : "Resume"}</TooltipContent>
                  </Tooltip>
                )}
                <Tooltip>
                  <TooltipTrigger asChild>
                    <button
                      onClick={handleCancel}
                      className="p-1 rounded-lg hover:bg-destructive/10 text-label-tertiary hover:text-destructive transition-all"
                    >
                      <XCircle size={14} />
                    </button>
                  </TooltipTrigger>
                  <TooltipContent>Cancel</TooltipContent>
                </Tooltip>
              </div>
            </div>
          </div>
        </div>
      </motion.div>
    </TooltipProvider>
  );
}

export default UploadItem;
