import React from "react";
import { View, Pressable } from "react-native";
import { Folder } from "lucide-react-native";

// Theme
import { useTheme } from "@theme/useTheme";

// Components
import Text from "@components/ui/text/Text";

/**
 * A single folder row in a file listing.
 * @param {object} item - Folder data object with `id`, `name`, and optional `itemCount`
 * @param {() => void} [onPress=()=>{}] - Handler for tapping the folder row
 * @param {() => void} [onLongPress=()=>{}] - Handler for long-pressing (e.g. to open action sheet)
 */
export default function FolderListItem({ item = {}, onPress = () => {}, onLongPress = () => {} }) {
  const { colors } = useTheme();

  return (
    <Pressable
      onPress={onPress}
      onLongPress={onLongPress}
      android_ripple={{ color: colors.ripple.DEFAULT }}
      hitSlop={8}
      className="flex-row items-center px-4 py-3 gap-3"
    >
      <View className="w-10 h-10 rounded-xl bg-primary/10 items-center justify-center">
        <Folder size={20} color={colors.primary.DEFAULT} />
      </View>
      <View className="flex-1">
        <Text variant="body1" weight="medium" numberOfLines={1}>
          {item.name}
        </Text>
        {item.itemCount != null ? (
          <Text variant="caption" color="secondary">
            {item.itemCount} {item.itemCount === 1 ? "item" : "items"}
          </Text>
        ) : null}
      </View>
    </Pressable>
  );
}
