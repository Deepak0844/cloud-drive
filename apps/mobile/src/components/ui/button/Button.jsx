import React from "react";
import { ActivityIndicator, Pressable, Text as RNText } from "react-native";
import { useTheme } from "@theme/useTheme";

const variantClasses = {
  primary: { container: "bg-primary active:bg-primary-dark", text: "text-primary-foreground font-sans" },
  secondary: { container: "bg-secondary active:bg-secondary-dark", text: "text-secondary-foreground font-sans" },
  danger: { container: "bg-danger active:bg-danger-dark", text: "text-danger-foreground font-sans" },
  ghost: { container: "bg-transparent active:bg-neutral-subtle", text: "text-primary font-sans" },
  outline: {
    container: "bg-transparent border border-primary active:bg-primary-subtle",
    text: "text-primary font-sans",
  },
};

const sizeClasses = {
  sm: { container: "px-3 h-8 rounded-md", text: "text-sm" },
  md: { container: "px-4 h-10 rounded-md", text: "text-base" },
  lg: { container: "px-6 h-12 rounded-lg", text: "text-lg" },
};

/**
 * @param {'primary'|'secondary'|'danger'|'ghost'|'outline'} [variant='primary'] - Visual style
 * @param {'sm'|'md'|'lg'} [size='md']                   - Height and padding scale
 * @param {boolean} [disabled=false]                      - Disables press; reduces opacity
 * @param {boolean} [loading=false]                       - Shows ActivityIndicator; blocks press
 * @param {import('react').ReactElement} [leftIcon=null]   - Icon rendered before the label
 * @param {import('react').ReactElement} [rightIcon=null] - Icon rendered after the label
 * @param {import('react').ReactNode} [children=null]     - Label text or custom content
 * @param {() => void} [onPress=()=>{}]                   - Press handler
 * @param {string}  [className='']                        - Extra NativeWind classes applied to the Pressable
 */
export default function Button({
  variant = "primary",
  size = "md",
  disabled = false,
  loading = false,
  leftIcon = null,
  rightIcon = null,
  children = null,
  onPress = () => {},
  className = "",
  ...props
}) {
  const { colors } = useTheme();
  const variantClass = variantClasses[variant] ?? variantClasses.primary;
  const sizeClass = sizeClasses[size] ?? sizeClasses.md;
  const disabledClass = disabled || loading ? "opacity-50" : "";
  const ripple =
    variant === "primary" || variant === "danger" ? { color: colors.ripple.onDark } : { color: colors.ripple.onLight };
  const spinnerColor =
    variant === "primary" || variant === "secondary" || variant === "danger"
      ? colors[variant].foreground
      : colors.primary.DEFAULT;

  return (
    <Pressable
      onPress={!disabled && !loading ? onPress : undefined}
      className={`flex-row items-center justify-center gap-2 ${sizeClass.container} ${variantClass.container} ${disabledClass} ${className}`}
      android_ripple={ripple}
      {...props}
    >
      {loading ? (
        <ActivityIndicator size="small" color={spinnerColor} />
      ) : (
        <>
          {leftIcon}
          {typeof children === "string" ? (
            <RNText className={`font-semibold ${sizeClass.text} ${variantClass.text}`}>{children}</RNText>
          ) : (
            children
          )}
          {rightIcon}
        </>
      )}
    </Pressable>
  );
}

/**
 * Pre-styled text child for use inside a Button when custom JSX is passed instead of a string label.
 * @param {import('react').ReactNode} [children=null] - Text content
 * @param {string}  [className='']                   - Extra NativeWind classes applied to the Text
 */
export function ButtonText({ children = null, className = "", ...props }) {
  return (
    <RNText className={`font-semibold font-sans ${className}`} {...props}>
      {children}
    </RNText>
  );
}
