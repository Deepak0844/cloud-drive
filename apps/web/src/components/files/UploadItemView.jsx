import PropTypes from "prop-types";
import React from "react";
import { AlertCircle, CheckCircle2, Pause, Play, RotateCw, XCircle } from "lucide-react";
import { motion } from "framer-motion";

// Utils
import { formatBytes } from "@shared-utils/utils";
import { cn } from "@lib/utils";

// Components
import { Progress } from "@components/ui/progress";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@components/ui/tooltip";

function UploadItemView({
  file,
  progress = 0,
  isSuccess,
  isError,
  isUploading,
  isPaused,
  error = null,
  speedLabel = null,
  etaLabel = null,
  fileIcon,
  onPause,
  onResume,
  onCancel,
}) {
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
                        onClick={onPause}
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
                        onClick={onResume}
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
                      onClick={onCancel}
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

UploadItemView.propTypes = {
  file: PropTypes.object.isRequired,
  progress: PropTypes.number,
  isSuccess: PropTypes.bool,
  isError: PropTypes.bool,
  isUploading: PropTypes.bool,
  isPaused: PropTypes.bool,
  error: PropTypes.string,
  speedLabel: PropTypes.string,
  etaLabel: PropTypes.string,
  fileIcon: PropTypes.node,
  onPause: PropTypes.func.isRequired,
  onResume: PropTypes.func.isRequired,
  onCancel: PropTypes.func.isRequired,
};

export default UploadItemView;
