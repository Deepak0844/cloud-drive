import React from "react";
import { View, TextInput, Text as RNText, Platform, StyleSheet } from "react-native";
import { useTheme } from "@theme/useTheme";

/**
 * @param {string}  [label='']                         - Label text rendered above the input
 * @param {string}  [error='']                         - Error message shown below the input; also turns the border red
 * @param {string}  [hint='']                          - Helper text shown below the input when there is no error
 * @param {import('react').ReactElement} [leftIcon=null]  - Icon rendered on the left inside the input box
 * @param {import('react').ReactElement} [rightIcon=null] - Icon rendered on the right inside the input box
 * @param {boolean} [disabled=false]                   - Makes the input non-editable and reduces opacity
 * @param {string}  [className='']                     - Extra NativeWind classes applied to the outer View wrapper
 * @param {string}  [inputClassName='']                - Extra NativeWind classes applied to the TextInput
 * @param {string}  [labelClassName='']                - Extra NativeWind classes applied to the label text
 */
export default function Input({
  label = "",
  error = "",
  hint = "",
  leftIcon = null,
  rightIcon = null,
  disabled = false,
  className = "",
  inputClassName = "",
  labelClassName = "",
  ...props
}) {
  const { colors } = useTheme();
  const borderClass = error ? "border-danger" : "border-glass-surface-border";
  const disabledClass = disabled ? "opacity-50" : "";

  return (
    <View className={`gap-1 ${className}`}>
      {label ? (
        <RNText className={`text-sm font-medium leading-normal font-sans text-text ${labelClassName}`}>{label}</RNText>
      ) : null}

      <View
        className={`flex-row items-center bg-glass-surface-bg border rounded-md px-3 h-10 ${borderClass} ${disabledClass}`}
      >
        {leftIcon ? <View className="mr-2">{leftIcon}</View> : null}
        <TextInput
          className={`flex-1 font-sans text-base py-0 text-white ${inputClassName}`}
          textAlignVertical="center"
          style={Platform.OS === "android" ? styles.androidInput : undefined}
          placeholderTextColor={colors.input.placeholder}
          editable={!disabled}
          {...props}
        />
        {rightIcon ? <View className="ml-2">{rightIcon}</View> : null}
      </View>

      {error ? (
        <RNText className="text-xs font-normal leading-normal font-sans text-danger">{error}</RNText>
      ) : hint ? (
        <RNText className="text-xs font-normal leading-normal font-sans text-text-secondary">{hint}</RNText>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  androidInput: { includeFontPadding: false },
});
