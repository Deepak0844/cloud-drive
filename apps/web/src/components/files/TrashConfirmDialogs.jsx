import React from "react";
import { AlertTriangle } from "lucide-react";

// Components
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@components/ui/alert-dialog";

function TrashConfirmDialogs({
  confirmEmpty,
  onConfirmEmptyChange,
  onEmptyConfirm,
  confirmDelete,
  onConfirmDeleteChange,
  onDeleteConfirm,
  selectedCount,
}) {
  return (
    <>
      <AlertDialog open={confirmEmpty} onOpenChange={onConfirmEmptyChange}>
        <AlertDialogContent className="aurora-modal">
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2 text-error">
              <AlertTriangle size={20} />
              <span>Empty Trash</span>
            </AlertDialogTitle>
            <AlertDialogDescription className="text-label-tertiary font-medium">
              Are you sure you want to permanently delete all items in the trash? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="rounded-xl font-bold">Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={onEmptyConfirm}
              className="rounded-xl font-bold bg-error hover:bg-error/90 text-white shadow-glow-sm"
            >
              Empty Trash
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={confirmDelete} onOpenChange={onConfirmDeleteChange}>
        <AlertDialogContent className="aurora-modal">
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2 text-error">
              <AlertTriangle size={20} />
              <span>Delete Forever</span>
            </AlertDialogTitle>
            <AlertDialogDescription className="text-label-tertiary font-medium">
              Are you sure you want to permanently delete these {selectedCount} items? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="rounded-xl font-bold">Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={onDeleteConfirm}
              className="rounded-xl font-bold bg-error hover:bg-error/90 text-white shadow-glow-sm"
            >
              Delete Forever
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

export default TrashConfirmDialogs;
