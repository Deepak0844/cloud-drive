import React, { useEffect, useMemo, useRef } from "react";
import { useChunkedUpload, UploadStatus } from "@/hooks/useChunkedUpload";
import { useUploadDetails } from "@/contexts/UploadContext";
import { Progress, Tooltip } from "antd";
import {
  PauseCircleFilled,
  PlayCircleFilled,
  CloseCircleFilled,
  CheckCircleFilled,
  ExclamationCircleFilled,
  ReloadOutlined,
  FileImageOutlined,
  FilePdfOutlined,
  FileTextOutlined,
  FileZipOutlined,
  FileOutlined,
  FileUnknownOutlined,
} from "@ant-design/icons";
import { formatBytes } from "@shared-utils/utils";
import { motion } from "framer-motion";

/* ─── helpers ─────────────────────────────────────────────────────────── */

const getFileIcon = (fileType) => {
  if (!fileType) return <FileUnknownOutlined className="text-gray-500" />;
  if (fileType.startsWith("image/")) return <FileImageOutlined className="text-blue-400" />;
  if (fileType === "application/pdf") return <FilePdfOutlined className="text-red-400" />;
  if (fileType.startsWith("text/")) return <FileTextOutlined className="text-green-400" />;
  if (fileType.startsWith("video/")) return <FileOutlined className="text-purple-400" />;
  if (fileType.includes("zip") || fileType.includes("compressed") || fileType.includes("tar"))
    return <FileZipOutlined className="text-orange-400" />;
  return <FileUnknownOutlined className="text-gray-500" />;
};

/**
 * Format bytes/s → human-readable speed string (e.g. "12.4 MB/s")
 */
const formatSpeed = (bps) => {
  if (!bps || bps <= 0) return null;
  if (bps >= 1024 * 1024) return `${(bps / 1024 / 1024).toFixed(1)} MB/s`;
  if (bps >= 1024) return `${(bps / 1024).toFixed(0)} KB/s`;
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

const UploadItem = ({ upload }) => {
  const { id, file, folderId, initPromise } = upload;
  const { removeUpload } = useUploadDetails();

  const { status, progress, error, speed, eta, start, pause, resume, cancel } = useChunkedUpload(
    file,
    folderId,
    () => {
      setTimeout(() => removeUpload(id), 3000);
    },
    initPromise
  );

  const hasStartedRef = useRef(false);

  useEffect(() => {
    if (!hasStartedRef.current) {
      hasStartedRef.current = true;
      start();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleCancel = () => {
    cancel();
    removeUpload(id);
  };

  const fileIcon = useMemo(() => getFileIcon(file.type), [file.type]);

  const isUploading = status === UploadStatus.UPLOADING;
  const isPaused = status === UploadStatus.PAUSED;
  const isError = status === UploadStatus.ERROR;
  const isSuccess = status === UploadStatus.SUCCESS;
  const isActive = isUploading || isPaused;

  const speedLabel = formatSpeed(speed);
  const etaLabel = formatEta(eta);

  return (
    <motion.div
      initial={{ opacity: 0, y: 10, scale: 0.97 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, scale: 0.95 }}
      transition={{ duration: 0.2 }}
      className={`mb-2 rounded-xl border overflow-hidden shadow-sm transition-colors ${
        isError
          ? "bg-red-50/60 border-red-200 dark:bg-red-900/20 dark:border-red-800"
          : isSuccess
            ? "bg-green-50/60 border-green-200 dark:bg-green-900/20 dark:border-green-800"
            : "bg-white dark:bg-gray-800 border-gray-100 dark:border-gray-700"
      }`}
    >
      {/* Top row: icon · filename · filesize */}
      <div className="flex items-center gap-2.5 px-3 pt-2.5 pb-1">
        {/* Icon */}
        <div className="w-8 h-8 rounded-lg bg-gray-100 dark:bg-gray-900 flex items-center justify-center text-lg shrink-0">
          {isSuccess ? (
            <CheckCircleFilled className="text-green-500" />
          ) : isError ? (
            <ExclamationCircleFilled className="text-red-500" />
          ) : (
            fileIcon
          )}
        </div>

        {/* File name + size */}
        <div className="flex-1 min-w-0">
          <p
            className="text-xs font-semibold text-gray-800 dark:text-gray-100 truncate leading-tight"
            title={file.name}
          >
            {file.name}
          </p>
          <p className="text-[10px] text-gray-400 dark:text-gray-500 leading-tight mt-0.5">{formatBytes(file.size)}</p>
        </div>

        {/* Action buttons — always visible */}
        <div className="flex items-center gap-0.5 shrink-0">
          {isUploading && (
            <Tooltip title="Pause">
              <button
                onClick={pause}
                className="w-7 h-7 flex items-center justify-center rounded-lg text-yellow-500 hover:bg-yellow-50 dark:hover:bg-yellow-900/30 hover:text-yellow-600 transition-colors"
              >
                <PauseCircleFilled style={{ fontSize: 18 }} />
              </button>
            </Tooltip>
          )}

          {(isPaused || isError) && (
            <Tooltip title={isError ? "Retry" : "Resume"}>
              <button
                onClick={resume}
                className={`w-7 h-7 flex items-center justify-center rounded-lg transition-colors ${
                  isError
                    ? "text-red-500 hover:bg-red-50 dark:hover:bg-red-900/30 hover:text-red-600"
                    : "text-blue-500 hover:bg-blue-50 dark:hover:bg-blue-900/30 hover:text-blue-600"
                }`}
              >
                {isError ? <ReloadOutlined style={{ fontSize: 16 }} /> : <PlayCircleFilled style={{ fontSize: 18 }} />}
              </button>
            </Tooltip>
          )}

          {(isActive || isError) && (
            <Tooltip title="Cancel">
              <button
                onClick={handleCancel}
                className="w-7 h-7 flex items-center justify-center rounded-lg text-gray-400 hover:bg-red-50 dark:hover:bg-red-900/30 hover:text-red-500 transition-colors"
              >
                <CloseCircleFilled style={{ fontSize: 18 }} />
              </button>
            </Tooltip>
          )}
        </div>
      </div>

      {/* Progress bar + percentage */}
      {!isSuccess && (
        <div className="px-3 pb-1">
          <div className="flex items-center gap-2">
            <Progress
              percent={progress}
              size={["100%", 5]}
              showInfo={false}
              status={isError ? "exception" : isPaused ? "normal" : "active"}
              strokeColor={isError ? "#ef4444" : isPaused ? "#f59e0b" : { "0%": "#3b82f6", "100%": "#6366f1" }}
              className="m-0 flex-1"
            />
            <span
              className={`text-[10px] font-bold w-8 text-right shrink-0 ${
                isError ? "text-red-500" : isPaused ? "text-yellow-500" : "text-gray-500 dark:text-gray-400"
              }`}
            >
              {progress}%
            </span>
          </div>
        </div>
      )}

      {/* Bottom status bar: speed + ETA  OR  status text */}
      <div className="px-3 pb-2.5">
        {isUploading && (speedLabel || etaLabel) && (
          <div className="flex items-center gap-2 mt-0.5">
            {speedLabel && (
              <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-blue-500 dark:text-blue-400">
                {/* bolt icon via SVG — tiny */}
                <svg width="9" height="9" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z" />
                </svg>
                {speedLabel}
              </span>
            )}
            {etaLabel && <span className="text-[10px] text-gray-400 dark:text-gray-500">{etaLabel} remaining</span>}
          </div>
        )}

        {isPaused && <p className="text-[10px] font-semibold text-yellow-500 mt-0.5">Upload paused</p>}

        {isError && (
          <p className="text-[10px] font-semibold text-red-500 mt-0.5 truncate">{error || "Upload failed"}</p>
        )}

        {isSuccess && <p className="text-[10px] font-semibold text-green-500">Upload complete</p>}
      </div>
    </motion.div>
  );
};

export default UploadItem;
