import React from "react";
import { View, Pressable } from "react-native";
import { BlurView } from "expo-blur";
import { useTheme } from "@providers/useTheme";

/**
 * Frosted-glass card backed by expo-blur. Blur intensity and tint are driven by the active theme.
 * @param {import('react').ReactNode} [children=null]  - Card body content
 * @param {import('react-native').ViewStyle} [style={}] - Inline style forwarded to the BlurView
 * @param {boolean} [pressable=false]                   - Wraps content in a Pressable when true
 * @param {() => void} [onPress=()=>{}]                 - Press handler; only active when pressable is true
 */
export default function GlassCard({ children = null, style = {}, pressable = false, onPress = () => {} }) {
  const { colors, glass } = useTheme();
  const { blurIntensity, tint } = glass.card;

  const content = <View className="bg-glass-card-bg border border-glass-card-border rounded-xl p-4">{children}</View>;

  return (
    <BlurView intensity={blurIntensity} tint={tint} className="rounded-xl overflow-hidden" style={style}>
      {pressable ? (
        <Pressable onPress={onPress} android_ripple={{ color: colors.ripple.glass }}>
          {content}
        </Pressable>
      ) : (
        content
      )}
    </BlurView>
  );
}
