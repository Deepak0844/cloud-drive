import React from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "../../../../apps/web/src/components/ui/dialog";
import { Button as ShadcnButton } from "../../../../apps/web/src/components/ui/button";

/**
 * Bridge wrapper for Modal to shadcn Dialog.
 */
export default function Modal({
  open = false,
  modalTitle = "",
  modalWidth = 600,
  btnText = "Submit",
  btnLoading = false,
  cancelText = "Cancel",
  handleSubmit = () => {},
  handleCloseModal = () => {},
  children,
}) {
  return (
    <Dialog open={open} onOpenChange={(isOpen) => !isOpen && handleCloseModal()}>
      <DialogContent
        onInteractOutside={(e) => e.preventDefault()}
        style={{ maxWidth: modalWidth }}
        className="glass-card border-white/10 shadow-premium sm:rounded-2xl"
      >
        {modalTitle && (
          <DialogHeader className="border-b border-white/5 pb-4 mb-4">
            <DialogTitle className="text-xl font-bold tracking-tight">{modalTitle}</DialogTitle>
          </DialogHeader>
        )}

        <div className="min-h-[100px]">{children}</div>

        <DialogFooter className="border-t border-white/5 pt-4 mt-4">
          <div className="flex justify-end gap-3 w-full">
            <ShadcnButton variant="ghost" onClick={handleCloseModal}>
              {cancelText}
            </ShadcnButton>
            <ShadcnButton
              variant="primary"
              onClick={handleSubmit}
              disabled={btnLoading}
              className="shadow-primary px-6"
            >
              {btnText}
            </ShadcnButton>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
