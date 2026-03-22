// React core & third-party libraries
import { useState } from "react";
import { toast } from "sonner";

// Services (RTK Query hooks)
import {
  useDeleteFolderMutation,
  useMoveFolderMutation,
  useCopyFolderMutation,
  useRenameFolderMutation,
} from "@services/api/folderApi";
import {
  useCopyFileMutation,
  useDeleteFileMutation,
  useMoveFileMutation,
  useRenameFileMutation,
} from "@services/api/fileApi";
import { useBulkCopyMutation, useBulkDeleteMutation, useBulkMoveMutation } from "@services/api/bulkApi";

// Constants
import { ItemTypes } from "@shared-constants/constants";
import { ApiBasePath, FileServiceUrls, BulkServiceUrls, ROOT_FOLDER_ID } from "@constants/serviceUrls";

// Utils
import { FileUtils } from "@shared-utils/utils";

export function useFileActions({ folders, clearSelection }) {
  // Dialog states
  const [renameItem, setRenameItem] = useState(null);
  const [newName, setNewName] = useState("");
  const [deleteItem, setDeleteItem] = useState(null);
  const [bulkDeleteItems, setBulkDeleteItems] = useState(null);
  const [folderPicker, setFolderPicker] = useState({
    visible: false,
    action: "move", // 'move' | 'copy' | 'bulk-move' | 'bulk-copy'
    item: null, // individual item
    items: [], // bulk items
  });

  // API Mutations
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

  const isActionLoading =
    moveFileLoading || copyFileLoading || moveFolderLoading || copyFolderLoading || bulkMoveLoading || bulkCopyLoading;

  // Rename Actions
  function handleRenameTrigger(item) {
    setRenameItem(item);
    setNewName(item.name);
  }

  async function handleRenameConfirm() {
    if (!renameItem || !newName.trim()) return;
    try {
      const id = renameItem._id || renameItem.id;
      const isFolder = "itemCount" in renameItem;

      if (isFolder) await renameFolder({ id, name: newName }).unwrap();
      else await renameFile({ id, name: newName }).unwrap();

      toast.success(`Renamed successfully`);
      setRenameItem(null);
    } catch (err) {
      toast.error(err.data?.message || "Failed to rename");
    }
  }

  // Delete Actions
  function handleDeleteTrigger(item) {
    setDeleteItem(item);
  }

  async function handleDeleteConfirm() {
    if (!deleteItem) return;
    try {
      const id = deleteItem._id || deleteItem.id;
      const isFolder = "itemCount" in deleteItem;

      if (isFolder) await deleteFolder({ id }).unwrap();
      else await deleteFile({ id }).unwrap();

      toast.success(`Deleted ${deleteItem.name}`);
      setDeleteItem(null);
    } catch (err) {
      toast.error(err.data?.message || "Failed to delete");
    }
  }

  function handleBulkDeleteTrigger(itemsToDelete) {
    if (!itemsToDelete || itemsToDelete.length === 0) return;
    setBulkDeleteItems(itemsToDelete);
  }

  async function handleBulkDeleteConfirm() {
    if (!bulkDeleteItems) return;
    try {
      await bulkDelete({ items: bulkDeleteItems }).unwrap();
      toast.success("Items moved to trash");
      clearSelection();
      setBulkDeleteItems(null);
    } catch {
      toast.error("Failed to delete items");
    }
  }

  // Move & Copy Actions
  function handleMoveTrigger(item) {
    setFolderPicker({ visible: true, action: "move", item, items: [] });
  }

  function handleCopyTrigger(item) {
    setFolderPicker({ visible: true, action: "copy", item, items: [] });
  }

  function handleBulkMoveTrigger(items) {
    if (!items || items.length === 0) return;
    setFolderPicker({ visible: true, action: "bulk-move", item: null, items });
  }

  function handleBulkCopyTrigger(items) {
    if (!items || items.length === 0) return;
    setFolderPicker({ visible: true, action: "bulk-copy", item: null, items });
  }

  async function handleFolderPickerConfirm(targetFolderId) {
    const { action, item, items } = folderPicker;
    const normalizedTargetId = targetFolderId === ROOT_FOLDER_ID ? null : targetFolderId;

    try {
      if (action === "move" || action === "copy") {
        const id = item._id || item.id;
        const isFolder = "itemCount" in item || folders?.some((f) => (f._id || f.id) === id);

        if (action === "move") {
          if (isFolder) await moveFolder({ id, parentId: normalizedTargetId }).unwrap();
          else await moveFile({ id, folderId: normalizedTargetId }).unwrap();
          toast.success(`${item.name} moved successfully`);
        } else {
          if (isFolder) await copyFolder({ id, parentId: normalizedTargetId }).unwrap();
          else await copyFile({ id, folderId: normalizedTargetId }).unwrap();
          toast.success(`${item.name} copied successfully`);
        }
      } else if (action === "bulk-move" || action === "bulk-copy") {
        if (action === "bulk-move") {
          await bulkMove({ items, targetFolderId: normalizedTargetId }).unwrap();
          toast.success(`${items.length} items moved successfully`);
        } else {
          await bulkCopy({ items, targetFolderId: normalizedTargetId }).unwrap();
          toast.success(`${items.length} items copied successfully`);
        }
        clearSelection();
      }
      setFolderPicker({ ...folderPicker, visible: false });
    } catch (err) {
      toast.error(err.data?.message || `Failed to ${action}`);
    }
  }

  // Download Actions
  function handleDownload(file) {
    if (!file) return;
    FileUtils.startFileDownload(file, `${ApiBasePath}${FileServiceUrls.downloadFile}`);
    toast.success("Download started", { id: "downloading" });
  }

  function handleBulkDownload(itemsToDownload) {
    if (!itemsToDownload || itemsToDownload.length === 0) return;
    const fileItems = itemsToDownload.filter((i) => i.type === ItemTypes.FILE);
    if (fileItems.length === 0) {
      toast.warning("Please select at least one file to download");
      return;
    }

    try {
      const url = `${ApiBasePath}${BulkServiceUrls.bulkDownload}`;
      const payload = { items: fileItems };

      // Use triggerPostDownload to support streaming for heavy ZIP files
      // This bypasses RTK Query/Axios to allow the browser to handle the stream directly.
      FileUtils.triggerPostDownload(url, payload);

      toast.success("Preparing your download...");
      clearSelection();
    } catch {
      toast.error("Failed to initiate bulk download");
    }
  }

  return {
    renameItem,
    setRenameItem,
    newName,
    setNewName,
    deleteItem,
    setDeleteItem,
    bulkDeleteItems,
    setBulkDeleteItems,
    folderPicker,
    setFolderPicker,

    handleRenameTrigger,
    handleRenameConfirm,
    handleDeleteTrigger,
    handleDeleteConfirm,
    handleBulkDeleteTrigger,
    handleBulkDeleteConfirm,
    handleMoveTrigger,
    handleCopyTrigger,
    handleBulkMoveTrigger,
    handleBulkCopyTrigger,
    handleFolderPickerConfirm,
    handleDownload,
    handleBulkDownload,

    isActionLoading,
  };
}
