import React, { useState } from "react";
import { View, TextInput } from "react-native";
import { Download, Share2, Wifi, WifiOff, Star, Pencil, FolderInput, Copy, Trash2 } from "lucide-react-native";
import * as Sharing from "expo-sharing";

// Rtk
import { useDeleteFileMutation, useRenameFileMutation, useToggleFileFavoriteMutation } from "@api/fileApi";

// Hooks
import { useOfflineFiles } from "@hooks/useOfflineFiles";

// Lib
import backgroundTransfer from "@lib/backgroundTransfer";

// Theme
import { useTheme } from "@theme/useTheme";

// Components
import { Dialog } from "@components/ui/alert-dialog/AlertDialog";
import Text from "@components/ui/text/Text";
import Button, { ButtonSpinner, ButtonText } from "@components/ui/button/Button";

function ConfirmDialog({ visible = false, title = "", message = "", onConfirm = () => {}, onCancel = () => {} }) {
  return (
    <Dialog
      isOpen={visible}
      onClose={onCancel}
      size="md"
      title={title}
      contentClassName="bg-surface-card rounded-2xl p-2"
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
  const { colors } = useTheme();
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
      contentClassName="bg-surface-card rounded-2xl p-2"
      footerClassName="gap-3 mt-2"
      onCancel={onCancel}
      onConfirm={handleConfirm}
      confirmLabel="Save"
    >
      <TextInput
        value={value}
        onChangeText={setValue}
        selectTextOnFocus
        style={{
          borderWidth: 1,
          borderColor: colors.surface.border,
          borderRadius: 8,
          paddingHorizontal: 12,
          paddingVertical: 10,
          color: colors.neutral.DEFAULT,
          fontSize: 14,
        }}
      />
    </Dialog>
  );
}

export default function FileActionSheet({ file = null, onClose = () => {} }) {
  const { colors } = useTheme();
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
      await backgroundTransfer.download(file.id, file.downloadUrl, file.name);
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

  const actions = [
    {
      icon: Download,
      label: "Download",
      onPress: handleDownload,
      loading: isDownloading,
    },
    {
      icon: Share2,
      label: "Share",
      onPress: handleShare,
      loading: isSharing,
    },
    {
      icon: isOffline ? WifiOff : Wifi,
      label: isOffline ? "Remove offline" : "Mark offline",
      onPress: handleOfflineToggle,
      loading: isTogglingOffline,
    },
    {
      icon: Star,
      label: isFavourite ? "Unfavourite" : "Favourite",
      onPress: handleToggleFavourite,
      loading: isTogglingFav,
      iconColor: isFavourite ? colors.warning.DEFAULT : undefined,
    },
    {
      icon: Pencil,
      label: "Rename",
      onPress: () => setShowRenamePrompt(true),
      loading: isRenaming,
    },
    { icon: FolderInput, label: "Move", onPress: () => {}, stub: true },
    { icon: Copy, label: "Copy", onPress: () => {}, stub: true },
    {
      icon: Trash2,
      label: "Delete",
      onPress: () => setShowDeleteConfirm(true),
      loading: isDeleting,
      danger: true,
    },
  ];

  return (
    <>
      <View className="p-4 gap-2">
        <Text size="sm" bold className="text-secondary mb-2 px-1">
          {file.name}
        </Text>
        {actions.map(({ icon: Icon, label, onPress, loading = false, danger = false, stub = false, iconColor }) => (
          <Button key={label} variant={danger ? "destructive" : "ghost"} onPress={onPress} disabled={stub || loading}>
            {loading ? <ButtonSpinner /> : <Icon size={18} color={iconColor} />}
            <ButtonText>
              {label}
              {stub ? " (soon)" : ""}
            </ButtonText>
          </Button>
        ))}
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
