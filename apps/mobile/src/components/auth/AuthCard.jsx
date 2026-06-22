import React from "react";
import { View } from "react-native";

/**
 * Auth Card
 * @param {*} children
 * @returns
 */
export default function AuthCard({ children }) {
  return (
    <View className="bg-glass-surface-bg border border-glass-surface-border rounded-2xl p-2xl overflow-hidden">
      {children}
    </View>
  );
}
