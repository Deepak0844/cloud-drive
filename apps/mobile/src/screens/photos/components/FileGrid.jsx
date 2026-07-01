import React from "react";
import { Pressable, Dimensions } from "react-native";

// Hooks
import { useResponsive } from "@hooks/useResponsive";

// Components
import AuthImage from "@components/media/AuthImage";

export default function FileGrid({ file = null, onPress = null }) {
  const { columns } = useResponsive();
  const tileSize = Math.floor(Dimensions.get("window").width / columns) - 2;

  return (
    <Pressable
      onPress={onPress}
      className="m-px overflow-hidden bg-neutral-subtle"
      style={{ width: tileSize, height: tileSize }}
    >
      <AuthImage uri={file?.thumbnailUrl ?? ""} className="absolute inset-0" contentFit="cover" transition={150} />
    </Pressable>
  );
}
