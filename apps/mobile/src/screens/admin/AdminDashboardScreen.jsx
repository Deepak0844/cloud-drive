import React from "react";
import { View, ScrollView } from "react-native";
import { HardDrive, Users, FileText } from "lucide-react-native";

// Rtk
import { useGetSystemStatsQuery } from "@api/adminApi";

// Utils
import { formatBytes } from "@shared-utils/utils";

// Theme
import { useTheme } from "@theme/useTheme";

// Components
import Skeleton from "@components/ui/skeleton/Skeleton";
import ScreenLayout from "@components/ui/screen/ScreenLayout";
import GlassHeader from "@components/ui/header/GlassHeader";
import GlassCard from "@components/ui/glass/GlassCard";
import Text from "@components/ui/text/Text";

function StatCard({ Icon, label, value, iconColor }) {
  return (
    <GlassCard className="flex-1">
      <Icon size={22} color={iconColor} />
      <Text size="3xl" bold className="mt-2">
        {value}
      </Text>
      <Text size="xs" className="text-secondary mt-1">
        {label}
      </Text>
    </GlassCard>
  );
}

export default function AdminDashboardScreen() {
  const { colors } = useTheme();
  const { data, isLoading } = useGetSystemStatsQuery();

  return (
    <ScreenLayout>
      <GlassHeader title="Dashboard" />

      <Skeleton loading={isLoading}>
        <ScrollView className="flex-1 p-4" contentContainerClassName="gap-4 pb-4">
          <View className="flex-row gap-3">
            <StatCard
              Icon={HardDrive}
              label="Storage used"
              value={formatBytes(data?.totalStorageUsed)}
              iconColor={colors.primary.DEFAULT}
            />
            <StatCard
              Icon={Users}
              label="Total users"
              value={String(data?.totalUsers ?? 0)}
              iconColor={colors.success.DEFAULT}
            />
          </View>
          <View className="flex-row gap-3">
            <StatCard
              Icon={FileText}
              label="Total files"
              value={String(data?.totalFiles ?? 0)}
              iconColor={colors.warning.DEFAULT}
            />
          </View>
        </ScrollView>
      </Skeleton>
    </ScreenLayout>
  );
}
