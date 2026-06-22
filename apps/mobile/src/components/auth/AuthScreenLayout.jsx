import React from "react";
import { View, ScrollView, KeyboardAvoidingView } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

// Constants
import { KeyboardBehavior } from "@constants/generalConstants";

/**
 * Root layout shell shared by all auth screens.
 * Composes the safe area, keyboard avoidance, and scroll container over the
 * persistent aurora backdrop that AuthNavigator renders behind the stack.
 * @param {{ children: React.ReactNode }} props
 */
export default function AuthScreenLayout({ children }) {
  return (
    <View className="flex-1 bg-transparent">
      <SafeAreaView className="flex-1 bg-transparent" edges={["top", "bottom"]}>
        <KeyboardAvoidingView className="flex-1 bg-transparent" behavior={KeyboardBehavior}>
          <ScrollView
            className="bg-transparent"
            contentContainerClassName="grow justify-center px-xl py-3xl gap-2xl"
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
