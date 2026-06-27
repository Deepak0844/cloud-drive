import React from "react";
import { View } from "react-native";

// Components
import Text from "@components/ui/text/Text";

/**
 * Stub bottom sheet for active upload progress.
 * Real implementation wired in Phase 5 (background transfers).
 */
export default function UploadProgressSheet() {
  return (
    <View className="hidden">
      <Text variant="caption">Upload progress — Phase 5</Text>
    </View>
  );
}
