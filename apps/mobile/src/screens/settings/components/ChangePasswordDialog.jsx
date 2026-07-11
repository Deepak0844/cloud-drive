import React, { useState, useEffect } from "react";
import { View, TextInput } from "react-native";

// Rtk
import { useUpdatePasswordMutation } from "@api/authApi";

// Theme
import { useTheme } from "@theme/useTheme";

// Components
import { Dialog } from "@components/ui/alert-dialog/AlertDialog";
import Text from "@components/ui/text/Text";

const MIN_PASSWORD_LENGTH = 8;

export default function ChangePasswordDialog({ visible = false, onClose = () => {} }) {
  const { colors } = useTheme();
  const [updatePassword, { isLoading }] = useUpdatePasswordMutation();

  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    if (visible) {
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
      setError("");
      setSuccess(false);
    }
  }, [visible]);

  async function handleConfirm() {
    setError("");
    if (newPassword.length < MIN_PASSWORD_LENGTH) {
      setError(`New password must be at least ${MIN_PASSWORD_LENGTH} characters`);
      return;
    }
    if (newPassword !== confirmPassword) {
      setError("Passwords do not match");
      return;
    }
    try {
      await updatePassword({ currentPassword, newPassword }).unwrap();
      setSuccess(true);
      setTimeout(onClose, 1200);
    } catch (ex) {
      const status = ex?.status ?? ex?.originalStatus;
      setError(
        status === 400 || status === 401
          ? "Current password is incorrect"
          : (ex?.data?.message ?? "Could not change password — try again")
      );
    }
  }

  const inputClassName = "border border-border rounded-md px-md py-[10px] text-sm text-neutral";

  return (
    <Dialog
      isOpen={visible}
      onClose={onClose}
      size="md"
      title="Change Password"
      contentClassName="bg-surface rounded-2xl p-2"
      footerClassName="gap-3 mt-2"
      onCancel={onClose}
      onConfirm={handleConfirm}
      confirmLabel="Update"
      confirmDisabled={isLoading || success || !currentPassword || !newPassword || !confirmPassword}
      confirmLoading={isLoading}
    >
      <View className="gap-3">
        <TextInput
          value={currentPassword}
          onChangeText={setCurrentPassword}
          placeholder="Current password"
          placeholderTextColor={colors.surface.textDisabled}
          secureTextEntry
          className={inputClassName}
        />
        <TextInput
          value={newPassword}
          onChangeText={setNewPassword}
          placeholder="New password"
          placeholderTextColor={colors.surface.textDisabled}
          secureTextEntry
          className={inputClassName}
        />
        <TextInput
          value={confirmPassword}
          onChangeText={setConfirmPassword}
          placeholder="Confirm new password"
          placeholderTextColor={colors.surface.textDisabled}
          secureTextEntry
          className={inputClassName}
        />
        {error.length > 0 ? (
          <Text size="xs" className="text-danger">
            {error}
          </Text>
        ) : null}
        {success ? (
          <Text size="xs" className="text-success">
            Password updated
          </Text>
        ) : null}
      </View>
    </Dialog>
  );
}
