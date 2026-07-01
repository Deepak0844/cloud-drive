import React from "react";
import { View, Pressable } from "react-native";
import { Folder } from "lucide-react-native";

// Theme
import { useTheme } from "@theme/useTheme";

// Components
import Text from "@components/ui/text/Text";
import GlassCard from "@components/ui/glass/GlassCard";

/**
 * A single folder row backed by a glass card surface.
 * @param {object} item - Folder data object with `id`, `name`, and optional `itemCount`
 * @param {() => void} [onPress=()=>{}] - Handler for tapping the folder row
 */
export default function FolderListItem({ item = {}, onPress = () => {}, onLongPress = null }) {
  const { colors } = useTheme();

  return (
    <Pressable onPress={onPress} onLongPress={onLongPress} android_ripple={{ color: colors.ripple.glass }}>
      <GlassCard>
        <View className="flex-row items-center gap-3">
          <View className="w-10 h-10 rounded-xl bg-primary/10 items-center justify-center">
            <Folder size={20} color={colors.primary.DEFAULT} />
          </View>
          <View className="flex-1">
            <Text size="md" className="font-medium" numberOfLines={1}>
              {item.name}
            </Text>
            {item.itemCount != null ? (
              <Text size="xs" className="text-secondary">
                {item.itemCount} {item.itemCount === 1 ? "item" : "items"}
              </Text>
            ) : null}
          </View>
        </View>
      </GlassCard>
    </Pressable>
  );
}
