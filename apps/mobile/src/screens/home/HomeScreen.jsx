import React from "react";
import { Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

export default function HomeScreen() {
  return (
    <SafeAreaView className="flex-1" edges={["top"]}>
      <View className="flex-1 items-center justify-center gap-2 px-6">
        <Text className="text-2xl font-bold text-red-900">Mobile</Text>
        <Text className="text-base text-slate-500">Skeleton app — styled with NativeWind.</Text>
      </View>
    </SafeAreaView>
  );
}
