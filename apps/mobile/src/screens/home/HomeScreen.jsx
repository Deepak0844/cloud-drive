import React from "react";
import { View, ScrollView, FlatList } from "react-native";
import Svg, { Circle } from "react-native-svg";
import { Search, Settings } from "lucide-react-native";

// Rtk
import { useGetQuotaUsageQuery, useGetQuotaBreakdownQuery } from "@api/quotaApi";
import { useGetRecentFilesQuery } from "@api/fileApi";

// Utils
import { formatBytes } from "@shared-utils/utils";

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

// Sections
import FileListItem from "@screens/files/components/FileListItem";

const QUOTA_R = 44;
const QUOTA_STROKE = 8;
const QUOTA_CIRC = 2 * Math.PI * QUOTA_R;

function QuotaRing({ usedBytes = 0, totalBytes = 1, colors = {} }) {
  const pct = Math.min(usedBytes / totalBytes, 1);
  const dash = pct * QUOTA_CIRC;
  return (
    <View className="items-center gap-2">
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
      <Text size="sm" className="text-secondary">
        {formatBytes(usedBytes)} / {formatBytes(totalBytes)}
      </Text>
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
          {formatBytes(bytes)}
        </Text>
      </View>
      <View className="h-1.5 rounded-full bg-neutral-subtle">
        <View className="h-1.5 rounded-full" style={{ width: `${Math.round(pct * 100)}%`, backgroundColor: color }} />
      </View>
    </View>
  );
}

function StorageCard({ quota = null, onRetry = () => {} }) {
  const { colors } = useTheme();
  return (
    <GlassCard>
      <Text bold className="mb-3">
        Storage
      </Text>
      {quota ? (
        <QuotaRing usedBytes={quota.used_bytes ?? 0} totalBytes={quota.quota_bytes ?? 1} colors={colors} />
      ) : (
        <GlassCard>
          <Text size="sm" className="text-secondary text-center">
            Could not load quota
          </Text>
          <Button variant="outline" size="sm" onPress={onRetry} className="mt-2">
            <ButtonText>Retry</ButtonText>
          </Button>
        </GlassCard>
      )}
    </GlassCard>
  );
}

function RecentFilesStrip({ items = [], onNavigate = () => {} }) {
  return (
    <View className="gap-2">
      <Text bold size="md">
        Recent
      </Text>
      <FlatList
        horizontal
        showsHorizontalScrollIndicator={false}
        data={items}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <View className="w-56 mr-3">
            <FileListItem item={item} onPress={() => onNavigate(item.id)} onLongPress={() => {}} />
          </View>
        )}
        ListEmptyComponent={<EmptyState message="No recent files" />}
      />
    </View>
  );
}

function StorageBreakdownCard({ categories = [], totalBytes = 1, categoryColors = {} }) {
  const { colors } = useTheme();
  return (
    <GlassCard>
      <Text bold className="mb-3">
        By type
      </Text>
      <View className="gap-3">
        {categories.map((item) => (
          <StorageBar
            key={item.category}
            label={item.category.charAt(0).toUpperCase() + item.category.slice(1)}
            bytes={item.total_size_bytes ?? 0}
            totalBytes={totalBytes}
            color={categoryColors[item.category] ?? colors.neutral.DEFAULT}
          />
        ))}
      </View>
    </GlassCard>
  );
}

export default function HomeScreen({ navigation = {} }) {
  const { colors } = useTheme();
  const { data: quota, isLoading: quotaLoading, refetch: refetchQuota } = useGetQuotaUsageQuery();
  const { data: breakdown } = useGetQuotaBreakdownQuery();
  const { data: recent, isLoading: recentLoading, refetch: refetchRecent } = useGetRecentFilesQuery({ limit: 6 });

  const isLoading = quotaLoading || recentLoading;

  const categoryColors = {
    images: colors.primary.DEFAULT,
    video: colors.alt.DEFAULT,
    audio: colors.warning.DEFAULT,
    docs: colors.success.DEFAULT,
    other: colors.neutral.DEFAULT,
  };

  function handleRetry() {
    refetchQuota();
    refetchRecent();
  }

  const headerRight = (
    <View className="flex-row gap-1">
      <IconButton
        icon={<Search size={20} color={colors.neutral.DEFAULT} />}
        onPress={() => navigation.navigate(AppScreens.SEARCH)}
        variant="ghost"
        size="sm"
      />
      <IconButton
        icon={<Settings size={20} color={colors.neutral.DEFAULT} />}
        onPress={() => navigation.navigate(AppScreens.SETTINGS)}
        variant="ghost"
        size="sm"
      />
    </View>
  );

  return (
    <ScreenLayout>
      <GlassHeader title="Home" right={headerRight} accentColor={colors.primary.DEFAULT} />

      <Skeleton loading={isLoading}>
        <ScrollView className="flex-1 p-4" contentContainerClassName="gap-4 pb-4">
          <StorageCard quota={quota} onRetry={handleRetry} />
          <RecentFilesStrip
            items={recent?.items ?? []}
            onNavigate={(id) => navigation.navigate(AppScreens.FILE_DETAIL, { fileId: id })}
          />
          {Array.isArray(breakdown) && breakdown.length > 0 && (
            <StorageBreakdownCard
              categories={breakdown}
              totalBytes={quota?.quota_bytes ?? 1}
              categoryColors={categoryColors}
            />
          )}
        </ScrollView>
      </Skeleton>
    </ScreenLayout>
  );
}
