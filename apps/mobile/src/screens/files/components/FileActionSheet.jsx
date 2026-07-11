import React, { useState } from "react";
import { View, TextInput, Alert } from "react-native";
import { Download, Share2, Wifi, WifiOff, Star, Pencil, FolderInput, Copy, Trash2 } from "lucide-react-native";
import * as Sharing from "expo-sharing";

// Rtk
import { useDeleteFileMutation, useRenameFileMutation, useToggleFileFavoriteMutation } from "@api/fileApi";

// Hooks
import { useOfflineFiles } from "@hooks/useOfflineFiles";

// Lib
import backgroundTransfer from "@lib/backgroundTransfer";
import haptics from "@lib/haptics";

// Components
import { Dialog } from "@components/ui/alert-dialog/AlertDialog";
import Text from "@components/ui/text/Text";
import MenuSheetRow from "@components/ui/menu-sheet-row/MenuSheetRow";
import Divider from "@components/ui/divider/Divider";

function ConfirmDialog({ visible = false, title = "", message = "", onConfirm = () => {}, onCancel = () => {} }) {
  return (
    <Dialog
      isOpen={visible}
      onClose={onCancel}
      size="md"
      title={title}
      contentClassName="bg-surface rounded-2xl p-2"
      footerClassName="gap-3 mt-2"
      onCancel={onCancel}
      onConfirm={onConfirm}
      confirmLabel="Delete"
      confirmVariant="destructive"
    >
      <Text size="sm" className="text-secondary">
        {message}
      </Text>
    </Dialog>
  );
}

function PromptDialog({ visible = false, title = "", initialValue = "", onConfirm = () => {}, onCancel = () => {} }) {
  const [value, setValue] = useState(initialValue);

  function handleConfirm() {
    const trimmed = value.trim();
    if (trimmed && trimmed !== initialValue) {
      onConfirm(trimmed);
    }
  }

  return (
    <Dialog
      isOpen={visible}
      onClose={onCancel}
      size="md"
      title={title}
      contentClassName="bg-surface rounded-2xl p-2"
      footerClassName="gap-3 mt-2"
      onCancel={onCancel}
      onConfirm={handleConfirm}
      confirmLabel="Save"
    >
      <TextInput
        value={value}
        onChangeText={setValue}
        selectTextOnFocus
        className="border border-border rounded-md px-md py-[10px] text-sm text-neutral"
      />
    </Dialog>
  );
}

/**
 * Single-file action list. Move/Copy delegate to the caller (`onRequestMove`/
 * `onRequestCopy`) instead of managing their own nested picker sheet — the
 * picker is owned by `FilesBrowserContent` so only one bottom sheet is ever
 * open at a time.
 */
export default function FileActionSheet({
  file = null,
  onClose = () => {},
  onRequestMove = () => {},
  onRequestCopy = () => {},
}) {
  const [deleteFile, { isLoading: isDeleting }] = useDeleteFileMutation();
  const [renameFile, { isLoading: isRenaming }] = useRenameFileMutation();
  const [toggleFileFavorite, { isLoading: isTogglingFav }] = useToggleFileFavoriteMutation();
  const { markOffline, removeOffline } = useOfflineFiles();

  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [showRenamePrompt, setShowRenamePrompt] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);
  const [isSharing, setIsSharing] = useState(false);
  const [isTogglingOffline, setIsTogglingOffline] = useState(false);

  if (!file) return null;

  async function handleDownload() {
    setIsDownloading(true);
    try {
      const uri = await backgroundTransfer.download(file.id, file.downloadUrl, file.name);
      const isMedia = file.mimeType?.startsWith("image/") || file.mimeType?.startsWith("video/");
      if (isMedia) {
        await backgroundTransfer.saveToGallery(uri, file.mimeType);
      }
    } catch (ex) {
      if (ex.message === "MEDIA_LIBRARY_PERMISSION_DENIED") {
        Alert.alert(
          "Permission required",
          "Go to Settings → Privacy → Photos and grant access to save downloads to your Gallery."
        );
      } else {
        throw ex;
      }
    } finally {
      setIsDownloading(false);
      onClose();
    }
  }

  async function handleShare() {
    setIsSharing(true);
    try {
      const uri = await backgroundTransfer.download(file.id, file.downloadUrl, file.name);
      await Sharing.shareAsync(uri);
    } finally {
      setIsSharing(false);
      onClose();
    }
  }

  async function handleToggleFavourite() {
    haptics.success();
    await toggleFileFavorite({ id: file.id }).unwrap();
    onClose();
  }

  async function handleOfflineToggle() {
    setIsTogglingOffline(true);
    try {
      if (file.isOffline) {
        await removeOffline(file.id);
      } else {
        await markOffline(file);
      }
    } finally {
      setIsTogglingOffline(false);
      onClose();
    }
  }

  async function handleDeleteConfirm() {
    setShowDeleteConfirm(false);
    haptics.warning();
    await deleteFile({ id: file.id });
    onClose();
  }

  async function handleRenameConfirm(name) {
    setShowRenamePrompt(false);
    await renameFile({ id: file.id, name });
    onClose();
  }

  const isFavourite = file.isFavorite ?? false;
  const isOffline = file.isOffline ?? false;

  const quickActions = [
    { icon: Download, label: "Download", onPress: handleDownload, loading: isDownloading, tint: "alt" },
    { icon: Share2, label: "Share", onPress: handleShare, loading: isSharing, tint: "alt" },
    {
      icon: isOffline ? WifiOff : Wifi,
      label: isOffline ? "Remove offline" : "Mark offline",
      onPress: handleOfflineToggle,
      loading: isTogglingOffline,
      tint: isOffline ? "primary" : "neutral",
    },
    {
      icon: Star,
      label: isFavourite ? "Unfavourite" : "Favourite",
      onPress: handleToggleFavourite,
      loading: isTogglingFav,
      tint: isFavourite ? "warning" : "neutral",
    },
  ];

  const editActions = [
    { icon: Pencil, label: "Rename", onPress: () => setShowRenamePrompt(true), loading: isRenaming, tint: "neutral" },
    { icon: FolderInput, label: "Move", onPress: () => onRequestMove(file), tint: "neutral" },
    { icon: Copy, label: "Copy", onPress: () => onRequestCopy(file), tint: "neutral" },
  ];

  const dangerActions = [
    { icon: Trash2, label: "Delete", onPress: () => setShowDeleteConfirm(true), loading: isDeleting, danger: true },
  ];

  function renderRow({ icon, label, onPress, loading = false, danger = false, tint = "neutral" }) {
    return (
      <MenuSheetRow
        key={label}
        icon={icon}
        label={label}
        onPress={onPress}
        loading={loading}
        danger={danger}
        tint={danger ? "danger" : tint}
      />
    );
  }

  return (
    <>
      <View className="p-4 gap-2">
        <Text size="sm" bold className="text-secondary mb-2 px-1">
          {file.name}
        </Text>
        <View className="gap-1">{quickActions.map(renderRow)}</View>
        <Divider spacingSize="sm" />
        <View className="gap-1">{editActions.map(renderRow)}</View>
        <Divider spacingSize="sm" />
        <View className="gap-1">{dangerActions.map(renderRow)}</View>
      </View>

      <ConfirmDialog
        visible={showDeleteConfirm}
        title="Delete file"
        message={`Delete "${file.name}"? This moves it to trash.`}
        onConfirm={handleDeleteConfirm}
        onCancel={() => setShowDeleteConfirm(false)}
      />

      <PromptDialog
        visible={showRenamePrompt}
        title="Rename file"
        initialValue={file.name}
        onConfirm={handleRenameConfirm}
        onCancel={() => setShowRenamePrompt(false)}
      />
    </>
  );
}
