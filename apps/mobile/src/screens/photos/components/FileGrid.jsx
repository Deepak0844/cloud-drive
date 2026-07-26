import React from "react";
import { View, Pressable, Dimensions } from "react-native";
import { Star, Film } from "lucide-react-native";

// Hooks
import { useResponsive } from "@hooks/useResponsive";

// Theme
import { useTheme } from "@theme/useTheme";

// Components
import AuthImage from "@components/media/AuthImage";

// Horizontal padding on the photos grid row (px-4). Subtracted from the window width so the tiles
// fit INSIDE that padding — otherwise they're sized to the full screen and overflow the right edge.
const GRID_HORIZONTAL_PADDING = 16;

export default function FileGrid({ file = null, onPress = null }) {
  const { columns } = useResponsive();
  const { colors } = useTheme();
  const tileSize = Math.floor((Dimensions.get("window").width - GRID_HORIZONTAL_PADDING * 2) / columns) - 2;

  return (
    <Pressable
      onPress={onPress}
      className="m-px overflow-hidden bg-neutral-subtle"
      style={{ width: tileSize, height: tileSize }}
    >
      <AuthImage uri={file?.thumbnailUrl ?? ""} className="absolute inset-0" contentFit="cover" transition={150} />
      {file?.isFavorite ? (
        <View className="absolute top-1.5 right-1.5">
          <Star size={12} color={colors.warning.DEFAULT} fill={colors.warning.DEFAULT} />
        </View>
      ) : null}
      {file?.mimeType?.startsWith("video/") ? (
        <View className="absolute bottom-1.5 right-1.5 rounded px-1 py-0.5 bg-black/60">
          <Film size={11} color={colors.neutral.foreground} />
        </View>
      ) : null}
    </Pressable>
  );
}
