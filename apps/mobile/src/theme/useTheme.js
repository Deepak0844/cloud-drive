import { useContext } from "react";
import { useColorScheme } from "nativewind";
import ThemeContext from "@providers/ThemeContext";

export function useTheme() {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error("useTheme must be used within ThemeProvider");
  return ctx;
}

export function useToggleColorScheme() {
  const { setColorScheme, colorScheme } = useColorScheme();
  return {
    colorScheme,
    toggle: () => setColorScheme(colorScheme === "dark" ? "light" : "dark"),
    setColorScheme,
  };
}
