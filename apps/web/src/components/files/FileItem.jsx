// React core & third-party libraries
import React, { useEffect, useState } from "react";
import { Check, MoreVertical, Star } from "lucide-react";
import { motion } from "framer-motion";

// Constants
import { ApiBasePath, FileServiceUrls } from "@constants/serviceUrls";

// Services (RTK Query hooks)
import { useToggleFileFavoriteMutation } from "@services/api/fileApi";

// Utils
import { UrlUtils } from "@shared-utils/utils";
import { getFileInfo } from "@utils/fileDisplayUtils";
import { buildItemMenuItems } from "@utils/menuUtils";
import { cn } from "@lib/utils";

// Components
import Dropdown from "@components/common/Dropdown";
import { Tooltip, TooltipTrigger, TooltipContent, TooltipProvider } from "@components/ui/tooltip";
import { Card, CardContent } from "@components/ui/card";

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
        className={cn(
          "group flex items-center gap-4 p-3 rounded-2xl transition-all cursor-pointer border",
          isSelected
            ? "bg-primary/10 border-primary/40 shadow-glow-sm"
            : "glass-card hover:bg-white/5 border-transparent hover:border-white/10"
        )}
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
            className={cn(
              "w-5 h-5 rounded-md border flex items-center justify-center transition-colors",
              isSelected
                ? "bg-primary border-primary text-on-primary"
                : "border-line-strong bg-surface group-hover:border-primary/50"
            )}
          >
            {isSelected && <Check size={14} strokeWidth={3} />}
          </div>
        </div>

        <div
          className={cn(
            "shrink-0 w-9 h-9 rounded-lg flex items-center justify-center overflow-hidden text-xl shadow-sm",
            getFileInfo(file.type).bg,
            getFileInfo(file.type).color
          )}
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
            <div className="font-bold text-sm text-label truncate select-text" title={file.name}>
              {file.name}
            </div>
            {showParentContext && file.folder?.name && (
              <div className="text-[10px] text-label-tertiary truncate leading-none mt-1 font-medium italic">
                in <span className="font-bold opacity-80">{file.folder.name}</span>
              </div>
            )}
          </div>
          <div className="col-span-3 text-xs text-label-tertiary capitalize font-bold tracking-tight opacity-70">
            {file.type}
          </div>
          <div className="col-span-3">
            <span className="text-[10px] font-black text-label-tertiary bg-white/5 px-2 py-0.5 rounded-lg border border-white/5 whitespace-nowrap">
              {file.size}
            </span>
          </div>
        </div>

        <div onClick={(e) => e.stopPropagation()} onKeyDown={(e) => e.stopPropagation()} role="button" tabIndex={0}>
          <Dropdown menu={{ items: menuItems }} trigger={["click"]}>
            <div className="p-2 rounded-full hover:bg-surface-alt transition-colors group/more">
              <MoreVertical size={18} className="text-label-tertiary group-hover/more:text-primary transition-colors" />
            </div>
          </Dropdown>
        </div>
      </div>
    );
  }

  return (
    <motion.div whileHover={{ y: -5 }} className="h-full relative">
      <Card
        className={cn(
          "h-full border-2 rounded-2xl transition-all duration-500 cursor-pointer overflow-hidden backdrop-blur-3xl backdrop-saturate-200",
          isSelected
            ? "border-primary/60 bg-primary/10 shadow-glow"
            : "glass-card border-white/10 border-t-white/20 border-l-white/15 hover:border-primary/40 hover:shadow-glow bg-white/10 shadow-premium"
        )}
        onClick={handleClick}
        onDoubleClick={handleDoubleClick}
      >
        <CardContent className="p-2">
          {isSelected && (
            <div className="absolute top-2.5 right-2.5 z-20">
              <div className="bg-primary text-on-primary rounded-full p-0.5 shadow-sm">
                <Check size={14} strokeWidth={4} />
              </div>
            </div>
          )}

          {isFavorite && !isSelected && (
            <div className="absolute top-2.5 right-2.5 z-20">
              <Star size={16} className="text-warning fill-warning" />
            </div>
          )}

          <div
            className={cn(
              "aspect-square rounded-xl flex items-center justify-center overflow-hidden mb-2.5 transition-colors duration-300 text-5xl",
              isSelected ? "bg-surface/50 backdrop-blur-sm shadow-inner" : getFileInfo(file.type).bg,
              getFileInfo(file.type).color
            )}
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
            <div className="flex-1 min-w-0 flex flex-col">
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <div
                      className="font-black text-[12px] leading-tight mb-1 text-label truncate select-text"
                      title={file.name}
                    >
                      {file.name}
                    </div>
                  </TooltipTrigger>
                  <TooltipContent
                    side="top"
                    className="max-w-[200px] break-all bg-surface/95 text-white font-bold border-white/10 backdrop-blur-xl"
                  >
                    {file.name}
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
              {showParentContext && file.folder?.name && (
                <div className="truncate text-[9px] text-label-tertiary leading-none mb-1 font-semibold italic">
                  in <span className="font-bold text-primary/70">{file.folder.name}</span>
                </div>
              )}
              <div className="text-[10px] font-black text-label-tertiary/70 uppercase tracking-widest flex items-center gap-1">
                <span className="w-1 h-1 rounded-full bg-primary/40" />
                {file.size}
              </div>
            </div>
            <div
              onClick={(e) => e.stopPropagation()}
              onKeyDown={(e) => e.stopPropagation()}
              role="button"
              tabIndex={0}
              className="mt-[-2px]"
            >
              <Dropdown menu={{ items: menuItems }} trigger={["click"]}>
                <div className="p-1.5 rounded-full hover:bg-surface-alt transition-colors group/more">
                  <MoreVertical
                    size={16}
                    className="text-label-tertiary group-hover/more:text-primary transition-colors"
                  />
                </div>
              </Dropdown>
            </div>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}

export default FileItem;
