import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Copy, Trash2, Move, Star, Download } from "lucide-react";

// Constants

import PageUrls from "@constants/pageUrls";
import { ItemTypes } from "@shared-constants/constants";

// Hooks
import { useFileActions } from "@hooks/files/useFileActions";
import { useFavoriteActions } from "@hooks/files/useFavoriteActions";
import { useInfinitePaging } from "@hooks/files/useInfinitePaging";
import { useListPageParams } from "@hooks/files/useListPageParams";
import { useOutsideClickClear } from "@hooks/files/useOutsideClickClear";
import { useSelectableItems } from "@hooks/files/useSelectableItems";

// Services (RTK Query hooks)
import { useGetFilesQuery } from "@services/api/fileApi";
import { useGetFoldersQuery } from "@services/api/folderApi";

import FileItem from "@components/files/FileItem";
import FilePreviewModal from "@components/files/FilePreviewModal";
import FloatingBulkActionsBar, { BulkAction } from "@components/files/FloatingBulkActionsBar";
import FolderItem from "@components/files/FolderItem";
import FolderPickerModal from "@components/files/FolderPickerModal";
import InfoDrawer from "@components/files/InfoDrawer";
import ListControls from "@components/files/ListControls";
import PageHeader from "@components/layout/PageHeader";
import Loader from "@components/common/Loader";
import RenameModal from "@components/files/RenameModal";
import DeleteModal from "@components/files/DeleteModal";
import BulkDeleteModal from "@components/files/BulkDeleteModal";

function FavoritesPage() {
  const navigate = useNavigate();
  const [infoItem, setInfoItem] = useState(null);
  const [previewFile, setPreviewFile] = useState(null);
  const [viewMode, setViewMode] = useState("grid");

  const { clearSelection, selectedItems, toggleSelect } = useSelectableItems();
  const { advancedFilters, debouncedSearch, page, pageSize, setPage, updateParams } = useListPageParams();

  const { data: foldersData, isLoading: foldersLoading } = useGetFoldersQuery({
    isFavorite: "true",
    search: debouncedSearch || undefined,
  });

  const {
    data: filesData,
    isLoading: filesLoading,
    isFetching: filesFetching,
  } = useGetFilesQuery({
    isFavorite: "true",
    search: debouncedSearch || undefined,
    pg: page,
    ps: pageSize,
  });

  const { loaderRef } = useInfinitePaging({
    hasNext: filesData?.pagination?.hasNext || false,
    isLoading: filesFetching,
    page,
    setPage,
    updateParams,
  });

  const paginationData = filesData?.pagination || {};
  const folders = foldersData?.data || [];
  const files = filesData?.data || [];
  const isLoading = foldersLoading || filesLoading;

  const {
    deleteItem,
    folderPicker,
    newName,
    renameItem,
    bulkDeleteItems,
    setBulkDeleteItems,
    setDeleteItem,
    setFolderPicker,
    setNewName,
    setRenameItem,
    handleBulkCopyTrigger,
    handleBulkDeleteConfirm,
    handleBulkMoveTrigger,
    handleCopyTrigger,
    handleDeleteConfirm,
    handleDeleteTrigger,
    handleFolderPickerConfirm,
    handleMoveTrigger,
    handleRenameConfirm,
    handleRenameTrigger,
    handleBulkDownload,
  } = useFileActions({
    clearSelection,
    folders,
  });

  // 5. Custom & shared hooks (continued)
  const { handleToggleFileFavorite, handleToggleFolderFavorite, isFileFavoriting, isFolderFavoriting } =
    useFavoriteActions();

  // 7. Derived / computed variables

  // Event handlers

  function handleOpen(item) {
    if ("itemCount" in item) {
      navigate(`${PageUrls.DashboardPage}?folder=${item.id || item._id}`);
      clearSelection();
    } else {
      setPreviewFile(item);
    }
  }

  useOutsideClickClear({ clearSelection });

  // Render
  return (
    <div className="flex flex-col gap-4 pb-10 bg-background min-h-full">
      <PageHeader
        rightContent={
          <ListControls
            advancedFilters={advancedFilters}
            placeholder="Search in Favorites..."
            updateParams={updateParams}
            viewMode={viewMode}
            setViewMode={setViewMode}
          />
        }
      />

      <div className="h-4" />

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
          tooltip="Move to Trash"
          danger
          onClick={() => setBulkDeleteItems(selectedItems)}
        />
      </FloatingBulkActionsBar>

      {/* Content Section */}
      <div className="space-y-6">
        {isLoading ? (
          <div className="py-24 flex flex-col items-center justify-center gap-4">
            <Loader size={32} />
            <span className="text-label-tertiary font-medium">Loading favorites...</span>
          </div>
        ) : (
          <>
            {/* Folders Section */}
            {folders.length > 0 && (
              <div>
                <h2 className="text-[10px] font-black uppercase tracking-[0.2em] text-label-tertiary mb-3 px-1 opacity-80">
                  Folders
                </h2>
                <div
                  className={
                    viewMode === "grid"
                      ? "grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4"
                      : "flex flex-col gap-2"
                  }
                >
                  {folders.map((folder) => {
                    const id = String(folder._id || folder.id);
                    return (
                      <div key={id}>
                        <FolderItem
                          folder={{ ...folder, id }}
                          viewMode={viewMode}
                          isSelected={selectedItems.some((i) => i.id === id)}
                          onToggleSelect={(id) => toggleSelect(id, ItemTypes.FOLDER)}
                          onOpen={handleOpen}
                          onShowInfo={setInfoItem}
                          onRename={handleRenameTrigger}
                          onDelete={handleDeleteTrigger}
                          onMove={handleMoveTrigger}
                          onCopy={handleCopyTrigger}
                          onToggleFavorite={handleToggleFolderFavorite}
                          isFavoriting={isFolderFavoriting}
                        />
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Files Section */}
            {files.length > 0 && (
              <div>
                <h2 className="text-[10px] font-black uppercase tracking-[0.2em] text-label-tertiary mb-3 px-1 opacity-80">
                  Files
                </h2>
                <div
                  className={
                    viewMode === "grid"
                      ? "grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4"
                      : "flex flex-col gap-2"
                  }
                >
                  {files.map((file) => {
                    const id = String(file._id || file.id);
                    return (
                      <div key={id}>
                        <FileItem
                          file={{ ...file, id }}
                          viewMode={viewMode}
                          isSelected={selectedItems.some((i) => i.id === id)}
                          onToggleSelect={(id) => toggleSelect(id, ItemTypes.FILE)}
                          onOpen={handleOpen}
                          onShowInfo={setInfoItem}
                          onRename={handleRenameTrigger}
                          onDelete={handleDeleteTrigger}
                          onMove={handleMoveTrigger}
                          onCopy={handleCopyTrigger}
                          onToggleFavorite={handleToggleFileFavorite}
                          isFavoriting={isFileFavoriting}
                        />
                      </div>
                    );
                  })}
                </div>

                {/* Infinite Scroll Loader */}
                <div ref={loaderRef} className="py-8 flex flex-col items-center justify-center gap-4 w-full">
                  {filesFetching ? (
                    <>
                      <Loader size={20} />
                      <span className="text-label-tertiary text-xs font-medium">Loading more files...</span>
                    </>
                  ) : paginationData?.hasNext ? (
                    <span className="text-label-tertiary text-xs italic opacity-60">Scroll for more</span>
                  ) : (
                    <span className="text-label-tertiary text-xs italic opacity-40">No more files to show</span>
                  )}
                </div>
              </div>
            )}

            {folders.length === 0 && files.length === 0 && (
              <div className="py-24 flex flex-col items-center justify-center text-center opacity-60 grayscale">
                <div className="w-20 h-20 mb-6 rounded-full bg-surface-dim flex items-center justify-center border-2 border-dashed border-line shadow-inner">
                  <Star className="text-3xl text-label-tertiary" size={32} />
                </div>
                <h2 className="text-lg font-bold text-label mb-1">No favorites found</h2>
                <p className="text-label-secondary text-sm font-medium">
                  Starred items will appear here for quick access.
                </p>
              </div>
            )}
          </>
        )}
      </div>

      {/* Shared Modals & Drawers */}
      <InfoDrawer item={infoItem} open={!!infoItem} onClose={() => setInfoItem(null)} />

      <FilePreviewModal
        file={previewFile}
        open={!!previewFile}
        onClose={() => setPreviewFile(null)}
        allFiles={files}
        currentIndex={
          previewFile ? files.findIndex((f) => (f._id || f.id) === (previewFile._id || previewFile.id)) : -1
        }
        onNavigate={(index) => setPreviewFile(files[index])}
      />

      <FolderPickerModal
        open={folderPicker.visible}
        onClose={() => setFolderPicker({ ...folderPicker, visible: false })}
        onConfirm={handleFolderPickerConfirm}
        action={folderPicker.action}
        excludeIds={folderPicker.items
          .map((i) => i.id)
          .concat(folderPicker.item ? [folderPicker.item.id || folderPicker.item._id] : [])}
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
    </div>
  );
}

export default FavoritesPage;
