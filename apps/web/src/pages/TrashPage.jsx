// React core & third-party libraries
import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { message as antdMessage } from "antd";
import { Trash2, Home, RotateCcw, AlertTriangle } from "lucide-react";
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
import PageNames from "@constants/pageNames";
import PageUrls from "@constants/pageUrls";

// Hooks
import { useInfinitePaging } from "@hooks/files/useInfinitePaging";
import { useListPageParams } from "@hooks/files/useListPageParams";
import { useOutsideClickClear } from "@hooks/files/useOutsideClickClear";
import { useSelectableItems } from "@hooks/files/useSelectableItems";

// Components
import FileItem from "@components/files/FileItem";
import FloatingBulkActionsBar from "@components/files/FloatingBulkActionsBar";
import FolderItem from "@components/files/FolderItem";
import ListControls from "@components/files/ListControls";
import InfoDrawer from "@components/files/InfoDrawer";
import Button from "@shared-components/components/button";
import Loader from "@shared-components/components/loader";
import PageHeader from "@components/layout/PageHeader";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@components/ui/breadcrumb";
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
  const [viewMode, setViewMode] = useState("grid"); // 'grid' | 'list'
  const { clearSelection, isSelected, selectedItems, toggleSelect } = useSelectableItems();
  const { advancedFilters, debouncedSearch, page, pageSize, setPage, updateParams } = useListPageParams();

  // Custom & shared hooks

  // RTK Query hooks
  const [emptyTrash, { isLoading: isEmptying }] = useEmptyTrashMutation();
  const [permanentlyDeleteItems, { isLoading: isDeleting }] = usePermanentlyDeleteItemsMutation();
  const [restoreItems, { isLoading: isRestoring }] = useRestoreItemsMutation();

  const [confirmEmpty, setConfirmEmpty] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);

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
  useEffect(() => {
    // Handled by updateParams, but good for external URL changes
  }, [debouncedSearch, advancedFilters]);
  useOutsideClickClear({ clearSelection });

  async function onEmptyTrashConfirm() {
    try {
      await emptyTrash().unwrap();
      antdMessage.success("Trash emptied successfully");
      clearSelection();
    } catch (_error) {
      antdMessage.error("Failed to empty trash");
    } finally {
      setConfirmEmpty(false);
    }
  }

  async function handleBulkRestore() {
    if (selectedItems.length === 0) return;
    try {
      await restoreItems({ items: selectedItems }).unwrap();
      antdMessage.success(`Restored ${selectedItems.length} items`);
      clearSelection();
    } catch (_error) {
      antdMessage.error("Failed to restore items");
    }
  }

  async function onDeleteSelectedConfirm() {
    try {
      await permanentlyDeleteItems({ items: selectedItems }).unwrap();
      antdMessage.success(`Permanently deleted ${selectedItems.length} items`);
      clearSelection();
    } catch (_error) {
      antdMessage.error("Failed to delete items");
    } finally {
      setConfirmDelete(false);
    }
  }

  return (
    <div className="flex flex-col gap-6 pb-24">
      <PageHeader
        title={PageNames.TRASH}
        icon={
          <div className="w-10 h-10 rounded-xl bg-error/10 flex items-center justify-center border border-error/20 shadow-glow-sm">
            <Trash2 className="text-xl text-error" size={20} />
          </div>
        }
        breadcrumbNode={
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
                <BreadcrumbPage className="text-label font-bold text-xs">{PageNames.TRASH}</BreadcrumbPage>
              </BreadcrumbItem>
            </BreadcrumbList>
          </Breadcrumb>
        }
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
              styleType="primary"
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

      {/* Bulk Actions Bar */}
      {selectedItems.length > 0 && (
        <motion.div initial={{ y: 100, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 100, opacity: 0 }}>
          <FloatingBulkActionsBar selectedCount={selectedItems.length} clearSelection={clearSelection}>
            <Button
              type="text"
              icon={<RotateCcw size={16} />}
              onClick={handleBulkRestore}
              loading={isRestoring}
              className="rounded-xl font-bold flex flex-col items-center gap-0.5 h-12 w-16 text-primary hover:bg-primary/10 border-none justify-center transition-all bg-transparent!"
            >
              <span className="text-[10px] uppercase tracking-tighter">Restore</span>
            </Button>
            <Button
              type="text"
              icon={<Trash2 size={16} />}
              onClick={() => setConfirmDelete(true)}
              loading={isDeleting}
              className="rounded-xl font-bold flex flex-col items-center gap-0.5 h-12 w-16 text-error hover:bg-error/10 border-none justify-center transition-all bg-transparent!"
            >
              <span className="text-[10px] uppercase tracking-tighter">Delete</span>
            </Button>
          </FloatingBulkActionsBar>
        </motion.div>
      )}

      {isLoading ? (
        <div className="py-20 flex justify-center w-full">
          <Loader size={32} />
        </div>
      ) : folders.length === 0 && files.length === 0 ? (
        <div className="bg-surface rounded-3xl border border-line shadow-sm flex flex-col items-center justify-center py-24 px-8 mt-4 hover:border-primary/20 transition-colors">
          <motion.div
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ delay: 0.1, type: "spring", stiffness: 200, damping: 16 }}
            className="w-24 h-24 rounded-full bg-error/10 flex items-center justify-center mb-6 shadow-inner border border-error/20"
          >
            <Trash2 size={40} className="text-error opacity-80" />
          </motion.div>
          <h2 className="text-2xl font-bold text-label mb-2 tracking-tight">Your trash is empty</h2>
          <p className="text-sm text-label-tertiary text-center max-w-xs leading-relaxed font-medium">
            Items you delete will appear here and be permanently removed after 30 days.
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
                  viewMode === "grid"
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
                  viewMode === "grid"
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
                        onOpen={() => toggleSelect(id, "file")} // prevent preview in trash, just select
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
