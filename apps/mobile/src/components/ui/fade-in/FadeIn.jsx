import React, { useEffect } from "react";
import Animated, { useSharedValue, useAnimatedStyle, withDelay, withTiming } from "react-native-reanimated";
import { useTheme } from "@providers/useTheme";

/**
 * @param {import('react').ReactNode} [children=null] - Content to fade in
 * @param {number}  [duration=0]                      - Animation duration in ms; 0 falls back to theme `animations.duration.normal`
 * @param {number}  [delay=0]                         - Delay before the fade starts, in ms
 * @param {import('react-native').ViewStyle} [style={}] - Inline style forwarded to the Animated.View
 */
export default function FadeIn({ children = null, duration = 0, delay = 0, style = {} }) {
  const { animations } = useTheme();
  const resolvedDuration = duration || animations.duration.normal;
  const opacity = useSharedValue(0);

  useEffect(() => {
    opacity.value = 0;
    opacity.value = withDelay(delay, withTiming(1, { duration: resolvedDuration }));
  }, [resolvedDuration, delay]);

  const animatedStyle = useAnimatedStyle(() => ({ opacity: opacity.value }));

  return <Animated.View style={[animatedStyle, style]}>{children}</Animated.View>;
}
