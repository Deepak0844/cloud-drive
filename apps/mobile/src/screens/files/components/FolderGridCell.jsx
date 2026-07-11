import React from "react";
import { View, Pressable, Dimensions } from "react-native";
import { Folder, CheckCircle2, Circle, MoreVertical } from "lucide-react-native";

// Theme
import { useTheme } from "@theme/useTheme";

// Components
import Text from "@components/ui/text/Text";

const GRID_COLUMNS = 3;

/**
 * Grid tile for the files browser's grid view. Folder counterpart to
 * `FileGridCell` — folders have no thumbnail, so this always shows the
 * folder icon + name.
 */
export default function FolderGridCell({
  folder = null,
  selected = false,
  selectionMode = false,
  onPress = () => {},
  onLongPress = () => {},
  onOpenMenu = null,
}) {
  const { colors } = useTheme();
  const tileSize = Math.floor((Dimensions.get("window").width - 16) / GRID_COLUMNS) - 4;
  const iconSize = Math.floor(tileSize * 0.55);

  // The tap area and the menu button are siblings, not nested Pressables
  // — a Pressable inside another Pressable reliably loses its own touch
  // responder to the outer one on Android (see FileListItem's RowBody).
  return (
    <View
      className="m-0.5 rounded-md overflow-hidden border border-glass-card-border"
      style={{ width: tileSize, height: tileSize }}
    >
      <Pressable
        onPress={onPress}
        onLongPress={onLongPress}
        className="flex-1 bg-primary/10 items-center justify-center"
      >
        <View className="items-center justify-center gap-1 px-2">
          <Folder size={iconSize} color={colors.primary.DEFAULT} fill={colors.primary.DEFAULT} strokeWidth={0} />
          <Text size="2xs" numberOfLines={2} className="text-secondary text-center">
            {folder?.name ?? ""}
          </Text>
        </View>
        {selected ? <View className="absolute inset-0 bg-primary/20" /> : null}
      </Pressable>
      {selected ? <View className="absolute inset-0 rounded-xl border-2 border-primary" /> : null}
      {selected ? (
        <View className="absolute top-1 right-1 rounded-full bg-surface">
          <CheckCircle2 size={18} color={colors.primary.DEFAULT} />
        </View>
      ) : selectionMode ? (
        <View className="absolute top-1 right-1 rounded-full bg-surface/80">
          <Circle size={18} color={colors.neutral.light} />
        </View>
      ) : null}
      {onOpenMenu ? (
        <Pressable
          onPress={onOpenMenu}
          hitSlop={8}
          className="absolute top-1.5 left-2 w-6 h-6 rounded-full items-center justify-center bg-black/60"
        >
          <MoreVertical size={15} color={colors.neutral.foreground} />
        </Pressable>
      ) : null}
    </View>
  );
}
