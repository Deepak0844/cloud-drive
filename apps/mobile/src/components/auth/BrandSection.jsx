import React from "react";
import { View } from "react-native";
import { Cloud } from "lucide-react-native";

// Components
import Text from "@components/ui/text/Text";

/**
 * Aurora-themed brand header shared by all auth screens.
 * Renders the Cloud Drive logo badge, wordmark, and an optional tagline.
 * @param {string} [subtitle=''] - Optional tagline rendered below the wordmark
 */
export default function BrandSection({ subtitle = "" }) {
  return (
    <View className="items-center">
      <View className="w-20 h-20 items-center justify-center bg-white/8 border border-white/[18] rounded-2xl overflow-hidden">
        <Cloud size={34} color="white" strokeWidth={1.5} />
      </View>
      <Text size="3xl" bold className="text-white text-center mt-lg">
        Cloud Drive
      </Text>
      {subtitle ? (
        <Text size="sm" className="text-white/50 text-center mt-xs">
          {subtitle}
        </Text>
      ) : null}
    </View>
  );
}
