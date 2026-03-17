// React core & third-party libraries
import { useEffect, useState } from "react";
import { Upload } from "antd";
import { Cloud, Copy, Trash2, Download, Move, FolderOpen, Send, AlertTriangle, Info } from "lucide-react";
import { motion } from "framer-motion";

// Services (RTK Query hooks)
import { useGetFolderContentsQuery, useGetFolderDetailsQuery } from "@services/api/folderApi";

// Constants
import { QUERY_PARAMS_KEYS, STORAGE, DefaultSort } from "@shared-constants/constants";
import PageNames from "@constants/pageNames";

import { useDragDrop } from "@hooks/files/useDragDrop";
import { useFileActions } from "@hooks/files/useFileActions";
import { useFolderCreation } from "@hooks/files/useFolderCreation";
import { useInfinitePaging } from "@hooks/files/useInfinitePaging";
import { useListPageParams } from "@hooks/files/useListPageParams";
import { useOutsideClickClear } from "@hooks/files/useOutsideClickClear";
import { useSelectableItems } from "@hooks/files/useSelectableItems";
import { useUploadHandler } from "@hooks/files/useUploadHandler";

// Contexts
import { useUploadDetails } from "@contexts/UploadContext";

// Components
import BreadcrumbNav from "@components/files/BreadcrumbNav";
import FileGrid from "@components/files/FileGrid";
import FilePreviewModal from "@components/files/FilePreviewModal";
import FileToolbar from "@components/files/FileToolbar";
import FloatingBulkActionsBar from "@components/files/FloatingBulkActionsBar";
import FolderPickerModal from "@components/files/FolderPickerModal";
import InfoDrawer from "@components/files/InfoDrawer";
import PageHeader from "@components/layout/PageHeader";
import QuotaRequestModal from "@components/settings/QuotaRequestModal";
import Button from "@shared-components/components/button";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@components/ui/tooltip";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@components/ui/dialog";
import { Input } from "@components/ui/input";
import { Label } from "@components/ui/label";

const { Dragger } = Upload;

function MyFilesView() {
  // Local state
  const [infoItem, setInfoItem] = useState(null);
  const [previewFile, setPreviewFile] = useState(null);
  const [quotaModalVisible, setQuotaModalVisible] = useState(false);
  const [quotaRequestModalVisible, setQuotaRequestModalVisible] = useState(false);
  const [viewMode, setViewMode] = useState("grid");
  const { clearSelection, selectedItems, toggleSelect: toggleSelectBase } = useSelectableItems();
  const { advancedFilters, debouncedSearch, page, pageSize, searchParams, setSearchParams, setPage, updateParams } =
    useListPageParams();

  // Derived / computed variables
  const currentFolderId = searchParams.get("folder") || "root";

  const sortBy = searchParams.get(QUERY_PARAMS_KEYS.SORT_BY) || DefaultSort.FIELD;
  const sortOrder = searchParams.get(QUERY_PARAMS_KEYS.SORT_ORDER) || DefaultSort.ORDER;

  // RTK Query hooks
  const {
    data: contentsData,
    isLoading: isContentsLoading,
    isFetching: isContentsFetching,
  } = useGetFolderContentsQuery({
    folderId: currentFolderId,
    search: debouncedSearch || undefined,
    sortBy: sortBy,
    sortOrder: sortOrder,
    pg: page,
    ps: pageSize,
    ...advancedFilters,
  });

  const { data: detailsData } = useGetFolderDetailsQuery(
    { id: currentFolderId },
    {
      skip: currentFolderId === "root" || !!debouncedSearch,
    }
  );

  // Derived / computed variables
  const folders = contentsData?.data?.folders || [];
  const files = contentsData?.data?.files || [];
  const breadcrumbs = currentFolderId === "root" ? [] : detailsData?.data?.breadcrumbs || [];
  const paginationData = contentsData?.pagination || {};

  // Event handlers
  function setCurrentFolderId(id) {
    const newParams = new URLSearchParams(searchParams);
    if (id === "root" || !id) {
      newParams.delete("folder");
    } else {
      newParams.set("folder", id);
    }
    setSearchParams(newParams);
  }

  // Custom & shared hooks
  const { loaderRef } = useInfinitePaging({
    hasNext: paginationData?.hasNext || false,
    isLoading: isContentsFetching,
    page,
    setPage,
    updateParams,
  });

  function toggleSelect(id, type) {
    toggleSelectBase(String(id), type);
  }

  function handleRequestQuota() {
    setQuotaModalVisible(false);
    setQuotaRequestModalVisible(true);
  }

  function handleOpen(item) {
    if ("itemCount" in item) {
      setCurrentFolderId(item._id || item.id);
      clearSelection();
    } else {
      setPreviewFile(item);
    }
  }

  function handleShowInfo(item) {
    if ("itemCount" in item) {
      setInfoItem(item);
    } else {
      const virtualPath =
        breadcrumbs && breadcrumbs.length > 0 ? `My Files / ${breadcrumbs.map((b) => b.name).join(" / ")}` : "My Files";
      setInfoItem({ ...item, virtualPath });
    }
  }

  const {
    renameItem,
    setRenameItem,
    newName,
    setNewName,
    deleteItem,
    setDeleteItem,
    folderPicker,
    setFolderPicker,
    handleRenameTrigger,
    handleRenameConfirm,
    handleDeleteTrigger,
    handleDeleteConfirm,
    handleBulkDelete,
    handleMoveTrigger,
    handleCopyTrigger,
    handleBulkMoveTrigger,
    handleBulkCopyTrigger,
    handleFolderPickerConfirm,
    handleDownload,
    handleBulkDownload,
    isActionLoading,
  } = useFileActions({ folders, clearSelection });

  const { handleCreateFolder } = useFolderCreation({ currentFolderId });
  const { addUpload } = useUploadDetails();
  const { isDragging, handleDragEnter, handleDragLeave, handleDrop } = useDragDrop();
  const { uploadRef, handleUploadClick, uploadProps } = useUploadHandler({
    addUpload,
    currentFolderId,
    handleDragEnter,
    handleDragLeave,
    handleDrop,
  });

  // useEffect
  useOutsideClickClear({ clearSelection });

  useEffect(() => {
    function handleOpenQuota() {
      setQuotaModalVisible(true);
    }
    window.addEventListener("openQuotaModal", handleOpenQuota);
    return () => {
      window.removeEventListener("openQuotaModal", handleOpenQuota);
    };
  }, []);

  // Render
  return (
    <div className="flex flex-col gap-4 pb-10">
      <PageHeader
        title={PageNames.MY_FILES}
        icon={
          <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center border border-primary/20 shadow-glow-sm">
            <FolderOpen className="text-xl text-primary" size={20} />
          </div>
        }
        breadcrumbNode={<BreadcrumbNav breadcrumbs={breadcrumbs} setCurrentFolderId={setCurrentFolderId} />}
        rightContent={
          <FileToolbar
            advancedFilters={advancedFilters}
            updateParams={updateParams}
            sortBy={sortBy}
            sortOrder={sortOrder}
            viewMode={viewMode}
            setViewMode={setViewMode}
            handleUploadClick={handleUploadClick}
            handleCreateFolder={handleCreateFolder}
          />
        }
      />

      <div className="h-4" />

      {selectedItems.length > 0 && (
        <motion.div initial={{ y: 100, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 100, opacity: 0 }}>
          <FloatingBulkActionsBar selectedCount={selectedItems.length} clearSelection={clearSelection}>
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    type="text"
                    icon={<Move size={16} />}
                    onClick={() => handleBulkMoveTrigger(selectedItems)}
                    className="rounded-xl font-bold flex flex-col items-center gap-0.5 h-12 w-16 text-primary hover:bg-primary/10 border-none justify-center transition-all bg-transparent!"
                  >
                    <span className="text-[10px] uppercase tracking-tighter">Move</span>
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Move selection</TooltipContent>
              </Tooltip>
            </TooltipProvider>

            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    type="text"
                    icon={<Copy size={16} />}
                    onClick={() => handleBulkCopyTrigger(selectedItems)}
                    className="rounded-xl font-bold flex flex-col items-center gap-0.5 h-12 w-16 text-primary hover:bg-primary/10 border-none justify-center transition-all bg-transparent!"
                  >
                    <span className="text-[10px] uppercase tracking-tighter">Copy</span>
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Copy selection</TooltipContent>
              </Tooltip>
            </TooltipProvider>

            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    type="text"
                    icon={<Download size={16} />}
                    onClick={() => handleBulkDownload(selectedItems)}
                    className="rounded-xl font-bold flex flex-col items-center gap-0.5 h-12 w-16 text-primary hover:bg-primary/10 border-none justify-center transition-all bg-transparent!"
                  >
                    <span className="text-[10px] uppercase tracking-tighter">Download</span>
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Download selection (files only)</TooltipContent>
              </Tooltip>
            </TooltipProvider>

            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    type="text"
                    danger
                    icon={<Trash2 size={16} />}
                    onClick={() => handleBulkDelete(selectedItems)}
                    className="rounded-xl font-bold flex flex-col items-center gap-0.5 h-12 w-16 text-error hover:bg-error/10 border-none justify-center transition-all bg-transparent!"
                  >
                    <span className="text-[10px] uppercase tracking-tighter">Delete</span>
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Delete selection</TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </FloatingBulkActionsBar>
        </motion.div>
      )}

      <div ref={uploadRef}>
        <Dragger {...uploadProps} className="bg-transparent! border-none! cursor-default group relative">
          <FileGrid
            folders={folders}
            files={files}
            isContentsLoading={isContentsLoading}
            isContentsFetching={isContentsFetching}
            paginationData={paginationData}
            loaderRef={loaderRef}
            viewMode={viewMode}
            selectedItems={selectedItems}
            toggleSelect={toggleSelect}
            handleOpen={handleOpen}
            handleShowInfo={handleShowInfo}
            handleRenameTrigger={handleRenameTrigger}
            handleDeleteTrigger={handleDeleteTrigger}
            handleMoveTrigger={handleMoveTrigger}
            handleCopyTrigger={handleCopyTrigger}
            handleDownload={handleDownload}
            isDragging={isDragging}
          />
        </Dragger>

        <Dialog open={quotaModalVisible} onOpenChange={setQuotaModalVisible}>
          <DialogContent className="max-w-[420px] p-0 overflow-hidden border-none aurora-modal">
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
                  styleType="primary"
                  size="large"
                  icon={<Send size={18} />}
                  onClick={handleRequestQuota}
                  className="w-full rounded-2xl h-14 font-black shadow-glow text-base uppercase tracking-wider"
                >
                  Request Increase
                </Button>
                <Button
                  type="text"
                  onClick={() => setQuotaModalVisible(false)}
                  className="w-full rounded-2xl h-12 text-label-tertiary font-bold hover:text-label transition-colors"
                >
                  Later
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <InfoDrawer item={infoItem} open={!!infoItem} onClose={() => setInfoItem(null)} />
      <FilePreviewModal
        file={previewFile}
        open={!!previewFile}
        onClose={() => setPreviewFile(null)}
        handleDownload={handleDownload}
      />
      <QuotaRequestModal open={quotaRequestModalVisible} onClose={() => setQuotaRequestModalVisible(false)} />

      <FolderPickerModal
        open={folderPicker.visible}
        onClose={() => setFolderPicker({ ...folderPicker, visible: false })}
        onConfirm={handleFolderPickerConfirm}
        title={folderPicker.action.includes("move") ? "Move to Folder" : "Copy to Folder"}
        confirmText={folderPicker.action.includes("move") ? "Move Here" : "Copy Here"}
        excludeIds={
          folderPicker.item
            ? [String(folderPicker.item._id || folderPicker.item.id)]
            : selectedItems.map((i) => String(i.id))
        }
        currentParentId={folderPicker.item ? folderPicker.item.parent || folderPicker.item.folder : currentFolderId}
        loading={isActionLoading}
      />

      {/* Rename Modal */}
      <Dialog open={!!renameItem} onOpenChange={(open) => !open && setRenameItem(null)}>
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
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                className="rounded-xl h-12 bg-surface-dim/30 border-line/40 focus:border-primary/50 transition-all font-medium"
                onKeyDown={(e) => e.key === "Enter" && handleRenameConfirm()}
              />
            </div>
          </div>
          <DialogFooter>
            <Button type="text" onClick={() => setRenameItem(null)} className="rounded-xl font-bold px-6">
              Cancel
            </Button>
            <Button
              styleType="primary"
              onClick={handleRenameConfirm}
              className="rounded-xl font-black px-8 shadow-glow italic"
            >
              Rename
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Modal */}
      <Dialog open={!!deleteItem} onOpenChange={(open) => !open && setDeleteItem(null)}>
        <DialogContent className="max-w-[400px] aurora-modal">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-error italic">
              <AlertTriangle size={18} />
              <span>Delete Item</span>
            </DialogTitle>
          </DialogHeader>
          <div className="py-4 flex flex-col items-center text-center gap-6">
            <div className="w-16 h-16 bg-error/10 text-error rounded-full flex items-center justify-center border border-error/20 shadow-glow-sm">
              <Trash2 size={24} />
            </div>
            <p className="text-sm text-label-tertiary font-medium leading-relaxed">
              Are you sure you want to delete{" "}
              <span className="text-label font-black italic">&quot;{deleteItem?.name}&quot;</span>?
              <br />
              <span className="text-[10px] uppercase tracking-wider opacity-60 mt-2 block">
                This item will be moved to trash.
              </span>
            </p>
          </div>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button type="text" onClick={() => setDeleteItem(null)} className="rounded-xl font-bold px-6">
              Cancel
            </Button>
            <Button
              styleType="primary"
              variant="destructive"
              onClick={handleDeleteConfirm}
              className="rounded-xl font-black px-8 shadow-glow-sm italic"
            >
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default function MyFilesPage() {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      transition={{ duration: 0.3 }}
    >
      <MyFilesView />
    </motion.div>
  );
}
