import React from "react";
import { MoreVertical } from "lucide-react-native";

// Theme
import { useTheme } from "@theme/useTheme";

// Components
import IconButton from "@components/ui/icon-button/IconButton";

/**
 * Three-dot row action trigger — a normal tap target, so it doesn't compete
 * with a row's swipe/pan gesture the way long-press does.
 */
export default function FileMoreButton({ onPress = () => {} }) {
  const { colors } = useTheme();
  return (
    <IconButton
      icon={<MoreVertical size={17} color={colors.neutral.light} />}
      onPress={onPress}
      variant="ghost"
      size="sm"
    />
  );
}
