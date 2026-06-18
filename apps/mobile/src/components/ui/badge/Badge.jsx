import React from "react";
import { View, Text as RNText } from "react-native";

const variantClasses = {
  primary: { container: "bg-primary-subtle", text: "text-primary-dark font-sans" },
  success: { container: "bg-success-subtle", text: "text-success-dark font-sans" },
  warning: { container: "bg-warning-subtle", text: "text-warning-dark font-sans" },
  danger: { container: "bg-danger-subtle", text: "text-danger-dark font-sans" },
  neutral: { container: "bg-neutral-subtle", text: "text-neutral-dark font-sans" },
};

const sizeClasses = {
  sm: { container: "px-2 py-0.5 rounded-full", text: "text-xs" },
  md: { container: "px-3 py-1 rounded-full", text: "text-sm" },
};

/**
 * @param {'primary'|'success'|'warning'|'danger'|'neutral'} [variant='primary'] - Color scheme
 * @param {'sm'|'md'} [size='md']         - Pill size
 * @param {import('react').ReactNode} [children=null] - Label text
 * @param {string}  [className='']                   - Extra NativeWind classes applied to the root View
 */
export default function Badge({ variant = "primary", size = "md", children = null, className = "" }) {
  const variantClass = variantClasses[variant] ?? variantClasses.primary;
  const sizeClass = sizeClasses[size] ?? sizeClasses.md;

  return (
    <View className={`self-start ${sizeClass.container} ${variantClass.container} ${className}`}>
      <RNText className={`font-semibold ${sizeClass.text} ${variantClass.text}`}>{children}</RNText>
    </View>
  );
}
