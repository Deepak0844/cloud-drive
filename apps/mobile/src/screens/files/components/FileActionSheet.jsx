import React, { useState } from "react";
import { View, TextInput } from "react-native";
import { Download, Share2, Wifi, Pencil, FolderInput, Copy, Trash2 } from "lucide-react-native";

// Rtk
import { useDeleteFileMutation, useRenameFileMutation } from "@api/fileApi";

// Theme
import { useTheme } from "@theme/useTheme";

// Gluestack
import {
  AlertDialog,
  AlertDialogBackdrop,
  AlertDialogBody,
  AlertDialogContent,
  AlertDialogFooter,
  AlertDialogHeader,
} from "@components/ui/alert-dialog/AlertDialog";

// Components
import Text from "@components/ui/text/Text";
import Button from "@components/ui/button/Button";

function ConfirmDialog({ visible = false, title = "", message = "", onConfirm = () => {}, onCancel = () => {} }) {
  return (
    <AlertDialog isOpen={visible} onClose={onCancel} size="md">
      <AlertDialogBackdrop />
      <AlertDialogContent className="bg-surface-card rounded-2xl p-2">
        <AlertDialogHeader>
          <Text variant="h5" weight="bold">
            {title}
          </Text>
        </AlertDialogHeader>
        <AlertDialogBody>
          <Text variant="body2" color="secondary">
            {message}
          </Text>
        </AlertDialogBody>
        <AlertDialogFooter className="gap-3 mt-2">
          <Button variant="ghost" size="md" onPress={onCancel} className="flex-1">
            Cancel
          </Button>
          <Button variant="danger" size="md" onPress={onConfirm} className="flex-1">
            Delete
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
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
    <AlertDialog isOpen={visible} onClose={onCancel} size="md">
      <AlertDialogBackdrop />
      <AlertDialogContent className="bg-surface-card rounded-2xl p-2">
        <AlertDialogHeader>
          <Text variant="h5" weight="bold">
            {title}
          </Text>
        </AlertDialogHeader>
        <AlertDialogBody>
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
        </AlertDialogBody>
        <AlertDialogFooter className="gap-3 mt-2">
          <Button variant="ghost" size="md" onPress={onCancel} className="flex-1">
            Cancel
          </Button>
          <Button variant="primary" size="md" onPress={handleConfirm} className="flex-1">
            Save
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

/**
 * Bottom action sheet for file operations.
 * @param {object|null} [file=null] - The file to act on; `null` hides the sheet
 * @param {() => void} [onClose=()=>{}] - Called when the sheet should close
 */
export default function FileActionSheet({ file = null, onClose = () => {} }) {
  const [deleteFile, { isLoading: isDeleting }] = useDeleteFileMutation();
  const [renameFile, { isLoading: isRenaming }] = useRenameFileMutation();
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [showRenamePrompt, setShowRenamePrompt] = useState(false);

  if (!file) {
    return null;
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

  const actions = [
    { icon: Download, label: "Download", onPress: () => {}, stub: true },
    { icon: Share2, label: "Share", onPress: () => {}, stub: true },
    { icon: Wifi, label: "Mark offline", onPress: () => {}, stub: true },
    { icon: Pencil, label: "Rename", onPress: () => setShowRenamePrompt(true), loading: isRenaming },
    { icon: FolderInput, label: "Move", onPress: () => {}, stub: true },
    { icon: Copy, label: "Copy", onPress: () => {}, stub: true },
    { icon: Trash2, label: "Delete", onPress: () => setShowDeleteConfirm(true), loading: isDeleting, danger: true },
  ];

  return (
    <>
      <View className="p-4 gap-2">
        <Text variant="label" color="secondary" className="mb-2 px-1">
          {file.name}
        </Text>
        {actions.map(({ icon: Icon, label, onPress, loading = false, danger = false, stub = false }) => (
          <Button
            key={label}
            variant={danger ? "danger" : "ghost"}
            size="md"
            onPress={onPress}
            loading={loading}
            disabled={stub || loading}
            leftIcon={<Icon size={18} />}
          >
            {label}
            {stub ? " (Phase 5)" : ""}
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
