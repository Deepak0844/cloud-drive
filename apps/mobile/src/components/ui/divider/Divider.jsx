import React from "react";
import { View } from "react-native";

const spacingClasses = {
  xs: "my-xs",
  sm: "my-sm",
  md: "my-md",
  lg: "my-lg",
  xl: "my-xl",
};

/**
 * @param {'xs'|'sm'|'md'|'lg'|'xl'} [spacingSize='md'] - Vertical margin above and below the rule
 * @param {string}  [className='']                        - Extra NativeWind classes applied to the View
 */
export default function Divider({ spacingSize = "md", className = "" }) {
  const spacingClass = spacingClasses[spacingSize] ?? "my-md";

  return <View className={`h-px bg-border ${spacingClass} ${className}`} />;
}
