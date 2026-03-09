// React core & third-party libraries
import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Breadcrumb, Input, Modal, Tooltip, Typography } from "antd";
import {
  CopyOutlined,
  DeleteOutlined,
  DragOutlined,
  HomeOutlined,
  StarFilled,
  WarningOutlined,
} from "@ant-design/icons";
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

const { Text } = Typography;

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
    setDeleteItem,
    setFolderPicker,
    setNewName,
    setRenameItem,
    handleBulkCopyTrigger,
    handleBulkDelete,
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
        icon={<StarFilled className="text-warning opacity-80" />}
        breadcrumbNode={
          <Breadcrumb separator={<span className="text-label-tertiary">/</span>} items={breadcrumbsList} />
        }
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
          </FloatingBulkActionsBar>
        </motion.div>
      )}

      {/* Content Section */}
      <div className="space-y-6">
        {isLoading ? (
          <div className="py-24 flex flex-col items-center justify-center gap-4">
            <Loader size={32} />
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
                      <Loader size={24} />
                      <Text className="text-label-tertiary text-sm">Loading more files...</Text>
                    </>
                  ) : paginationData?.hasNext ? (
                    <Text className="text-label-tertiary text-sm italic">Scroll for more</Text>
                  ) : (
                    <Text className="text-label-tertiary text-sm italic">No more files</Text>
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
