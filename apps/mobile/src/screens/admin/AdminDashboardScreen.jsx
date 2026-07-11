import React from "react";
import { View, ScrollView, RefreshControl } from "react-native";
import { Users, Zap, Bell } from "lucide-react-native";

// Constants
import { AppScreens } from "@constants/appScreens";

// Rtk
import { useGetSystemStatsQuery, useGetQuotaRequestsQuery } from "@api/adminApi";
import { useGetNotificationsQuery } from "@api/notificationApi";

// Hooks
import { useHardwareLiveStats } from "@hooks/useHardwareLiveStats";

// Utils
import { NumberUtils } from "@shared-utils/utils";

// Theme
import { useTheme } from "@theme/useTheme";

// Components
import Skeleton from "@components/ui/skeleton/Skeleton";
import ScreenLayout from "@components/ui/screen/ScreenLayout";
import GlassHeader from "@components/ui/header/GlassHeader";
import GlassCard from "@components/ui/glass/GlassCard";
import Text from "@components/ui/text/Text";
import IconButton from "@components/ui/icon-button/IconButton";
import HardwareGaugeCard from "./components/HardwareGaugeCard";
import UserStatusDonut from "./components/UserStatusDonut";
import StorageOverviewCard from "./components/StorageOverviewCard";
import UploadVelocityCard from "./components/UploadVelocityCard";

function SectionHeader({ title }) {
  return (
    <View className="flex-row items-center gap-2 mt-2">
      <Text size="2xs" bold className="text-secondary uppercase tracking-widest">
        {title}
      </Text>
      <View className="flex-1 h-px bg-border" />
    </View>
  );
}

const KPI_VARIANTS = {
  primary: { chip: "bg-primary-light/10 border-primary-light/20", value: "text-primary-light" },
  warning: { chip: "bg-warning/10 border-warning/20", value: "text-warning" },
};

function KpiCard({ Icon, value, label, sub, variant, iconColor }) {
  const tint = KPI_VARIANTS[variant];
  return (
    <GlassCard className="flex-1">
      <View className={`w-8 h-8 rounded-lg items-center justify-center mb-2 border ${tint.chip}`}>
        <Icon size={14} color={iconColor} />
      </View>
      <Text size="2xl" bold className={tint.value}>
        {value}
      </Text>
      <Text size="2xs" bold className="text-secondary uppercase tracking-wider mt-1">
        {label}
      </Text>
      {sub ? (
        <Text size="2xs" className="text-secondary mt-0.5">
          {sub}
        </Text>
      ) : null}
    </GlassCard>
  );
}

export default function AdminDashboardScreen({ navigation = {} }) {
  const { colors } = useTheme();
  const { data, isLoading, isFetching, refetch } = useGetSystemStatsQuery();
  const { data: pendingRequests } = useGetQuotaRequestsQuery({ status: "pending" });
  const { data: notifications } = useGetNotificationsQuery();

  const unreadCount = (Array.isArray(notifications) ? notifications : []).filter((n) => n.is_read === false).length;

  const hardware = useHardwareLiveStats(data?.system ?? null);

  const userStats = data?.user_stats ?? {};
  const storageOverview = data?.storage_overview ?? {};
  const fileStats = data?.file_stats ?? {};
  const quotaStats = data?.quota_requests ?? {};
  const pendingCount = quotaStats.pending ?? pendingRequests?.items?.length ?? 0;

  const memUsedGb = hardware?.memory ? (hardware.memory.used / 1024 ** 3).toFixed(1) : null;
  const memTotalGb = hardware?.memory ? (hardware.memory.total / 1024 ** 3).toFixed(1) : null;

  return (
    <ScreenLayout>
      <GlassHeader
        titleElement={
          <View className="flex-1">
            <Text size="2xs" bold className="text-secondary uppercase tracking-widest">
              Admin
            </Text>
            <Text size="xl" bold>
              Dashboard
            </Text>
          </View>
        }
        right={
          <View className="flex-row items-center gap-2">
            <View className="flex-row items-center gap-1.5 px-2.5 py-1 rounded-full border border-success/30 bg-success/10">
              <View className="w-1.5 h-1.5 rounded-full bg-success" />
              <Text size="2xs" bold className="text-success uppercase tracking-widest">
                Live
              </Text>
            </View>
            <View>
              <IconButton
                icon={<Bell size={18} color={colors.neutral.DEFAULT} />}
                onPress={() => navigation.navigate(AppScreens.NOTIFICATIONS)}
                variant="ghost"
                size="sm"
              />
              {unreadCount > 0 ? (
                <View className="absolute -top-0.5 -right-0.5 min-w-4 h-4 px-0.5 rounded-full bg-danger items-center justify-center">
                  <Text size="2xs" bold className="text-danger-foreground">
                    {unreadCount > 9 ? "9+" : unreadCount}
                  </Text>
                </View>
              ) : null}
            </View>
          </View>
        }
      />

      <Skeleton loading={isLoading}>
        <ScrollView
          className="flex-1 px-4"
          contentContainerClassName="gap-3 pb-6 pt-3"
          refreshControl={<RefreshControl refreshing={isFetching && !isLoading} onRefresh={refetch} />}
        >
          <SectionHeader title="Overview" />
          <View className="flex-row gap-3">
            <KpiCard
              Icon={Users}
              value={String(userStats.total ?? 0)}
              label="Total Users"
              sub={`+${userStats.new_last_7d ?? 0} new this week`}
              variant="primary"
              iconColor={colors.primary.light}
            />
            <KpiCard
              Icon={Zap}
              value={String(pendingCount)}
              label="Pending Quotas"
              sub={`${quotaStats.approved_this_month ?? 0} approved this month`}
              variant="warning"
              iconColor={colors.warning.DEFAULT}
            />
          </View>

          <SectionHeader title="Server Health" />
          <View className="flex-row gap-2">
            <HardwareGaugeCard
              title="CPU"
              percent={Number(hardware?.cpu?.load ?? 0)}
              sub={hardware?.cpu?.temp != null && hardware.cpu.temp !== "N/A" ? `Temp: ${hardware.cpu.temp}°C` : ""}
              color={colors.primary.DEFAULT}
            />
            <HardwareGaugeCard
              title="Memory"
              percent={Number(hardware?.memory?.usage_percent ?? 0)}
              sub={memUsedGb ? `${memUsedGb}/${memTotalGb} GB` : ""}
              color={colors.alt.DEFAULT}
            />
            <HardwareGaugeCard
              title={`Disk ${hardware?.disk?.path ?? "/"}`}
              percent={Number(hardware?.disk?.usage_percent ?? 0)}
              sub={
                hardware?.disk
                  ? `${NumberUtils.formatBytes(hardware.disk.used)}/${NumberUtils.formatBytes(hardware.disk.total)}`
                  : ""
              }
              color={colors.warning.DEFAULT}
            />
          </View>

          <SectionHeader title="Analytics" />
          <View className="flex-row gap-3">
            <UserStatusDonut
              total={userStats.total ?? 0}
              active={userStats.active ?? 0}
              inactive={userStats.inactive ?? 0}
            />
            <StorageOverviewCard overview={storageOverview} totalFileSizeBytes={fileStats.total_size_bytes ?? 0} />
          </View>

          <SectionHeader title="Upload Velocity" />
          <UploadVelocityCard
            uploads24h={fileStats.uploads_last_24h ?? 0}
            uploads7d={fileStats.uploads_last_7d ?? 0}
            uploads30d={fileStats.uploads_last_30d ?? 0}
          />
        </ScrollView>
      </Skeleton>
    </ScreenLayout>
  );
}
