// React core & third-party libraries
import React, { useEffect, useState } from "react";
import { Modal, Typography } from "antd";
import { DownloadOutlined } from "@ant-design/icons";

// Constants
import { ApiBasePath, FileServiceUrls } from "@constants/serviceUrls";

// Utils
import { UrlUtils } from "@shared-utils/utils";

// Components
import Button from "@shared-components/components/button";
import Loader from "@shared-components/components/loader";
import VideoPlayer from "@components/media/VideoPlayer";
import AudioPlayer from "@components/media/AudioPlayer";

// Services
import { useGetPlaybackInfoQuery } from "@services/api/fileApi";

const { Text } = Typography;

export default function FilePreviewModal({ file, open, onClose, handleDownload }) {
  // Local state
  const [hasError, setHasError] = useState(false);
  const [previewSrc, setPreviewSrc] = useState(null);
  const [previewLoading, setPreviewLoading] = useState(true);

  const type = file?.type || file?.category;
  const fileId = file?.id || file?._id;
  const isMediaFile = type === "video" || type === "audio";

  // Custom & shared hooks

  // Fetch HLS/native playback strategy for video and audio files
  const {
    data: playbackInfoResponse,
    isLoading: isPlaybackInfoLoading,
    isError: isPlaybackInfoError,
  } = useGetPlaybackInfoQuery(fileId, {
    skip: !fileId || !isMediaFile || !open,
  });

  const playbackInfo = playbackInfoResponse?.data;

  // useEffect
  // Derive preview URL for images and PDFs (not used for video/audio)
  useEffect(() => {
    if (!open || !file || isMediaFile) {
      setPreviewSrc(null);
      setPreviewLoading(true);
      return;
    }

    try {
      const id = file.id || file._id;
      const url = UrlUtils.format(`${ApiBasePath}${FileServiceUrls.preview}`, { id });
      setPreviewSrc(`${url}${url.includes("?") ? "&" : "?"}_t=${Date.now()}`);
      setPreviewLoading(false);
    } catch (_err) {
      setHasError(true);
      setPreviewLoading(false);
    }

    return () => {
      if (previewSrc?.startsWith("blob:")) URL.revokeObjectURL(previewSrc);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [file, open, isMediaFile]);

  // Reset error state when the opened file changes
  useEffect(() => {
    setHasError(false);
  }, [fileId]);

  // Event handlers
  function onDownload() {
    if (!file) return;
    handleDownload?.(file);
  }

  function onPlayerError() {
    setHasError(true);
  }

  // Render
  function renderContent() {
    // ── Error state ──────────────────────────────────────────────────────────
    if (hasError || isPlaybackInfoError) {
      return (
        <div className="flex flex-col items-center justify-center p-20 gap-4">
          <Text className="text-xl font-bold text-label">Preview Unavailable</Text>
          <Text className="text-label-secondary text-center max-w-xs mb-4">
            We couldn&apos;t generate a preview for this file type, or the file may be corrupted.
          </Text>
          <Button type="primary" icon={<DownloadOutlined />} onClick={onDownload} className="font-bold rounded-xl h-10">
            Download File Instead
          </Button>
        </div>
      );
    }

    // ── Video ────────────────────────────────────────────────────────────────
    if (type === "video") {
      if (isPlaybackInfoLoading || !playbackInfo) {
        return (
          <div className="flex flex-col items-center justify-center p-20 gap-4 opacity-70">
            <Loader size={32} />
            <Text className="text-label-tertiary">Preparing video...</Text>
          </div>
        );
      }
      return <VideoPlayer playbackInfo={playbackInfo} onError={onPlayerError} />;
    }

    // ── Audio ────────────────────────────────────────────────────────────────
    if (type === "audio") {
      if (isPlaybackInfoLoading || !playbackInfo) {
        return (
          <div className="flex flex-col items-center justify-center p-20 gap-4 opacity-70">
            <Loader size={32} />
            <Text className="text-label-tertiary">Preparing audio...</Text>
          </div>
        );
      }
      return (
        <AudioPlayer
          playbackInfo={playbackInfo}
          audioMetadata={file?.audio_metadata}
          fileId={fileId}
          onError={onPlayerError}
        />
      );
    }

    // ── Loading state (images / PDFs) ────────────────────────────────────────
    if (previewLoading) {
      return (
        <div className="flex flex-col items-center justify-center p-20 gap-4 opacity-70">
          <Loader size={32} />
          <Text className="text-label-tertiary">Loading preview...</Text>
        </div>
      );
    }

    // ── Image ────────────────────────────────────────────────────────────────
    if (type === "image" || file?.mime_type?.startsWith("image/")) {
      return (
        <div className="relative w-full rounded-2xl overflow-hidden bg-checkered flex items-center justify-center">
          <img
            src={previewSrc}
            alt={file?.name}
            className="max-w-full max-h-[75vh] object-contain shadow-sm"
            onError={() => setHasError(true)}
          />
        </div>
      );
    }

    // ── PDF ──────────────────────────────────────────────────────────────────
    if (type === "pdf" || file?.mime_type === "application/pdf") {
      return (
        <div className="w-full h-[75vh] rounded-2xl overflow-hidden shadow-inner border border-line">
          <object data={previewSrc} type="application/pdf" className="w-full h-full">
            <div className="flex flex-col items-center justify-center h-full p-20 gap-4">
              <Text className="text-xl font-bold text-label">Browser PDF Viewer Not Supported</Text>
              <Button
                type="primary"
                icon={<DownloadOutlined />}
                onClick={onDownload}
                className="font-bold rounded-xl h-10"
              >
                Download PDF
              </Button>
            </div>
          </object>
        </div>
      );
    }

    // ── Default fallback ─────────────────────────────────────────────────────
    return (
      <div className="flex flex-col items-center justify-center p-20 gap-4">
        <Text className="text-xl font-bold text-label">No Preview Available</Text>
        <Text className="text-label-secondary">Previews are not supported for .{file?.extension || "this"} files.</Text>
        <Button
          type="primary"
          icon={<DownloadOutlined />}
          onClick={onDownload}
          className="font-bold rounded-xl h-10 mt-2"
        >
          Download File
        </Button>
      </div>
    );
  }

  return (
    <Modal
      open={open}
      onCancel={onClose}
      footer={null}
      destroyOnHidden
      centered
      width={1000}
      title={
        <div className="flex items-center gap-3 pr-8">
          <Text className="font-bold truncate text-lg max-w-lg">{file?.name}</Text>
          <Button
            type="text"
            icon={<DownloadOutlined />}
            size="small"
            onClick={onDownload}
            className="text-primary hover:bg-primary-light rounded-lg font-semibold"
          >
            Download
          </Button>
        </div>
      }
      className="premium-modal"
      styles={{
        body: { padding: "20px" },
        header: { marginBottom: 0, padding: "16px 20px", borderBottom: "1px solid rgba(0,0,0,0.06)" },
      }}
    >
      {renderContent()}
    </Modal>
  );
}
