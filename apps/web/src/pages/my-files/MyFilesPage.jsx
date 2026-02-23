// external
import {
  AppstoreOutlined,
  BarsOutlined,
  CloseOutlined,
  CloudServerOutlined,
  CloudUploadOutlined,
  CopyOutlined,
  DeleteOutlined,
  DragOutlined,
  HomeOutlined,
  PlusOutlined,
  SearchOutlined,
  SendOutlined,
  UploadOutlined,
  WarningOutlined,
} from "@ant-design/icons";
import { App, Breadcrumb, Input, Modal, Typography, Upload } from "antd";
import { motion } from "framer-motion";
import React, { useCallback, useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";

// constants
import { MOCK_DATA, STORAGE } from "@shared-constants/constants";
import PageNames from "@/constants/pageNames";

// components
import FileItem from "@/components/files/FileItem";
import FolderItem from "@/components/files/FolderItem";
import InfoDrawer from "@/components/files/InfoDrawer";
import QuotaRequestModal from "@/components/settings/QuotaRequestModal";
import Button from "@shared-components/components/button";
import Dropdown from "@shared-components/components/dropdown";

const { Text } = Typography;

const { Dragger } = Upload;

function MyFilesView() {
  const { message } = App.useApp();
  const [selectedItems, setSelectedItems] = useState([]);
  const [isDragging, setIsDragging] = useState(false);
  const [viewMode, setViewMode] = useState("grid"); // 'grid' | 'list'
  const [quotaModalVisible, setQuotaModalVisible] = useState(false);
  const [quotaRequestModalVisible, setQuotaRequestModalVisible] = useState(false);
  const [infoItem, setInfoItem] = useState(null);
  const [renameItem, setRenameItem] = useState(null);
  const [deleteItem, setDeleteItem] = useState(null);
  const [newName, setNewName] = useState("");

  // Mock data
  const folders = MOCK_DATA.FOLDERS;
  const files = MOCK_DATA.FILES;

  function toggleSelect(id) {
    setSelectedItems((prev) => (prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]));
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

    function handleOpenQuota() {
      setQuotaModalVisible(true);
    }
    window.addEventListener("openQuotaModal", handleOpenQuota);

    return () => {
      document.removeEventListener("click", handleClickOutside);
      window.removeEventListener("openQuotaModal", handleOpenQuota);
    };
  }, [handleClickOutside]);

  function handleRequestQuota() {
    setQuotaModalVisible(false);
    setQuotaRequestModalVisible(true);
  }

  function handleBulkDelete() {
    message.success(`Moving ${selectedItems.length} items to Trash`);
    clearSelection();
  }

  function handleOpen(item) {
    message.info(`Opening ${item.name}`);
  }

  function handleRenameTrigger(item) {
    setRenameItem(item);
    setNewName(item.name);
  }

  function handleRenameConfirm() {
    if (!renameItem || !newName.trim()) return;
    message.success(`Renamed "${renameItem.name}" to "${newName}"`);
    setRenameItem(null);
  }

  function handleDeleteTrigger(item) {
    setDeleteItem(item);
  }

  function handleDeleteConfirm() {
    if (!deleteItem) return;
    message.success(`Deleted ${deleteItem.name}`);
    setDeleteItem(null);
  }

  const uploadRef = useRef(null);
  const dragCounter = useRef(0);

  function handleDragEnter(e) {
    e.preventDefault();
    e.stopPropagation();
    dragCounter.current += 1;

    // Check if the dragged item is actually a file
    const isFile = e.dataTransfer.types && Array.from(e.dataTransfer.types).includes("Files");
    if (isFile) {
      setIsDragging(true);
    }
  }

  function handleDragLeave(e) {
    e.preventDefault();
    e.stopPropagation();
    dragCounter.current -= 1;
    if (dragCounter.current === 0) {
      setIsDragging(false);
    }
  }

  function handleDrop(e) {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    dragCounter.current = 0;
  }

  function handleUploadClick() {
    if (uploadRef.current) {
      const uploadInput = uploadRef.current.querySelector('input[type="file"]');
      if (uploadInput) uploadInput.click();
    }
  }

  const uploadProps = {
    name: "file",
    multiple: true,
    action: "https://www.mocky.io/v2/5cc8019d300000980a055e76",
    showUploadList: false,
    onChange(info) {
      const { status } = info.file;
      if (status === "done") {
        message.success(`${info.file.name} file uploaded successfully.`);
      } else if (status === "error") {
        message.error(`${info.file.name} file upload failed.`);
      }
    },
    openFileDialogOnClick: false,
    onDragEnter: handleDragEnter,
    onDragLeave: handleDragLeave,
    onDrop: handleDrop,
  };

  return (
    <div className="flex flex-col gap-4 pb-10">
      {/* Header Section */}
      <div className="flex flex-row justify-between items-center gap-4 px-1">
        <div className="shrink-0">
          <Breadcrumb
            separator={<span className="text-label-tertiary">/</span>}
            items={[
              {
                title: (
                  <Link to="/" className="flex items-center gap-2 text-primary font-semibold text-xs">
                    <HomeOutlined className="text-[10px]" /> <span>{PageNames.MY_FILES}</span>
                  </Link>
                ),
              },
            ]}
          />
        </div>

        <div className="flex gap-2 grow justify-end items-center">
          <div className="w-48 flex-none">
            <Input
              id="search-input"
              name="search"
              placeholder="Search..."
              prefix={<SearchOutlined className="text-primary text-sm" />}
              className="h-9 rounded-xl border-line bg-surface shadow-sm focus:shadow-md transition-all text-sm w-full"
            />
          </div>

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

          <Dropdown
            menu={{
              items: [
                { key: "upload", label: "Upload File", icon: <UploadOutlined /> },
                { key: "folder", label: "New Folder", icon: <PlusOutlined /> },
              ],
              onClick: ({ key }) => {
                if (key === "upload") handleUploadClick();
                else message.info("Creating new folder...");
              },
            }}
            placement="bottomRight"
            trigger={["click"]}
          >
            <Button
              type="primary"
              className="rounded-xl h-9 px-4 font-bold shadow-primary text-sm flex items-center gap-2"
            >
              <PlusOutlined />
              <span>New</span>
            </Button>
          </Dropdown>
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
              className="hover:rotate-90 transition-transform flex items-center justify-center w-6 h-6"
            />
            <span className="text-base font-bold tracking-tight">{selectedItems.length} items</span>
          </div>

          <div className="flex gap-1.5">
            <Button
              size="small"
              icon={<DragOutlined />}
              className="rounded-lg font-bold border-none h-8 hover:scale-105 transition-all text-primary bg-white text-xs px-3"
            >
              Move
            </Button>
            <Button
              size="small"
              icon={<CopyOutlined />}
              className="rounded-lg font-bold border-none h-8 hover:scale-105 transition-all text-primary bg-white text-xs px-3"
            >
              Copy
            </Button>
            <Button
              size="small"
              danger
              type="primary"
              icon={<DeleteOutlined />}
              onClick={handleBulkDelete}
              className="rounded-lg font-bold h-8 border-none shadow-lg hover:scale-105 transition-all text-xs px-3 ml-1"
            >
              Delete
            </Button>
          </div>
        </div>
      )}

      <div ref={uploadRef}>
        <Dragger {...uploadProps} className="bg-transparent! border-none! cursor-default group relative">
          <div className="space-y-6 text-left">
            {/* Folders Section */}
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
                {folders.map((folder) => (
                  <div key={folder.id}>
                    <FolderItem
                      folder={folder}
                      viewMode={viewMode}
                      isSelected={selectedItems.includes(folder.id)}
                      onToggleSelect={toggleSelect}
                      onOpen={handleOpen}
                      onShowInfo={setInfoItem}
                      onRename={handleRenameTrigger}
                      onDelete={handleDeleteTrigger}
                    />
                  </div>
                ))}
              </div>
            </div>

            {/* Files Section */}
            <div>
              <h2 className="text-[10px] font-black uppercase tracking-[0.2em] text-label-tertiary mb-3 px-1 opacity-80">
                Recent Files
              </h2>
              <div
                className={
                  viewMode === "grid"
                    ? "grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4"
                    : "flex flex-col gap-2"
                }
              >
                {files.map((file) => (
                  <div key={file.id}>
                    <FileItem
                      file={file}
                      viewMode={viewMode}
                      isSelected={selectedItems.includes(file.id)}
                      onToggleSelect={toggleSelect}
                      onOpen={handleOpen}
                      onShowInfo={setInfoItem}
                      onRename={handleRenameTrigger}
                      onDelete={handleDeleteTrigger}
                    />
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Premium Drop Hint Overlay */}
          <div
            className={`pointer-events-none absolute inset-0 z-40 transition-all duration-300 backdrop-blur-md bg-white/40 flex items-center justify-center p-8 rounded-2xl overflow-hidden ${isDragging ? "opacity-100" : "opacity-0 invisible"}`}
          >
            <div
              className={`relative w-full max-w-md bg-white/90 backdrop-blur-xl p-10 rounded-3xl shadow-[0_20px_50px_rgba(0,0,0,0.1)] border border-white/50 flex flex-col items-center gap-6 transition-all duration-300 ${isDragging ? "scale-100" : "scale-95"}`}
            >
              <div className="w-24 h-24 bg-primary/10 rounded-full flex items-center justify-center mb-2">
                <CloudUploadOutlined className="text-6xl text-primary" />
              </div>
              <div className="text-center space-y-2">
                <h3 className="text-2xl font-black text-label tracking-tight">Ready to Upload</h3>
                <p className="text-label-secondary font-medium px-4">
                  Drop your files here to instantly add them to your NAS storage
                </p>
              </div>
            </div>
          </div>
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
      <QuotaRequestModal open={quotaRequestModalVisible} onClose={() => setQuotaRequestModalVisible(false)} />

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
