import React, { useEffect } from "react";
import { View, Text, StyleSheet } from "react-native";
import { colors } from "@theme/tokens/colors";
import Svg, { Circle } from "react-native-svg";
import Animated, { useSharedValue, useAnimatedStyle, withTiming, withRepeat, Easing } from "react-native-reanimated";

const AnimatedSvg = Animated.createAnimatedComponent(Svg);

/**
 * @param {number} [size=48] - Diameter of the spinner in pixels.
 * @param {string} [color] - Color of the spinning arc. Defaults to `colors.primary.DEFAULT`.
 * @param {string} [trackColor] - Color of the background track circle. Defaults to `colors.neutral.light`.
 * @param {number} [strokeWidth] - Stroke width; defaults to 12% of size.
 */
export function Spinner({ size = 48, color = colors.primary.DEFAULT, trackColor = colors.neutral.light, strokeWidth }) {
  const finalStrokeWidth = strokeWidth ?? size * 0.12;
  const radius = (size - finalStrokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;

  const rotation = useSharedValue(0);

  useEffect(() => {
    rotation.value = withRepeat(
      withTiming(360, {
        duration: Math.max(700, size * 12),
        easing: Easing.linear,
      }),
      -1,
      false
    );
  }, [size]);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ rotate: `${rotation.value}deg` }],
  }));

  return (
    <View className="justify-center items-center" style={{ width: size, height: size }}>
      <Svg width={size} height={size}>
        <Circle cx={size / 2} cy={size / 2} r={radius} stroke={trackColor} strokeWidth={finalStrokeWidth} fill="none" />
      </Svg>

      <AnimatedSvg width={size} height={size} style={[styles.overlay, animatedStyle]}>
        <Circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke={color}
          strokeWidth={finalStrokeWidth}
          fill="none"
          strokeDasharray={`${circumference * 0.5} ${circumference}`}
          strokeLinecap="round"
        />
      </AnimatedSvg>
    </View>
  );
}

/**
 * @param {string} [text='Loading...'] - Message displayed below the spinner.
 * @param {string} [color] - Color of the spinning arc. Defaults to `colors.primary.DEFAULT`.
 * @param {string} [trackColor] - Color of the background track circle. Defaults to `colors.neutral.light`.
 * @param {number} [size=48] - Diameter of the spinner in pixels.
 */
const styles = StyleSheet.create({
  overlay: { position: "absolute", top: 0, left: 0 },
});

export const LoadingSpinner = ({
  text = "Loading...",
  color = colors.primary.DEFAULT,
  trackColor = colors.neutral.light,
  size = 48,
}) => {
  return (
    <View className="absolute inset-0 justify-center items-center">
      <View className="absolute inset-0 bg-black/35" />
      <View className="items-center">
        <Spinner size={size} color={color} trackColor={trackColor} />
        <Text className="mt-3 text-sm text-white">{text}</Text>
      </View>
    </View>
  );
};
