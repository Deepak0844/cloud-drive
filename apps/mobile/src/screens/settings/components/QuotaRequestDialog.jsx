import React, { useState, useEffect } from "react";
import { View, Pressable, TextInput } from "react-native";

// Rtk
import { useRequestQuotaMutation } from "@api/quotaApi";

// Theme
import { useTheme } from "@theme/useTheme";

// Components
import { Dialog } from "@components/ui/alert-dialog/AlertDialog";
import Text from "@components/ui/text/Text";

const GB = 1024 * 1024 * 1024;
const SIZE_OPTIONS_GB = [50, 100, 200, 500];

export default function QuotaRequestDialog({ visible = false, currentQuotaBytes = 0, onClose = () => {} }) {
  const { colors } = useTheme();
  const [requestQuota, { isLoading }] = useRequestQuotaMutation();

  const [selectedGb, setSelectedGb] = useState(null);
  const [reason, setReason] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);

  // Only offer sizes above the current quota.
  const options = SIZE_OPTIONS_GB.filter((gb) => gb * GB > currentQuotaBytes);

  useEffect(() => {
    if (visible) {
      setSelectedGb(null);
      setReason("");
      setError("");
      setSuccess(false);
    }
  }, [visible]);

  async function handleConfirm() {
    setError("");
    if (!selectedGb) {
      setError("Pick a storage size");
      return;
    }
    try {
      await requestQuota({ requested_bytes: selectedGb * GB, reason: reason.trim() || undefined }).unwrap();
      setSuccess(true);
      setTimeout(onClose, 1200);
    } catch (ex) {
      setError(ex?.data?.message ?? "Could not submit request — try again");
    }
  }

  return (
    <Dialog
      isOpen={visible}
      onClose={onClose}
      size="md"
      title="Request More Storage"
      contentClassName="bg-surface rounded-2xl p-2"
      footerClassName="gap-3 mt-2"
      onCancel={onClose}
      onConfirm={handleConfirm}
      confirmLabel="Send Request"
      confirmDisabled={isLoading || success || !selectedGb}
      confirmLoading={isLoading}
    >
      <View className="gap-3">
        <View className="flex-row flex-wrap gap-2">
          {options.map((gb) => {
            const selected = selectedGb === gb;
            return (
              <Pressable
                key={gb}
                onPress={() => setSelectedGb(gb)}
                className={`h-9 px-3 rounded-full border items-center justify-center ${selected ? "bg-primary-subtle border-primary" : "border-border"}`}
              >
                <Text size="xs" bold className={selected ? "text-primary-light" : undefined}>
                  {gb} GB
                </Text>
              </Pressable>
            );
          })}
        </View>
        <TextInput
          value={reason}
          onChangeText={setReason}
          placeholder="Reason (optional)"
          placeholderTextColor={colors.surface.textDisabled}
          multiline
          numberOfLines={3}
          className="border border-border rounded-md px-md py-[10px] text-sm text-neutral min-h-[72px]"
          style={{ textAlignVertical: "top" }}
        />
        {error.length > 0 ? (
          <Text size="xs" className="text-danger">
            {error}
          </Text>
        ) : null}
        {success ? (
          <Text size="xs" className="text-success">
            Request submitted — an admin will review it
          </Text>
        ) : null}
      </View>
    </Dialog>
  );
}
