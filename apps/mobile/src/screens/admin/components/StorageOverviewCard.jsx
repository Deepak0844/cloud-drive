import React from "react";
import { View } from "react-native";

// Utils
import { NumberUtils } from "@shared-utils/utils";

// Components
import Text from "@components/ui/text/Text";
import GlassCard from "@components/ui/glass/GlassCard";

/**
 * Platform storage overview (design 12), fed by getSystemStats():
 * storage_overview + file_stats.total_size_bytes.
 */
export default function StorageOverviewCard({ overview = {}, totalFileSizeBytes = 0 }) {
  const pct = Number(overview.utilization_percent ?? 0);

  return (
    <GlassCard className="flex-1">
      <Text size="2xs" bold className="text-secondary uppercase tracking-widest mb-2">
        Storage Overview
      </Text>
      <View className="flex-row justify-between mb-1">
        <Text size="xs" className="text-secondary">
          Platform Used
        </Text>
        <Text size="xs" bold className="text-warning">
          {pct.toFixed(1)}%
        </Text>
      </View>
      <View className="h-1.5 rounded-full bg-neutral-subtle overflow-hidden mb-1">
        <View className="h-full rounded-full bg-warning" style={{ width: `${Math.min(pct, 100)}%` }} />
      </View>
      <Text size="2xs" className="text-secondary mb-2">
        {NumberUtils.formatBytes(overview.total_used_bytes ?? 0)} of{" "}
        {NumberUtils.formatBytes(overview.total_allocated_bytes ?? 0)} allocated
      </Text>
      <View className="flex-row gap-2">
        <View className="flex-1 rounded-lg bg-glass-surface-bg border border-glass-surface-border p-2">
          <Text size="sm" bold className="text-danger-light">
            {overview.users_above_80_percent ?? 0}
          </Text>
          <Text size="2xs" className="text-secondary uppercase">
            Near Quota ≥80%
          </Text>
        </View>
        <View className="flex-1 rounded-lg bg-glass-surface-bg border border-glass-surface-border p-2">
          <Text size="sm" bold className="text-alt">
            {NumberUtils.formatBytes(totalFileSizeBytes)}
          </Text>
          <Text size="2xs" className="text-secondary uppercase">
            Total File Size
          </Text>
        </View>
      </View>
    </GlassCard>
  );
}
