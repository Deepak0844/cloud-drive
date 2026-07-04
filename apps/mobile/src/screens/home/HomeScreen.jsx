import React from "react";
import { View, ScrollView, Pressable } from "react-native";
import { DrawerActions } from "@react-navigation/native";
import Svg, { Circle } from "react-native-svg";
import { Search, Settings, Menu } from "lucide-react-native";

// Rtk
import { useGetQuotaUsageQuery, useGetQuotaBreakdownQuery } from "@api/quotaApi";
import { useGetRecentFilesQuery } from "@api/fileApi";

// Utils
import { NumberUtils } from "@shared-utils/utils";

// Constants
import { AppScreens } from "@constants/appScreens";

// Theme
import { useTheme } from "@theme/useTheme";

// Components
import ScreenLayout from "@components/ui/screen/ScreenLayout";
import GlassHeader from "@components/ui/header/GlassHeader";
import IconButton from "@components/ui/icon-button/IconButton";
import GlassCard from "@components/ui/glass/GlassCard";
import Skeleton from "@components/ui/skeleton/Skeleton";
import Text from "@components/ui/text/Text";
import EmptyState from "@components/ui/empty-state/EmptyState";
import Button, { ButtonText } from "@components/ui/button/Button";
import Wordmark from "@components/ui/wordmark/Wordmark";

// Sections
import FileListItem from "@screens/files/components/FileListItem";

const QUOTA_R = 44;
const QUOTA_STROKE = 8;
const QUOTA_CIRC = 2 * Math.PI * QUOTA_R;

function QuotaRing({ usedBytes = 0, totalBytes = 1, colors = {} }) {
  const pct = Math.min(usedBytes / totalBytes, 1);
  const dash = pct * QUOTA_CIRC;
  return (
    <View className="items-center justify-center">
      <Svg width={104} height={104}>
        <Circle cx={52} cy={52} r={QUOTA_R} stroke={colors.neutral.subtle} strokeWidth={QUOTA_STROKE} fill="none" />
        <Circle
          cx={52}
          cy={52}
          r={QUOTA_R}
          stroke={colors.primary.DEFAULT}
          strokeWidth={QUOTA_STROKE}
          fill="none"
          strokeDasharray={`${dash} ${QUOTA_CIRC}`}
          strokeLinecap="round"
          transform="rotate(-90, 52, 52)"
        />
      </Svg>
      <View className="absolute items-center">
        <Text size="lg" bold>
          {Math.round(pct * 100)}%
        </Text>
        <Text size="2xs" className="text-secondary uppercase tracking-wider">
          used
        </Text>
      </View>
    </View>
  );
}

function StorageBar({ label = "", bytes = 0, totalBytes = 1, color = "#7c3aed" }) {
  const pct = totalBytes > 0 ? Math.min(bytes / totalBytes, 1) : 0;
  return (
    <View className="gap-1">
      <View className="flex-row justify-between">
        <Text size="xs" className="text-secondary">
          {label}
        </Text>
        <Text size="xs" className="text-secondary">
          {NumberUtils.formatBytes(bytes)}
        </Text>
      </View>
      <View className="h-1.5 rounded-full bg-neutral-subtle">
        <View className="h-1.5 rounded-full" style={{ width: `${Math.round(pct * 100)}%`, backgroundColor: color }} />
      </View>
    </View>
  );
}

function StorageCard({ quota = null, breakdown = [], categoryColors = {}, onRetry = () => {} }) {
  const { colors } = useTheme();

  if (!quota) {
    return (
      <GlassCard>
        <Text size="sm" className="text-secondary text-center">
          Could not load quota
        </Text>
        <Button variant="outline" size="sm" onPress={onRetry} className="mt-2">
          <ButtonText>Retry</ButtonText>
        </Button>
      </GlassCard>
    );
  }

  return (
    <GlassCard>
      <View className="flex-row items-center gap-5">
        <QuotaRing usedBytes={quota.used_bytes ?? 0} totalBytes={quota.quota_bytes ?? 1} colors={colors} />
        <View className="flex-1 gap-3">
          <View>
            <Text size="md" bold>
              Drive Capacity
            </Text>
            <Text size="xs" className="text-secondary">
              {NumberUtils.formatBytes(quota.used_bytes ?? 0)} of {NumberUtils.formatBytes(quota.quota_bytes ?? 1)} used
            </Text>
          </View>
          {breakdown.map((item) => (
            <StorageBar
              key={item.category}
              label={item.category.charAt(0).toUpperCase() + item.category.slice(1)}
              bytes={item.total_size_bytes ?? 0}
              totalBytes={quota.quota_bytes ?? 1}
              color={categoryColors[item.category] ?? colors.neutral.DEFAULT}
            />
          ))}
        </View>
      </View>
    </GlassCard>
  );
}

function RecentFilesList({ items = [], onNavigate = () => {}, onSeeAll = () => {} }) {
  return (
    <View className="gap-2">
      <View className="flex-row items-center justify-between">
        <Text bold size="xs" className="uppercase tracking-wider">
          Recent
        </Text>
        <Pressable onPress={onSeeAll}>
          <Text size="xs" bold className="text-primary">
            See all →
          </Text>
        </Pressable>
      </View>
      {items.length > 0 ? (
        <View className="gap-2">
          {items.map((item) => (
            <FileListItem key={item.id} item={item} onPress={() => onNavigate(item.id)} onLongPress={() => {}} />
          ))}
        </View>
      ) : (
        <EmptyState message="No recent files" />
      )}
    </View>
  );
}

export default function HomeScreen({ navigation = {} }) {
  const { colors } = useTheme();
  const { data: quota, isLoading: quotaLoading, refetch: refetchQuota } = useGetQuotaUsageQuery();
  const { data: breakdown } = useGetQuotaBreakdownQuery();
  const { data: recent, isLoading: recentLoading, refetch: refetchRecent } = useGetRecentFilesQuery({ limit: 6 });

  const isLoading = quotaLoading || recentLoading;

  const categoryColors = {
    images: colors.alt.DEFAULT,
    video: colors.primary.DEFAULT,
    audio: colors.warning.DEFAULT,
    docs: colors.success.DEFAULT,
    other: colors.neutral.DEFAULT,
  };

  function handleRetry() {
    refetchQuota();
    refetchRecent();
  }

  const headerLeft = (
    <IconButton
      icon={<Menu size={20} color={colors.neutral.DEFAULT} />}
      onPress={() => navigation.dispatch(DrawerActions.openDrawer())}
      variant="ghost"
      size="sm"
    />
  );

  const headerRight = (
    <View className="flex-row gap-1">
      <IconButton
        icon={<Search size={20} color={colors.neutral.DEFAULT} />}
        onPress={() => navigation.navigate(AppScreens.SEARCH)}
        variant="ghost"
        size="sm"
      />
      <IconButton
        icon={<Settings size={17} color={colors.primary.light} />}
        onPress={() => navigation.navigate(AppScreens.SETTINGS)}
        variant="ghost"
        size="sm"
        className="bg-primary/[15] border border-primary/30"
      />
    </View>
  );

  return (
    <ScreenLayout>
      <GlassHeader
        titleElement={
          <View className="flex-1">
            <Wordmark
              gradientId="homeWordmarkGradient"
              gradientColors={[colors.primary.DEFAULT, colors.alt.DEFAULT]}
              height={22}
              fontSize={17}
              y={17}
            />
          </View>
        }
        left={headerLeft}
        right={headerRight}
        accentColor={colors.primary.DEFAULT}
      />

      <Skeleton loading={isLoading}>
        <ScrollView className="flex-1 p-4" contentContainerClassName="gap-4 pb-4">
          <StorageCard
            quota={quota}
            breakdown={Array.isArray(breakdown) ? breakdown : []}
            categoryColors={categoryColors}
            onRetry={handleRetry}
          />
          <RecentFilesList
            items={recent?.items ?? []}
            onNavigate={(id) => navigation.navigate(AppScreens.FILE_DETAIL, { fileId: id })}
            onSeeAll={() => navigation.navigate(AppScreens.RECENT)}
          />
        </ScrollView>
      </Skeleton>
    </ScreenLayout>
  );
}
