import React, { useState } from "react";
import { View, FlatList } from "react-native";
import { UserCheck, UserX } from "lucide-react-native";

// Rtk
import { useGetUsersQuery, useUpdateUserStatusMutation, useUpdateUserQuotaMutation } from "@api/adminApi";

// Utils
import { NumberUtils } from "@shared-utils/utils";

// Theme
import { useTheme } from "@theme/useTheme";

// Components
import Skeleton from "@components/ui/skeleton/Skeleton";
import ScreenLayout from "@components/ui/screen/ScreenLayout";
import GlassHeader from "@components/ui/header/GlassHeader";
import GlassCard from "@components/ui/glass/GlassCard";
import EmptyState from "@components/ui/empty-state/EmptyState";
import Text from "@components/ui/text/Text";
import Button, { ButtonText } from "@components/ui/button/Button";
import { Input, InputField } from "@components/ui/input/Input";
import { Dialog } from "@components/ui/alert-dialog/AlertDialog";

function UserRow({ user = {}, onToggleStatus = () => {}, onEditQuota = () => {} }) {
  const { colors } = useTheme();
  return (
    <GlassCard className="mx-4 my-1">
      <View className="flex-row items-center justify-between mb-1">
        <View className="flex-1">
          <Text size="md" bold numberOfLines={1}>
            {user.name ?? user.email}
          </Text>
          <Text size="xs" className="text-secondary">
            {user.email}
          </Text>
        </View>
        <View className={`px-2 py-0.5 rounded-full ${user.is_active ? "bg-success/15" : "bg-danger/15"}`}>
          <Text size="xs" className={user.is_active ? "text-success" : "text-danger"}>
            {user.is_active ? "Active" : "Inactive"}
          </Text>
        </View>
      </View>
      <View className="flex-row items-center justify-between mt-1">
        <Text size="xs" className="text-secondary">
          {NumberUtils.formatBytes(user.quota_used)} / {NumberUtils.formatBytes(user.quota_bytes)}
        </Text>
        <View className="flex-row gap-2">
          <Button variant="ghost" size="sm" onPress={() => onToggleStatus(user._id ?? user.id)}>
            {user.is_active ? (
              <UserX size={14} color={colors.danger.DEFAULT} />
            ) : (
              <UserCheck size={14} color={colors.success.DEFAULT} />
            )}
            <ButtonText>{user.is_active ? "Deactivate" : "Activate"}</ButtonText>
          </Button>
          <Button variant="ghost" size="sm" onPress={() => onEditQuota(user._id ?? user.id)}>
            <ButtonText>Quota</ButtonText>
          </Button>
        </View>
      </View>
    </GlassCard>
  );
}

export default function AdminUsersScreen() {
  const { data, isLoading, refetch } = useGetUsersQuery();
  const [updateStatus] = useUpdateUserStatusMutation();
  const [updateQuota] = useUpdateUserQuotaMutation();

  const [quotaDialog, setQuotaDialog] = useState({ open: false, userId: null });
  const [quotaInput, setQuotaInput] = useState("");

  async function handleToggleStatus(userId, isActive) {
    await updateStatus({ id: userId, is_active: !isActive });
  }

  function handleEditQuota(userId) {
    setQuotaInput("");
    setQuotaDialog({ open: true, userId });
  }

  async function handleConfirmQuota() {
    const gb = parseFloat(quotaInput);
    if (!isNaN(gb) && gb > 0) {
      await updateQuota({ id: quotaDialog.userId, quota_bytes: Math.round(gb * 1024 * 1024 * 1024) });
    }
    setQuotaDialog({ open: false, userId: null });
  }

  function handleCloseQuota() {
    setQuotaDialog({ open: false, userId: null });
  }

  return (
    <ScreenLayout>
      <GlassHeader title="Users" />

      <Skeleton loading={isLoading}>
        <FlatList
          data={data?.items ?? []}
          keyExtractor={(item) => item._id ?? item.id}
          renderItem={({ item }) => (
            <UserRow
              user={item}
              onToggleStatus={(id) => handleToggleStatus(id, item.is_active)}
              onEditQuota={handleEditQuota}
            />
          )}
          refreshing={false}
          onRefresh={refetch}
          contentContainerClassName="py-2"
          ListEmptyComponent={isLoading ? null : <EmptyState message="No users found" />}
        />
      </Skeleton>

      <Dialog
        isOpen={quotaDialog.open}
        onClose={handleCloseQuota}
        title="Update Quota"
        onCancel={handleCloseQuota}
        onConfirm={handleConfirmQuota}
        confirmLabel="Update"
      >
        <Input>
          <InputField
            value={quotaInput}
            onChangeText={setQuotaInput}
            placeholder="Quota in GB"
            keyboardType="decimal-pad"
          />
        </Input>
      </Dialog>
    </ScreenLayout>
  );
}
