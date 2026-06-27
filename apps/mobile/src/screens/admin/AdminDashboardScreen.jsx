import React from "react";
import { View, ScrollView } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { HardDrive, Users, FileText } from "lucide-react-native";
import SkeletonPlaceholder from "react-native-skeleton-placeholder";

// Rtk
import { useGetSystemStatsQuery } from "@api/adminApi";

// Utils
import { formatBytes } from "@shared-utils/utils";

// Theme
import { useTheme } from "@theme/useTheme";

// Components
import Text from "@components/ui/text/Text";

/**
 * A stat card showing an icon, label, and value.
 * @param {React.ComponentType} Icon - Lucide icon component
 * @param {string} label - Card label
 * @param {string} value - Formatted value to display
 * @param {string} iconColor - Icon tint color
 */
function StatCard({ Icon, label, value, iconColor }) {
  return (
    <View className="flex-1 bg-surface-card rounded-2xl p-4 gap-2">
      <Icon size={22} color={iconColor} />
      <Text variant="h3" weight="bold">
        {value}
      </Text>
      <Text variant="caption" color="secondary">
        {label}
      </Text>
    </View>
  );
}

function DashboardBody({ isLoading = false, data = null, colors = {} }) {
  return (
    <SkeletonPlaceholder enabled={isLoading} borderRadius={16}>
      <ScrollView className="flex-1 p-4" contentContainerClassName="gap-4">
        <View className="flex-row gap-3">
          <StatCard
            Icon={HardDrive}
            label="Storage used"
            value={formatBytes(data?.totalStorageUsed)}
            iconColor={colors.primary?.DEFAULT}
          />
          <StatCard
            Icon={Users}
            label="Total users"
            value={String(data?.totalUsers ?? 0)}
            iconColor={colors.success?.DEFAULT}
          />
        </View>
        <View className="flex-row gap-3">
          <StatCard
            Icon={FileText}
            label="Total files"
            value={String(data?.totalFiles ?? 0)}
            iconColor={colors.warning?.DEFAULT}
          />
        </View>
      </ScrollView>
    </SkeletonPlaceholder>
  );
}

export default function AdminDashboardScreen() {
  const { colors } = useTheme();
  const { data, isLoading } = useGetSystemStatsQuery();

  return (
    <SafeAreaView className="flex-1 bg-surface-DEFAULT" edges={["top"]}>
      <View className="px-4 py-3 border-b border-border">
        <Text variant="h4" weight="bold">
          Dashboard
        </Text>
      </View>
      <DashboardBody isLoading={isLoading} data={data} colors={colors} />
    </SafeAreaView>
  );
}
