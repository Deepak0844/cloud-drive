import React from "react";
import { View, useWindowDimensions } from "react-native";
import Svg, { Defs, RadialGradient, Stop, Rect } from "react-native-svg";

// Theme
import { useTheme } from "@theme/useTheme";

// Aurora gradient stops (sourced from the generic palette):
//   primary.DEFAULT – radial at top-centre (web: 25% opacity → 30% on mobile for visibility)
//   alt.DEFAULT     – radial at top-right  (web: 15% opacity → 20% on mobile)
//   accent.pink     – subtle bottom-left accent (mobile-only; adds depth on a full-bleed screen)
export default function AuroraBackground() {
  const { width, height } = useWindowDimensions();
  const { colors } = useTheme();

  return (
    <View className="absolute inset-0">
      <Svg width={width} height={height}>
        <Defs>
          <RadialGradient id="av" cx={width * 0.5} cy={-height * 0.05} r={width * 0.8} gradientUnits="userSpaceOnUse">
            <Stop offset="0%" stopColor={colors.primary.DEFAULT} stopOpacity="0.30" />
            <Stop offset="100%" stopColor={colors.primary.DEFAULT} stopOpacity="0" />
          </RadialGradient>
          <RadialGradient id="ac" cx={width * 0.85} cy={height * 0.18} r={width * 0.55} gradientUnits="userSpaceOnUse">
            <Stop offset="0%" stopColor={colors.alt.DEFAULT} stopOpacity="0.20" />
            <Stop offset="100%" stopColor={colors.alt.DEFAULT} stopOpacity="0" />
          </RadialGradient>
          <RadialGradient id="ap" cx={width * 0.15} cy={height * 0.92} r={width * 0.5} gradientUnits="userSpaceOnUse">
            <Stop offset="0%" stopColor={colors.accent.pink} stopOpacity="0.15" />
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
