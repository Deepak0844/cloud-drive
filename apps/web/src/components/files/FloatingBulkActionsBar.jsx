import React from "react";
import { X } from "lucide-react";
// Components
import { Button } from "@components/ui/button";

export default function FloatingBulkActionsBar({ selectedCount, clearSelection, children }) {
  if (selectedCount === 0) return null;

  return (
    <div className="fixed bottom-10 left-1/2 z-50 pointer-events-auto -translate-x-1/2">
      <div className="bg-surface/80 backdrop-blur-2xl rounded-3xl p-2 flex items-center gap-2 shadow-premium border border-white/10 px-6 h-16 min-w-[420px] bulk-actions-bar animate-in fade-in slide-in-from-bottom-4 duration-500">
        <div className="flex items-center gap-4 pr-4 border-r border-white/10">
          <Button
            variant="ghost"
            size="icon"
            onClick={clearSelection}
            className="h-10 w-10 rounded-xl hover:rotate-90 hover:bg-destructive/10 text-label-secondary hover:text-destructive transition-all duration-300"
          >
            <X size={18} />
          </Button>
          <div className="flex flex-col">
            <span className="text-[10px] font-black text-primary uppercase tracking-widest leading-none mb-1">
              Selected
            </span>
            <span className="text-sm font-black text-label leading-none">{selectedCount} items</span>
          </div>
        </div>

        <div className="flex gap-2 items-center pl-4">{children}</div>
      </div>
    </div>
  );
}
