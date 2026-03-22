// React core & third-party libraries
import { useEffect, useState } from "react";
import { Cloud, Copy, Trash2, Download, Move, Send, AlertTriangle } from "lucide-react";
import { motion } from "framer-motion";

// Services (RTK Query hooks)
import { useGetFolderContentsQuery, useGetFolderDetailsQuery } from "@services/api/folderApi";

// Constants
import { QUERY_PARAMS_KEYS, STORAGE, DefaultSort } from "@shared-constants/constants";
import { ROOT_FOLDER_ID } from "@constants/serviceUrls";

import { useDragDrop } from "@hooks/files/useDragDrop";
import { useFileActions } from "@hooks/files/useFileActions";
import { useFavoriteActions } from "@hooks/files/useFavoriteActions";
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
import FloatingBulkActionsBar, { BulkAction } from "@components/files/FloatingBulkActionsBar";
import FolderPickerModal from "@components/files/FolderPickerModal";
import InfoDrawer from "@components/files/InfoDrawer";
import PageHeader from "@components/layout/PageHeader";
import QuotaRequestModal from "@components/settings/QuotaRequestModal";
import RenameModal from "@components/files/RenameModal";
import DeleteModal from "@components/files/DeleteModal";
import BulkDeleteModal from "@components/files/BulkDeleteModal";
import CreateFolderModal from "@components/files/CreateFolderModal";
import { Button } from "@components/ui/button";
import { Dialog, DialogContent } from "@components/ui/dialog";

// Remove Dragger
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
  const currentFolderId = searchParams.get("folder") || ROOT_FOLDER_ID;

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
      skip: currentFolderId === ROOT_FOLDER_ID || !!debouncedSearch,
    }
  );

  // Derived / computed variables
  const folders = contentsData?.data?.folders || [];
  const files = contentsData?.data?.files || [];
  const breadcrumbs = currentFolderId === ROOT_FOLDER_ID ? [] : detailsData?.data?.breadcrumbs || [];
  const paginationData = contentsData?.pagination || {};

  // Event handlers
  function setCurrentFolderId(id) {
    const newParams = new URLSearchParams(searchParams);
    if (id === ROOT_FOLDER_ID || !id) {
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
    bulkDeleteItems,
    setBulkDeleteItems,
    folderPicker,
    setFolderPicker,
    handleRenameTrigger,
    handleRenameConfirm,
    handleDeleteTrigger,
    handleDeleteConfirm,
    handleBulkDeleteTrigger,
    handleBulkDeleteConfirm,
    handleMoveTrigger,
    handleCopyTrigger,
    handleBulkMoveTrigger,
    handleBulkCopyTrigger,
    handleFolderPickerConfirm,
    handleDownload,
    handleBulkDownload,
    isActionLoading,
  } = useFileActions({ folders, clearSelection });

  // 5. Custom & shared hooks (continued)
  const { handleToggleFileFavorite, handleToggleFolderFavorite, isFileFavoriting, isFolderFavoriting } =
    useFavoriteActions();

  const {
    isFolderModalOpen,
    setIsFolderModalOpen,
    newFolderName,
    setNewFolderName,
    handleCreateFolderClick,
    handleCreateFolderConfirm,
  } = useFolderCreation({ currentFolderId });
  const { addUpload } = useUploadDetails();
  const { isDragging, handleDragEnter, handleDragLeave, handleDrop } = useDragDrop();
  const { uploadInputRef, handleUploadClick, handleFileChange, dropzoneProps } = useUploadHandler({
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
            handleCreateFolder={handleCreateFolderClick}
          />
        }
      />

      <div className="h-4" />

      <div className="relative group min-h-[400px]">
        <input type="file" multiple className="hidden" ref={uploadInputRef} onChange={handleFileChange} />
        <div {...dropzoneProps} className="w-full h-full min-h-[400px]">
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
            handleToggleFileFavorite={handleToggleFileFavorite}
            handleToggleFolderFavorite={handleToggleFolderFavorite}
            isFileFavoriting={isFileFavoriting}
            isFolderFavoriting={isFolderFavoriting}
            isDragging={isDragging}
          />
        </div>

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
                  variant="primary"
                  size="large"
                  icon={<Send size={18} />}
                  onClick={handleRequestQuota}
                  className="w-full rounded-2xl h-14 font-black shadow-glow text-base uppercase tracking-wider"
                >
                  Request Increase
                </Button>
                <Button
                  variant="ghost"
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
      <FloatingBulkActionsBar selectedCount={selectedItems.length} clearSelection={clearSelection}>
        <BulkAction
          icon={<Move size={16} />}
          label="Move"
          tooltip="Move selection"
          onClick={() => handleBulkMoveTrigger(selectedItems)}
        />
        <BulkAction
          icon={<Copy size={16} />}
          label="Copy"
          tooltip="Copy selection"
          onClick={() => handleBulkCopyTrigger(selectedItems)}
        />
        <BulkAction
          icon={<Download size={16} />}
          label="Download"
          tooltip="Download selection (files only)"
          onClick={() => handleBulkDownload(selectedItems)}
        />
        <BulkAction
          icon={<Trash2 size={16} />}
          label="Delete"
          tooltip="Delete selection"
          danger
          onClick={() => handleBulkDeleteTrigger(selectedItems)}
        />
      </FloatingBulkActionsBar>
      <FilePreviewModal
        file={previewFile}
        open={!!previewFile}
        onClose={() => setPreviewFile(null)}
        handleDownload={handleDownload}
        allFiles={files}
        currentIndex={
          previewFile ? files.findIndex((f) => (f._id || f.id) === (previewFile._id || previewFile.id)) : -1
        }
        onNavigate={(index) => setPreviewFile(files[index])}
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
      <RenameModal
        open={!!renameItem}
        onClose={() => setRenameItem(null)}
        name={newName}
        onNameChange={(e) => setNewName(e.target.value)}
        onConfirm={handleRenameConfirm}
      />

      <DeleteModal
        open={!!deleteItem}
        onClose={() => setDeleteItem(null)}
        itemName={deleteItem?.name}
        onConfirm={handleDeleteConfirm}
      />

      {/* Bulk Delete Modal */}
      <BulkDeleteModal
        open={!!bulkDeleteItems}
        onClose={() => setBulkDeleteItems(null)}
        count={bulkDeleteItems?.length}
        onConfirm={handleBulkDeleteConfirm}
      />

      {/* Create Folder Modal */}
      <CreateFolderModal
        open={isFolderModalOpen}
        onClose={() => setIsFolderModalOpen(false)}
        folderName={newFolderName}
        onFolderNameChange={(e) => setNewFolderName(e.target.value)}
        onConfirm={handleCreateFolderConfirm}
      />
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
