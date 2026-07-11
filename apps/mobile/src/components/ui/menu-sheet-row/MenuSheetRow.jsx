import React from "react";
import { ActivityIndicator, Pressable, View } from "react-native";

// Components
import Text from "@components/ui/text/Text";

// Theme
import { useTheme } from "@theme/useTheme";

const tintBgClasses = {
  primary: "bg-primary-subtle",
  alt: "bg-alt-subtle",
  success: "bg-success-subtle",
  warning: "bg-warning-subtle",
  danger: "bg-danger-subtle",
  neutral: "bg-neutral-subtle",
};

/**
 * @param {import('react').ComponentType} icon    - Lucide icon component
 * @param {string} label
 * @param {() => void} [onPress=()=>{}]
 * @param {boolean} [loading=false]
 * @param {boolean} [disabled=false]
 * @param {boolean} [danger=false]                  - Renders the label in the danger color
 * @param {'primary'|'alt'|'success'|'warning'|'danger'|'neutral'} [tint='neutral'] - Icon avatar tint
 */
export default function MenuSheetRow({
  icon: Icon,
  label = "",
  onPress = () => {},
  loading = false,
  disabled = false,
  danger = false,
  tint = "neutral",
}) {
  const { colors } = useTheme();
  const isDisabled = disabled || loading;
  const tintBgClass = tintBgClasses[tint] ?? tintBgClasses.neutral;
  const iconColor = colors[tint]?.DEFAULT ?? colors.neutral.DEFAULT;

  return (
    <Pressable
      onPress={!isDisabled ? onPress : undefined}
      pointerEvents={isDisabled ? "none" : "auto"}
      className={`flex-row items-center gap-3 py-2 px-1 rounded-xl active:bg-neutral-subtle ${isDisabled ? "opacity-40" : ""}`}
    >
      <View className={`w-9 h-9 rounded-full items-center justify-center ${tintBgClass}`}>
        {loading ? <ActivityIndicator size="small" color={iconColor} /> : <Icon size={18} color={iconColor} />}
      </View>
      <Text className={danger ? "text-danger" : ""}>{label}</Text>
    </Pressable>
  );
}
