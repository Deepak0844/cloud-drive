import React from "react";
import { View, FlatList } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { CheckCircle, XCircle } from "lucide-react-native";
import SkeletonPlaceholder from "react-native-skeleton-placeholder";

// Rtk
import { useGetQuotaRequestsQuery, useApproveQuotaMutation, useRejectQuotaMutation } from "@api/adminApi";

// Utils
import { formatBytes } from "@shared-utils/utils";

// Theme
import { useTheme } from "@theme/useTheme";

// Components
import Text from "@components/ui/text/Text";
import Button, { ButtonSpinner, ButtonText } from "@components/ui/button/Button";

function QuotaRequestRow({
  request = {},
  onApprove = () => {},
  onReject = () => {},
  isApproving = false,
  isRejecting = false,
}) {
  const { colors } = useTheme();
  return (
    <View className="px-4 py-3 border-b border-border gap-2">
      <Text size="md" className="font-medium">
        {request.user?.name ?? request.user?.email ?? "Unknown user"}
      </Text>
      <Text size="xs" className="text-secondary">
        Requested: {formatBytes(request.requested_quota_bytes)}
      </Text>
      {request.reason ? (
        <Text size="xs" className="text-secondary" numberOfLines={2}>
          {request.reason}
        </Text>
      ) : null}
      <View className="flex-row gap-2 mt-1">
        <Button size="sm" onPress={onApprove} disabled={isApproving || isRejecting}>
          {isApproving ? <ButtonSpinner /> : <CheckCircle size={14} color={colors.primary.foreground} />}
          <ButtonText>Approve</ButtonText>
        </Button>
        <Button variant="destructive" size="sm" onPress={onReject} disabled={isApproving || isRejecting}>
          {isRejecting ? <ButtonSpinner /> : <XCircle size={14} color={colors.primary.foreground} />}
          <ButtonText>Reject</ButtonText>
        </Button>
      </View>
    </View>
  );
}

export default function AdminQuotaScreen() {
  const { data, isLoading, refetch } = useGetQuotaRequestsQuery();
  const [approveQuota] = useApproveQuotaMutation();
  const [rejectQuota] = useRejectQuotaMutation();

  return (
    <SafeAreaView className="flex-1 bg-surface-DEFAULT" edges={["top"]}>
      <View className="px-4 py-3 border-b border-border">
        <Text size="2xl" bold>
          Quota Requests
        </Text>
      </View>
      <SkeletonPlaceholder enabled={isLoading} borderRadius={4}>
        <FlatList
          data={isLoading ? Array(5).fill({}) : (data?.items ?? [])}
          keyExtractor={(_, i) => String(i)}
          renderItem={({ item }) => (
            <QuotaRequestRow
              request={item}
              onApprove={() => approveQuota({ id: item._id ?? item.id })}
              onReject={() => rejectQuota({ id: item._id ?? item.id })}
            />
          )}
          refreshing={false}
          onRefresh={refetch}
          ListEmptyComponent={
            <View className="flex-1 items-center justify-center mt-20">
              <Text size="sm" className="text-secondary">
                No pending requests
              </Text>
            </View>
          }
        />
      </SkeletonPlaceholder>
    </SafeAreaView>
  );
}
