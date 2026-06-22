import React, { useMemo } from "react";
import { View } from "react-native";
import { vars, useColorScheme } from "nativewind";

// Theme
import { lightColors, darkColors } from "@theme/tokens/colors";
import { typography, spacing, radius, shadows, animations, glass } from "@theme/tokens/tokens";

// Providers
import ThemeContext from "@providers/ThemeContext";

function buildVars(colors, glassColors) {
  return vars({
    "--primary": colors.primary.DEFAULT,
    "--primary-light": colors.primary.light,
    "--primary-dark": colors.primary.dark,
    "--primary-subtle": colors.primary.subtle,
    "--primary-foreground": colors.primary.foreground,
    "--secondary": colors.secondary.DEFAULT,
    "--secondary-light": colors.secondary.light,
    "--secondary-dark": colors.secondary.dark,
    "--secondary-subtle": colors.secondary.subtle,
    "--secondary-foreground": colors.secondary.foreground,
    "--success": colors.success.DEFAULT,
    "--success-light": colors.success.light,
    "--success-dark": colors.success.dark,
    "--success-subtle": colors.success.subtle,
    "--success-foreground": colors.success.foreground,
    "--danger": colors.danger.DEFAULT,
    "--danger-light": colors.danger.light,
    "--danger-dark": colors.danger.dark,
    "--danger-subtle": colors.danger.subtle,
    "--danger-foreground": colors.danger.foreground,
    "--warning": colors.warning.DEFAULT,
    "--warning-light": colors.warning.light,
    "--warning-dark": colors.warning.dark,
    "--warning-subtle": colors.warning.subtle,
    "--warning-foreground": colors.warning.foreground,
    "--alt": colors.alt.DEFAULT,
    "--alt-light": colors.alt.light,
    "--alt-dark": colors.alt.dark,
    "--alt-subtle": colors.alt.subtle,
    "--alt-foreground": colors.alt.foreground,
    "--neutral": colors.neutral.DEFAULT,
    "--neutral-light": colors.neutral.light,
    "--neutral-dark": colors.neutral.dark,
    "--neutral-subtle": colors.neutral.subtle,
    "--neutral-foreground": colors.neutral.foreground,
    "--background": colors.surface.background,
    "--surface": colors.surface.card,
    "--border": colors.surface.border,
    "--text": colors.surface.text,
    "--text-secondary": colors.surface.textSecondary,
    "--text-disabled": colors.surface.textDisabled,
    "--glass-card-bg": glassColors.card.background,
    "--glass-card-border": glassColors.card.border,
    "--glass-bar-bg": glassColors.bar.background,
    "--glass-bar-border": glassColors.bar.border,
    "--glass-modal-bg": glassColors.modal.background,
    "--glass-modal-border": glassColors.modal.border,
    "--surface-inverse": colors.surface.inverse,
    "--glass-surface-bg": colors.glass.surface.background,
    "--glass-surface-border": colors.glass.surface.border,
    "--input-placeholder": colors.input.placeholder,
  });
}

const lightGlass = { card: glass.card.light, bar: glass.bar.light, modal: glass.modal.light };
const darkGlass = { card: glass.card.dark, bar: glass.bar.dark, modal: glass.modal.dark };

/**
 * Theme Provider
 * @param {*} children
 * @returns
 */
export default function ThemeProvider({ children }) {
  const { colorScheme } = useColorScheme();
  const isDark = colorScheme === "dark";
  const activeColors = isDark ? darkColors : lightColors;
  const activeGlass = isDark ? darkGlass : lightGlass;
  const themeVars = useMemo(() => buildVars(activeColors, activeGlass), [activeColors, activeGlass]);
  const value = {
    colors: activeColors,
    typography,
    spacing,
    radius,
    shadows,
    animations,
    glass: activeGlass,
    colorScheme,
  };

  return (
    <ThemeContext.Provider value={value}>
      <View style={themeVars} className="flex-1">
        {children}
      </View>
    </ThemeContext.Provider>
  );
}
