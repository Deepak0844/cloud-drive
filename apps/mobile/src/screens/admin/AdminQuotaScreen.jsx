import React from "react";
import { View, FlatList } from "react-native";
import { CheckCircle, XCircle } from "lucide-react-native";

// Rtk
import { useGetQuotaRequestsQuery, useApproveQuotaMutation, useRejectQuotaMutation } from "@api/adminApi";

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
    <GlassCard className="mx-4 my-1">
      <Text size="md" bold numberOfLines={1}>
        {request.user?.name ?? request.user?.email ?? "Unknown user"}
      </Text>
      <Text size="xs" className="text-secondary mt-0.5">
        Requested: {NumberUtils.formatBytes(request.requested_quota_bytes)}
      </Text>
      {request.reason ? (
        <Text size="xs" className="text-secondary mt-0.5" numberOfLines={2}>
          {request.reason}
        </Text>
      ) : null}
      <View className="flex-row gap-2 mt-2">
        <Button size="sm" onPress={onApprove} disabled={isApproving || isRejecting}>
          {isApproving ? <ButtonSpinner /> : <CheckCircle size={14} color={colors.primary.foreground} />}
          <ButtonText>Approve</ButtonText>
        </Button>
        <Button variant="destructive" size="sm" onPress={onReject} disabled={isApproving || isRejecting}>
          {isRejecting ? <ButtonSpinner /> : <XCircle size={14} color={colors.primary.foreground} />}
          <ButtonText>Reject</ButtonText>
        </Button>
      </View>
    </GlassCard>
  );
}

export default function AdminQuotaScreen() {
  const { data, isLoading, refetch } = useGetQuotaRequestsQuery();
  const [approveQuota] = useApproveQuotaMutation();
  const [rejectQuota] = useRejectQuotaMutation();

  return (
    <ScreenLayout>
      <GlassHeader title="Quota Requests" />

      <Skeleton loading={isLoading}>
        <FlatList
          data={data?.items ?? []}
          keyExtractor={(item) => item._id ?? item.id}
          renderItem={({ item }) => (
            <QuotaRequestRow
              request={item}
              onApprove={() => approveQuota({ id: item._id ?? item.id })}
              onReject={() => rejectQuota({ id: item._id ?? item.id })}
            />
          )}
          refreshing={false}
          onRefresh={refetch}
          contentContainerClassName="py-2"
          ListEmptyComponent={isLoading ? null : <EmptyState message="No pending requests" />}
        />
      </Skeleton>
    </ScreenLayout>
  );
}
