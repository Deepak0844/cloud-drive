import React from "react";
import { View } from "react-native";

/**
 * Auth Card
 * @param {*} children
 * @param {string} [className=''] - Extra classes merged onto the card's root View
 * @returns
 */
export default function AuthCard({ children, className = "" }) {
  return (
    <View
      className={`bg-glass-surface-bg border border-glass-surface-border rounded-2xl p-2xl overflow-hidden ${className}`}
    >
      {children}
    </View>
  );
}
