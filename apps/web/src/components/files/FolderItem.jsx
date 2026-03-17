// React core & third-party libraries
import React from "react";
import { Folder as FolderIcon, MoreVertical, Star, Check } from "lucide-react";
import { motion } from "framer-motion";

// Services (RTK Query hooks)
import { useToggleFolderFavoriteMutation } from "@services/api/folderApi";

// Utils
import { buildItemMenuItems } from "@utils/menuUtils";
import { cn } from "@lib/utils";

// Components
import Dropdown from "@shared-components/components/dropdown";
import { Card, CardContent } from "@components/ui/card";

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

  const menuItems = buildItemMenuItems({
    item: folder,
    isFolder: true,
    isTrashItem,
    isFavorite,
    isFavoriting,
    onOpen,
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
          "group flex items-center gap-4 p-3 rounded-xl transition-all cursor-pointer border",
          isSelected
            ? "bg-primary-light border-primary/30 shadow-glow-sm"
            : "bg-surface hover:bg-surface-dim border-transparent hover:border-line"
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
            "w-10 h-10 rounded-xl flex items-center justify-center text-lg transition-all",
            isSelected ? "bg-primary text-on-primary" : "bg-primary/10 text-primary"
          )}
        >
          <FolderIcon size={20} fill={isSelected ? "currentColor" : "none"} />
        </div>

        <div className="flex-1 min-w-0 flex items-center justify-between">
          <div className="flex flex-col min-w-0">
            <div className="font-semibold text-sm text-label truncate">{folder.name}</div>
            {showParentContext && folder.parent?.name && (
              <div className="text-[10px] text-label-tertiary truncate leading-none mt-0.5">
                in <span className="font-bold opacity-80">{folder.parent.name}</span>
              </div>
            )}
          </div>
          <div className="text-xs text-label-tertiary font-medium">{folder.itemCount || 0} items</div>
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
    <motion.div whileHover={{ y: -4 }} className="relative h-full">
      <Card
        className={cn(
          "h-full border-2 rounded-2xl transition-all duration-200 cursor-pointer overflow-hidden",
          isSelected
            ? "border-primary bg-primary-light shadow-glow"
            : "border-transparent shadow-sm hover:shadow-md bg-surface"
        )}
        onClick={handleClick}
        onDoubleClick={handleDoubleClick}
      >
        <CardContent className="p-3">
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

          <div className="flex items-center gap-3">
            <div
              className={cn(
                "w-10 h-10 rounded-xl flex items-center justify-center transition-all duration-300",
                isSelected ? "bg-primary text-on-primary shadow-glow-sm" : "bg-primary/10 text-primary"
              )}
            >
              <FolderIcon size={22} fill={isSelected ? "currentColor" : "none"} />
            </div>
            <div className="flex-1 min-w-0">
              <div className="font-bold truncate text-[13px] text-label" title={folder.name}>
                {folder.name}
              </div>
              {showParentContext && folder.parent?.name && (
                <div className="truncate text-[10px] text-label-tertiary leading-none mb-1 font-medium italic">
                  in <span className="font-bold opacity-80">{folder.parent.name}</span>
                </div>
              )}
              <div className="text-[11px] font-semibold text-label-tertiary">{folder.itemCount || 0} items</div>
            </div>
            <div onClick={(e) => e.stopPropagation()} onKeyDown={(e) => e.stopPropagation()} role="button" tabIndex={0}>
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

export default FolderItem;
