import React from "react";
import { View, Pressable, Dimensions } from "react-native";
import { File, CheckCircle2, Circle, Film, MoreVertical } from "lucide-react-native";

// Theme
import { useTheme } from "@theme/useTheme";

// Components
import AuthImage from "@components/media/AuthImage";
import Text from "@components/ui/text/Text";

const GRID_COLUMNS = 3;

/**
 * Grid tile for the files browser's grid view. Previewable files show their
 * thumbnail; everything else falls back to a file icon + name.
 */
// Categories the server can actually generate a thumbnail for
// (see FileService.getOrGenerateThumbnail) — documents/archives/other return
// no thumbnail, so they keep the icon+name fallback.
const THUMBNAILABLE_PREFIXES = ["image/", "video/", "audio/"];

export default function FileGridCell({
  file = null,
  selected = false,
  selectionMode = false,
  onPress = () => {},
  onLongPress = () => {},
  onOpenMenu = null,
}) {
  const { colors } = useTheme();
  const tileSize = Math.floor((Dimensions.get("window").width - 16) / GRID_COLUMNS) - 4;
  const isVideo = Boolean(file?.mimeType?.startsWith("video/"));
  const hasThumb = Boolean(file?.thumbnailUrl) && THUMBNAILABLE_PREFIXES.some((p) => file?.mimeType?.startsWith(p));

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
        className="flex-1 bg-neutral-subtle items-center justify-center"
      >
        {hasThumb ? (
          <AuthImage uri={file.thumbnailUrl} className="absolute inset-0" contentFit="cover" transition={150} />
        ) : (
          <View className="items-center justify-center gap-1 px-2">
            <File size={24} color={colors.neutral.DEFAULT} />
            <Text size="2xs" numberOfLines={2} className="text-secondary text-center">
              {file?.name ?? ""}
            </Text>
          </View>
        )}
        {hasThumb && isVideo ? (
          <View className="absolute bottom-1 right-1 rounded px-1 py-0.5 bg-black/60">
            <Film size={11} color={colors.neutral.foreground} />
          </View>
        ) : null}
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
          className="absolute top-1 left-2 w-6 h-6 rounded-full items-center justify-center bg-black/60"
        >
          <MoreVertical size={15} color={colors.neutral.foreground} />
        </Pressable>
      ) : null}
    </View>
  );
}
