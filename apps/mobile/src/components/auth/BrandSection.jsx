import React from "react";
import { View } from "react-native";
import { Cloud } from "lucide-react-native";

// Components
import Text from "@components/ui/text/Text";
import Wordmark from "@components/ui/wordmark/Wordmark";

// Theme
import { useTheme } from "@theme/useTheme";

/**
 * Aurora-themed brand header shared by all auth screens.
 * Renders the Cloud Drive logo badge, wordmark, and an optional tagline.
 * @param {string} [subtitle=''] - Optional tagline rendered below the wordmark
 */
export default function BrandSection({ subtitle = "" }) {
  const { colors } = useTheme();

  return (
    <View className="items-center">
      <View className="rounded-2xl shadow-lg shadow-primary">
        <View className="w-20 h-20 items-center justify-center bg-white/8 border border-white/[18] rounded-2xl overflow-hidden">
          <Cloud size={34} color="white" strokeWidth={1.5} />
        </View>
      </View>
      <View className="w-full mt-lg">
        <Wordmark
          gradientId="wordmarkGradient"
          gradientColors={[colors.primary.DEFAULT, colors.alt.DEFAULT, colors.accent.pink]}
          height={40}
          fontSize={28}
          fontWeight="900"
          letterSpacing={-0.5}
          align="center"
          y={30}
        />
      </View>
      {subtitle ? (
        <Text size="sm" className="text-white/50 text-center mt-xs">
          {subtitle}
        </Text>
      ) : null}
    </View>
  );
}
