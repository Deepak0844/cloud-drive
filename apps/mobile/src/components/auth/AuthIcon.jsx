import React from "react";
import { useTheme } from "@theme/useTheme";

/**
 * Renders an icon with the muted on-inverse icon color from the active theme.
 * @param {{ Icon: React.ComponentType, [key: string]: unknown }} props
 */
export default function AuthIcon({ Icon, ...props }) {
  const { colors } = useTheme();
  return <Icon color={colors.surface.iconOnInverse} {...props} />;
}
