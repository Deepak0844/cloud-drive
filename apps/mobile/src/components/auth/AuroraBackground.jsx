import React from "react";
import { View, useWindowDimensions } from "react-native";
import Svg, { Defs, RadialGradient, Stop, Rect } from "react-native-svg";
import { useColorScheme } from "nativewind";

// Theme
import { useTheme } from "@theme/useTheme";

// Dark:  violet 30% / cyan 20% / pink 15% — rich glow on slate-950
// Light: violet 30% / cyan 20% / pink 12% — airy glow on violet-50 tinted bg
export default function AuroraBackground() {
  const { width, height } = useWindowDimensions();
  const { colors } = useTheme();
  const { colorScheme } = useColorScheme();
  const isDark = colorScheme === "dark";

  const opacityViolet = isDark ? "0.30" : "0.30";
  const opacityCyan = isDark ? "0.20" : "0.20";
  const opacityPink = isDark ? "0.15" : "0.12";

  return (
    <View className="absolute inset-0">
      <Svg width={width} height={height}>
        <Defs>
          <RadialGradient id="av" cx={width * 0.5} cy={-height * 0.05} r={width * 0.95} gradientUnits="userSpaceOnUse">
            <Stop offset="0%" stopColor={colors.primary.DEFAULT} stopOpacity={opacityViolet} />
            <Stop offset="100%" stopColor={colors.primary.DEFAULT} stopOpacity="0" />
          </RadialGradient>
          <RadialGradient id="ac" cx={width * 0.85} cy={height * 0.18} r={width * 0.65} gradientUnits="userSpaceOnUse">
            <Stop offset="0%" stopColor={colors.alt.DEFAULT} stopOpacity={opacityCyan} />
            <Stop offset="100%" stopColor={colors.alt.DEFAULT} stopOpacity="0" />
          </RadialGradient>
          <RadialGradient id="ap" cx={width * 0.15} cy={height * 0.92} r={width * 0.6} gradientUnits="userSpaceOnUse">
            <Stop offset="0%" stopColor={colors.accent.pink} stopOpacity={opacityPink} />
            <Stop offset="100%" stopColor={colors.accent.pink} stopOpacity="0" />
          </RadialGradient>
        </Defs>
        <Rect x={0} y={0} width={width} height={height} fill="url(#av)" />
        <Rect x={0} y={0} width={width} height={height} fill="url(#ac)" />
        <Rect x={0} y={0} width={width} height={height} fill="url(#ap)" />
      </Svg>
    </View>
  );
}
