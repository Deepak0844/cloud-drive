// React core & third-party libraries
import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { App, Breadcrumb } from "antd";
import { DeleteOutlined, HomeOutlined, RestOutlined, UndoOutlined } from "@ant-design/icons";
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
import InfoDrawer from "@components/files/InfoDrawer";
import ListControls from "@components/files/ListControls";
import PageHeader from "@components/layout/PageHeader";
import Button from "@shared-components/components/button";
import Loader from "@shared-components/components/loader";

function TrashView() {
  // Local state
  const [infoItem, setInfoItem] = useState(null);
  const [viewMode, setViewMode] = useState("grid"); // 'grid' | 'list'
  const { clearSelection, isSelected, selectedItems, toggleSelect } = useSelectableItems();
  const { advancedFilters, debouncedSearch, page, pageSize, setPage, updateParams } = useListPageParams();

  // Custom & shared hooks
  const { message, modal } = App.useApp();

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
  useEffect(() => {
    // Handled by updateParams, but good for external URL changes
  }, [debouncedSearch, advancedFilters]);
  useOutsideClickClear({ clearSelection });

  function handleEmptyTrash() {
    modal.confirm({
      title: "Empty Trash",
      icon: <RestOutlined className="text-danger" />,
      content: "Are you sure you want to permanently delete all items in the trash? This action cannot be undone.",
      okText: "Empty Trash",
      okType: "danger",
      cancelText: "Cancel",
      className: "premium-modal",
      centered: true,
      onOk: async () => {
        try {
          await emptyTrash().unwrap();
          message.success("Trash emptied successfully");
          clearSelection();
        } catch (_error) {
          message.error("Failed to empty trash");
        }
      },
    });
  }

  async function handleBulkRestore() {
    if (selectedItems.length === 0) return;
    try {
      await restoreItems({ items: selectedItems }).unwrap();
      message.success(`Restored ${selectedItems.length} items`);
      clearSelection();
    } catch (_error) {
      message.error("Failed to restore items");
    }
  }

  function handleBulkDelete() {
    if (selectedItems.length === 0) return;
    modal.confirm({
      title: "Delete Forever",
      icon: <DeleteOutlined className="text-danger" />,
      content: `Are you sure you want to permanently delete these ${selectedItems.length} items? This action cannot be undone.`,
      okText: "Delete Forever",
      okType: "danger",
      cancelText: "Cancel",
      className: "premium-modal",
      centered: true,
      onOk: async () => {
        try {
          await permanentlyDeleteItems({ items: selectedItems }).unwrap();
          message.success(`Permanently deleted ${selectedItems.length} items`);
          clearSelection();
        } catch (_error) {
          message.error("Failed to delete items");
        }
      },
    });
  }

  return (
    <div className="flex flex-col gap-6 pb-24">
      <PageHeader
        title={PageNames.TRASH}
        icon={<RestOutlined className="text-danger opacity-80" />}
        breadcrumbNode={
          <Breadcrumb
            items={[
              {
                title: (
                  <Link
                    to={PageUrls.DashboardPage}
                    className="flex items-center gap-2 text-primary font-semibold text-xs transition-colors"
                  >
                    <HomeOutlined className="text-[10px]" /> <span>{PageNames.MY_FILES}</span>
                  </Link>
                ),
              },
              { title: <span className="text-label-secondary font-medium text-xs">{PageNames.TRASH}</span> },
            ]}
          />
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
              danger
              type="primary"
              icon={<RestOutlined />}
              onClick={handleEmptyTrash}
              disabled={folders.length === 0 && files.length === 0}
              loading={isEmptying}
              className="rounded-xl h-10 shadow-lg font-bold hover:scale-[1.02] transition-transform active:scale-95"
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
              icon={<UndoOutlined />}
              onClick={handleBulkRestore}
              loading={isRestoring}
              className="rounded-xl font-bold flex flex-col items-center gap-0.5 h-12 w-16 text-primary hover:bg-primary-light border-none justify-center"
            >
              <span className="text-[10px] uppercase tracking-tighter">Restore</span>
            </Button>
            <Button
              type="text"
              danger
              icon={<DeleteOutlined />}
              onClick={handleBulkDelete}
              loading={isDeleting}
              className="rounded-xl font-bold flex flex-col items-center gap-0.5 h-12 w-16 text-danger hover:bg-danger-light border-none justify-center"
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
            className="w-24 h-24 rounded-full bg-danger-light flex items-center justify-center mb-6 shadow-inner"
          >
            <DeleteOutlined style={{ fontSize: "2.5rem", color: "var(--danger)" }} className="opacity-80" />
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
                <Loader size={24} />
                <span className="text-label-tertiary text-sm">Loading more items...</span>
              </>
            ) : paginationData?.hasNext ? (
              <span className="text-label-tertiary text-sm italic">Scroll for more</span>
            ) : (
              <span className="text-label-tertiary text-sm italic">No more items in trash</span>
            )}
          </div>
        </div>
      )}

      <InfoDrawer item={infoItem} open={!!infoItem} onClose={() => setInfoItem(null)} />
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
