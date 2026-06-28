import React from "react";
import { View, Pressable, Image } from "react-native";
import { File } from "lucide-react-native";

// Utils
import { formatBytes } from "@shared-utils/utils";

// Theme
import { useTheme } from "@theme/useTheme";

// Components
import Text from "@components/ui/text/Text";
import GlassCard from "@components/ui/glass/GlassCard";

/**
 * A single file row in a file listing backed by a glass card surface.
 * GlassCard handles visual surface; Pressable handles both press and long-press.
 * @param {object} item - Normalized file object with `id`, `name`, `size`, `mimeType`, `thumbnailUrl`
 * @param {() => void} [onPress=()=>{}] - Handler for tapping the file row
 * @param {() => void} [onLongPress=()=>{}] - Handler for long-pressing (e.g. to open action sheet)
 */
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
          </View>
        </View>
      </GlassCard>
    </Pressable>
  );
}
