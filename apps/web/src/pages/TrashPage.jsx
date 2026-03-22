// React core & third-party libraries
import { useState } from "react";

import { toast } from "sonner";
import { Trash2, RotateCcw, AlertTriangle } from "lucide-react";
import { motion } from "framer-motion";

// Services (RTK Query hooks)
import {
  useEmptyTrashMutation,
  useGetTrashItemsQuery,
  usePermanentlyDeleteItemsMutation,
  useRestoreItemsMutation,
} from "@services/api/trashApi";

// Constants
import { ItemTypes } from "@shared-constants/constants";
import { VIEW_MODES } from "@constants/uiConstants";

// Hooks
import { useInfinitePaging } from "@hooks/files/useInfinitePaging";
import { useListPageParams } from "@hooks/files/useListPageParams";
import { useOutsideClickClear } from "@hooks/files/useOutsideClickClear";
import { useSelectableItems } from "@hooks/files/useSelectableItems";

// Components
import FileItem from "@components/files/FileItem";
import FloatingBulkActionsBar, { BulkAction } from "@components/files/FloatingBulkActionsBar";
import FolderItem from "@components/files/FolderItem";
import ListControls from "@components/files/ListControls";
import InfoDrawer from "@components/files/InfoDrawer";
import { Button } from "@components/ui/button";
import Loader from "@components/common/Loader";
import PageHeader from "@components/layout/PageHeader";

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

function TrashView() {
  // Local state
  const [infoItem, setInfoItem] = useState(null);
  const [viewMode, setViewMode] = useState(VIEW_MODES.GRID);
  const [confirmEmpty, setConfirmEmpty] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const { clearSelection, isSelected, selectedItems, toggleSelect } = useSelectableItems();
  const { advancedFilters, debouncedSearch, page, pageSize, setPage, updateParams } = useListPageParams();

  // RTK Query hooks
  const [emptyTrash, { isLoading: isEmptying }] = useEmptyTrashMutation();
  const [permanentlyDeleteItems, { isLoading: isDeleting }] = usePermanentlyDeleteItemsMutation();
  const [restoreItems, { isLoading: isRestoring }] = useRestoreItemsMutation();

  const {
    data: trashData,
    isLoading,
    isFetching,
  } = useGetTrashItemsQuery({
    search: debouncedSearch || undefined,
    pg: page,
    ps: pageSize,
    ...advancedFilters,
  });

  // Derived / computed variables
  const paginationData = trashData?.pagination || {};
  const folders = trashData?.data?.folders || [];
  const files = trashData?.data?.files || [];

  // Event handlers

  // Custom & shared hooks
  const { loaderRef } = useInfinitePaging({
    hasNext: paginationData?.hasNext || false,
    isLoading: isFetching,
    page,
    setPage,
    updateParams,
  });

  // useEffect
  useOutsideClickClear({ clearSelection });

  async function onEmptyTrashConfirm() {
    try {
      await emptyTrash().unwrap();
      toast.success("Trash emptied successfully");
      clearSelection();
    } catch (_error) {
      toast.error("Failed to empty trash");
    } finally {
      setConfirmEmpty(false);
    }
  }

  async function handleBulkRestore() {
    if (selectedItems.length === 0) return;
    try {
      await restoreItems({ items: selectedItems }).unwrap();
      toast.success(`Restored ${selectedItems.length} items`);
      clearSelection();
    } catch (_error) {
      toast.error("Failed to restore items");
    }
  }

  async function onDeleteSelectedConfirm() {
    try {
      await permanentlyDeleteItems({ items: selectedItems }).unwrap();
      toast.success(`Permanently deleted ${selectedItems.length} items`);
      clearSelection();
    } catch (_error) {
      toast.error("Failed to delete items");
    } finally {
      setConfirmDelete(false);
    }
  }

  return (
    <div className="flex flex-col gap-6 pb-24">
      <PageHeader
        rightContent={
          <>
            <ListControls
              advancedFilters={advancedFilters}
              placeholder="Search in trash..."
              searchClassName="w-full md:w-64 h-10"
              showSearchContainer={false}
              updateParams={updateParams}
              viewMode={viewMode}
              setViewMode={setViewMode}
              variant="trash"
            />

            <Button
              variant="destructive"
              icon={<Trash2 size={16} />}
              onClick={() => setConfirmEmpty(true)}
              disabled={folders.length === 0 && files.length === 0}
              loading={isEmptying}
              className="rounded-xl h-10 shadow-glow-sm font-bold hover:scale-[1.02] transition-transform active:scale-95 px-6"
            >
              Empty Trash
            </Button>
          </>
        }
      />

      <InfoDrawer item={infoItem} open={!!infoItem} onClose={() => setInfoItem(null)} />

      {isLoading ? (
        <div className="py-20 flex justify-center w-full">
          <Loader size={32} />
        </div>
      ) : folders.length === 0 && files.length === 0 ? (
        <div className="glass-card rounded-[2.5rem] shadow-md flex flex-col items-center justify-center py-24 px-8 mt-4 bg-white/5 border-dashed border-white/10">
          <motion.div
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ delay: 0.1, type: "spring", stiffness: 200, damping: 16 }}
            className="w-24 h-24 rounded-4xl glass-card flex items-center justify-center mb-8 shadow-inner border-[#dc2626]/20 crimson-glow"
          >
            <Trash2 size={44} className="text-[#dc2626] opacity-80" />
          </motion.div>
          <h2 className="text-3xl font-black text-label mb-3 tracking-tighter italic">Trash is Empty</h2>
          <p className="text-sm text-label-tertiary text-center max-w-xs leading-relaxed font-medium opacity-70">
            Deleted items stay here for 30 days before being permanently removed.
          </p>
        </div>
      ) : (
        <div className="space-y-8 mt-4">
          {/* Folders Section */}
          {folders.length > 0 && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
              <h2 className="text-[10px] font-black uppercase tracking-[0.2em] text-label-tertiary mb-4 px-1 opacity-60">
                Deleted Folders
              </h2>
              <div
                className={
                  viewMode === VIEW_MODES.GRID
                    ? "grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4"
                    : "flex flex-col gap-2"
                }
              >
                {folders.map((folder) => {
                  const id = folder._id || folder.id;
                  return (
                    <motion.div
                      key={id}
                      layout
                      className="opacity-80 hover:opacity-100 grayscale hover:grayscale-0 transition-all duration-300"
                    >
                      <FolderItem
                        folder={{ ...folder, id }}
                        viewMode={viewMode}
                        isSelected={isSelected(id)}
                        onToggleSelect={(folderId) => toggleSelect(folderId, ItemTypes.FOLDER)}
                        onOpen={() => toggleSelect(id, ItemTypes.FOLDER)} // prevent navigation in trash, just select
                        onShowInfo={setInfoItem}
                        isTrashItem={true}
                      />
                    </motion.div>
                  );
                })}
              </div>
            </motion.div>
          )}

          {/* Files Section */}
          {files.length > 0 && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
              <h2 className="text-[10px] font-black uppercase tracking-[0.2em] text-label-tertiary mb-4 px-1 opacity-60">
                Deleted Files
              </h2>
              <div
                className={
                  viewMode === VIEW_MODES.GRID
                    ? "grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4"
                    : "flex flex-col gap-2"
                }
              >
                {files.map((file) => {
                  const id = file._id || file.id;
                  return (
                    <motion.div
                      key={id}
                      layout
                      className="opacity-80 hover:opacity-100 grayscale hover:grayscale-0 transition-all duration-300"
                    >
                      <FileItem
                        file={{ ...file, id }}
                        viewMode={viewMode}
                        isSelected={isSelected(id)}
                        onToggleSelect={(fileId) => toggleSelect(fileId, ItemTypes.FILE)}
                        onOpen={() => toggleSelect(id, ItemTypes.FILE)} // prevent preview in trash, just select
                        onShowInfo={setInfoItem}
                        isTrashItem={true}
                      />
                    </motion.div>
                  );
                })}
              </div>
            </motion.div>
          )}

          {/* Infinite Scroll Loader */}
          <div ref={loaderRef} className="py-8 flex flex-col items-center justify-center gap-4 w-full">
            {isFetching ? (
              <>
                <Loader size={20} />
                <span className="text-label-tertiary text-xs font-medium">Loading more items...</span>
              </>
            ) : paginationData?.hasNext ? (
              <span className="text-label-tertiary text-xs italic opacity-60">Scroll for more</span>
            ) : (
              <span className="text-label-tertiary text-xs italic opacity-40">No more items in trash</span>
            )}
          </div>
        </div>
      )}

      <InfoDrawer item={infoItem} open={!!infoItem} onClose={() => setInfoItem(null)} />

      {/* Confirmation Dialogs */}
      <AlertDialog open={confirmEmpty} onOpenChange={setConfirmEmpty}>
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
              onClick={onEmptyTrashConfirm}
              className="rounded-xl font-bold bg-error hover:bg-error/90 text-white shadow-glow-sm"
            >
              Empty Trash
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={confirmDelete} onOpenChange={setConfirmDelete}>
        <AlertDialogContent className="aurora-modal">
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2 text-error">
              <AlertTriangle size={20} />
              <span>Delete Forever</span>
            </AlertDialogTitle>
            <AlertDialogDescription className="text-label-tertiary font-medium">
              Are you sure you want to permanently delete these {selectedItems.length} items? This action cannot be
              undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="rounded-xl font-bold">Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={onDeleteSelectedConfirm}
              className="rounded-xl font-bold bg-error hover:bg-error/90 text-white shadow-glow-sm"
            >
              Delete Forever
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <FloatingBulkActionsBar selectedCount={selectedItems.length} clearSelection={clearSelection}>
        <BulkAction
          icon={<RotateCcw size={16} />}
          label="Restore"
          tooltip="Restore selection"
          onClick={handleBulkRestore}
          loading={isRestoring}
        />
        <BulkAction
          icon={<Trash2 size={16} />}
          label="Delete"
          tooltip="Delete permanently"
          danger
          onClick={() => setConfirmDelete(true)}
          loading={isDeleting}
        />
      </FloatingBulkActionsBar>
    </div>
  );
}

export default function TrashPage() {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.98 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.98 }}
      transition={{ duration: 0.3 }}
    >
      <TrashView />
    </motion.div>
  );
}
