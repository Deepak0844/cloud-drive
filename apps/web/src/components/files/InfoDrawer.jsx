// React core & third-party libraries
import React from "react";
import { X } from "lucide-react";

// Components
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@components/ui/sheet";
import { Button } from "@components/ui/button";
import ItemDetailsContent from "./ItemDetailsContent";

function InfoDrawer({ item, open, onClose }) {
  if (!item) return null;

  return (
    <Sheet open={open} onOpenChange={(val) => !val && onClose()}>
      <SheetContent
        side="right"
        showCloseButton={false}
        className="w-full sm:max-w-[360px] bg-surface/95 backdrop-blur-2xl border-l border-white/10 p-0 shadow-2xl flex flex-col"
      >
        <SheetHeader className="p-6 pb-2 flex flex-row items-center justify-between space-y-0">
          <SheetTitle className="text-lg font-black tracking-tight text-label">Details</SheetTitle>
          <Button
            variant="ghost"
            size="icon"
            onClick={onClose}
            className="h-8 w-8 rounded-xl hover:bg-surface-dim hover:text-primary transition-all"
          >
            <X size={18} />
          </Button>
        </SheetHeader>

        <div className="flex-1 overflow-y-auto p-6 pt-2 custom-scrollbar">
          <ItemDetailsContent item={item} />
        </div>
      </SheetContent>
    </Sheet>
  );
}

export default InfoDrawer;
