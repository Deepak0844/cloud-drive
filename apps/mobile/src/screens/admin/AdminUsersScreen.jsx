import React from "react";
import { View, FlatList, Alert } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { UserCheck, UserX } from "lucide-react-native";
import SkeletonPlaceholder from "react-native-skeleton-placeholder";

// Rtk
import { useGetUsersQuery, useUpdateUserStatusMutation, useUpdateUserQuotaMutation } from "@api/adminApi";

// Utils
import { formatBytes } from "@shared-utils/utils";

// Theme
import { useTheme } from "@theme/useTheme";

// Components
import Text from "@components/ui/text/Text";
import Button from "@components/ui/button/Button";

function UserRow({ user = {}, onToggleStatus = () => {}, onEditQuota = () => {} }) {
  const { colors } = useTheme();
  return (
    <View className="px-4 py-3 border-b border-border gap-1">
      <View className="flex-row items-center justify-between">
        <View className="flex-1">
          <Text variant="body1" weight="medium" numberOfLines={1}>
            {user.name ?? user.email}
          </Text>
          <Text variant="caption" color="secondary">
            {user.email}
          </Text>
        </View>
        <View className={`px-2 py-0.5 rounded-full ${user.is_active ? "bg-success/15" : "bg-danger/15"}`}>
          <Text variant="caption" color={user.is_active ? "success" : "danger"}>
            {user.is_active ? "Active" : "Inactive"}
          </Text>
        </View>
      </View>
      <View className="flex-row items-center justify-between mt-1">
        <Text variant="caption" color="secondary">
          Quota: {formatBytes(user.quota_used)} / {formatBytes(user.quota_bytes)}
        </Text>
        <View className="flex-row gap-2">
          <Button
            variant="ghost"
            size="sm"
            onPress={() => onToggleStatus(user._id ?? user.id)}
            leftIcon={
              user.is_active ? (
                <UserX size={14} color={colors.danger.DEFAULT} />
              ) : (
                <UserCheck size={14} color={colors.success.DEFAULT} />
              )
            }
          >
            {user.is_active ? "Deactivate" : "Activate"}
          </Button>
          <Button variant="ghost" size="sm" onPress={() => onEditQuota(user._id ?? user.id)}>
            Quota
          </Button>
        </View>
      </View>
    </View>
  );
}

export default function AdminUsersScreen() {
  const { data, isLoading, refetch } = useGetUsersQuery();
  const [updateStatus] = useUpdateUserStatusMutation();
  const [updateQuota] = useUpdateUserQuotaMutation();

  async function handleToggleStatus(userId, isActive) {
    await updateStatus({ id: userId, is_active: !isActive });
  }

  function handleEditQuota(userId) {
    Alert.prompt(
      "Update quota",
      "Enter new quota in GB:",
      async (input) => {
        const gb = parseFloat(input);
        if (!isNaN(gb) && gb > 0) {
          await updateQuota({ id: userId, quota_bytes: Math.round(gb * 1024 * 1024 * 1024) });
        }
      },
      "plain-text"
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-surface-DEFAULT" edges={["top"]}>
      <View className="px-4 py-3 border-b border-border">
        <Text variant="h4" weight="bold">
          Users
        </Text>
      </View>
      <SkeletonPlaceholder enabled={isLoading} borderRadius={4}>
        <FlatList
          data={isLoading ? Array(5).fill({}) : (data?.items ?? [])}
          keyExtractor={(_, i) => String(i)}
          renderItem={({ item }) => (
            <UserRow
              user={item}
              onToggleStatus={(id) => handleToggleStatus(id, item.is_active)}
              onEditQuota={handleEditQuota}
            />
          )}
          refreshing={false}
          onRefresh={refetch}
          ListEmptyComponent={
            <View className="flex-1 items-center justify-center mt-20">
              <Text variant="body2" color="secondary">
                No users found
              </Text>
            </View>
          }
        />
      </SkeletonPlaceholder>
    </SafeAreaView>
  );
}
