import React from "react";
import { View, Pressable, Image } from "react-native";
import { File } from "lucide-react-native";

// Utils
import { formatBytes } from "@shared-utils/utils";

// Theme
import { useTheme } from "@theme/useTheme";

// Components
import Text from "@components/ui/text/Text";

/**
 * A single file row in a file listing.
 * @param {object} item - Normalized file object with `id`, `name`, `size`, `mimeType`, `thumbnailUrl`
 * @param {() => void} [onPress=()=>{}] - Handler for tapping the file row
 * @param {() => void} [onLongPress=()=>{}] - Handler for long-pressing (e.g. to open action sheet)
 */
export default function FileListItem({ item = {}, onPress = () => {}, onLongPress = () => {} }) {
  const { colors } = useTheme();

  return (
    <Pressable
      onPress={onPress}
      onLongPress={onLongPress}
      android_ripple={{ color: colors.ripple.DEFAULT }}
      hitSlop={8}
      className="flex-row items-center px-4 py-3 gap-3"
    >
      <View className="w-10 h-10 rounded-xl bg-surface-card overflow-hidden items-center justify-center">
        {item.thumbnailUrl ? (
          <Image source={{ uri: item.thumbnailUrl }} style={{ width: 40, height: 40 }} resizeMode="cover" />
        ) : (
          <File size={20} color={colors.neutral.DEFAULT} />
        )}
      </View>
      <View className="flex-1">
        <Text variant="body1" weight="medium" numberOfLines={1}>
          {item.name}
        </Text>
        <Text variant="caption" color="secondary">
          {item.size != null ? formatBytes(item.size) : ""}
        </Text>
      </View>
    </Pressable>
  );
}
