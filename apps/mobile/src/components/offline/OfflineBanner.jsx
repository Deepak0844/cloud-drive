import React from "react";
import { View } from "react-native";
import { WifiOff } from "lucide-react-native";
import { useSelector } from "react-redux";

import Text from "@components/ui/text/Text";

export default function OfflineBanner() {
  const isOnline = useSelector((s) => s.offline.isOnline);

  if (isOnline) {
    return null;
  }

  return (
    <View className="flex-row items-center justify-center gap-2 bg-warning px-4 py-2">
      <WifiOff size={14} color="white" />
      <Text size="xs" className="text-white font-medium">
        {"You're offline — showing cached content"}
      </Text>
    </View>
  );
}
