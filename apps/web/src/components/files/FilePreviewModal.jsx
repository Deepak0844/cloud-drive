// React core & third-party libraries
import React, { useEffect, useState } from "react";
import { Download, X, AlertCircle, FileText, File } from "lucide-react";

// Constants
import { ApiBasePath, FileServiceUrls } from "@constants/serviceUrls";

// Utils
import { UrlUtils } from "@shared-utils/utils";

// Components
import { Button } from "@components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@components/ui/dialog";
import Loader from "@shared-components/components/loader";
import VideoPlayer from "@components/media/VideoPlayer";
import AudioPlayer from "@components/media/AudioPlayer";

// Services
import { useGetPlaybackInfoQuery } from "@services/api/fileApi";

export default function FilePreviewModal({ file, open, onClose, handleDownload }) {
  // Local state
  const [hasError, setHasError] = useState(false);
  const [previewSrc, setPreviewSrc] = useState(null);
  const [previewLoading, setPreviewLoading] = useState(true);

  const type = file?.type || file?.category;
  const fileId = file?.id || file?._id;
  const isMediaFile = type === "video" || type === "audio";

  // Fetch HLS/native playback strategy for video and audio files
  const {
    data: playbackInfoResponse,
    isLoading: isPlaybackInfoLoading,
    isError: isPlaybackInfoError,
  } = useGetPlaybackInfoQuery(fileId, {
    skip: !fileId || !isMediaFile || !open,
  });

  const playbackInfo = playbackInfoResponse?.data;

  // Derive preview URL for images and PDFs
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
        <div className="flex flex-col items-center justify-center p-12 sm:p-20 gap-6 text-center">
          <div className="w-16 h-16 rounded-full bg-destructive/10 flex items-center justify-center">
            <AlertCircle size={32} className="text-destructive" />
          </div>
          <div className="space-y-2">
            <h3 className="text-xl font-bold text-label">Preview Unavailable</h3>
            <p className="text-label-secondary max-w-xs text-sm">
              We couldn&apos;t generate a preview for this file type, or the file may be corrupted.
            </p>
          </div>
          <Button onClick={onDownload} variant="aurora" size="lg" className="rounded-xl font-bold px-8 shadow-glow-sm">
            <Download className="mr-2 h-5 w-5" />
            Download Instead
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
            <span className="text-sm font-semibold text-label-tertiary">Preparing video...</span>
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
            <span className="text-sm font-semibold text-label-tertiary">Preparing audio...</span>
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
          <span className="text-sm font-semibold text-label-tertiary">Loading preview...</span>
        </div>
      );
    }

    // ── Image ────────────────────────────────────────────────────────────────
    if (type === "image" || file?.mime_type?.startsWith("image/")) {
      return (
        <div className="relative w-full rounded-2xl overflow-hidden bg-checkered flex items-center justify-center p-2">
          <img
            src={previewSrc}
            alt={file?.name}
            className="max-w-full max-h-[70vh] rounded-lg shadow-2xl object-contain border border-white/10"
            onError={() => setHasError(true)}
          />
        </div>
      );
    }

    // ── PDF ──────────────────────────────────────────────────────────────────
    if (type === "pdf" || file?.mime_type === "application/pdf") {
      return (
        <div className="w-full h-[75vh] rounded-2xl overflow-hidden shadow-inner border border-white/10 bg-surface-dim">
          <object data={previewSrc} type="application/pdf" className="w-full h-full">
            <div className="flex flex-col items-center justify-center h-full p-20 gap-6 text-center">
              <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center">
                <FileText size={32} className="text-primary" />
              </div>
              <div className="space-y-2">
                <h3 className="text-xl font-bold text-label">PDF Preview Suppressed</h3>
                <p className="text-label-secondary text-sm">Your browser doesn&apos;t support direct PDF viewing.</p>
              </div>
              <Button
                onClick={onDownload}
                variant="aurora"
                size="lg"
                className="rounded-xl font-bold px-8 shadow-glow-sm"
              >
                <Download className="mr-2 h-5 w-5" />
                Download PDF
              </Button>
            </div>
          </object>
        </div>
      );
    }

    // ── Default fallback ─────────────────────────────────────────────────────
    return (
      <div className="flex flex-col items-center justify-center p-20 gap-6 text-center">
        <div className="w-16 h-16 rounded-full bg-label-tertiary/10 flex items-center justify-center">
          <File size={32} className="text-label-tertiary" />
        </div>
        <div className="space-y-2">
          <h3 className="text-xl font-bold text-label">No Preview Available</h3>
          <p className="text-xs font-bold text-label-tertiary uppercase tracking-widest">
            .{file?.extension || "UNKNOWN"} FILE
          </p>
        </div>
        <Button
          onClick={onDownload}
          variant="aurora"
          size="lg"
          className="rounded-xl font-bold px-8 mt-2 shadow-glow-sm"
        >
          <Download className="mr-2 h-5 w-5" />
          Download File
        </Button>
      </div>
    );
  }

  return (
    <Dialog open={open} onOpenChange={(val) => !val && onClose()}>
      <DialogContent className="max-w-5xl w-[95vw] p-0 overflow-hidden bg-surface/90 backdrop-blur-2xl border-white/10 shadow-premium gap-0 rounded-3xl">
        <DialogHeader className="p-4 px-6 border-b border-white/5 bg-white/5 flex flex-row items-center justify-between space-y-0">
          <div className="flex items-center gap-4 min-w-0 mr-12">
            <DialogTitle className="text-lg font-black tracking-tight text-label truncate" title={file?.name}>
              {file?.name}
            </DialogTitle>
            <Button
              variant="secondary"
              size="sm"
              onClick={onDownload}
              className="h-8 rounded-lg font-bold bg-primary/10 text-primary hover:bg-primary/20 hover:text-primary transition-all shadow-sm hidden sm:flex px-3 shrink-0"
            >
              <Download className="mr-1.5 h-3.5 w-3.5 stroke-3" />
              Download
            </Button>
          </div>
          <Button
            variant="ghost"
            size="icon"
            onClick={onClose}
            className="h-8 w-8 rounded-lg hover:bg-white/10 text-label-secondary absolute right-4 top-4"
          >
            <X size={18} />
          </Button>
        </DialogHeader>

        <div className="p-4 sm:p-6 custom-scrollbar max-h-[85vh] overflow-y-auto">{renderContent()}</div>
      </DialogContent>
    </Dialog>
  );
}
