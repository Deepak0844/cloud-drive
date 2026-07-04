import React from "react";
import { View } from "react-native";
import { BlurView } from "expo-blur";
import { ChevronLeft } from "lucide-react-native";

// Theme
import { useTheme } from "@theme/useTheme";

// Components
import Text from "@components/ui/text/Text";
import IconButton from "@components/ui/icon-button/IconButton";

/**
 * Reusable glass screen header backed by BlurView.
 * Tint and blur intensity are driven by the active theme (dark glass / frosted white).
 *
 * @param {string}        [title='']       - Header title text
 * @param {ReactElement}  [titleElement]   - Optional custom title element; takes priority over title
 * @param {() => void}    [onBack]         - When provided, renders a ChevronLeft back button
 * @param {ReactElement}  [left]           - Optional custom left element; takes priority over onBack
 * @param {ReactElement}  [right]          - Optional element rendered on the right side
 * @param {string}        [accentColor]    - Optional hex colour for the bottom border tint
 */
export default function GlassHeader({
  title = "",
  titleElement = null,
  onBack = null,
  left = null,
  right = null,
  accentColor = null,
}) {
  const { glass = {}, colors = {} } = useTheme();
  const { blurIntensity, tint } = glass.bar;

  return (
    <BlurView
      intensity={blurIntensity}
      tint={tint}
      className="border-b border-glass-bar-border"
      style={accentColor ? { borderBottomColor: accentColor } : undefined}
    >
      <View className="flex-row items-center px-2 py-3 gap-1">
        {left ??
          (onBack ? (
            <IconButton
              icon={<ChevronLeft size={22} color={colors.neutral.DEFAULT} />}
              onPress={onBack}
              variant="ghost"
              size="sm"
            />
          ) : (
            <View className="w-8" />
          ))}

        {titleElement ?? (
          <Text size="xl" bold numberOfLines={1} className="flex-1">
            {title}
          </Text>
        )}

        {right ?? <View className="w-8" />}
      </View>
    </BlurView>
  );
}
