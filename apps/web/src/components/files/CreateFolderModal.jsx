// React core & third-party libraries
import PropTypes from "prop-types";
import { FolderOpen } from "lucide-react";

// Components
import { Button } from "@components/ui/button";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@components/ui/dialog";
import { Input } from "@components/ui/input";
import { Label } from "@components/ui/label";

/**
 * Create-folder dialog used on the MyFiles page.
 */
export default function CreateFolderModal({ open, onClose, folderName, onFolderNameChange, onConfirm }) {
  return (
    <Dialog open={open} onOpenChange={(isOpen) => !isOpen && onClose()}>
      <DialogContent className="max-w-[420px] aurora-modal">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 italic">
            <FolderOpen size={18} className="text-primary" />
            <span>New Folder</span>
          </DialogTitle>
        </DialogHeader>
        <div className="py-6 space-y-4">
          <div className="space-y-2">
            <Label className="text-[10px] font-black uppercase tracking-[0.2em] text-label-tertiary ml-1">
              Folder Name
            </Label>
            <Input
              value={folderName}
              onChange={onFolderNameChange}
              placeholder="Folder name"
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
            Create
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

CreateFolderModal.propTypes = {
  open: PropTypes.bool.isRequired,
  onClose: PropTypes.func.isRequired,
  folderName: PropTypes.string.isRequired,
  onFolderNameChange: PropTypes.func.isRequired,
  onConfirm: PropTypes.func.isRequired,
};
