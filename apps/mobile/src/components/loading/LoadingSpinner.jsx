import React, { useEffect } from "react";
import { View, Text } from "react-native";
import Svg, { Circle } from "react-native-svg";
import Animated, { useSharedValue, useAnimatedStyle, withTiming, withRepeat, Easing } from "react-native-reanimated";

const AnimatedSvg = Animated.createAnimatedComponent(Svg);

/**
 * @param {number} [size=48] - Diameter of the spinner in pixels.
 * @param {string} [color='#E53A48'] - Color of the spinning arc.
 * @param {string} [trackColor='#E0E0E0'] - Color of the background track circle.
 * @param {number} [strokeWidth] - Stroke width; defaults to 12% of size.
 */
export function Spinner({ size = 48, color = "#E53A48", trackColor = "#E0E0E0", strokeWidth }) {
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

      <AnimatedSvg width={size} height={size} className="absolute inset-0" style={animatedStyle}>
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
 * @param {string} [color='#E53A48'] - Color of the spinning arc.
 * @param {string} [trackColor='#E0E0E0'] - Color of the background track circle.
 * @param {number} [size=48] - Diameter of the spinner in pixels.
 */
export const LoadingSpinner = ({ text = "Loading...", color = "#E53A48", trackColor = "#E0E0E0", size = 48 }) => {
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
