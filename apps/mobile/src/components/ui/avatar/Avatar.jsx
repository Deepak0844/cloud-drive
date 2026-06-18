import React from "react";
import { View, Image, Text as RNText } from "react-native";

const sizeClasses = {
  sm: "w-8 h-8",
  md: "w-10 h-10",
  lg: "w-14 h-14",
  xl: "w-[72px] h-[72px]",
};

/**
 * @param {string}  [src='']           - Image URI; takes priority over icon and initials
 * @param {string}  [initials='?']     - 1–2 letter fallback text; shown when no src or icon
 * @param {import('react').ReactElement} [icon=null] - Icon element fallback; shown when no src
 * @param {'sm'|'md'|'lg'|'xl'} [size='md']         - Circle diameter
 * @param {string}  [className='']                   - Extra NativeWind classes applied to the root View
 */
export default function Avatar({ src = "", initials = "?", icon = null, size = "md", className = "" }) {
  const sizeClass = sizeClasses[size] ?? sizeClasses.md;

  return (
    <View
      className={`${sizeClass} rounded-full overflow-hidden items-center justify-center bg-primary-subtle ${className}`}
    >
      {src ? (
        <Image source={{ uri: src }} className="w-full h-full" resizeMode="cover" />
      ) : icon ? (
        <View className="items-center justify-center">{icon}</View>
      ) : (
        <RNText className="text-primary-dark font-semibold font-sans">{initials}</RNText>
      )}
    </View>
  );
}
