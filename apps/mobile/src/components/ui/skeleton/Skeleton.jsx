import React from "react";
import SkeletonPlaceholder from "react-native-skeleton-placeholder";

// Theme
import { useTheme } from "@theme/useTheme";

/**
 * Wraps children with a shimmer skeleton effect while loading.
 * When loading=true, children's shapes are used as the shimmer mask.
 * When loading=false, children render normally.
 *
 * @param {boolean} [loading=false]              - Show shimmer when true
 * @param {import('react').ReactNode} [children] - Content whose shape defines the skeleton
 */
export default function Skeleton({ loading = false, children = null }) {
  const { colors } = useTheme();

  if (!loading) return children;

  return (
    <SkeletonPlaceholder backgroundColor={colors.neutral.subtle} highlightColor={colors.surface.card} speed={1400}>
      {children}
    </SkeletonPlaceholder>
  );
}
