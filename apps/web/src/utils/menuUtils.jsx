import React from "react";
import { Download, ExternalLink, Star, StarOff, Info, Edit, Move, Copy, Trash2 } from "lucide-react";

export function buildItemMenuItems({
  item,
  isFolder = false,
  isTrashItem = false,
  isFavorite = false,
  isFavoriting = false,
  onOpen,
  onDownload,
  onShowInfo,
  onRename,
  onMove,
  onCopy,
  onDelete,
  toggleFavorite,
}) {
  if (isTrashItem) {
    return [{ key: "info", label: "Details", icon: <Info size={16} />, onClick: () => onShowInfo?.(item) }];
  }

  const items = [];

  if (onOpen) {
    items.push({ key: "open", label: "Open", icon: <ExternalLink size={16} />, onClick: () => onOpen?.(item) });
  }

  if (!isFolder && onDownload) {
    items.push({ key: "download", label: "Download", icon: <Download size={16} />, onClick: () => onDownload?.(item) });
  }

  if (toggleFavorite) {
    items.push({
      key: "favorite",
      label: isFavorite ? "Remove from Favorites" : "Add to Favorites",
      icon: isFavorite ? <StarOff size={16} className="text-warning" /> : <Star size={16} />,
      onClick: () => toggleFavorite({ id: item.id || item._id }),
      disabled: isFavoriting,
    });
  }

  if (onShowInfo) {
    items.push({ key: "info", label: "Details", icon: <Info size={16} />, onClick: () => onShowInfo?.(item) });
  }

  const hasDivider1 = onOpen || onDownload || toggleFavorite || onShowInfo;
  if (hasDivider1 && (onRename || onMove || onCopy)) {
    items.push({ type: "divider" });
  }

  if (onRename)
    items.push({ key: "rename", label: "Rename", icon: <Edit size={16} />, onClick: () => onRename?.(item) });
  if (onMove) items.push({ key: "move", label: "Move to...", icon: <Move size={16} />, onClick: () => onMove?.(item) });
  if (onCopy) items.push({ key: "copy", label: "Copy to...", icon: <Copy size={16} />, onClick: () => onCopy?.(item) });

  const hasDivider2 = onRename || onMove || onCopy;
  if (hasDivider2 && onDelete) {
    items.push({ type: "divider" });
  }

  if (onDelete) {
    items.push({
      key: "delete",
      label: "Delete",
      icon: <Trash2 size={16} className="text-destructive" />,
      onClick: () => onDelete?.(item),
      danger: true,
    });
  }

  return items;
}
