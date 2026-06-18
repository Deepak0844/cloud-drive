import React, { useMemo } from "react";
import { View } from "react-native";
import { vars, useColorScheme } from "nativewind";
import { lightColors, darkColors } from "@theme/tokens/colors";
import { typography, spacing, radius, shadows, animations, glass } from "@theme/tokens/tokens";
import ThemeContext from "@providers/ThemeContext";

const buildVars = (c, g) =>
  vars({
    "--primary": c.primary.DEFAULT,
    "--primary-light": c.primary.light,
    "--primary-dark": c.primary.dark,
    "--primary-subtle": c.primary.subtle,
    "--primary-foreground": c.primary.foreground,
    "--secondary": c.secondary.DEFAULT,
    "--secondary-light": c.secondary.light,
    "--secondary-dark": c.secondary.dark,
    "--secondary-subtle": c.secondary.subtle,
    "--secondary-foreground": c.secondary.foreground,
    "--success": c.success.DEFAULT,
    "--success-light": c.success.light,
    "--success-dark": c.success.dark,
    "--success-subtle": c.success.subtle,
    "--success-foreground": c.success.foreground,
    "--danger": c.danger.DEFAULT,
    "--danger-light": c.danger.light,
    "--danger-dark": c.danger.dark,
    "--danger-subtle": c.danger.subtle,
    "--danger-foreground": c.danger.foreground,
    "--warning": c.warning.DEFAULT,
    "--warning-light": c.warning.light,
    "--warning-dark": c.warning.dark,
    "--warning-subtle": c.warning.subtle,
    "--warning-foreground": c.warning.foreground,
    "--alt": c.alt.DEFAULT,
    "--alt-light": c.alt.light,
    "--alt-dark": c.alt.dark,
    "--alt-subtle": c.alt.subtle,
    "--alt-foreground": c.alt.foreground,
    "--neutral": c.neutral.DEFAULT,
    "--neutral-light": c.neutral.light,
    "--neutral-dark": c.neutral.dark,
    "--neutral-subtle": c.neutral.subtle,
    "--neutral-foreground": c.neutral.foreground,
    "--background": c.surface.background,
    "--surface": c.surface.card,
    "--border": c.surface.border,
    "--text": c.surface.text,
    "--text-secondary": c.surface.textSecondary,
    "--text-disabled": c.surface.textDisabled,
    "--glass-card-bg": g.card.background,
    "--glass-card-border": g.card.border,
    "--glass-bar-bg": g.bar.background,
    "--glass-bar-border": g.bar.border,
    "--glass-modal-bg": g.modal.background,
    "--glass-modal-border": g.modal.border,
  });

const lightGlass = { card: glass.card.light, bar: glass.bar.light, modal: glass.modal.light };
const darkGlass = { card: glass.card.dark, bar: glass.bar.dark, modal: glass.modal.dark };

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
