import React from "react";
import { AlertCircle, Download, File, FileText } from "lucide-react";
import { motion } from "framer-motion";

// Constants
import { FileCategories } from "@shared-constants/constants";

// Components
import { Button } from "@components/ui/button";
import Loader from "@components/common/Loader";
import AudioPlayer from "@components/media/AudioPlayer";
import VideoPlayer from "@components/media/VideoPlayer";

function FilePreviewContent({
  file,
  type,
  previewSrc,
  previewLoading,
  hasError,
  isPlaybackInfoError,
  playbackInfo,
  isPlaybackInfoLoading,
  onDownload,
  fileId,
  onError,
}) {
  if (hasError || isPlaybackInfoError) {
    return (
      <div className="flex flex-col items-center justify-center p-12 gap-6 text-center text-white">
        <div className="w-16 h-16 rounded-full bg-destructive/20 flex items-center justify-center">
          <AlertCircle size={32} className="text-destructive" />
        </div>
        <div className="space-y-2">
          <h3 className="text-xl font-bold">Preview Unavailable</h3>
          <p className="text-white/60 max-w-xs text-sm">
            We couldn&apos;t generate a preview for &quot;{file?.name}&quot;.
          </p>
        </div>
        <Button
          onClick={() => onDownload?.(file)}
          variant="aurora"
          size="lg"
          className="rounded-xl font-bold px-8 shadow-glow-sm"
        >
          <Download className="mr-2 h-5 w-5" />
          Download Instead
        </Button>
      </div>
    );
  }

  if (type === FileCategories.VIDEO) {
    if (isPlaybackInfoLoading || !playbackInfo) {
      return (
        <div className="flex flex-col items-center justify-center p-20 gap-4 opacity-70 text-white">
          <Loader size={32} />
          <span className="text-sm font-semibold">Preparing video...</span>
        </div>
      );
    }
    return <VideoPlayer playbackInfo={playbackInfo} onError={onError} />;
  }

  if (type === FileCategories.AUDIO) {
    if (isPlaybackInfoLoading || !playbackInfo) {
      return (
        <div className="flex flex-col items-center justify-center p-20 gap-4 opacity-70 text-white">
          <Loader size={32} />
          <span className="text-sm font-semibold">Preparing audio...</span>
        </div>
      );
    }
    return (
      <AudioPlayer playbackInfo={playbackInfo} audioMetadata={file?.audio_metadata} fileId={fileId} onError={onError} />
    );
  }

  if (previewLoading) {
    return (
      <div className="flex flex-col items-center justify-center p-20 gap-4 opacity-70 text-white">
        <Loader size={32} />
        <span className="text-sm font-semibold">Loading preview...</span>
      </div>
    );
  }

  if (type === "image" || file?.mime_type?.startsWith("image/")) {
    return (
      <div className="relative w-full h-full flex items-center justify-center p-4">
        <motion.img
          key={fileId}
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ type: "spring", stiffness: 300, damping: 30 }}
          src={previewSrc}
          alt={file?.name}
          className="max-w-full max-h-full rounded-lg shadow-2xl object-contain"
          onError={onError}
        />
      </div>
    );
  }

  if (type === "pdf" || file?.mime_type === "application/pdf") {
    return (
      <div className="w-full h-full max-h-[90vh] rounded-xl overflow-hidden shadow-inner border border-white/10 bg-white/5">
        <object data={previewSrc} type="application/pdf" className="w-full h-full">
          <div className="flex flex-col items-center justify-center h-full p-20 gap-6 text-center text-white">
            <div className="w-16 h-16 rounded-full bg-primary/20 flex items-center justify-center">
              <FileText size={32} className="text-primary" />
            </div>
            <h3 className="text-xl font-bold">PDF Support Missing</h3>
            <p className="text-white/60 text-sm">Your browser doesn&apos;t support direct PDF viewing.</p>
            <Button onClick={() => onDownload?.(file)} variant="aurora" size="lg" className="rounded-xl">
              Download PDF
            </Button>
          </div>
        </object>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center justify-center p-20 gap-8 text-center text-white">
      <div className="w-24 h-24 rounded-4xl bg-white/5 flex items-center justify-center border border-white/10 shadow-inner">
        <File size={48} className="text-white/40" />
      </div>
      <div className="space-y-2">
        <h3 className="text-2xl font-bold">No Preview Available</h3>
        <p className="text-white/40 uppercase tracking-[0.2em] font-black text-xs">
          .{file?.extension || "UNKNOWN"} FILE
        </p>
      </div>
      <Button
        onClick={() => onDownload?.(file)}
        variant="aurora"
        className="h-14 px-12 rounded-2xl font-black text-base shadow-glow uppercase"
      >
        Download File
      </Button>
    </div>
  );
}

export default FilePreviewContent;
