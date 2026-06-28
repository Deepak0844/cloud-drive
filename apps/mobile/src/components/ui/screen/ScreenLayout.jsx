import React from "react";
import { SafeAreaView } from "react-native-safe-area-context";

/**
 * Transparent SafeAreaView wrapper. Use `edges` to control which sides get
 * safe-area insets — defaults to top-only so the glass tab bar handles bottom.
 * @param {import('react').ReactNode} children
 * @param {string[]} [edges=['top']]
 * @param {string} [className='']
 */
export default function ScreenLayout({ children = null, edges = ["top"], className = "" }) {
  return (
    <SafeAreaView className={`flex-1 bg-transparent ${className}`} edges={edges}>
      {children}
    </SafeAreaView>
  );
}
