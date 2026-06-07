import PropTypes from "prop-types";
import React from "react";
import { AlertTriangle, Cloud, Send } from "lucide-react";

// Constants
import { STORAGE } from "@shared-constants/constants";

// Components
import { Button } from "@components/ui/button";
import { Dialog, DialogContent } from "@components/ui/dialog";

function StorageLimitDialog({ open, onOpenChange, onRequestQuota }) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-105 p-0 overflow-hidden border-none aurora-modal">
        <div className="py-8 px-6 flex flex-col items-center text-center gap-6">
          <div className="w-20 h-20 bg-warning/10 text-warning rounded-3xl flex items-center justify-center border border-warning/20 shadow-glow-sm">
            <AlertTriangle size={40} />
          </div>

          <div className="space-y-2">
            <h2 className="text-2xl font-black text-label tracking-tight italic">Storage Limit Reached</h2>
            <p className="text-label-tertiary text-sm px-4 font-medium leading-relaxed">
              You&apos;ve used all of your available {STORAGE.TOTAL_QUOTA_GB} GB. Request an increase to keep saving
              your files.
            </p>
          </div>

          <div className="w-full bg-surface-dim/50 p-4 rounded-2xl border border-line/30 flex items-center justify-between gap-4 shadow-inner">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-primary/10 text-primary rounded-xl flex items-center justify-center border border-primary/20">
                <Cloud size={18} />
              </div>
              <div className="text-left">
                <p className="text-xs font-black text-label leading-none uppercase tracking-wide">Current Plan</p>
                <p className="text-[10px] text-label-tertiary mt-1 uppercase tracking-widest font-bold">
                  Free NAS Account
                </p>
              </div>
            </div>
            <span className="text-sm font-black text-primary italic">
              {STORAGE.TOTAL_QUOTA_GB}.0 GB / {STORAGE.TOTAL_QUOTA_GB}.0 GB
            </span>
          </div>

          <div className="flex flex-col w-full gap-3 mt-2">
            <Button
              variant="primary"
              size="large"
              icon={<Send size={18} />}
              onClick={onRequestQuota}
              className="w-full rounded-2xl h-14 font-black shadow-glow text-base uppercase tracking-wider"
            >
              Request Increase
            </Button>
            <Button
              variant="ghost"
              onClick={() => onOpenChange(false)}
              className="w-full rounded-2xl h-12 text-label-tertiary font-bold hover:text-label transition-colors"
            >
              Later
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

StorageLimitDialog.propTypes = {
  open: PropTypes.bool.isRequired,
  onOpenChange: PropTypes.func.isRequired,
  onRequestQuota: PropTypes.func.isRequired,
};

export default StorageLimitDialog;
