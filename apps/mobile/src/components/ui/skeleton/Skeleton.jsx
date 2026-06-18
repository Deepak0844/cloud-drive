import React, { useEffect } from "react";
import Animated, { useSharedValue, useAnimatedStyle, withRepeat, withTiming } from "react-native-reanimated";
import { useTheme } from "@theme/useTheme";

const radiusClassMap = {
  sm: "rounded-sm",
  md: "rounded-md",
  lg: "rounded-lg",
  xl: "rounded-xl",
  full: "rounded-full",
};

/**
 * @param {number|string} [width=0]                        - Width of the placeholder shape
 * @param {number|string} [height=0]                       - Height of the placeholder shape
 * @param {'sm'|'md'|'lg'|'xl'|'full'} [radius='md']      - Border radius of the placeholder
 * @param {import('react-native').ViewStyle} [style={}]    - Additional inline style forwarded to the Animated.View
 */
export default function Skeleton({ width = 0, height = 0, radius: radiusProp = "md", style = {} }) {
  const { animations } = useTheme();
  const opacity = useSharedValue(1);

  useEffect(() => {
    opacity.value = withRepeat(withTiming(0.4, { duration: animations.duration.slower }), -1, true);
  }, []);

  const animatedStyle = useAnimatedStyle(() => ({ opacity: opacity.value }));

  return (
    <Animated.View
      className={`bg-neutral-subtle ${radiusClassMap[radiusProp] ?? "rounded-md"}`}
      style={[animatedStyle, { width, height }, style]}
    />
  );
}
