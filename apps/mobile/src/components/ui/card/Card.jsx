import React from "react";
import { View, Pressable } from "react-native";
import { useTheme } from "@theme/useTheme";

const variantClasses = {
  elevated: "bg-surface rounded-xl p-4 shadow-md",
  outlined: "bg-background rounded-xl p-4 border border-neutral-light",
  filled: "bg-neutral-subtle rounded-xl p-4",
};

/**
 * @param {'elevated'|'outlined'|'filled'} [variant='elevated'] - Surface style
 * @param {boolean} [pressable=false]        - Renders the card as a Pressable when true
 * @param {() => void} [onPress=()=>{}]      - Press handler; only active when pressable is true
 * @param {import('react-native').ViewStyle} [style={}] - Inline style forwarded to the root element
 * @param {string}  [className='']                      - Extra NativeWind classes applied to the root element
 * @param {import('react').ReactNode} [children=null]   - Card body content
 */
export default function Card({
  variant = "elevated",
  pressable = false,
  onPress = () => {},
  style = {},
  className = "",
  children = null,
  ...rest
}) {
  const { colors } = useTheme();
  const variantClass = variantClasses[variant] ?? variantClasses.elevated;

  if (pressable) {
    return (
      <Pressable
        onPress={onPress}
        className={`${variantClass} ${className}`}
        style={style}
        android_ripple={{ color: colors.ripple.card }}
        {...rest}
      >
        {children}
      </Pressable>
    );
  }

  return (
    <View className={`${variantClass} ${className}`} style={style} {...rest}>
      {children}
    </View>
  );
}
