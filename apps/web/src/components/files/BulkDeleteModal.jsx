// React core & third-party libraries
import { AlertTriangle, Trash2 } from "lucide-react";

// Components
import { Button } from "@components/ui/button";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@components/ui/dialog";

/**
 * Bulk-delete confirmation dialog used across list pages.
 */
export default function BulkDeleteModal({ open, onClose, count, onConfirm }) {
  return (
    <Dialog open={open} onOpenChange={(isOpen) => !isOpen && onClose()}>
      <DialogContent className="max-w-[400px] aurora-modal">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-error italic">
            <AlertTriangle size={18} />
            <span>Bulk Delete Items</span>
          </DialogTitle>
        </DialogHeader>
        <div className="py-4 flex flex-col items-center text-center gap-6">
          <div className="w-16 h-16 bg-error/10 text-error rounded-full flex items-center justify-center border border-error/20 shadow-glow-sm">
            <Trash2 size={24} />
          </div>
          <p className="text-sm text-label-tertiary font-medium leading-relaxed">
            Are you sure you want to delete <span className="text-label font-black italic">{count} items</span>?
            <br />
            <span className="text-[10px] uppercase tracking-wider opacity-60 mt-2 block">
              These items will be moved to trash.
            </span>
          </p>
        </div>
        <DialogFooter className="gap-2 sm:gap-0">
          <Button variant="ghost" onClick={onClose} className="rounded-xl font-bold px-6">
            Cancel
          </Button>
          <Button
            variant="destructive"
            onClick={onConfirm}
            className="rounded-xl font-black px-8 shadow-glow-sm italic"
          >
            Delete
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
