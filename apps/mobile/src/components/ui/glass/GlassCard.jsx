import React from "react";
import { View, Pressable } from "react-native";
import { BlurView } from "expo-blur";
import { useTheme } from "@theme/useTheme";

/**
 * Frosted-glass card backed by expo-blur. Blur intensity and tint are driven by the active theme.
 * @param {import('react').ReactNode} [children=null]   - Card body content
 * @param {string} [className='']                       - Extra Tailwind classes on the outer container (flex-1, mx-4, etc.)
 * @param {string} [radiusClassName='rounded-lg']         - Corner-radius utility; override for a tighter/looser card
 * @param {import('react-native').ViewStyle} [style={}] - Inline style for dynamic values only (e.g. opacity)
 * @param {boolean} [pressable=false]                   - Wraps content in a Pressable when true
 * @param {() => void} [onPress=()=>{}]                 - Press handler; only active when pressable is true
 */
export default function GlassCard({
  children = null,
  className = "",
  radiusClassName = "rounded-lg",
  style = {},
  pressable = false,
  onPress = () => {},
}) {
  const { colors, glass } = useTheme();
  const { blurIntensity, tint } = glass.card;

  const body = <View className="bg-glass-card-bg p-4">{children}</View>;

  return (
    <View className={`${radiusClassName} border border-glass-card-border overflow-hidden ${className}`} style={style}>
      <BlurView intensity={blurIntensity} tint={tint}>
        {pressable ? (
          <Pressable onPress={onPress} android_ripple={{ color: colors.ripple.glass }}>
            {body}
          </Pressable>
        ) : (
          body
        )}
      </BlurView>
    </View>
  );
}
