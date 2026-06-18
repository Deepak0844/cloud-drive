import React from "react";
import { Text as RNText } from "react-native";

const variantClasses = {
  h1: "text-4xl font-bold leading-tight font-sans",
  h2: "text-3xl font-bold leading-tight font-sans",
  h3: "text-2xl font-semibold leading-snug font-sans",
  h4: "text-xl font-semibold leading-snug font-sans",
  body1: "text-base font-normal leading-normal font-sans",
  body2: "text-sm font-normal leading-normal font-sans",
  caption: "text-xs font-normal leading-normal font-sans",
  label: "text-sm font-medium leading-normal font-sans",
  overline: "text-xs font-semibold leading-normal tracking-wide uppercase font-sans",
};

const colorClasses = {
  primary: "text-primary",
  secondary: "text-text-secondary",
  danger: "text-danger",
  success: "text-success",
  warning: "text-warning",
  alt: "text-alt",
  disabled: "text-text-disabled",
  white: "text-white",
};

const weightClasses = {
  normal: "font-normal",
  medium: "font-medium",
  semibold: "font-semibold",
  bold: "font-bold",
};

const alignClasses = {
  left: "text-left",
  center: "text-center",
  right: "text-right",
};

/**
 * @param {'h1'|'h2'|'h3'|'h4'|'body1'|'body2'|'caption'|'label'|'overline'} [variant=''] - Typography scale; empty string renders unstyled text
 * @param {'primary'|'secondary'|'danger'|'success'|'warning'|'alt'|'disabled'|'white'} [color=''] - Token color; empty string defaults to `text-text`
 * @param {'normal'|'medium'|'semibold'|'bold'} [weight=''] - Overrides the weight set by variant
 * @param {'left'|'center'|'right'} [align='']              - Text alignment; empty string uses inherited alignment
 * @param {import('react-native').TextStyle} [style={}]      - Inline style forwarded to RNText
 * @param {string}  [className='']                           - Extra NativeWind classes applied to the Text
 * @param {import('react').ReactNode} [children=null]        - Text content
 */
export default function Text({
  variant = "",
  color = "",
  weight = "",
  align = "",
  style = {},
  className = "",
  children = null,
  ...props
}) {
  const variantClass = variant ? (variantClasses[variant] ?? "") : "";
  const colorClass = color ? (colorClasses[color] ?? "text-text") : "text-text";
  const weightClass = weight ? (weightClasses[weight] ?? "") : "";
  const alignClass = align ? (alignClasses[align] ?? "") : "";

  return (
    <RNText
      className={`${variantClass} ${colorClass} ${weightClass} ${alignClass} ${className}`.trim()}
      style={style}
      {...props}
    >
      {children}
    </RNText>
  );
}
