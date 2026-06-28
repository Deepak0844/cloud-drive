import React from "react";
import { View } from "react-native";

// Components
import GlassCard from "@components/ui/glass/GlassCard";
import Text from "@components/ui/text/Text";

export default function EmptyState({ message = "No items found" }) {
  return (
    <View className="px-4 pt-4">
      <GlassCard>
        <Text size="sm" className="text-secondary text-center">
          {message}
        </Text>
      </GlassCard>
    </View>
  );
}
