import React, { useState, useEffect } from "react";
import { View, TextInput } from "react-native";

// Rtk
import { useUpdateProfileMutation } from "@api/authApi";

// Theme
import { useTheme } from "@theme/useTheme";

// Components
import { Dialog } from "@components/ui/alert-dialog/AlertDialog";
import Text from "@components/ui/text/Text";

export default function EditProfileDialog({ visible = false, currentName = "", onClose = () => {} }) {
  const { colors } = useTheme();
  const [updateProfile, { isLoading }] = useUpdateProfileMutation();
  const [name, setName] = useState(currentName);
  const [error, setError] = useState("");

  useEffect(() => {
    if (visible) {
      setName(currentName);
      setError("");
    }
  }, [visible, currentName]);

  async function handleConfirm() {
    const trimmed = name.trim();
    if (!trimmed) {
      setError("Name cannot be empty");
      return;
    }
    if (trimmed === currentName) {
      onClose();
      return;
    }
    try {
      await updateProfile({ name: trimmed }).unwrap();
      onClose();
    } catch (ex) {
      setError(ex?.data?.message ?? "Could not update profile — try again");
    }
  }

  return (
    <Dialog
      isOpen={visible}
      onClose={onClose}
      size="md"
      title="Edit Profile"
      contentClassName="bg-surface rounded-2xl p-2"
      footerClassName="gap-3 mt-2"
      onCancel={onClose}
      onConfirm={handleConfirm}
      confirmLabel="Save"
      confirmDisabled={isLoading || name.trim().length === 0}
      confirmLoading={isLoading}
    >
      <View className="gap-2">
        <TextInput
          value={name}
          onChangeText={setName}
          placeholder="Display name"
          placeholderTextColor={colors.surface.textDisabled}
          selectTextOnFocus
          className="border border-border rounded-md px-md py-[10px] text-sm text-neutral"
        />
        {error.length > 0 ? (
          <Text size="xs" className="text-danger">
            {error}
          </Text>
        ) : null}
      </View>
    </Dialog>
  );
}
