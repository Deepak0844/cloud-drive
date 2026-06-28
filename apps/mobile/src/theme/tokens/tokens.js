export const typography = {
  fontFamily: {
    sans: "Outfit",
    mono: "Courier New",
  },
  size: {
    xs: 12,
    sm: 14,
    base: 16,
    lg: 18,
    xl: 20,
    "2xl": 24,
    "3xl": 30,
    "4xl": 36,
  },
  weight: {
    regular: "400",
    medium: "500",
    semibold: "600",
    bold: "700",
  },
  lineHeight: {
    tight: 1.25,
    snug: 1.375,
    normal: 1.5,
    relaxed: 1.625,
  },
  styles: {
    h1: { fontSize: 36, fontWeight: "700", lineHeight: 44 },
    h2: { fontSize: 30, fontWeight: "700", lineHeight: 38 },
    h3: { fontSize: 24, fontWeight: "600", lineHeight: 32 },
    h4: { fontSize: 20, fontWeight: "600", lineHeight: 28 },
    body1: { fontSize: 16, fontWeight: "400", lineHeight: 24 },
    body2: { fontSize: 14, fontWeight: "400", lineHeight: 20 },
    caption: { fontSize: 12, fontWeight: "400", lineHeight: 16 },
    label: { fontSize: 14, fontWeight: "500", lineHeight: 20 },
    overline: { fontSize: 12, fontWeight: "600", lineHeight: 16, letterSpacing: 0.5 },
  },
};

export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  "2xl": 24,
  "3xl": 32,
  "4xl": 40,
  "5xl": 48,
};

export const radius = {
  none: 0,
  sm: 4,
  md: 8,
  lg: 12,
  xl: 16,
  "2xl": 24,
  full: 9999,
};

export const shadows = {
  sm: {
    ios: { shadowColor: "#000", shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.08, shadowRadius: 2 },
    android: { elevation: 2 },
  },
  md: {
    ios: { shadowColor: "#000", shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.12, shadowRadius: 4 },
    android: { elevation: 4 },
  },
  lg: {
    ios: { shadowColor: "#000", shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.16, shadowRadius: 8 },
    android: { elevation: 8 },
  },
  xl: {
    ios: { shadowColor: "#000", shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.2, shadowRadius: 16 },
    android: { elevation: 16 },
  },
};

export const animations = {
  duration: {
    instant: 100,
    fast: 150,
    normal: 250,
    slow: 400,
    slower: 600,
  },
  spring: {
    gentle: { damping: 20, stiffness: 150, mass: 1 },
    bouncy: { damping: 12, stiffness: 200, mass: 1 },
    snappy: { damping: 30, stiffness: 400, mass: 1 },
  },
  scale: {
    pressed: 0.97,
    emphasis: 1.02,
  },
};

export const glass = {
  card: {
    light: {
      background: "rgba(255, 255, 255, 0.42)",
      border: "rgba(124, 58, 237, 0.18)",
      blurIntensity: 72,
      tint: "light",
    },
    dark: {
      background: "rgba(255, 255, 255, 0.04)",
      border: "rgba(255, 255, 255, 0.08)",
      blurIntensity: 60,
      tint: "dark",
    },
  },
  bar: {
    light: {
      background: "rgba(255, 255, 255, 0.82)",
      border: "rgba(124, 58, 237, 0.12)",
      blurIntensity: 65,
      tint: "light",
    },
    dark: {
      background: "rgba(15, 23, 42, 0.8)",
      border: "rgba(255, 255, 255, 0.06)",
      blurIntensity: 50,
      tint: "dark",
    },
  },
  modal: {
    light: {
      background: "rgba(255, 255, 255, 0.92)",
      border: "rgba(124, 58, 237, 0.15)",
      blurIntensity: 85,
      tint: "light",
    },
    dark: {
      background: "rgba(15, 23, 42, 0.85)",
      border: "rgba(255, 255, 255, 0.10)",
      blurIntensity: 80,
      tint: "dark",
    },
  },
};
