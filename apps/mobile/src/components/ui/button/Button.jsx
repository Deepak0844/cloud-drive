import React from "react";
import { ActivityIndicator, Pressable, Text, View } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { createButton } from "@gluestack-ui/core/button/creator";
import { tva, withStyleContext, useStyleContext } from "@gluestack-ui/utils/nativewind-utils";
import { cssInterop } from "nativewind";
import { UIIcon } from "@gluestack-ui/core/icon/creator";

// Theme
import { useTheme } from "@theme/useTheme";

const SCOPE = "BUTTON";
const Root = withStyleContext(Pressable, SCOPE);

const UIButton = createButton({
  Root,
  Text,
  Group: View,
  Spinner: ActivityIndicator,
  Icon: UIIcon,
});

cssInterop(UIIcon, {
  className: {
    target: "style",
    nativeStyleToProp: { height: true, width: true, fill: true, color: "classNameColor", stroke: true },
  },
});

const buttonStyle = tva({
  base: "rounded-md flex-row items-center justify-center data-[disabled=true]:opacity-40 gap-2 h-fit",
  variants: {
    variant: {
      default: "bg-primary data-[active=true]:bg-primary-dark",
      destructive: "bg-danger data-[active=true]:bg-danger-dark",
      outline: "border border-border bg-background data-[active=true]:bg-neutral-subtle",
      secondary: "bg-secondary data-[active=true]:bg-secondary-dark",
      ghost: "data-[active=true]:bg-neutral-subtle",
      link: "text-primary",
      gradient: "overflow-hidden",
    },
    size: {
      default: "px-4 py-2",
      sm: "min-h-8 rounded-md px-3",
      lg: "min-h-10 rounded-md px-8",
      icon: "min-h-9 min-w-9",
    },
  },
});

const buttonTextStyle = tva({
  base: "font-sans font-semibold",
  parentVariants: {
    variant: {
      default: "text-primary-foreground",
      destructive: "text-danger-foreground",
      outline: "text-text",
      secondary: "text-secondary-foreground",
      ghost: "text-primary",
      link: "text-primary",
      gradient: "text-primary-foreground",
    },
    size: {
      default: "text-sm",
      sm: "text-xs",
      lg: "text-base",
      icon: "text-sm",
    },
  },
});

const buttonSpinnerStyle = tva({
  base: "",
  parentVariants: {
    size: {
      default: "h-4 w-4",
      sm: "h-4 w-4",
      lg: "h-4 w-4",
      icon: "h-4 w-4",
    },
  },
});

const buttonIconStyle = tva({
  base: "fill-none pointer-events-none shrink-0",
  parentVariants: {
    variant: {
      default: "text-primary-foreground",
      destructive: "text-danger-foreground",
      outline: "text-text",
      secondary: "text-secondary-foreground",
      ghost: "text-primary",
      link: "text-primary",
    },
    size: {
      default: "h-4 w-4",
      sm: "h-4 w-4",
      lg: "h-5 w-5",
      icon: "h-5 w-5",
    },
  },
});

export function Button({ className, variant = "default", size = "default", ...props }) {
  const { colors } = useTheme();

  if (variant === "gradient") {
    return (
      <LinearGradient
        colors={[colors.primary.DEFAULT, colors.alt.DEFAULT]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 0 }}
        className={buttonStyle({ variant, size, class: className })}
      >
        <UIButton
          {...props}
          className="flex-row items-center justify-center gap-2 flex-1 bg-transparent"
          context={{ variant, size }}
        />
      </LinearGradient>
    );
  }
  return (
    <UIButton {...props} className={buttonStyle({ variant, size, class: className })} context={{ variant, size }} />
  );
}

export function ButtonText({ className, size, ...props }) {
  const { size: parentSize, variant: parentVariant } = useStyleContext(SCOPE);
  return (
    <UIButton.Text
      {...props}
      className={buttonTextStyle({
        parentVariants: { size: parentSize, variant: parentVariant },
        size,
        class: className,
      })}
    />
  );
}

export function ButtonSpinner({ className, size, ...props }) {
  const { size: parentSize } = useStyleContext(SCOPE);
  return (
    <UIButton.Spinner
      {...props}
      className={buttonSpinnerStyle({ parentVariants: { size: parentSize }, class: className, size })}
    />
  );
}

export function ButtonIcon({ className, size, ...props }) {
  const { size: parentSize, variant: parentVariant } = useStyleContext(SCOPE);
  return (
    <UIButton.Icon
      {...props}
      className={buttonIconStyle({
        parentVariants: { size: parentSize, variant: parentVariant },
        size,
        class: className,
      })}
    />
  );
}

export function ButtonGroup({
  className,
  space: _space = "md",
  isAttached = false,
  flexDirection = "column",
  ...props
}) {
  return (
    <UIButton.Group
      {...props}
      className={`${flexDirection === "row" ? "flex-row" : "flex-col"} ${isAttached ? "gap-0" : "gap-3"} ${className ?? ""}`}
    />
  );
}

Button.displayName = "Button";
ButtonText.displayName = "ButtonText";
ButtonSpinner.displayName = "ButtonSpinner";
ButtonIcon.displayName = "ButtonIcon";
ButtonGroup.displayName = "ButtonGroup";

export default Button;
