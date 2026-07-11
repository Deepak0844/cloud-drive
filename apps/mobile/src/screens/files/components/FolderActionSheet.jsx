import React, { useState } from "react";
import { View, TextInput } from "react-native";
import { Pencil, FolderInput, Trash2 } from "lucide-react-native";

// Rtk
import { useRenameFolderMutation, useDeleteFolderMutation } from "@api/folderApi";

// Components
import { Dialog } from "@components/ui/alert-dialog/AlertDialog";
import Text from "@components/ui/text/Text";
import MenuSheetRow from "@components/ui/menu-sheet-row/MenuSheetRow";
import Divider from "@components/ui/divider/Divider";

/**
 * Single-folder action list. Move delegates to the caller (`onRequestMove`)
 * instead of managing its own nested picker sheet — the picker is owned by
 * `FilesBrowserContent` so only one bottom sheet is ever open at a time.
 */
export default function FolderActionSheet({ folder = null, onClose = () => {}, onRequestMove = () => {} }) {
  const [renameFolder, { isLoading: isRenaming }] = useRenameFolderMutation();
  const [deleteFolder, { isLoading: isDeleting }] = useDeleteFolderMutation();

  const [showRenamePrompt, setShowRenamePrompt] = useState(false);
  const [renameValue, setRenameValue] = useState("");
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  if (!folder) return null;

  async function handleRenameConfirm() {
    const trimmed = renameValue.trim();
    if (trimmed && trimmed !== folder.name) {
      await renameFolder({ id: folder.id, name: trimmed });
    }
    setShowRenamePrompt(false);
    onClose();
  }

  async function handleDeleteConfirm() {
    setShowDeleteConfirm(false);
    await deleteFolder({ id: folder.id });
    onClose();
  }

  return (
    <>
      <View className="p-4 gap-2">
        <Text size="sm" bold className="text-secondary mb-2 px-1">
          {folder.name}
        </Text>
        <View className="gap-1">
          <MenuSheetRow
            icon={Pencil}
            label="Rename"
            tint="neutral"
            loading={isRenaming}
            onPress={() => {
              setRenameValue(folder.name);
              setShowRenamePrompt(true);
            }}
          />
          <MenuSheetRow icon={FolderInput} label="Move" tint="neutral" onPress={() => onRequestMove(folder)} />
        </View>
        <Divider spacingSize="sm" />
        <MenuSheetRow
          icon={Trash2}
          label="Delete"
          tint="danger"
          danger
          loading={isDeleting}
          onPress={() => setShowDeleteConfirm(true)}
        />
      </View>

      <Dialog
        isOpen={showRenamePrompt}
        onClose={() => setShowRenamePrompt(false)}
        size="md"
        title="Rename folder"
        contentClassName="bg-surface rounded-2xl p-2"
        footerClassName="gap-3 mt-2"
        onCancel={() => setShowRenamePrompt(false)}
        onConfirm={handleRenameConfirm}
        confirmLabel="Save"
      >
        <TextInput
          value={renameValue}
          onChangeText={setRenameValue}
          selectTextOnFocus
          className="border border-border rounded-md px-md py-[10px] text-sm text-neutral"
        />
      </Dialog>

      <Dialog
        isOpen={showDeleteConfirm}
        onClose={() => setShowDeleteConfirm(false)}
        size="md"
        title="Delete folder"
        contentClassName="bg-surface rounded-2xl p-2"
        footerClassName="gap-3 mt-2"
        onCancel={() => setShowDeleteConfirm(false)}
        onConfirm={handleDeleteConfirm}
        confirmLabel="Delete"
        confirmVariant="destructive"
      >
        <Text size="sm" className="text-secondary">
          {`Delete "${folder.name}" and its contents? Items move to trash.`}
        </Text>
      </Dialog>
    </>
  );
}
