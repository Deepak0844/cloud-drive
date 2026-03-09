// React core & third-party libraries
import React, { useEffect, useState } from "react";
import { Input, Modal, Tooltip, Typography, Upload } from "antd";
import {
  CloudServerOutlined,
  CopyOutlined,
  DeleteOutlined,
  DownloadOutlined,
  DragOutlined,
  FolderOpenOutlined,
  SendOutlined,
  WarningOutlined,
} from "@ant-design/icons";
import { motion } from "framer-motion";

// Services (RTK Query hooks)
import { useGetFolderContentsQuery, useGetFolderDetailsQuery } from "@services/api/folderApi";

// Constants
import { QUERY_PARAMS_KEYS, STORAGE } from "@shared-constants/constants";
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

const { Text } = Typography;
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

  const sortBy = searchParams.get(QUERY_PARAMS_KEYS.SORT_BY) || "updatedAt";
  const sortOrder = searchParams.get(QUERY_PARAMS_KEYS.SORT_ORDER) || "desc";

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
    handleBulkDownload,
    isActionLoading,
    bulkDownloadLoading,
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
        icon={<FolderOpenOutlined className="text-primary opacity-80" />}
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
            <Tooltip title="Download selection (files only)">
              <Button
                type="text"
                icon={<DownloadOutlined />}
                loading={bulkDownloadLoading}
                onClick={() => handleBulkDownload(selectedItems)}
                className="rounded-xl font-bold flex flex-col items-center gap-0.5 h-12 w-14 text-primary hover:bg-primary-light border-none justify-center"
              >
                <span className="text-[10px] uppercase tracking-tighter">Download</span>
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
            isDragging={isDragging}
          />
        </Dragger>

        <Modal
          open={quotaModalVisible}
          onCancel={() => setQuotaModalVisible(false)}
          footer={null}
          centered
          width={420}
          className="premium-modal"
        >
          <div className="py-6 px-2 flex flex-col items-center text-center gap-6">
            <div className="w-20 h-20 bg-warning-light text-warning rounded-3xl flex items-center justify-center">
              <WarningOutlined className="text-4xl" />
            </div>

            <div className="space-y-2">
              <h2 className="text-2xl font-black text-primary tracking-tight">Storage Limit Reached</h2>
              <p className="text-label-secondary text-base pr-4 pl-4">
                You&apos;ve used all of your available {STORAGE.TOTAL_QUOTA_GB} GB. Request an increase to keep saving
                your files.
              </p>
            </div>

            <div className="w-full bg-surface-dim p-4 rounded-2xl border border-line flex items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-primary/10 text-primary rounded-xl flex items-center justify-center">
                  <CloudServerOutlined />
                </div>
                <div className="text-left">
                  <p className="text-xs font-bold text-label leading-none">Current Plan</p>
                  <p className="text-[10px] text-label-tertiary mt-1 uppercase tracking-wider">Free NAS Account</p>
                </div>
              </div>
              <span className="text-sm font-black text-primary">
                {STORAGE.TOTAL_QUOTA_GB}.0 GB / {STORAGE.TOTAL_QUOTA_GB}.0 GB
              </span>
            </div>

            <div className="flex flex-col w-full gap-3 px-4">
              <Button
                type="primary"
                size="large"
                icon={<SendOutlined />}
                onClick={handleRequestQuota}
                className="w-full rounded-2xl h-14 font-black shadow-primary text-base"
              >
                Request Quota Increase
              </Button>
              <Button
                type="text"
                onClick={() => setQuotaModalVisible(false)}
                className="w-full rounded-2xl h-12 text-label-tertiary font-bold hover:text-label"
              >
                Later
              </Button>
            </div>
          </div>
        </Modal>
      </div>

      <InfoDrawer item={infoItem} open={!!infoItem} onClose={() => setInfoItem(null)} />
      <FilePreviewModal file={previewFile} open={!!previewFile} onClose={() => setPreviewFile(null)} />
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
      <Modal
        title="Rename Item"
        open={!!renameItem}
        onOk={handleRenameConfirm}
        onCancel={() => setRenameItem(null)}
        okText="Rename"
        centered
        className="premium-modal"
      >
        <div className="py-4">
          <Text type="secondary" className="block mb-2 text-xs font-bold uppercase tracking-wider">
            New Name
          </Text>
          <Input
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            className="rounded-xl h-12"
            onPressEnter={handleRenameConfirm}
          />
        </div>
      </Modal>

      {/* Delete Modal */}
      <Modal
        title="Delete Item"
        open={!!deleteItem}
        onOk={handleDeleteConfirm}
        onCancel={() => setDeleteItem(null)}
        okText="Delete"
        okButtonProps={{ danger: true }}
        centered
        className="premium-modal"
      >
        <div className="py-2 flex flex-col items-center text-center gap-4">
          <div className="w-16 h-16 bg-danger-light text-danger rounded-full flex items-center justify-center text-2xl">
            <DeleteOutlined />
          </div>
          <p className="text-base text-label-secondary font-medium">
            Are you sure you want to delete <span className="text-label font-bold">&quot;{deleteItem?.name}&quot;</span>
            ?
          </p>
        </div>
      </Modal>
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
