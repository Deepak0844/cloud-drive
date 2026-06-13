// React core & third-party libraries
import PropTypes from "prop-types";
import React from "react";
import { X } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
// Components
import { Button } from "@components/ui/button";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@components/ui/tooltip";

export function BulkAction({ icon, label, onClick, tooltip, danger, loading }) {
  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            type="text"
            onClick={onClick}
            loading={loading}
            className={`rounded-xl font-bold flex flex-col items-center gap-0.5 h-12 w-16 ${
              danger ? "text-danger hover:bg-danger/10" : "text-primary hover:bg-primary/10"
            } border-none justify-center transition-all bg-transparent!`}
          >
            <div className="flex items-center justify-center">{icon}</div>
            <span className="text-[10px] uppercase tracking-tighter">{label}</span>
          </Button>
        </TooltipTrigger>
        {tooltip && <TooltipContent>{tooltip}</TooltipContent>}
      </Tooltip>
    </TooltipProvider>
  );
}

BulkAction.propTypes = {
  icon: PropTypes.node.isRequired,
  label: PropTypes.string.isRequired,
  onClick: PropTypes.func.isRequired,
  tooltip: PropTypes.string,
  danger: PropTypes.bool,
  loading: PropTypes.bool,
};

export default function FloatingBulkActionsBar({ selectedCount, clearSelection, children }) {
  return (
    <AnimatePresence>
      {selectedCount > 0 && (
        <motion.div
          initial={{ y: 100, x: "-50%", opacity: 0 }}
          animate={{ y: 0, x: "-50%", opacity: 1 }}
          exit={{ y: 100, x: "-50%", opacity: 0 }}
          transition={{ type: "spring", damping: 25, stiffness: 200 }}
          className="fixed bottom-10 left-1/2 z-50 pointer-events-auto bulk-actions-bar"
        >
          <div className="glass-card rounded-[2.5rem] p-2 flex items-center gap-2 shadow-premium bg-[#1a1c1e]/80 border-white/10 px-6 h-16 min-w-105 active-glow">
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
        </motion.div>
      )}
    </AnimatePresence>
  );
}

FloatingBulkActionsBar.propTypes = {
  selectedCount: PropTypes.number.isRequired,
  clearSelection: PropTypes.func.isRequired,
  children: PropTypes.node,
};
