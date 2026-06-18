import React, { useEffect } from "react";
import { View } from "react-native";
import { useColorScheme } from "nativewind";

export default function GluestackUIProvider({ mode = "system", children, ...props }) {
  const { setColorScheme } = useColorScheme();

  useEffect(() => {
    setColorScheme(mode);
  }, [mode]);

  return (
    <View style={{ flex: 1 }} {...props}>
      {children}
    </View>
  );
}
