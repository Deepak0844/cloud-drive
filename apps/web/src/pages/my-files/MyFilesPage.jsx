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
  FilterOutlined,
  FolderFilled,
  HomeOutlined,
  PlusOutlined,
  SearchOutlined,
  SendOutlined,
  UploadOutlined,
  WarningOutlined,
} from "@ant-design/icons";
import { App, Breadcrumb, Input, Modal, Spin, Tooltip, Typography, Upload } from "antd";
import { motion } from "framer-motion";
import React, { useCallback, useEffect, useRef, useState } from "react";
import { useSearchParams } from "react-router-dom";

// api
import {
  useCreateFolderMutation,
  useDeleteFolderMutation,
  useGetFolderContentsQuery,
  useGetFolderDetailsQuery,
  useMoveFolderMutation,
  useCopyFolderMutation,
  useRenameFolderMutation,
} from "../../store/api/folderApi";
import {
  useBulkCopyMutation,
  useBulkDeleteMutation,
  useBulkMoveMutation,
  useCopyFileMutation,
  useDeleteFileMutation,
  useMoveFileMutation,
  useRenameFileMutation,
} from "../../store/api/fileApi";

// constants
import { STORAGE } from "@shared-constants/constants";
import PageNames from "@/constants/pageNames";

// components
import FileItem from "@/components/files/FileItem";
import FolderItem from "@/components/files/FolderItem";
import InfoDrawer from "@/components/files/InfoDrawer";
import FilePreviewModal from "@/components/files/FilePreviewModal";
import FolderPickerModal from "@/components/files/FolderPickerModal";
import QuotaRequestModal from "@/components/settings/QuotaRequestModal";
import Button from "@shared-components/components/button";
import Dropdown from "@shared-components/components/dropdown";
import AdvancedFilterDropdown from "@/components/search/AdvancedFilterDropdown";
import { useUploadDetails } from "@/contexts/UploadContext";
import useDebounce from "@/hooks/useDebounce";

const { Text } = Typography;

const { Dragger } = Upload;

function MyFilesView() {
  const { message } = App.useApp();
  const [searchParams, setSearchParams] = useSearchParams();
  const currentFolderId = searchParams.get("folder") || "root";

  const setCurrentFolderId = (id) => {
    if (id === "root" || !id) {
      searchParams.delete("folder");
      setSearchParams(searchParams);
    } else {
      setSearchParams({ folder: id });
    }
  };

  const [selectedItems, setSelectedItems] = useState([]);
  const [isDragging, setIsDragging] = useState(false);
  const [viewMode, setViewMode] = useState("grid"); // 'grid' | 'list'
  const [quotaModalVisible, setQuotaModalVisible] = useState(false);
  const [quotaRequestModalVisible, setQuotaRequestModalVisible] = useState(false);
  const [infoItem, setInfoItem] = useState(null);
  const [renameItem, setRenameItem] = useState(null);
  const [deleteItem, setDeleteItem] = useState(null);
  const [previewFile, setPreviewFile] = useState(null);
  const [newName, setNewName] = useState("");

  const [searchTerm, setSearchTerm] = useState("");
  const debouncedSearch = useDebounce(searchTerm, 500);
  const [advancedFilters, setAdvancedFilters] = useState({});
  const [sortBy, setSortBy] = useState("updatedAt");
  const [sortOrder, setSortOrder] = useState("desc");

  // Folder Picker State
  const [folderPicker, setFolderPicker] = useState({
    visible: false,
    action: "move", // 'move' | 'copy' | 'bulk-move' | 'bulk-copy'
    item: null, // individual item for move/copy
    items: [], // selection for bulk move/copy
  });

  // API Queries
  const { data: contentsData, isLoading: isContentsLoading } = useGetFolderContentsQuery({
    folderId: currentFolderId,
    search: debouncedSearch,
    sortBy: sortBy,
    sortOrder: sortOrder,
    ...advancedFilters,
  });

  const { data: detailsData } = useGetFolderDetailsQuery(
    { id: currentFolderId },
    {
      skip: currentFolderId === "root" || !!debouncedSearch, // Skip details if searching (global search)
    }
  );

  // API Mutations
  const { addUpload } = useUploadDetails();
  const [createFolder] = useCreateFolderMutation();
  const [renameFile] = useRenameFileMutation();
  const [renameFolder] = useRenameFolderMutation();
  const [deleteFile] = useDeleteFileMutation();
  const [deleteFolder] = useDeleteFolderMutation();
  const [moveFile, { isLoading: moveFileLoading }] = useMoveFileMutation();
  const [copyFile, { isLoading: copyFileLoading }] = useCopyFileMutation();
  const [moveFolder, { isLoading: moveFolderLoading }] = useMoveFolderMutation();
  const [copyFolder, { isLoading: copyFolderLoading }] = useCopyFolderMutation();
  const [bulkDelete] = useBulkDeleteMutation();
  const [bulkMove, { isLoading: bulkMoveLoading }] = useBulkMoveMutation();
  const [bulkCopy, { isLoading: bulkCopyLoading }] = useBulkCopyMutation();

  const folders = contentsData?.data?.folders || [];
  const files = contentsData?.data?.files || [];
  const breadcrumbs = currentFolderId === "root" ? [] : detailsData?.data?.breadcrumbs || [];

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
      // Don't clear if clicking an item, the search bar, a modal, or the bulk actions bar
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

  function handleBulkMoveTrigger(items) {
    if (!items || items.length === 0) return;
    setFolderPicker({ visible: true, action: "bulk-move", item: null, items });
  }

  function handleBulkCopyTrigger(items) {
    if (!items || items.length === 0) return;
    setFolderPicker({ visible: true, action: "bulk-copy", item: null, items });
  }

  function handleMoveTrigger(item) {
    setFolderPicker({ visible: true, action: "move", item });
  }

  function handleCopyTrigger(item) {
    setFolderPicker({ visible: true, action: "copy", item });
  }

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
    } catch (err) {
      message.error(err.data?.message || `Failed to ${action}`);
    }
  }

  function handleOpen(item) {
    // If it's a folder, navigate into it
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
      // It's a file, inject the virtual path based on current breadcrumbs
      const virtualPath =
        breadcrumbs && breadcrumbs.length > 0 ? `My Files / ${breadcrumbs.map((b) => b.name).join(" / ")}` : "My Files";
      setInfoItem({ ...item, virtualPath });
    }
  }

  function handleRenameTrigger(item) {
    setRenameItem(item);
    setNewName(item.name);
  }

  async function handleRenameConfirm() {
    if (!renameItem || !newName.trim()) return;

    try {
      const id = renameItem._id || renameItem.id;
      const isFolder = "itemCount" in renameItem;

      if (isFolder) {
        await renameFolder({ id, name: newName }).unwrap();
      } else {
        await renameFile({ id, name: newName }).unwrap();
      }

      message.success(`Renamed successfully`);
      setRenameItem(null);
    } catch (err) {
      message.error(err.data?.message || "Failed to rename");
    }
  }

  function handleDeleteTrigger(item) {
    setDeleteItem(item);
  }

  async function handleDeleteConfirm() {
    if (!deleteItem) return;

    try {
      const id = deleteItem._id || deleteItem.id;
      const isFolder = "itemCount" in deleteItem;

      if (isFolder) {
        await deleteFolder({ id }).unwrap();
      } else {
        await deleteFile({ id }).unwrap();
      }

      message.success(`Deleted ${deleteItem.name}`);
      setDeleteItem(null);
    } catch (err) {
      message.error(err.data?.message || "Failed to delete");
    }
  }

  const uploadRef = useRef(null);
  const dragCounter = useRef(0);

  function handleDragEnter(e) {
    e.preventDefault();
    e.stopPropagation();
    dragCounter.current += 1;

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

  function handleDrop() {
    // Reset our dragging UI
    setIsDragging(false);
    dragCounter.current = 0;
    // We explicitly DO NOT call handleFileUpload(e.dataTransfer.files) here
    // because Ant Design Dragger natively intercepts drops and converts
    // them into beforeUpload invocations for each file automatically. calling
    // our upload iteration here would double-trigger the entire sequence.
  }

  function handleUploadClick() {
    if (uploadRef.current) {
      const uploadInput = uploadRef.current.querySelector('input[type="file"]');
      if (uploadInput) uploadInput.click();
    }
  }

  function handleCreateFolder() {
    Modal.confirm({
      title: "New Folder",
      content: (
        <Input
          id="new-folder-name"
          placeholder="Folder name"
          className="rounded-xl h-10 mt-2"
          onPressEnter={() => {}}
        />
      ),
      onOk: async () => {
        const input = document.getElementById("new-folder-name");
        const name = input?.value?.trim();
        if (!name) return;

        try {
          await createFolder({
            name,
            parent: currentFolderId === "root" ? null : currentFolderId,
          }).unwrap();
          message.success("Folder created");
        } catch (err) {
          message.error(err.data?.message || "Failed to create folder");
        }
      },
      className: "premium-modal",
      centered: true,
      okText: "Create",
    });
  }

  const uploadProps = {
    name: "file",
    multiple: true,
    showUploadList: false,
    beforeUpload: (file) => {
      // By returning false, we completely disable Antd's default XHR POST
      // and natively pipe the individual file directly into our Custom Upload Context
      addUpload(file, currentFolderId === "root" ? null : currentFolderId);
      return false;
    },
    openFileDialogOnClick: false,
    onDragEnter: handleDragEnter,
    onDragLeave: handleDragLeave,
    onDrop: handleDrop,
  };

  const breadcrumbsList = [
    {
      title: (
        <span
          onClick={() => setCurrentFolderId("root")}
          onKeyDown={(e) => e.key === "Enter" && setCurrentFolderId("root")}
          role="button"
          tabIndex={0}
          className="flex items-center gap-2 text-primary font-semibold text-xs cursor-pointer"
        >
          <HomeOutlined className="text-[10px]" /> <span>{PageNames.MY_FILES}</span>
        </span>
      ),
    },
    ...breadcrumbs.map((bc) => ({
      title: (
        <span
          onClick={() => setCurrentFolderId(bc.id)}
          onKeyDown={(e) => e.key === "Enter" && setCurrentFolderId(bc.id)}
          role="button"
          tabIndex={0}
          className="flex items-center gap-2 text-label font-medium text-xs cursor-pointer hover:text-primary transition-colors"
        >
          <span>{bc.name}</span>
        </span>
      ),
    })),
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
              id="search-input"
              name="search"
              placeholder="Search in My Files..."
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

          <div className="bg-surface-alt p-1 rounded-xl flex items-center gap-1">
            <Dropdown
              menu={{
                items: [
                  { key: "updatedAt-desc", label: "Newest First" },
                  { key: "updatedAt-asc", label: "Oldest First" },
                  { key: "name-asc", label: "Name (A-Z)" },
                  { key: "name-desc", label: "Name (Z-A)" },
                  { key: "size-desc", label: "Largest First" },
                  { key: "size-asc", label: "Smallest First" },
                ],
                onClick: ({ key }) => {
                  const [f, o] = key.split("-");
                  setSortBy(f);
                  setSortOrder(o);
                },
                selectable: true,
                defaultSelectedKeys: [`${sortBy}-${sortOrder}`],
              }}
              trigger={["click"]}
            >
              <Button type="text" className="rounded-lg text-xs font-bold text-label-secondary">
                Sort
              </Button>
            </Dropdown>
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
                else if (key === "folder") handleCreateFolder();
              },
            }}
            placement="bottomRight"
            trigger={["click"]}
          >
            <Button
              type="primary"
              className="rounded-xl h-10 px-4 font-bold shadow-primary text-sm flex items-center gap-2"
            >
              <PlusOutlined />
              <span>New</span>
            </Button>
          </Dropdown>
        </div>
      </div>

      <div className="h-4" />

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

      <div ref={uploadRef}>
        <Dragger {...uploadProps} className="bg-transparent! border-none! cursor-default group relative">
          <div className="space-y-6 text-left">
            {/* Folders Section */}
            {(folders.length > 0 || isContentsLoading) && (
              <div>
                <h2 className="text-[10px] font-black uppercase tracking-[0.2em] text-label-tertiary mb-3 px-1 opacity-80">
                  Folders
                </h2>
                {isContentsLoading ? (
                  <div className="py-10 flex justify-center w-full">
                    <Spin size="large" />
                  </div>
                ) : (
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
                            folder={{ ...folder, id }} // normalize id for the component
                            viewMode={viewMode}
                            isSelected={selectedItems.some((i) => String(i.id) === id)}
                            onToggleSelect={(id) => toggleSelect(String(id), "folder")}
                            onOpen={handleOpen}
                            onShowInfo={handleShowInfo}
                            onRename={handleRenameTrigger}
                            onDelete={handleDeleteTrigger}
                            onMove={handleMoveTrigger}
                            onCopy={handleCopyTrigger}
                          />
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}

            {/* Files Section */}
            {(files.length > 0 || isContentsLoading) && (
              <div>
                <h2 className="text-[10px] font-black uppercase tracking-[0.2em] text-label-tertiary mb-3 px-1 opacity-80">
                  Files
                </h2>
                {isContentsLoading ? (
                  <div className="py-10 flex justify-center w-full">
                    <Spin size="large" />
                  </div>
                ) : (
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
                            file={{ ...file, id }} // normalize id for the component
                            viewMode={viewMode}
                            isSelected={selectedItems.some((i) => String(i.id) === id)}
                            onToggleSelect={(id) => toggleSelect(String(id), "file")}
                            onOpen={handleOpen}
                            onShowInfo={handleShowInfo}
                            onRename={handleRenameTrigger}
                            onDelete={handleDeleteTrigger}
                            onMove={handleMoveTrigger}
                            onCopy={handleCopyTrigger}
                          />
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}

            {/* Empty State */}
            {!isContentsLoading && folders.length === 0 && files.length === 0 && (
              <div className="py-20 flex flex-col items-center justify-center text-center w-full opacity-60">
                <div className="w-24 h-24 mb-6 rounded-full bg-surface-dim flex items-center justify-center border-4 border-dashed border-line">
                  <FolderFilled className="text-4xl text-label-tertiary" />
                </div>
                <Text className="text-xl font-bold text-label mb-2">This folder is empty</Text>
                <Text className="text-label-secondary block max-w-sm">
                  Drag and drop files here to upload, or use the &quot;New&quot; button to create folders and add files.
                </Text>
              </div>
            )}
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
        loading={
          bulkMoveLoading ||
          bulkCopyLoading ||
          moveFolderLoading ||
          moveFileLoading ||
          copyFolderLoading ||
          copyFileLoading
        }
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
