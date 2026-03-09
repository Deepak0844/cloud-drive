// React core & third-party libraries
import React, { useState } from "react";
import { Breadcrumb, List, Modal, Typography } from "antd";
import { ArrowLeftOutlined, FolderFilled, FolderOpenFilled, HomeFilled } from "@ant-design/icons";

// Services (RTK Query hooks)
import { useGetFoldersQuery } from "@services/api/folderApi";

// Components
import Button from "@shared-components/components/button";
import Loader from "@shared-components/components/loader";

const { Text } = Typography;

/**
 * A modal that allows users to browse their folder structure and select a target folder.
 */
function FolderPickerModal({
  open,
  onClose,
  onConfirm,
  title = "Select Folder",
  confirmText = "Move Here",
  loading = false,
  excludeIds = [], // IDs to exclude (e.g., current folder or items being moved to prevent circular moves)
  currentParentId = null, // The current parent of the item(s) to prevent moving to same place
}) {
  // Local state
  // Navigation history to avoid calling folder details API
  const [history, setHistory] = useState([{ id: "root", name: "My Files" }]);

  // Derived / computed variables
  const currentFolder = history[history.length - 1];
  const currentFolderId = currentFolder.id;

  // RTK Query hooks
  // Fetch only folders in the current directory (optimized)
  const { data: foldersData, isLoading: isFoldersLoading } = useGetFoldersQuery(
    {
      parentId: currentFolderId === "root" ? null : currentFolderId,
    },
    { skip: !open }
  );

  // Derived / computed variables
  const folders = foldersData?.data || [];
  // Filter out excluded IDs
  const visibleFolders = folders.filter((f) => !excludeIds.includes(String(f._id || f.id)));

  // Event handlers
  function handleNavigate(id, name) {
    if (id === "root") {
      setHistory([{ id: "root", name: "My Files" }]);
    } else {
      setHistory((prev) => [...prev, { id, name }]);
    }
  }

  function handleBreadcrumbClick(index) {
    setHistory((prev) => prev.slice(0, index + 1));
  }

  function handleBack() {
    if (history.length <= 1) return;
    setHistory((prev) => prev.slice(0, -1));
  }

  function handleConfirm() {
    onConfirm(currentFolderId === "root" ? "root" : currentFolderId);
  }

  // Derived / computed variables
  const isSameFolder =
    (currentFolderId === "root" && (currentParentId === null || currentParentId === "root")) ||
    currentFolderId === currentParentId;

  // Render
  return (
    <Modal
      title={title}
      open={open}
      onCancel={onClose}
      footer={[
        <Button key="cancel" type="text" onClick={onClose} className="rounded-xl font-bold">
          Cancel
        </Button>,
        <Button
          key="confirm"
          type="primary"
          onClick={handleConfirm}
          loading={loading}
          disabled={isSameFolder}
          className="rounded-xl px-6 font-bold shadow-primary"
        >
          {isSameFolder ? "Already Here" : confirmText}
        </Button>,
      ]}
      className="premium-modal"
      centered
      width={480}
    >
      <div className="flex flex-col gap-4 py-2 min-h-[350px]">
        {/* Navigation / Breadcrumbs */}
        <div className="flex items-center gap-3 bg-surface-alt p-3 rounded-2xl border border-line">
          <Button
            type="text"
            icon={<ArrowLeftOutlined />}
            onClick={handleBack}
            disabled={currentFolderId === "root"}
            className="shrink-0 flex items-center justify-center w-8 h-8 rounded-lg"
          />
          <div className="flex-1 overflow-hidden">
            <Breadcrumb
              separator={<span className="text-label-tertiary">/</span>}
              items={history.map((item, index) => ({
                title: (
                  <span
                    className="cursor-pointer hover:text-primary transition-colors flex items-center gap-1"
                    onClick={() => handleBreadcrumbClick(index)}
                    onKeyDown={(e) => (e.key === "Enter" || e.key === " ") && handleBreadcrumbClick(index)}
                    role="button"
                    tabIndex={0}
                  >
                    {index === 0 && <HomeFilled className="text-[10px]" />}
                    <span
                      className={`text-xs ${index === history.length - 1 ? "font-bold text-primary" : "font-medium"}`}
                    >
                      {item.name}
                    </span>
                  </span>
                ),
              }))}
            />
          </div>
        </div>

        {/* Folder List */}
        <div className="flex-1 overflow-y-auto pr-1">
          {isFoldersLoading ? (
            <div className="py-20 flex justify-center w-full">
              <Loader size={32} />
            </div>
          ) : visibleFolders.length === 0 ? (
            <div className="py-20 flex flex-col items-center justify-center text-center opacity-60">
              <FolderOpenFilled className="text-4xl text-label-tertiary mb-3" />
              <Text className="text-sm font-bold text-label">No subfolders found</Text>
            </div>
          ) : (
            <List
              dataSource={visibleFolders}
              renderItem={(folder) => (
                <List.Item
                  className="px-3 py-3 rounded-xl hover:bg-surface-alt cursor-pointer transition-colors group border-none mb-1"
                  onClick={() => handleNavigate(String(folder._id || folder.id), folder.name)}
                >
                  <div className="flex items-center gap-3 w-full">
                    <div className="w-10 h-10 rounded-lg bg-primary-light text-primary flex items-center justify-center text-lg shrink-0 group-hover:scale-105 transition-transform">
                      <FolderFilled />
                    </div>
                    <div className="flex-1 min-w-0">
                      <Text strong className="block truncate text-sm">
                        {folder.name}
                      </Text>
                      <Text type="secondary" className="text-[11px]">
                        {folder.itemCount || 0} items
                      </Text>
                    </div>
                  </div>
                </List.Item>
              )}
            />
          )}
        </div>

        <div className="bg-primary/5 p-3 rounded-xl border border-primary/10">
          <Text className="text-[11px] text-primary font-medium flex items-center gap-2">
            <span className="w-1.5 h-1.5 rounded-full bg-primary" />
            Selection: {currentFolder.name}
          </Text>
        </div>
      </div>
    </Modal>
  );
}

export default FolderPickerModal;
