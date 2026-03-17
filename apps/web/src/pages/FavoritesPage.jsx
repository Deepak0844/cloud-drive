// React core & third-party libraries
import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Copy, Trash2, Move, Home, Star, AlertTriangle, Info } from "lucide-react";
import { motion } from "framer-motion";

// Constants
import PageNames from "@constants/pageNames";
import PageUrls from "@constants/pageUrls";
import { ItemTypes } from "@shared-constants/constants";

// Hooks
import { useFileActions } from "@hooks/files/useFileActions";
import { useInfinitePaging } from "@hooks/files/useInfinitePaging";
import { useListPageParams } from "@hooks/files/useListPageParams";
import { useOutsideClickClear } from "@hooks/files/useOutsideClickClear";
import { useSelectableItems } from "@hooks/files/useSelectableItems";

// Services (RTK Query hooks)
import { useGetFilesQuery } from "@services/api/fileApi";
import { useGetFoldersQuery } from "@services/api/folderApi";

// Components
import FileItem from "@components/files/FileItem";
import FilePreviewModal from "@components/files/FilePreviewModal";
import FolderItem from "@components/files/FolderItem";
import FolderPickerModal from "@components/files/FolderPickerModal";
import FloatingBulkActionsBar from "@components/files/FloatingBulkActionsBar";
import InfoDrawer from "@components/files/InfoDrawer";
import ListControls from "@components/files/ListControls";
import PageHeader from "@components/layout/PageHeader";
import Button from "@shared-components/components/button";
import Loader from "@shared-components/components/loader";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@components/ui/breadcrumb";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@components/ui/tooltip";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@components/ui/dialog";
import { Input } from "@components/ui/input";
import { Label } from "@components/ui/label";

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
    handleBulkDeleteTrigger,
    handleBulkDeleteConfirm,
    handleBulkMoveTrigger,
    handleCopyTrigger,
    handleDeleteConfirm,
    handleDeleteTrigger,
    handleFolderPickerConfirm,
    handleMoveTrigger,
    handleRenameConfirm,
    handleRenameTrigger,
  } = useFileActions({
    clearSelection,
    folders,
  });

  // 7. Derived / computed variables
  const breadcrumbsList = (
    <Breadcrumb className="mt-1">
      <BreadcrumbList>
        <BreadcrumbItem>
          <BreadcrumbLink asChild>
            <Link
              to={PageUrls.DashboardPage}
              className="flex items-center gap-1.5 text-label-tertiary hover:text-primary transition-colors text-xs font-medium"
            >
              <Home size={12} /> <span>{PageNames.MY_FILES}</span>
            </Link>
          </BreadcrumbLink>
        </BreadcrumbItem>
        <BreadcrumbSeparator />
        <BreadcrumbItem>
          <BreadcrumbPage className="text-label font-bold text-xs">{PageNames.FAVORITES}</BreadcrumbPage>
        </BreadcrumbItem>
      </BreadcrumbList>
    </Breadcrumb>
  );

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
    <div className="flex flex-col gap-4 pb-10">
      <PageHeader
        title={PageNames.FAVORITES}
        icon={
          <div className="w-10 h-10 rounded-xl bg-warning/10 flex items-center justify-center border border-warning/20 shadow-glow-sm">
            <Star className="text-warning fill-warning" size={20} />
          </div>
        }
        breadcrumbNode={breadcrumbsList}
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

      {/* Bulk Actions Bar */}
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
                    danger
                    icon={<Trash2 size={16} />}
                    onClick={() => handleBulkDeleteTrigger(selectedItems)}
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

      <FilePreviewModal file={previewFile} open={!!previewFile} onClose={() => setPreviewFile(null)} />

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

      {/* Bulk Delete Modal */}
      <Dialog open={!!bulkDeleteItems} onOpenChange={(open) => !open && setBulkDeleteItems(null)}>
        <DialogContent className="max-w-[400px] aurora-modal">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-error italic">
              <AlertTriangle size={18} />
              <span>Bulk Delete Items</span>
            </DialogTitle>
          </DialogHeader>
          <div className="py-4 flex flex-col items-center text-center gap-6">
            <div className="w-16 h-16 bg-error/10 text-error rounded-full flex items-center justify-center border border-error/20 shadow-glow-sm">
              <Trash2 size={24} />
            </div>
            <p className="text-sm text-label-tertiary font-medium leading-relaxed">
              Are you sure you want to delete{" "}
              <span className="text-label font-black italic">{bulkDeleteItems?.length} items</span>?
              <br />
              <span className="text-[10px] uppercase tracking-wider opacity-60 mt-2 block">
                These items will be moved to trash.
              </span>
            </p>
          </div>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button type="text" onClick={() => setBulkDeleteItems(null)} className="rounded-xl font-bold px-6">
              Cancel
            </Button>
            <Button
              styleType="primary"
              variant="destructive"
              onClick={handleBulkDeleteConfirm}
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

export default FavoritesPage;
