import { Info } from "lucide-react";
import { Button } from "@components/ui/button";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@components/ui/dialog";
import { Input } from "@components/ui/input";
import { Label } from "@components/ui/label";

/**
 * Reusable rename dialog used across MyFiles, Favorites, and other list pages.
 */
export default function RenameModal({ open, onClose, name, onNameChange, onConfirm }) {
  return (
    <Dialog open={open} onOpenChange={(isOpen) => !isOpen && onClose()}>
      <DialogContent className="max-w-[420px] aurora-modal">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 italic">
            <Info size={18} className="text-primary" />
            <span>Rename Item</span>
          </DialogTitle>
        </DialogHeader>
        <div className="py-6 space-y-4">
          <div className="space-y-2">
            <Label className="text-[10px] font-black uppercase tracking-[0.2em] text-label-tertiary ml-1">
              New Name
            </Label>
            <Input
              value={name}
              onChange={onNameChange}
              className="rounded-xl h-12 bg-surface-dim/30 border-line/40 focus:border-primary/50 transition-all font-medium"
              onKeyDown={(e) => e.key === "Enter" && onConfirm()}
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={onClose} className="rounded-xl font-bold px-6">
            Cancel
          </Button>
          <Button variant="primary" onClick={onConfirm} className="rounded-xl font-black px-8 shadow-glow italic">
            Rename
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
