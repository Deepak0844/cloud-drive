import React from "react";
import { View } from "react-native";

// Components
import Text from "@components/ui/text/Text";
import GlassCard from "@components/ui/glass/GlassCard";

const BAR_MAX_HEIGHT = 72;

/**
 * Uploads-by-period bar chart (design 12), fed by getSystemStats().file_stats.
 */
export default function UploadVelocityCard({ uploads24h = 0, uploads7d = 0, uploads30d = 0 }) {
  const bars = [
    { label: "Last 24h", value: uploads24h, colorClassName: "bg-primary-light" },
    { label: "Last 7d", value: uploads7d, colorClassName: "bg-primary" },
    { label: "Last 30d", value: uploads30d, colorClassName: "bg-primary-dark" },
  ];
  const max = Math.max(...bars.map((b) => b.value), 1);

  return (
    <GlassCard>
      <Text size="2xs" bold className="text-secondary uppercase tracking-widest mb-3">
        Uploads by Period
      </Text>
      <View className="flex-row items-end gap-3 h-[112px]">
        {bars.map(({ label, value, colorClassName }) => (
          <View key={label} className="flex-1 items-center justify-end gap-1">
            <Text size="xs" bold>
              {value.toLocaleString()}
            </Text>
            <View
              className={`w-full rounded-t-md ${colorClassName}`}
              style={{ height: Math.max((value / max) * BAR_MAX_HEIGHT, 4) }}
            />
            <Text size="2xs" className="text-secondary">
              {label}
            </Text>
          </View>
        ))}
      </View>
    </GlassCard>
  );
}
