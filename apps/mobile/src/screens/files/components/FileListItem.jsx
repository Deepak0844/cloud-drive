import React, { useState, useEffect } from "react";
import { View, Pressable, Image } from "react-native";
import { File } from "lucide-react-native";

// DB
import transfersRepository from "@db/repositories/transfersRepository";

// Utils
import { formatBytes } from "@shared-utils/utils";

// Theme
import { useTheme } from "@theme/useTheme";

// Components
import Text from "@components/ui/text/Text";
import GlassCard from "@components/ui/glass/GlassCard";

function TransferProgressBar({ fileId }) {
  const [pct, setPct] = useState(null);

  useEffect(() => {
    let mounted = true;

    async function poll() {
      const rows = await transfersRepository.getByStatus(["active", "pending", "paused"]);
      const match = rows.find((r) => r.fileId === fileId);
      if (mounted) setPct(match ? (match.progress ?? 0) : null);
    }

    poll();
    const interval = setInterval(poll, 1000);
    return () => {
      mounted = false;
      clearInterval(interval);
    };
  }, [fileId]);

  if (pct === null) return null;

  return (
    <View className="h-1 bg-neutral-subtle rounded-full overflow-hidden mt-1">
      <View className="h-full bg-primary rounded-full" style={{ width: `${pct}%` }} />
    </View>
  );
}

export default function FileListItem({ item = {}, onPress = () => {}, onLongPress = () => {} }) {
  const { colors } = useTheme();

  return (
    <Pressable onPress={onPress} onLongPress={onLongPress} android_ripple={{ color: colors.ripple.glass }}>
      <GlassCard>
        <View className="flex-row items-center gap-3">
          <View className="w-10 h-10 rounded-xl bg-neutral-subtle overflow-hidden items-center justify-center">
            {item.thumbnailUrl ? (
              <Image source={{ uri: item.thumbnailUrl }} style={{ width: 40, height: 40 }} resizeMode="cover" />
            ) : (
              <File size={20} color={colors.neutral.DEFAULT} />
            )}
          </View>
          <View className="flex-1">
            <Text size="md" className="font-medium" numberOfLines={1}>
              {item.name}
            </Text>
            <Text size="xs" className="text-secondary">
              {item.size != null ? formatBytes(item.size) : ""}
            </Text>
            <TransferProgressBar fileId={item.id} />
          </View>
        </View>
      </GlassCard>
    </Pressable>
  );
}
