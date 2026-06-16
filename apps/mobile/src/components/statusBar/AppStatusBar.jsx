import React from "react";
import { StatusBar } from "expo-status-bar";

/**
 * AppStatusBar — centralised status-bar configuration.
 *
 * Variants:
 *   'gradient-dark'  – Transparent, DARK icons.
 *                      Use on screens whose top area is a light/radial gradient
 *                      (e.g. login, sign-up, loan-form pages).
 *
 *   'gradient-light' – Transparent, LIGHT (white) icons.
 *                      Use on screens whose top area is a vivid coloured gradient
 *                      (e.g. HomeScreen, Support screens).
 *
 *   'default'        – Opaque white background, DARK icons.
 *                      Use on plain white screens that should NOT be edge-to-edge.
 */
export default function AppStatusBar({ variant = "default" }) {
  switch (variant) {
    case "gradient-light":
      return <StatusBar translucent backgroundColor="transparent" style="light" />;
    case "gradient-dark":
      return <StatusBar translucent backgroundColor="transparent" style="dark" />;
    default:
      return <StatusBar backgroundColor="#FFFFFF" style="dark" />;
  }
}
