// ─────────────────────────────────────────────────────────────────────────────
// Primitives — the only place raw color literals live. Each value appears once.
// Hue scales follow the Tailwind convention (50 = lightest → 950 = darkest).
// ─────────────────────────────────────────────────────────────────────────────
const palette = {
  white: "#ffffff",
  slate: {
    50: "#f8fafc",
    100: "#f1f5f9",
    200: "#e2e8f0",
    300: "#cbd5e1",
    400: "#94a3b8",
    500: "#64748b",
    600: "#475569",
    700: "#334155",
    800: "#1e293b",
    900: "#0f172a",
  },
  violet: {
    100: "#ede9fe",
    400: "#a78bfa",
    500: "#8b5cf6",
    600: "#7c3aed",
    700: "#6d28d9",
    subtleDark: "#1a0e40", // custom dark-violet tint (not a Tailwind step)
  },
  green: {
    100: "#dcfce7",
    400: "#4ade80",
    500: "#22c55e",
    600: "#16a34a",
    700: "#15803d",
    900: "#14532d",
  },
  red: {
    100: "#fee2e2",
    300: "#fca5a5",
    500: "#ef4444",
    600: "#dc2626",
    700: "#b91c1c",
    950: "#450a0a",
  },
  amber: {
    100: "#fef3c7",
    300: "#fcd34d",
    500: "#f59e0b",
    600: "#d97706",
    700: "#b45309",
    950: "#451a03",
  },
  sky: {
    100: "#e0f2fe",
    300: "#7dd3fc",
    400: "#38bdf8",
    500: "#0ea5e9",
    600: "#0284c7",
    950: "#082f49",
  },
  pink: {
    400: "#f472b6",
    500: "#ec4899",
  },
};

// Named translucent overlays (alpha primitives). Each value appears once.
const alpha = {
  black05: "rgba(0, 0, 0, 0.05)",
  black10: "rgba(0, 0, 0, 0.1)",
  black50: "rgba(0, 0, 0, 0.5)",
  black70: "rgba(0, 0, 0, 0.7)",
  white04: "rgba(255, 255, 255, 0.04)",
  white05: "rgba(255, 255, 255, 0.05)",
  white08: "rgba(255, 255, 255, 0.08)",
  white12: "rgba(255, 255, 255, 0.12)",
  white20: "rgba(255, 255, 255, 0.2)",
  white40: "rgba(255, 255, 255, 0.4)",
  white50: "rgba(255, 255, 255, 0.5)",
};

// ─────────────────────────────────────────────────────────────────────────────
// Semantic tokens — names map onto primitives. Shared values are shared by
// reference, so no raw literal is ever repeated.
// ─────────────────────────────────────────────────────────────────────────────
export const lightColors = {
  primary: {
    DEFAULT: palette.violet[600],
    light: palette.violet[400],
    dark: palette.violet[700],
    subtle: palette.violet[100],
    foreground: palette.white,
  },
  secondary: {
    DEFAULT: palette.slate[700],
    light: palette.slate[500],
    dark: palette.slate[800],
    subtle: palette.slate[100],
    foreground: palette.white,
  },
  success: {
    DEFAULT: palette.green[600],
    light: palette.green[500],
    dark: palette.green[700],
    subtle: palette.green[100],
    foreground: palette.white,
  },
  danger: {
    DEFAULT: palette.red[600],
    light: palette.red[500],
    dark: palette.red[700],
    subtle: palette.red[100],
    foreground: palette.white,
  },
  warning: {
    DEFAULT: palette.amber[600],
    light: palette.amber[500],
    dark: palette.amber[700],
    subtle: palette.amber[100],
    foreground: palette.slate[800],
  },
  alt: {
    DEFAULT: palette.sky[500],
    light: palette.sky[400],
    dark: palette.sky[600],
    subtle: palette.sky[100],
    foreground: palette.white,
  },
  neutral: {
    DEFAULT: palette.slate[500],
    light: palette.slate[300],
    dark: palette.slate[700],
    subtle: palette.slate[100],
    foreground: palette.white,
  },
  surface: {
    background: palette.white,
    card: palette.slate[50],
    border: palette.slate[200],
    text: palette.slate[900],
    textSecondary: palette.slate[500],
    textDisabled: palette.slate[400],
    overlay: alpha.black50,
    inverse: palette.slate[900],
    iconOnInverse: alpha.white50,
  },
  ripple: {
    onDark: alpha.white20,
    onLight: alpha.black10,
    card: alpha.black05,
    glass: alpha.white05,
  },
  accent: {
    pink: palette.pink[500],
  },
  glass: {
    surface: {
      background: alpha.white08,
      border: alpha.white12,
    },
  },
  input: {
    placeholder: alpha.white40,
  },
};

export const darkColors = {
  primary: {
    DEFAULT: palette.violet[500],
    light: palette.violet[400],
    dark: palette.violet[600],
    subtle: palette.violet.subtleDark,
    foreground: palette.white,
  },
  secondary: {
    DEFAULT: palette.slate[400],
    light: palette.slate[300],
    dark: palette.slate[500],
    subtle: palette.slate[800],
    foreground: palette.slate[900],
  },
  success: {
    DEFAULT: palette.green[500],
    light: palette.green[400],
    dark: palette.green[600],
    subtle: palette.green[900],
    foreground: palette.white,
  },
  danger: {
    DEFAULT: palette.red[500],
    light: palette.red[300],
    dark: palette.red[600],
    subtle: palette.red[950],
    foreground: palette.white,
  },
  warning: {
    DEFAULT: palette.amber[500],
    light: palette.amber[300],
    dark: palette.amber[600],
    subtle: palette.amber[950],
    foreground: palette.white,
  },
  alt: {
    DEFAULT: palette.sky[400],
    light: palette.sky[300],
    dark: palette.sky[500],
    subtle: palette.sky[950],
    foreground: palette.white,
  },
  neutral: {
    DEFAULT: palette.slate[400],
    light: palette.slate[300],
    dark: palette.slate[500],
    subtle: palette.slate[800],
    foreground: palette.white,
  },
  surface: {
    background: palette.slate[900],
    card: palette.slate[800],
    border: alpha.white08,
    text: palette.slate[50],
    textSecondary: palette.slate[400],
    textDisabled: palette.slate[600],
    overlay: alpha.black70,
    inverse: palette.slate[900],
    iconOnInverse: alpha.white50,
  },
  ripple: {
    onDark: alpha.white20,
    onLight: alpha.white08,
    card: alpha.white04,
    glass: alpha.white05,
  },
  accent: {
    pink: palette.pink[400],
  },
  glass: {
    surface: {
      background: alpha.white08,
      border: alpha.white12,
    },
  },
  input: {
    placeholder: alpha.white40,
  },
};

export const colors = lightColors;
