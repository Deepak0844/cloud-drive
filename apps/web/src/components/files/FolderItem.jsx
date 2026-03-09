// React core & third-party libraries
import React from "react";
import { Card, Typography } from "antd";
import {
  CheckCircleFilled,
  CopyOutlined,
  DeleteOutlined,
  DoubleRightOutlined,
  DragOutlined,
  EditOutlined,
  FolderFilled,
  InfoCircleOutlined,
  MoreOutlined,
  StarFilled,
  StarOutlined,
} from "@ant-design/icons";
import { motion } from "framer-motion";

// Services (RTK Query hooks)
import { useToggleFolderFavoriteMutation } from "@services/api/folderApi";

// Components
import Dropdown from "@shared-components/components/dropdown";

const { Text } = Typography;

function FolderItem({
  folder,
  isSelected,
  onToggleSelect,
  onOpen,
  onShowInfo,
  onRename,
  onDelete,
  onMove,
  onCopy,
  viewMode = "grid",
  isTrashItem = false,
  showParentContext = false,
}) {
  // RTK Query hooks
  const [toggleFavorite, { isLoading: isFavoriting }] = useToggleFolderFavoriteMutation();

  // Custom & shared hooks
  const clickTimeoutRef = React.useRef(null);

  // Derived / computed variables
  const isFavorite = folder.is_favorite;

  // Event handlers
  function handleClick(e) {
    e.stopPropagation();

    if (clickTimeoutRef.current) {
      clearTimeout(clickTimeoutRef.current);
      clickTimeoutRef.current = null;
      return;
    }

    clickTimeoutRef.current = setTimeout(() => {
      onToggleSelect(folder.id, e.metaKey || e.ctrlKey);
      clickTimeoutRef.current = null;
    }, 250);
  }

  function handleDoubleClick(e) {
    e.stopPropagation();
    if (clickTimeoutRef.current) {
      clearTimeout(clickTimeoutRef.current);
      clickTimeoutRef.current = null;
    }
    onOpen?.(folder);
  }

  const menuItems = isTrashItem
    ? [{ key: "info", label: "Details", icon: <InfoCircleOutlined />, onClick: () => onShowInfo?.(folder) }]
    : [
        { key: "open", label: "Open", icon: <DoubleRightOutlined /> },
        {
          key: "favorite",
          label: isFavorite ? "Remove from Favorites" : "Add to Favorites",
          icon: isFavorite ? <StarFilled className="text-warning" /> : <StarOutlined />,
          onClick: () => toggleFavorite({ id: folder.id }),
          disabled: isFavoriting,
        },
        { key: "info", label: "Details", icon: <InfoCircleOutlined />, onClick: () => onShowInfo?.(folder) },
        { key: "rename", label: "Rename", icon: <EditOutlined />, onClick: () => onRename?.(folder) },
        { key: "move", label: "Move to...", icon: <DragOutlined />, onClick: () => onMove?.(folder) },
        { key: "copy", label: "Copy to...", icon: <CopyOutlined />, onClick: () => onCopy?.(folder) },
        { type: "divider" },
        { key: "delete", label: "Delete", icon: <DeleteOutlined />, danger: true, onClick: () => onDelete?.(folder) },
      ];

  // Render
  if (viewMode === "list") {
    return (
      <div
        className={`group flex items-center gap-4 p-3 rounded-xl transition-colors cursor-pointer border ${
          isSelected
            ? "bg-primary-light border-primary/20"
            : "bg-surface hover:bg-surface-dim border-transparent hover:border-line"
        }`}
        onClick={handleClick}
        onDoubleClick={handleDoubleClick}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") handleClick(e);
        }}
        role="button"
        tabIndex={0}
      >
        <div
          onClick={(e) => {
            e.stopPropagation();
            onToggleSelect(folder.id);
          }}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === " ") {
              e.stopPropagation();
              onToggleSelect(folder.id);
            }
          }}
          role="button"
          tabIndex={0}
        >
          <div
            className={`w-5 h-5 rounded-md border flex items-center justify-center transition-colors ${
              isSelected
                ? "bg-primary border-primary text-on-primary"
                : "border-line-strong bg-surface group-hover:border-primary"
            }`}
          >
            {isSelected && <CheckCircleFilled className="text-xs" />}
          </div>
        </div>

        <div
          className={`w-10 h-10 rounded-xl flex items-center justify-center text-lg transition-all ${
            isSelected ? "bg-primary text-on-primary" : "bg-primary-light text-primary"
          }`}
        >
          <FolderFilled />
        </div>

        <div className="flex-1 min-w-0 flex items-center justify-between">
          <div className="flex flex-col min-w-0">
            <div className="font-medium text-sm text-label truncate">{folder.name}</div>
            {showParentContext && folder.parent?.name && (
              <div className="text-[10px] text-label-tertiary truncate leading-none mt-0.5">
                in <span className="font-bold">{folder.parent.name}</span>
              </div>
            )}
          </div>
          <div className="text-xs text-label-tertiary">{folder.itemCount || 0} items</div>
        </div>

        <div onClick={(e) => e.stopPropagation()} onKeyDown={(e) => e.stopPropagation()} role="button" tabIndex={0}>
          <Dropdown menu={{ items: menuItems }} trigger={["click"]}>
            <MoreOutlined className="text-label-tertiary hover:text-primary cursor-pointer p-2 rounded-full hover:bg-surface-alt transition-colors" />
          </Dropdown>
        </div>
      </div>
    );
  }

  return (
    <motion.div whileHover={{ y: -4 }} className="relative">
      <Card
        hoverable
        className={`border-2 rounded-2xl transition-all duration-200 relative ${
          isSelected
            ? "border-primary bg-primary-light shadow-[0_0_0_2px_rgba(59,130,246,0.2)]"
            : "border-transparent shadow-sm hover:shadow-lg bg-surface"
        }`}
        styles={{ body: { padding: "12px" } }}
        onClick={handleClick}
        onDoubleClick={handleDoubleClick}
      >
        {isSelected && (
          <div className="absolute top-2 right-2 z-20">
            <CheckCircleFilled className="text-primary text-lg bg-surface rounded-full" />
          </div>
        )}

        {isFavorite && !isSelected && (
          <div className="absolute top-2 right-2 z-20">
            <StarFilled className="text-warning text-lg" />
          </div>
        )}

        <div className="absolute top-2 left-2 z-10"></div>

        <div className="flex items-center gap-3">
          <div
            className={`w-10 h-10 rounded-xl flex items-center justify-center text-xl transition-all duration-300 ${
              isSelected ? "bg-primary text-on-primary shadow-primary" : "bg-primary-light text-primary"
            }`}
          >
            <FolderFilled />
          </div>
          <div className="flex-1 min-w-0">
            <Text strong className="block truncate text-[13px]" title={folder.name}>
              {folder.name}
            </Text>
            {showParentContext && folder.parent?.name && (
              <Text className="block truncate text-[10px] text-label-tertiary leading-none mb-1">
                in <span className="font-bold">{folder.parent.name}</span>
              </Text>
            )}
            <Text type="secondary" className="text-[11px] font-medium text-label-tertiary">
              {folder.itemCount || 0} items
            </Text>
          </div>
          <div onClick={(e) => e.stopPropagation()} onKeyDown={(e) => e.stopPropagation()} role="button" tabIndex={0}>
            <Dropdown menu={{ items: menuItems }} trigger={["click"]}>
              <MoreOutlined className="text-label-tertiary hover:text-primary cursor-pointer p-1 rounded-full hover:bg-surface-alt transition-colors" />
            </Dropdown>
          </div>
        </div>
      </Card>
    </motion.div>
  );
}

export default FolderItem;
