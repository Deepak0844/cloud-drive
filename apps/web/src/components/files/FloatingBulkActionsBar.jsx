import React from "react";
import { CloseOutlined } from "@ant-design/icons";

// Components
import Button from "@shared-components/components/button";

export default function FloatingBulkActionsBar({ selectedCount, clearSelection, children }) {
  return (
    <div className="fixed bottom-10 left-1/2 z-50 pointer-events-auto -translate-x-1/2">
      <div className="bg-surface/90 backdrop-blur-xl rounded-full p-2 flex items-center gap-2 shadow-[0_20px_40px_rgba(0,0,0,0.15)] border border-primary/20 ring-1 ring-white/20 px-6 h-16 min-w-[400px] bulk-actions-bar">
        <div className="flex items-center gap-3 pr-4 border-r border-line">
          <Button
            type="text"
            shape="circle"
            icon={<CloseOutlined className="text-xs" />}
            onClick={clearSelection}
            className="hover:rotate-90 transition-transform flex items-center justify-center w-8 h-8 bg-surface-alt"
          />
          <span className="text-sm font-black text-primary tracking-tight">{selectedCount} selected</span>
        </div>

        <div className="flex gap-2 items-center pl-2">{children}</div>
      </div>
    </div>
  );
}
