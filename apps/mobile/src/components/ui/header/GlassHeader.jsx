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
 * @param {string}              [title='']     - Header title text
 * @param {() => void}          [onBack]       - When provided, renders a ChevronLeft back button
 * @param {import('react').ReactElement} [rightSlot] - Optional element rendered on the right side
 */
export default function GlassHeader({ title = "", onBack = null, rightSlot = null }) {
  const { glass = {}, colors = {} } = useTheme();
  const { blurIntensity, tint } = glass.bar;

  return (
    <BlurView intensity={blurIntensity} tint={tint} className="border-b border-glass-bar-border">
      <View className="flex-row items-center px-2 py-3 gap-1">
        {onBack ? (
          <IconButton
            icon={<ChevronLeft size={22} color={colors.neutral.DEFAULT} />}
            onPress={onBack}
            variant="ghost"
            size="sm"
          />
        ) : (
          <View className="w-8" />
        )}

        <Text size="xl" bold numberOfLines={1} className="flex-1">
          {title}
        </Text>

        {rightSlot ? rightSlot : <View className="w-8" />}
      </View>
    </BlurView>
  );
}
