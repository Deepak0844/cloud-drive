import React, { useState, useEffect } from "react";
import { TextInput } from "react-native";

// Rtk
import { useCreateFolderMutation } from "@api/folderApi";

// Theme
import { useTheme } from "@theme/useTheme";

// Components
import { Dialog } from "@components/ui/alert-dialog/AlertDialog";

export default function CreateFolderDialog({ visible = false, parentId = null, onClose = () => {} }) {
  const { colors } = useTheme();
  const [createFolder, { isLoading }] = useCreateFolderMutation();
  const [name, setName] = useState("");

  useEffect(() => {
    if (visible) {
      setName("");
    }
  }, [visible]);

  async function handleConfirm() {
    const trimmed = name.trim();
    if (!trimmed) return;
    try {
      await createFolder({ name: trimmed, parentId }).unwrap();
    } finally {
      onClose();
    }
  }

  return (
    <Dialog
      isOpen={visible}
      onClose={onClose}
      size="md"
      title="New folder"
      contentClassName="bg-surface rounded-2xl p-2"
      footerClassName="gap-3 mt-2"
      onCancel={onClose}
      onConfirm={handleConfirm}
      confirmLabel="Create"
      confirmDisabled={isLoading || name.trim().length === 0}
      confirmLoading={isLoading}
    >
      <TextInput
        value={name}
        onChangeText={setName}
        placeholder="Folder name"
        placeholderTextColor={colors.surface.textDisabled}
        className="border border-border rounded-md px-md py-[10px] text-sm text-neutral"
      />
    </Dialog>
  );
}
