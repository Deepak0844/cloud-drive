import {
  AppstoreOutlined,
  BarsOutlined,
  CloseOutlined,
  CopyOutlined,
  DeleteOutlined,
  DragOutlined,
  FilterOutlined,
  HomeOutlined,
  SearchOutlined,
  StarFilled,
  WarningOutlined,
} from "@ant-design/icons";
import { App, Breadcrumb, Input, Spin, Typography, Tooltip, Modal } from "antd";
import { motion } from "framer-motion";
import React, { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";

// api
import {
  useDeleteFolderMutation,
  useGetFoldersQuery,
  useMoveFolderMutation,
  useCopyFolderMutation,
  useRenameFolderMutation,
} from "@/store/api/folderApi";
import {
  useBulkCopyMutation,
  useBulkDeleteMutation,
  useBulkMoveMutation,
  useCopyFileMutation,
  useDeleteFileMutation,
  useGetFilesQuery,
  useMoveFileMutation,
  useRenameFileMutation,
} from "@/store/api/fileApi";

// constants
import PageNames from "@/constants/pageNames";
import PageUrls from "@/constants/pageUrls";

// components
import FileItem from "@/components/files/FileItem";
import FolderItem from "@/components/files/FolderItem";
import InfoDrawer from "@/components/files/InfoDrawer";
import FilePreviewModal from "@/components/files/FilePreviewModal";
import FolderPickerModal from "@/components/files/FolderPickerModal";
import Button from "@shared-components/components/button";
import AdvancedFilterDropdown from "@/components/search/AdvancedFilterDropdown";
import useDebounce from "@/hooks/useDebounce";

import { useInfiniteScroll } from "@shared-hooks/hooks";

const { Text } = Typography;

function FavoritesPage() {
  const { message } = App.useApp();
  const [page, setPage] = useState(1);
  const [selectedItems, setSelectedItems] = useState([]);
  const [viewMode, setViewMode] = useState("grid");
  const [infoItem, setInfoItem] = useState(null);
  const [renameItem, setRenameItem] = useState(null);
  const [deleteItem, setDeleteItem] = useState(null);
  const [previewFile, setPreviewFile] = useState(null);
  const [newName, setNewName] = useState("");

  const [folderPicker, setFolderPicker] = useState({
    visible: false,
    action: "move",
    item: null,
    items: [],
  });

  const [searchTerm, setSearchTerm] = useState("");
  const debouncedSearch = useDebounce(searchTerm, 500);
  const [advancedFilters, setAdvancedFilters] = useState({});

  // Reset page on filter change
  useEffect(() => {
    setPage(1);
  }, [debouncedSearch, advancedFilters]);

  // Fetch favorite folders (typically folders aren't many, so we fetch all or just use a large limit)
  const { data: foldersData, isLoading: foldersLoading } = useGetFoldersQuery({
    isFavorite: "true",
    search: debouncedSearch || undefined,
    ...advancedFilters,
  });

  // Fetch favorite files with pagination
  const {
    data: filesData,
    isLoading: filesLoading,
    isFetching: filesFetching,
  } = useGetFilesQuery({
    isFavorite: "true",
    search: debouncedSearch || undefined,
    pg: page,
    ps: 40,
    ...advancedFilters,
  });

  const hasNextPage = filesData?.pagination?.hasNext || false;

  const { loaderRef } = useInfiniteScroll({
    hasNext: hasNextPage,
    isLoading: filesFetching,
    onLoadMore: () => setPage((prev) => prev + 1),
  });

  // API Mutations
  const [renameFile] = useRenameFileMutation();
  const [renameFolder] = useRenameFolderMutation();
  const [deleteFile] = useDeleteFileMutation();
  const [deleteFolder] = useDeleteFolderMutation();
  const [moveFile] = useMoveFileMutation();
  const [copyFile] = useCopyFileMutation();
  const [moveFolder] = useMoveFolderMutation();
  const [copyFolder] = useCopyFolderMutation();
  const [bulkDelete] = useBulkDeleteMutation();
  const [bulkMove] = useBulkMoveMutation();
  const [bulkCopy] = useBulkCopyMutation();

  const folders = foldersData?.data || [];
  const files = filesData?.data || [];
  const isLoading = foldersLoading || filesLoading;

  function toggleSelect(id, type) {
    setSelectedItems((prev) => {
      const exists = prev.find((item) => item.id === id);
      if (exists) return prev.filter((item) => item.id !== id);
      return [...prev, { id, type }];
    });
  }

  const clearSelection = useCallback(() => setSelectedItems([]), []);

  const handleClickOutside = useCallback(
    (e) => {
      if (
        e.target.closest(".animate-item") ||
        e.target.closest(".glass-bar") ||
        e.target.closest(".ant-modal-root") ||
        e.target.closest(".ant-modal-wrap") ||
        e.target.closest(".ant-modal-mask") ||
        e.target.closest(".bulk-actions-bar")
      )
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

  const handleRenameTrigger = (item) => {
    setRenameItem(item);
    setNewName(item.name);
  };

  const handleRenameConfirm = async () => {
    if (!newName || newName === renameItem.name) {
      setRenameItem(null);
      return;
    }

    try {
      const id = renameItem.id || renameItem._id;
      const isFolder = "itemCount" in renameItem;
      if (isFolder) await renameFolder({ id, name: newName }).unwrap();
      else await renameFile({ id, name: newName }).unwrap();
      message.success("Renamed successfully");
      setRenameItem(null);
    } catch (_err) {
      message.error(_err.data?.message || "Failed to rename");
    }
  };

  const handleDeleteTrigger = (item) => setDeleteItem(item);

  const handleDeleteConfirm = async () => {
    try {
      const id = deleteItem.id || deleteItem._id;
      const isFolder = "itemCount" in deleteItem;
      if (isFolder) await deleteFolder(id).unwrap();
      else await deleteFile(id).unwrap();
      message.success("Moved to trash");
      setDeleteItem(null);
      clearSelection();
    } catch (_err) {
      message.error("Failed to delete");
    }
  };

  function handleBulkDelete(itemsToDelete) {
    if (!itemsToDelete || itemsToDelete.length === 0) return;
    Modal.confirm({
      title: "Confirm Delete",
      content: `Are you sure you want to move ${itemsToDelete.length} items to the trash?`,
      okText: "Move to Trash",
      okType: "danger",
      onOk: async () => {
        try {
          await bulkDelete({ items: itemsToDelete }).unwrap();
          message.success("Items moved to trash");
          clearSelection();
        } catch {
          message.error("Failed to delete items");
        }
      },
      className: "premium-modal",
      centered: true,
    });
  }

  const handleBulkMoveTrigger = (items) => {
    if (!items || items.length === 0) return;
    setFolderPicker({ visible: true, action: "bulk-move", item: null, items });
  };

  const handleBulkCopyTrigger = (items) => {
    if (!items || items.length === 0) return;
    setFolderPicker({ visible: true, action: "bulk-copy", item: null, items });
  };

  const handleMoveTrigger = (item) => setFolderPicker({ visible: true, action: "move", item, items: [] });
  const handleCopyTrigger = (item) => setFolderPicker({ visible: true, action: "copy", item, items: [] });

  async function handleFolderPickerConfirm(targetFolderId) {
    const { action, item, items } = folderPicker;
    const normalizedTargetId = targetFolderId === "root" ? null : targetFolderId;

    try {
      if (action === "move" || action === "copy") {
        const id = item._id || item.id;
        const isFolder = "itemCount" in item || folders.some((f) => (f._id || f.id) === id);

        if (action === "move") {
          if (isFolder) await moveFolder({ id, parentId: normalizedTargetId }).unwrap();
          else await moveFile({ id, folderId: normalizedTargetId }).unwrap();
          message.success(`${item.name} moved successfully`);
        } else {
          if (isFolder) await copyFolder({ id, parentId: normalizedTargetId }).unwrap();
          else await copyFile({ id, folderId: normalizedTargetId }).unwrap();
          message.success(`${item.name} copied successfully`);
        }
      } else if (action === "bulk-move" || action === "bulk-copy") {
        if (action === "bulk-move") {
          await bulkMove({ items, targetFolderId: normalizedTargetId }).unwrap();
          message.success(`${items.length} items moved successfully`);
        } else {
          await bulkCopy({ items, targetFolderId: normalizedTargetId }).unwrap();
          message.success(`${items.length} items copied successfully`);
        }
        clearSelection();
      }
      setFolderPicker({ ...folderPicker, visible: false });
    } catch (_err) {
      message.error(_err.data?.message || `Failed to ${action}`);
    }
  }

  const handleOpen = (item) => {
    if ("itemCount" in item) {
      window.location.href = `${PageUrls.DashboardPage}?folder=${item.id || item._id}`;
    } else {
      setPreviewFile(item);
    }
  };

  const breadcrumbsList = [
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
    { title: <span className="font-bold text-xs opacity-60">{PageNames.FAVORITES}</span> },
  ];

  return (
    <div className="flex flex-col gap-4 pb-10">
      {/* Header Section */}
      <div className="flex flex-row justify-between items-center gap-4 px-1">
        <div className="shrink-0">
          <Breadcrumb separator={<span className="text-label-tertiary">/</span>} items={breadcrumbsList} />
        </div>

        <div className="flex gap-2 grow justify-end items-center">
          <div className="w-56 flex-none">
            <Input
              placeholder="Search in Favorites..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              prefix={<SearchOutlined className="text-primary text-sm" />}
              suffix={
                <AdvancedFilterDropdown
                  initialFilters={advancedFilters}
                  onFilter={(filters) => setAdvancedFilters(filters)}
                  onClear={() => setAdvancedFilters({})}
                  trigger={
                    <Tooltip title="Advanced Filters">
                      <div className="w-6 h-6 flex items-center justify-center rounded-md hover:bg-surface-alt cursor-pointer transition-all group/filter -mr-1">
                        <FilterOutlined
                          className={`text-xs ${Object.keys(advancedFilters).length > 0 ? "text-primary" : "text-label-tertiary"} group-hover/filter:text-primary`}
                        />
                      </div>
                    </Tooltip>
                  }
                />
              }
              className="h-10 rounded-xl border-line bg-surface shadow-sm focus:shadow-md transition-all text-sm w-full premium-nav-search"
              allowClear
            />
          </div>

          <div className="bg-surface-alt p-1 rounded-xl flex items-center gap-1"></div>

          <div className="bg-surface-alt p-1 rounded-xl flex items-center gap-1">
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
        </div>
      </div>

      <div className="h-4" />

      {/* Bulk Actions Bar */}
      {selectedItems.length > 0 && (
        <motion.div
          initial={{ y: 100, x: "-50%", opacity: 0 }}
          animate={{ y: 0, x: "-50%", opacity: 1 }}
          exit={{ y: 100, x: "-50%", opacity: 0 }}
          className="fixed bottom-10 left-1/2 z-50 pointer-events-auto"
        >
          <div className="bg-surface/90 backdrop-blur-xl rounded-full p-2 flex items-center gap-2 shadow-[0_20px_40px_rgba(0,0,0,0.15)] border border-primary/20 ring-1 ring-white/20 px-6 h-16 min-w-[400px] bulk-actions-bar">
            <div className="flex items-center gap-3 pr-4 border-r border-line">
              <Button
                type="text"
                shape="circle"
                icon={<CloseOutlined className="text-xs" />}
                onClick={clearSelection}
                className="hover:rotate-90 transition-transform flex items-center justify-center w-8 h-8 bg-surface-alt"
              />
              <span className="text-sm font-black text-primary tracking-tight">{selectedItems.length} selected</span>
            </div>

            <div className="flex gap-2 items-center pl-2">
              <Tooltip title="Move selection">
                <Button
                  type="text"
                  icon={<DragOutlined />}
                  onClick={() => handleBulkMoveTrigger(selectedItems)}
                  className="rounded-xl font-bold flex flex-col items-center gap-0.5 h-12 w-14 text-primary hover:bg-primary-light border-none justify-center"
                >
                  <span className="text-[10px] uppercase tracking-tighter">Move</span>
                </Button>
              </Tooltip>
              <Tooltip title="Copy selection">
                <Button
                  type="text"
                  icon={<CopyOutlined />}
                  onClick={() => handleBulkCopyTrigger(selectedItems)}
                  className="rounded-xl font-bold flex flex-col items-center gap-0.5 h-12 w-14 text-primary hover:bg-primary-light border-none justify-center"
                >
                  <span className="text-[10px] uppercase tracking-tighter">Copy</span>
                </Button>
              </Tooltip>
              <Tooltip title="Delete selection">
                <Button
                  type="text"
                  danger
                  icon={<DeleteOutlined />}
                  onClick={() => handleBulkDelete(selectedItems)}
                  className="rounded-xl font-bold flex flex-col items-center gap-0.5 h-12 w-14 text-danger hover:bg-danger-light border-none justify-center"
                >
                  <span className="text-[10px] uppercase tracking-tighter">Delete</span>
                </Button>
              </Tooltip>
            </div>
          </div>
        </motion.div>
      )}

      {/* Content Section */}
      <div className="space-y-6">
        {isLoading ? (
          <div className="py-24 flex flex-col items-center justify-center gap-4">
            <Spin size="large" />
            <Text className="text-label-tertiary">Loading favorites...</Text>
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
                          onToggleSelect={(id) => toggleSelect(id, "folder")}
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
                          onToggleSelect={(id) => toggleSelect(id, "file")}
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
                <div ref={loaderRef} className="py-8 flex flex-col items-center justify-center gap-4">
                  {filesFetching ? (
                    <>
                      <Spin size="medium" />
                      <Text className="text-label-tertiary text-sm">Loading more favorites...</Text>
                    </>
                  ) : hasNextPage ? (
                    <Text className="text-label-tertiary text-sm italic">Scroll for more</Text>
                  ) : (
                    <Text className="text-label-tertiary text-sm italic">No more favorites</Text>
                  )}
                </div>
              </div>
            )}

            {folders.length === 0 && files.length === 0 && (
              <div className="py-24 flex flex-col items-center justify-center text-center opacity-60">
                <div className="w-20 h-20 mb-6 rounded-full bg-surface-dim flex items-center justify-center border-2 border-dashed border-line">
                  <StarFilled className="text-3xl text-label-tertiary" />
                </div>
                <h2 className="text-lg font-bold text-label mb-1">No favorites found</h2>
                <p className="text-label-secondary text-sm">Starred items will appear here for quick access.</p>
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

      <Modal
        title="Rename Item"
        open={!!renameItem}
        onOk={handleRenameConfirm}
        onCancel={() => setRenameItem(null)}
        className="premium-modal"
        centered
      >
        <Input
          value={newName}
          onChange={(e) => setNewName(e.target.value)}
          placeholder="New name..."
          className="premium-input mt-4"
          onKeyDown={(e) => e.key === "Enter" && handleRenameConfirm()}
        />
      </Modal>

      <Modal
        title={
          <span className="text-danger flex items-center gap-2">
            <WarningOutlined /> Delete Item
          </span>
        }
        open={!!deleteItem}
        onOk={handleDeleteConfirm}
        onCancel={() => setDeleteItem(null)}
        okText="Move to Trash"
        okButtonProps={{ danger: true, className: "rounded-lg" }}
        cancelButtonProps={{ className: "rounded-lg" }}
        className="premium-modal"
        centered
      >
        <p className="mt-4 font-medium text-label-secondary">
          Are you sure you want to move <span className="text-label font-bold">&quot;{deleteItem?.name}&quot;</span> to
          the trash?
        </p>
      </Modal>
    </div>
  );
}

export default FavoritesPage;
