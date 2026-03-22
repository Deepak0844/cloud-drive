// React core & third-party libraries
import React, { useState } from "react";
import { ArrowLeft, Folder, FolderOpen, Home, Check } from "lucide-react";
import { cn } from "@lib/utils";

// Services (RTK Query hooks)
import { useGetFoldersQuery } from "@services/api/folderApi";

// Constants
import { ROOT_FOLDER_ID } from "@constants/serviceUrls";
import PageNames from "@constants/pageNames";

// Components
import { Button } from "@components/ui/button";
import Loader from "@components/common/Loader";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@components/ui/dialog";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbSeparator,
} from "@components/ui/breadcrumb";

/**
 * A modal that allows users to browse their folder structure and select a target folder.
 */
function FolderPickerModal({
  open,
  onClose,
  onConfirm,
  title = "Select Folder",
  confirmText = "Move Here",
  loading = false,
  excludeIds = [], // IDs to exclude (e.g., current folder or items being moved to prevent circular moves)
  currentParentId = null, // The current parent of the item(s) to prevent moving to same place
}) {
  // Local state
  // Navigation history to avoid calling folder details API
  const [history, setHistory] = useState([{ id: ROOT_FOLDER_ID, name: PageNames.MY_FILES }]);

  // Derived / computed variables
  const currentFolder = history[history.length - 1];
  const currentFolderId = currentFolder.id;

  // RTK Query hooks
  // Fetch only folders in the current directory (optimized)
  const { data: foldersData, isLoading: isFoldersLoading } = useGetFoldersQuery(
    {
      parentId: currentFolderId === ROOT_FOLDER_ID ? null : currentFolderId,
    },
    { skip: !open }
  );

  // Derived / computed variables
  const folders = foldersData?.data || [];
  // Filter out excluded IDs
  const visibleFolders = folders.filter((f) => !excludeIds.includes(String(f._id || f.id)));

  // Event handlers
  function handleNavigate(id, name) {
    if (id === ROOT_FOLDER_ID) {
      setHistory([{ id: ROOT_FOLDER_ID, name: PageNames.MY_FILES }]);
    } else {
      setHistory((prev) => [...prev, { id, name }]);
    }
  }

  function handleBreadcrumbClick(index) {
    setHistory((prev) => prev.slice(0, index + 1));
  }

  function handleBack() {
    if (history.length <= 1) return;
    setHistory((prev) => prev.slice(0, -1));
  }

  function handleConfirm() {
    onConfirm(currentFolderId === ROOT_FOLDER_ID ? ROOT_FOLDER_ID : currentFolderId);
  }

  // Derived / computed variables
  const isSameFolder =
    (currentFolderId === ROOT_FOLDER_ID && (currentParentId === null || currentParentId === ROOT_FOLDER_ID)) ||
    currentFolderId === currentParentId;

  // Render
  return (
    <Dialog open={open} onOpenChange={(val) => !val && onClose()}>
      <DialogContent className="sm:max-w-[520px] p-0 overflow-hidden border-white/10 bg-surface/95 backdrop-blur-2xl rounded-[2.5rem] shadow-premium">
        <DialogHeader className="px-8 pt-8 pb-4">
          <DialogTitle className="text-2xl font-black text-label tracking-tight flex items-center justify-between">
            {title}
          </DialogTitle>
        </DialogHeader>

        <div className="flex flex-col gap-6 px-8 py-2 min-h-[400px]">
          {/* Navigation / Breadcrumbs */}
          <div className="flex items-center gap-4 bg-surface-alt/50 p-4 rounded-2xl border border-white/5 shadow-inner">
            <Button
              variant="ghost"
              size="icon"
              onClick={handleBack}
              disabled={currentFolderId === ROOT_FOLDER_ID}
              className="shrink-0 h-10 w-10 rounded-xl hover:bg-primary/10 text-label-secondary hover:text-primary transition-all disabled:opacity-30"
            >
              <ArrowLeft size={20} />
            </Button>
            <div className="flex-1 overflow-hidden">
              <Breadcrumb>
                <BreadcrumbList>
                  {history.map((item, index) => {
                    const isLast = index === history.length - 1;
                    return (
                      <React.Fragment key={item.id}>
                        <BreadcrumbItem>
                          <BreadcrumbLink
                            className={cn(
                              "cursor-pointer text-[13px] transition-all flex items-center gap-1.5",
                              isLast
                                ? "font-black text-primary"
                                : "font-bold text-label-tertiary hover:text-label-secondary"
                            )}
                            onClick={() => handleBreadcrumbClick(index)}
                          >
                            {index === 0 && (
                              <Home size={12} className={cn(isLast ? "text-primary" : "text-label-tertiary")} />
                            )}
                            <span className="truncate max-w-[100px]">{item.name}</span>
                          </BreadcrumbLink>
                        </BreadcrumbItem>
                        {!isLast && <BreadcrumbSeparator className="text-white/10" />}
                      </React.Fragment>
                    );
                  })}
                </BreadcrumbList>
              </Breadcrumb>
            </div>
          </div>

          {/* Folder List */}
          <div className="flex-1 overflow-y-auto pr-1 custom-scrollbar">
            {isFoldersLoading ? (
              <div className="py-24 flex justify-center w-full">
                <Loader size={40} />
              </div>
            ) : visibleFolders.length === 0 ? (
              <div className="py-24 flex flex-col items-center justify-center text-center">
                <div className="w-20 h-20 bg-surface-alt rounded-3xl flex items-center justify-center mb-4 opacity-50">
                  <FolderOpen size={32} className="text-label-tertiary" />
                </div>
                <h4 className="text-base font-bold text-label-secondary">No subfolders found</h4>
              </div>
            ) : (
              <div className="space-y-2">
                {visibleFolders.map((folder) => (
                  <div
                    key={String(folder._id || folder.id)}
                    className="group flex items-center gap-4 px-4 py-3 rounded-2xl hover:bg-primary/5 cursor-pointer transition-all border border-transparent hover:border-primary/10"
                    onClick={() => handleNavigate(String(folder._id || folder.id), folder.name)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" || e.key === " ") {
                        handleNavigate(String(folder._id || folder.id), folder.name);
                      }
                    }}
                    role="button"
                    tabIndex={0}
                  >
                    <div className="w-12 h-12 rounded-[1.25rem] bg-primary/10 text-primary flex items-center justify-center shrink-0 group-hover:scale-110 group-hover:bg-primary transition-all duration-300 group-hover:text-white">
                      <Folder size={22} className="fill-current" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <span className="block truncate text-sm font-black text-label group-hover:text-primary transition-colors">
                        {folder.name}
                      </span>
                      <span className="text-[11px] font-bold text-label-tertiary uppercase tracking-tighter">
                        {folder.itemCount || 0} items
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="bg-primary/10 p-4 rounded-2xl border border-primary/20 flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center shrink-0 shadow-glow">
              <Check size={16} className="text-white stroke-3" />
            </div>
            <div className="flex-1">
              <span className="text-[10px] font-black text-primary/60 uppercase tracking-widest block mb-0.5">
                Selection
              </span>
              <span className="text-sm font-black text-primary truncate block">{currentFolder.name}</span>
            </div>
          </div>
        </div>

        <DialogFooter className="px-8 pb-8 pt-4 gap-3 bg-linear-to-t from-surface to-transparent sm:justify-end">
          <Button
            variant="ghost"
            onClick={onClose}
            className="rounded-2xl font-black text-label-secondary hover:text-label hover:bg-surface-alt transition-all px-6"
          >
            Cancel
          </Button>
          <Button
            onClick={handleConfirm}
            disabled={isSameFolder || loading}
            className={cn(
              "rounded-2xl px-8 font-black transition-all shadow-glow",
              isSameFolder
                ? "bg-surface-alt text-label-tertiary cursor-not-allowed"
                : "bg-primary text-white hover:scale-105"
            )}
          >
            {loading ? <Loader size={16} className="mr-2" /> : null}
            {isSameFolder ? "Already Here" : confirmText}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export default FolderPickerModal;
