import React from "react";
import { View, Text, Pressable } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useDispatch, useSelector } from "react-redux";
import { setColorMode } from "@redux-slices/themeSlice";

const COLOR_MODES = [
  { label: "Light", value: "light" },
  { label: "Dark", value: "dark" },
  { label: "System", value: "system" },
];

export default function SettingsScreen() {
  const dispatch = useDispatch();
  const colorMode = useSelector((s) => s.theme.colorMode);

  return (
    <SafeAreaView className="flex-1">
      <View className="flex-1 items-center justify-center">
        <Text className="text-base mb-3">Theme</Text>
        <View className="flex-row rounded-lg overflow-hidden border border-gray-300">
          {COLOR_MODES.map((mode) => (
            <Pressable
              key={mode.value}
              className={`py-2 px-5 ${colorMode === mode.value ? "bg-blue-500" : "bg-transparent"}`}
              onPress={() => dispatch(setColorMode(mode.value))}
            >
              <Text className={colorMode === mode.value ? "text-white text-sm" : "text-gray-700 text-sm"}>
                {mode.label}
              </Text>
            </Pressable>
          ))}
        </View>
      </View>
    </SafeAreaView>
  );
}
