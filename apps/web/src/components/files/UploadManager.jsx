// React core & third-party libraries
import React, { useState } from "react";
import { CloudUpload, ChevronDown, ChevronUp } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

// Hooks
import { useUploadDetails } from "@contexts/UploadContext";

// Components
import UploadItem from "./UploadItem";
import { Button } from "@components/ui/button";

function UploadManager() {
  // Local state
  const [minimized, setMinimized] = useState(false);

  // Custom & shared hooks
  const { uploads } = useUploadDetails();

  if (uploads.length === 0) return null;

  // Derived / computed variables
  const totalUploads = uploads.length;

  // Render
  return (
    <div className="fixed bottom-8 right-8 z-50 w-[380px] shadow-premium rounded-4xl bg-surface/95 backdrop-blur-2xl border border-white/10 overflow-hidden flex flex-col transition-all duration-500">
      {/* Header */}
      <div
        role="button"
        tabIndex={0}
        className="px-6 py-4 bg-label flex justify-between items-center cursor-pointer hover:bg-label/90 transition-all active:scale-[0.99]"
        onClick={() => setMinimized(!minimized)}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            setMinimized(!minimized);
          }
        }}
      >
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center">
            <CloudUpload size={18} className="text-primary animate-pulse" />
          </div>
          <span className="font-black text-slate-900 tracking-tight">
            {totalUploads} Upload{totalUploads !== 1 ? "s" : ""}
          </span>
        </div>
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8 rounded-full hover:bg-slate-200 text-slate-400 hover:text-slate-900 transition-all"
          onClick={(e) => {
            e.stopPropagation();
            setMinimized(!minimized);
          }}
        >
          {minimized ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
        </Button>
      </div>

      {/* Upload Items List */}
      <AnimatePresence>
        {!minimized && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
            className="overflow-hidden bg-surface-alt/20"
          >
            <div className="max-h-96 overflow-y-auto p-4 flex flex-col gap-3 custom-scrollbar">
              {uploads.map((upload) => (
                <UploadItem key={upload.id} upload={upload} />
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export default UploadManager;
