import React from "react";
import { Pressable } from "react-native";

const sizeClasses = {
  sm: "w-8 h-8 rounded-full",
  md: "w-10 h-10 rounded-full",
  lg: "w-12 h-12 rounded-full",
};

const variantClasses = {
  primary: "bg-primary active:bg-primary-dark items-center justify-center",
  ghost: "bg-transparent active:bg-neutral-subtle items-center justify-center",
  outline: "bg-transparent border border-neutral-light active:bg-neutral-subtle items-center justify-center",
};

/**
 * @param {import('react').ReactElement} [icon=null] - Icon element to render inside the button
 * @param {() => void} [onPress=()=>{}]        - Press handler
 * @param {'primary'|'ghost'|'outline'} [variant='ghost'] - Visual style
 * @param {'sm'|'md'|'lg'} [size='md']         - Circle diameter
 * @param {boolean} [disabled=false]            - Disables press and reduces opacity
 * @param {string}  [className='']              - Extra NativeWind classes applied to the Pressable
 */
export default function IconButton({
  icon = null,
  onPress = () => {},
  variant = "ghost",
  size = "md",
  disabled = false,
  className = "",
  ...rest
}) {
  const sizeClass = sizeClasses[size] ?? sizeClasses.md;
  const variantClass = variantClasses[variant] ?? variantClasses.ghost;
  const disabledClass = disabled ? "opacity-50" : "";

  return (
    <Pressable
      onPress={!disabled ? onPress : undefined}
      pointerEvents={disabled ? "none" : "auto"}
      className={`${sizeClass} ${variantClass} ${disabledClass} ${className}`}
      {...rest}
    >
      {icon}
    </Pressable>
  );
}
