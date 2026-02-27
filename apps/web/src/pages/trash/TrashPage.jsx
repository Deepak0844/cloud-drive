import {
  AppstoreOutlined,
  BarsOutlined,
  CloseOutlined,
  DeleteOutlined,
  HomeOutlined,
  RestOutlined,
  UndoOutlined,
} from "@ant-design/icons";
import { App, Breadcrumb, Spin } from "antd";
import { motion } from "framer-motion";
import React, { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";

// api
import {
  useEmptyTrashMutation,
  useGetTrashItemsQuery,
  usePermanentlyDeleteItemsMutation,
  useRestoreItemsMutation,
} from "@/store/api/trashApi";

// constants
import PageNames from "@/constants/pageNames";
import PageUrls from "@/constants/pageUrls";

// components
import FileItem from "@/components/files/FileItem";
import FolderItem from "@/components/files/FolderItem";
import InfoDrawer from "@/components/files/InfoDrawer";
import Button from "@shared-components/components/button";

function TrashView() {
  const { message, modal } = App.useApp();

  const [selectedItems, setSelectedItems] = useState([]);
  const [viewMode, setViewMode] = useState("grid"); // 'grid' | 'list'
  const [infoItem, setInfoItem] = useState(null);

  // API Queries
  const { data: trashData, isLoading } = useGetTrashItemsQuery();

  // API Mutations
  const [emptyTrash, { isLoading: isEmptying }] = useEmptyTrashMutation();
  const [restoreItems, { isLoading: isRestoring }] = useRestoreItemsMutation();
  const [permanentlyDeleteItems, { isLoading: isDeleting }] = usePermanentlyDeleteItemsMutation();

  const folders = trashData?.data?.folders || [];
  const files = trashData?.data?.files || [];

  function toggleSelect(id, type) {
    setSelectedItems((prev) => {
      const exists = prev.find((item) => item.id === id);
      if (exists) {
        return prev.filter((item) => item.id !== id);
      }
      return [...prev, { id, type }];
    });
  }

  const clearSelection = useCallback(() => setSelectedItems([]), []);

  const handleClickOutside = useCallback(
    (e) => {
      if (e.target.closest(".animate-item") || e.target.closest(".glass-bar") || e.target.closest(".ant-modal-root"))
        return;
      clearSelection();
    },
    [clearSelection]
  );

  useEffect(() => {
    document.addEventListener("click", handleClickOutside);
    return () => {
      document.removeEventListener("click", handleClickOutside);
    };
  }, [handleClickOutside]);

  const handleEmptyTrash = () => {
    modal.confirm({
      title: "Empty Trash",
      icon: <RestOutlined className="text-danger" />,
      content: "Are you sure you want to permanently delete all items in the trash? This action cannot be undone.",
      okText: "Empty Trash",
      okType: "danger",
      cancelText: "Cancel",
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
  };

  const handleBulkRestore = async () => {
    if (selectedItems.length === 0) return;
    try {
      await restoreItems(selectedItems).unwrap();
      message.success(`Restored ${selectedItems.length} items`);
      clearSelection();
    } catch (_error) {
      message.error("Failed to restore items");
    }
  };

  const handleBulkDelete = () => {
    if (selectedItems.length === 0) return;
    modal.confirm({
      title: "Delete Forever",
      icon: <DeleteOutlined className="text-danger" />,
      content: `Are you sure you want to permanently delete these ${selectedItems.length} items? This action cannot be undone.`,
      okText: "Delete",
      okType: "danger",
      cancelText: "Cancel",
      onOk: async () => {
        try {
          await permanentlyDeleteItems(selectedItems).unwrap();
          message.success(`Permanently deleted ${selectedItems.length} items`);
          clearSelection();
        } catch (_error) {
          message.error("Failed to delete items");
        }
      },
    });
  };

  const isSelected = (id) => selectedItems.some((item) => item.id === id);

  return (
    <div className="flex flex-col gap-6 pb-10">
      <div className="flex justify-between items-end px-1">
        <div>
          <h1 className="text-2xl font-bold text-label mb-2">{PageNames.TRASH}</h1>
          <Breadcrumb
            items={[
              {
                title: (
                  <Link to={PageUrls.DashboardPage}>
                    <HomeOutlined /> {PageNames.MY_FILES}
                  </Link>
                ),
              },
              { title: PageNames.TRASH },
            ]}
          />
        </div>

        <div className="flex items-center gap-4">
          <div className="bg-surface-alt p-1 rounded-xl flex items-center gap-1 shrink-0">
            <Button
              type={viewMode === "grid" ? "default" : "text"}
              size="small"
              icon={<AppstoreOutlined />}
              onClick={() => setViewMode("grid")}
              className={`rounded-lg w-8 h-7 flex items-center justify-center border-none ${viewMode === "grid" ? "bg-surface shadow-sm text-primary" : "text-label-secondary hover:bg-surface-alt"}`}
            />
            <Button
              type={viewMode === "list" ? "default" : "text"}
              size="small"
              icon={<BarsOutlined />}
              onClick={() => setViewMode("list")}
              className={`rounded-lg w-8 h-7 flex items-center justify-center border-none ${viewMode === "list" ? "bg-surface shadow-sm text-primary" : "text-label-secondary hover:bg-surface-alt"}`}
            />
          </div>

          <Button
            danger
            type="primary"
            icon={<RestOutlined />}
            onClick={handleEmptyTrash}
            disabled={folders.length === 0 && files.length === 0}
            loading={isEmptying}
            className="rounded-xl h-10 shadow-sm"
          >
            Empty Trash
          </Button>
        </div>
      </div>

      {selectedItems.length > 0 && (
        <div className="glass-bar rounded-xl p-3 flex items-center justify-between shadow-2xl fixed top-20 left-1/2 -translate-x-1/2 z-50 text-white w-full max-w-xl">
          <div className="flex items-center gap-3 ml-1">
            <Button
              ghost
              size="small"
              shape="circle"
              icon={<CloseOutlined className="text-[10px]" />}
              onClick={clearSelection}
              className="hover:rotate-90 transition-transform flex items-center justify-center w-6 h-6 border-white/20 text-white"
            />
            <span className="text-base font-bold tracking-tight">{selectedItems.length} items</span>
          </div>

          <div className="flex gap-1.5">
            <Button
              size="small"
              icon={<UndoOutlined />}
              onClick={handleBulkRestore}
              loading={isRestoring}
              className="rounded-lg font-bold border-none h-8 hover:scale-105 transition-all text-primary bg-white text-xs px-3"
            >
              Restore
            </Button>
            <Button
              size="small"
              danger
              type="primary"
              icon={<DeleteOutlined />}
              onClick={handleBulkDelete}
              loading={isDeleting}
              className="rounded-lg font-bold h-8 border-none shadow-lg hover:scale-105 transition-all text-xs px-3 ml-1 bg-danger hover:bg-danger-hover border-danger"
            >
              Delete Forever
            </Button>
          </div>
        </div>
      )}

      {isLoading ? (
        <div className="py-20 flex justify-center w-full">
          <Spin size="large" />
        </div>
      ) : folders.length === 0 && files.length === 0 ? (
        <div className="bg-surface rounded-3xl border border-line shadow-sm flex flex-col items-center justify-center py-24 px-8 mt-4">
          <motion.div
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ delay: 0.1, type: "spring", stiffness: 200, damping: 16 }}
            className="w-24 h-24 rounded-full bg-danger-light flex items-center justify-center mb-6"
          >
            <DeleteOutlined style={{ fontSize: "2.5rem", color: "var(--danger)" }} />
          </motion.div>
          <h2 className="text-xl font-semibold text-label mb-2">Your trash is empty</h2>
          <p className="text-sm text-label-tertiary text-center max-w-xs leading-relaxed">
            Items you delete will appear here and be permanently removed after 30 days.
          </p>
        </div>
      ) : (
        <div className="space-y-6 text-left mt-2">
          {/* Folders Section */}
          {folders.length > 0 && (
            <div>
              <h2 className="text-[10px] font-black uppercase tracking-[0.2em] text-label-tertiary mb-3 px-1 opacity-80">
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
                    <div key={id} className="opacity-80 grayscale-20">
                      <FolderItem
                        folder={{ ...folder, id }}
                        viewMode={viewMode}
                        isSelected={isSelected(id)}
                        onToggleSelect={(folderId) => toggleSelect(folderId, "folder")}
                        onOpen={() => toggleSelect(id, "folder")} // prevent navigation in trash, just select
                        onShowInfo={setInfoItem}
                        isTrashItem={true} // Add this prop to FolderItem to hide normal menu options
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
                    <div key={id} className="opacity-80 grayscale-20">
                      <FileItem
                        file={{ ...file, id }}
                        viewMode={viewMode}
                        isSelected={isSelected(id)}
                        onToggleSelect={(fileId) => toggleSelect(fileId, "file")}
                        onOpen={() => toggleSelect(id, "file")} // prevent preview in trash, just select
                        onShowInfo={setInfoItem}
                        isTrashItem={true} // Add this prop to FileItem to hide normal menu options
                      />
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      )}

      <InfoDrawer item={infoItem} open={!!infoItem} onClose={() => setInfoItem(null)} />
    </div>
  );
}

export default function TrashPage() {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      transition={{ duration: 0.3 }}
    >
      <TrashView />
    </motion.div>
  );
}
