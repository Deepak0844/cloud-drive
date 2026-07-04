import React from "react";
import { View, ScrollView, KeyboardAvoidingView } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

// Constants
import { KeyboardBehavior } from "@constants/generalConstants";

/**
 * Root layout shell shared by all auth screens.
 * Composes the safe area, keyboard avoidance, and scroll container over the
 * persistent aurora backdrop that AuthNavigator renders behind the stack.
 * @param {{ children: React.ReactNode, centered?: boolean }} props
 * @param {boolean} [centered=true] - Vertically centers the whole children block (brand+card
 * screens). Set false for screens whose last child should stretch to fill the remaining space
 * instead (e.g. a top-pinned header + flex-1 card).
 */
export default function AuthScreenLayout({ children, centered = true }) {
  return (
    <View className="flex-1 bg-transparent">
      <SafeAreaView className="flex-1 bg-transparent" edges={["top", "bottom"]}>
        <KeyboardAvoidingView className="flex-1 bg-transparent" behavior={KeyboardBehavior}>
          <ScrollView
            className="bg-transparent"
            contentContainerClassName={`grow ${centered ? "justify-center" : ""} px-xl py-3xl gap-2xl`}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
            {children}
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </View>
  );
}
