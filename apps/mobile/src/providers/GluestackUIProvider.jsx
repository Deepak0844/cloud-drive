import React, { useEffect } from "react";
import { View } from "react-native";
import { useColorScheme } from "nativewind";
import { OverlayProvider } from "@gluestack-ui/core/overlay/creator";

export default function GluestackUIProvider({ mode = "system", children, ...props }) {
  const { setColorScheme } = useColorScheme();

  useEffect(() => {
    setColorScheme(mode);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mode]);

  return (
    <View style={{ flex: 1 }} {...props}>
      <OverlayProvider>{children}</OverlayProvider>
    </View>
  );
}
