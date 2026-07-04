import React from "react";
import { View } from "react-native";
import { Cloud } from "lucide-react-native";
import Svg, { Defs, LinearGradient, Stop, Text as SvgText } from "react-native-svg";

// Components
import Text from "@components/ui/text/Text";

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
        <Svg width="100%" height={40}>
          <Defs>
            <LinearGradient id="wordmarkGradient" x1="0%" y1="0%" x2="100%" y2="100%">
              <Stop offset="0%" stopColor={colors.primary.DEFAULT} />
              <Stop offset="50%" stopColor={colors.alt.DEFAULT} />
              <Stop offset="100%" stopColor={colors.accent.pink} />
            </LinearGradient>
          </Defs>
          <SvgText
            x="50%"
            y="30"
            textAnchor="middle"
            fontSize={28}
            fontWeight="900"
            fontStyle="italic"
            letterSpacing={-0.5}
            fontFamily="Outfit"
            fill="url(#wordmarkGradient)"
          >
            CLOUD DRIVE
          </SvgText>
        </Svg>
      </View>
      {subtitle ? (
        <Text size="sm" className="text-white/50 text-center mt-xs">
          {subtitle}
        </Text>
      ) : null}
    </View>
  );
}
