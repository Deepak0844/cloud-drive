// React core & third-party libraries
import React, { useEffect, useState } from "react";
import { Card, Typography } from "antd";
import { CheckCircleFilled, MoreOutlined, StarFilled } from "@ant-design/icons";
import { motion } from "framer-motion";

// Constants
import { ApiBasePath, FileServiceUrls } from "@constants/serviceUrls";

// Services (RTK Query hooks)
import { useToggleFileFavoriteMutation } from "@services/api/fileApi";

// Utils
import { UrlUtils } from "@shared-utils/utils";
import { getFileInfo } from "@utils/fileDisplayUtils";
import { buildItemMenuItems } from "@utils/menuUtils";

// Components
import Button from "@shared-components/components/button";
import Dropdown from "@shared-components/components/dropdown";
import { Tooltip, TooltipTrigger, TooltipContent, TooltipProvider } from "@components/ui/tooltip";

const { Text } = Typography;

function FileItem({
  file,
  isSelected,
  onToggleSelect,
  onOpen,
  onShowInfo,
  onRename,
  onDelete,
  onMove,
  onCopy,
  handleDownload,
  viewMode = "grid",
  isTrashItem = false,
  showParentContext = false,
}) {
  // Local state
  const [thumbnailSrc, setThumbnailSrc] = useState(null);

  // RTK Query hooks
  const [toggleFavorite, { isLoading: isFavoriting }] = useToggleFileFavoriteMutation();

  // Custom & shared hooks
  const clickTimeoutRef = React.useRef(null);

  // Derived / computed variables
  const isFavorite = file.is_favorite;

  const hasThumbnail =
    file.type === "image" ||
    file.category === "image" ||
    file?.mime_type?.startsWith("image/") ||
    file.type === "video" ||
    file.category === "video" ||
    file?.mime_type?.startsWith("video/") ||
    file.type === "audio" ||
    file.category === "audio" ||
    file?.mime_type?.startsWith("audio/");

  useEffect(() => {
    if (hasThumbnail) {
      const fileId = file.id || file._id;
      const url = UrlUtils.format(`${ApiBasePath}${FileServiceUrls.thumbnail}`, { id: fileId });
      setThumbnailSrc(url);
    } else {
      setThumbnailSrc(null);
    }
  }, [file, hasThumbnail]);

  // Event handlers
  function handleClick(e) {
    e.stopPropagation();

    if (clickTimeoutRef.current) {
      clearTimeout(clickTimeoutRef.current);
      clickTimeoutRef.current = null;
      return;
    }

    clickTimeoutRef.current = setTimeout(() => {
      onToggleSelect(file.id || file._id, e.metaKey || e.ctrlKey);
      clickTimeoutRef.current = null;
    }, 250);
  }

  function handleDoubleClick(e) {
    e.stopPropagation();
    if (clickTimeoutRef.current) {
      clearTimeout(clickTimeoutRef.current);
      clickTimeoutRef.current = null;
    }
    onOpen?.(file);
  }

  function onDownload() {
    handleDownload?.(file);
  }

  const menuItems = buildItemMenuItems({
    item: file,
    isFolder: false,
    isTrashItem,
    isFavorite,
    isFavoriting,
    onOpen,
    onDownload,
    onShowInfo,
    onRename,
    onMove,
    onCopy,
    onDelete,
    toggleFavorite,
  });

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
            onToggleSelect(file.id || file._id);
          }}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === " ") {
              e.stopPropagation();
              onToggleSelect(file.id || file._id);
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
          className={`shrink-0 w-9 h-9 rounded-lg flex items-center justify-center overflow-hidden text-xl ${getFileInfo(file.type).bg} ${getFileInfo(file.type).color}`}
        >
          {thumbnailSrc ? (
            <img
              src={thumbnailSrc}
              alt={file.name}
              className="w-full h-full object-cover"
              onError={() => setThumbnailSrc(null)}
            />
          ) : (
            getFileInfo(file.type).icon
          )}
        </div>

        <div className="flex-1 min-w-0 grid grid-cols-12 gap-4 items-center">
          <div className="col-span-6 flex flex-col min-w-0">
            <div className="font-medium text-sm text-label truncate">{file.name}</div>
            {showParentContext && file.folder?.name && (
              <div className="text-[10px] text-label-tertiary truncate leading-none mt-0.5">
                in <span className="font-bold">{file.folder.name}</span>
              </div>
            )}
          </div>
          <div className="col-span-3 text-xs text-label-tertiary capitalize">{file.type}</div>
          <div className="col-span-3 text-xs text-label-tertiary">{file.size}</div>
        </div>

        <div onClick={(e) => e.stopPropagation()} onKeyDown={(e) => e.stopPropagation()} role="button" tabIndex={0}>
          <Dropdown menu={{ items: menuItems }} trigger={["click"]}>
            <Button
              type="text"
              size="small"
              icon={<MoreOutlined />}
              className="text-label-tertiary hover:text-primary"
            />
          </Dropdown>
        </div>
      </div>
    );
  }

  return (
    <motion.div whileHover={{ y: -5 }} className="h-full relative">
      <Card
        hoverable
        className={`h-full border-2 rounded-2xl transition-all duration-200 relative ${
          isSelected
            ? "border-primary bg-primary-light shadow-[0_0_0_2px_rgba(59,130,246,0.2)]"
            : "border-transparent shadow-sm hover:shadow-xl bg-surface"
        }`}
        styles={{ body: { padding: "8px" } }}
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

        <div
          className={`aspect-square rounded-xl flex items-center justify-center overflow-hidden mb-2 transition-colors duration-300 text-5xl ${
            isSelected ? "bg-surface" : getFileInfo(file.type).bg
          } ${getFileInfo(file.type).color}`}
        >
          {thumbnailSrc ? (
            <img
              src={thumbnailSrc}
              alt={file.name}
              className="w-full h-full object-cover pointer-events-none"
              onError={() => setThumbnailSrc(null)}
            />
          ) : (
            getFileInfo(file.type).icon
          )}
        </div>

        <div className="flex items-start justify-between gap-1 px-1 pb-1">
          <div className="flex-1 min-w-0">
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Text strong className="block truncate text-[12px] leading-tight mb-0.5 cursor-default">
                    {file.name}
                  </Text>
                </TooltipTrigger>
                <TooltipContent side="top" className="max-w-[200px] break-words">
                  {file.name}
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
            {showParentContext && file.folder?.name && (
              <Text className="block truncate text-[9px] text-label-tertiary leading-none mb-1">
                in <span className="font-black text-primary/70">{file.folder.name}</span>
              </Text>
            )}
            <Text type="secondary" className="text-[10px] font-medium opacity-60">
              {file.size}
            </Text>
          </div>
          <div
            onClick={(e) => e.stopPropagation()}
            onKeyDown={(e) => e.stopPropagation()}
            role="button"
            tabIndex={0}
            className="mt-[-2px]"
          >
            <Dropdown menu={{ items: menuItems }} trigger={["click"]}>
              <MoreOutlined className="text-label-tertiary hover:text-primary cursor-pointer p-1 rounded-full hover:bg-surface-alt transition-colors text-sm" />
            </Dropdown>
          </div>
        </div>
      </Card>
    </motion.div>
  );
}

export default FileItem;
