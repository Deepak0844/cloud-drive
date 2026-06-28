import React from "react";
import { BlurView } from "expo-blur";

// Theme
import { useTheme } from "@theme/useTheme";

export default function GlassBottomSheet({ visible = false, children = null }) {
  const { glass } = useTheme();

  if (!visible) {
    return null;
  }
  return (
    <BlurView
      intensity={glass.bar.blurIntensity}
      tint={glass.bar.tint}
      className="absolute bottom-0 left-0 right-0 rounded-t-2xl overflow-hidden border-t border-glass-bar-border"
    >
      {children}
    </BlurView>
  );
}
