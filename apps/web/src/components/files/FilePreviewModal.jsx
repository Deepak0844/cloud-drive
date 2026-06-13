// React core & third-party libraries
import PropTypes from "prop-types";
import React, { useEffect, useState, useCallback } from "react";
import { Download, X, ChevronLeft, ChevronRight, Info } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

// Constants
import { ApiBasePath, FileServiceUrls } from "@constants/serviceUrls";
import { FileCategories } from "@shared-constants/constants";

// Utils
import { UrlUtils } from "@shared-utils/utils";
import { cn } from "@lib/utils";

// Components
import { Button } from "@components/ui/button";
import ItemDetailsContent from "./ItemDetailsContent";
import FilePreviewContent from "./FilePreviewContent";

// Services (RTK Query hooks)
import { useGetPlaybackInfoQuery } from "@services/api/fileApi";

export default function FilePreviewModal({
  file,
  open,
  onClose,
  handleDownload,
  allFiles = [],
  currentIndex = -1,
  onNavigate,
}) {
  // Local state
  const [hasError, setHasError] = useState(false);
  const [previewSrc, setPreviewSrc] = useState(null);
  const [previewLoading, setPreviewLoading] = useState(true);
  const [showSidebar, setShowSidebar] = useState(false);

  const currentFile = file;
  const type = currentFile?.type || currentFile?.category;
  const fileId = currentFile?.id || currentFile?._id;
  const isMediaFile = type === FileCategories.VIDEO || type === FileCategories.AUDIO;

  // Navigation logic
  const hasMultipleFiles = allFiles.length > 1;
  const canGoNext = hasMultipleFiles && currentIndex < allFiles.length - 1;
  const canGoPrev = hasMultipleFiles && currentIndex > 0;

  // RTK Query hooks
  // Fetch HLS/native playback strategy for video and audio files
  const {
    data: playbackInfoResponse,
    isLoading: isPlaybackInfoLoading,
    isError: isPlaybackInfoError,
  } = useGetPlaybackInfoQuery(fileId, {
    skip: !fileId || !isMediaFile || !open,
  });

  const playbackInfo = playbackInfoResponse?.data;

  // Event handlers
  const handleNext = useCallback(
    function handleNext(e) {
      e?.stopPropagation();
      if (canGoNext) onNavigate?.(currentIndex + 1);
    },
    [canGoNext, currentIndex, onNavigate]
  );

  const handlePrev = useCallback(
    function handlePrev(e) {
      e?.stopPropagation();
      if (canGoPrev) onNavigate?.(currentIndex - 1);
    },
    [canGoPrev, currentIndex, onNavigate]
  );

  // Effects
  useEffect(() => {
    if (!open) return;

    const handleKeyDown = (e) => {
      switch (e.key) {
        case "ArrowRight":
          handleNext();
          break;
        case "ArrowLeft":
          handlePrev();
          break;
        case "Escape":
          onClose();
          break;
        case "i":
        case "I":
          setShowSidebar((prev) => !prev);
          break;
        default:
          break;
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [open, handleNext, handlePrev, onClose]);

  // Derive preview URL for images and PDFs
  useEffect(() => {
    if (!open || !currentFile || isMediaFile) {
      setPreviewSrc(null);
      setPreviewLoading(true);
      return;
    }

    let resolvedUrl = null;
    try {
      const id = currentFile.id || currentFile._id;
      const base = UrlUtils.format(`${ApiBasePath}${FileServiceUrls.preview}`, { id });
      resolvedUrl = `${base}${base.includes("?") ? "&" : "?"}_t=${Date.now()}`;
      setPreviewSrc(resolvedUrl);
      setPreviewLoading(false);
    } catch (_err) {
      setHasError(true);
      setPreviewLoading(false);
    }

    return () => {
      if (resolvedUrl?.startsWith("blob:")) URL.revokeObjectURL(resolvedUrl);
    };
  }, [currentFile, open, isMediaFile]);

  // Reset error state when the opened file changes
  useEffect(() => {
    setHasError(false);
  }, [fileId]);

  if (!open) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-100 flex flex-col bg-black/98 backdrop-blur-xl select-none overflow-hidden"
      >
        {/* Immersive Header */}
        <div className="h-20 px-6 flex items-center justify-between border-b border-white/5 bg-linear-to-b from-black/40 to-transparent relative z-20">
          <div className="flex items-center gap-6 min-w-0">
            <Button
              variant="ghost"
              size="icon"
              onClick={onClose}
              className="w-10 h-10 rounded-xl hover:bg-white/10 text-white/70 hover:text-white transition-all shadow-glow-sm"
            >
              <X size={20} />
            </Button>
            <div className="flex flex-col min-w-0">
              <h2 className="text-base font-bold text-white truncate max-w-[400px]" title={currentFile?.name}>
                {currentFile?.name}
              </h2>
              {hasMultipleFiles && (
                <span className="text-[10px] font-black uppercase tracking-widest text-[#f59e0b] mt-0.5">
                  Item {currentIndex + 1} of {allFiles.length}
                </span>
              )}
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => handleDownload?.(currentFile)}
              className="w-10 h-10 rounded-xl hover:bg-white/10 text-white/50 hover:text-white"
            >
              <Download size={18} />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setShowSidebar(!showSidebar)}
              className={cn(
                "w-10 h-10 rounded-xl transition-all",
                showSidebar
                  ? "bg-primary/20 text-primary shadow-glow-sm"
                  : "hover:bg-white/10 text-white/50 hover:text-white"
              )}
            >
              <Info size={18} />
            </Button>
          </div>
        </div>

        {/* Main Content Area */}
        <div className="flex flex-1 relative min-h-0">
          {/* Navigation Arrows */}
          <AnimatePresence>
            {canGoPrev && (
              <motion.div
                key="prev"
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="absolute left-6 top-1/2 -translate-y-1/2 z-30"
              >
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={handlePrev}
                  className="w-14 h-14 rounded-2xl bg-white/5 border border-white/5 hover:bg-white/10 text-white/70 hover:text-white transition-all shadow-2xl backdrop-blur-md"
                >
                  <ChevronLeft size={32} strokeWidth={3} />
                </Button>
              </motion.div>
            )}

            {canGoNext && (
              <motion.div
                key="next"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 20 }}
                className="absolute right-6 top-1/2 -translate-y-1/2 z-30"
              >
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={handleNext}
                  className="w-14 h-14 rounded-2xl bg-white/5 border border-white/5 hover:bg-white/10 text-white/70 hover:text-white transition-all shadow-2xl backdrop-blur-md"
                >
                  <ChevronRight size={32} strokeWidth={3} />
                </Button>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Immersive Viewport */}
          <div className="flex-1 flex items-center justify-center relative bg-gradient-radial from-white/5 to-transparent">
            <FilePreviewContent
              key={fileId}
              file={currentFile}
              type={type}
              previewSrc={previewSrc}
              previewLoading={previewLoading}
              hasError={hasError}
              isPlaybackInfoError={isPlaybackInfoError}
              playbackInfo={playbackInfo}
              isPlaybackInfoLoading={isPlaybackInfoLoading}
              onDownload={handleDownload}
              fileId={fileId}
              onError={() => setHasError(true)}
            />
          </div>

          {/* Collapsible Meta Sidebar */}
          <AnimatePresence>
            {showSidebar && (
              <motion.div
                initial={{ opacity: 0, x: 300 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 300 }}
                className="w-[360px] bg-surface/90 backdrop-blur-3xl border-l border-white/10 flex flex-col shadow-[-20px_0_40px_rgba(0,0,0,0.5)] z-40 overflow-hidden"
              >
                <div className="p-6 pb-2 flex items-center justify-between">
                  <h3 className="text-lg font-black tracking-tight text-white italic">Details</h3>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => setShowSidebar(false)}
                    className="h-8 w-8 rounded-lg hover:bg-white/10 text-white/50"
                  >
                    <X size={18} />
                  </Button>
                </div>
                <div className="flex-1 overflow-y-auto p-6 custom-scrollbar">
                  <ItemDetailsContent
                    item={currentFile}
                    className="**:text-white/90 [&_h3]:text-white [&_.bg-surface-dim]:bg-white/5 [&_.bg-surface-alt]:bg-white/5 [&_span]:text-white/60"
                  />
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}

FilePreviewModal.propTypes = {
  file: PropTypes.object,
  open: PropTypes.bool.isRequired,
  onClose: PropTypes.func.isRequired,
  handleDownload: PropTypes.func,
  allFiles: PropTypes.array,
  currentIndex: PropTypes.number,
  onNavigate: PropTypes.func,
};
