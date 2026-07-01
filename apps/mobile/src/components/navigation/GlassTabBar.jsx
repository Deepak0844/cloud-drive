import React from "react";
import { View, Pressable } from "react-native";
import { BlurView } from "expo-blur";
import { useSafeAreaInsets } from "react-native-safe-area-context";

// Theme
import { useTheme } from "@theme/useTheme";

// Components
import Text from "@components/ui/text/Text";

/**
 * Custom bottom tab bar with BlurView glass surface.
 * Adapts to dark/light mode via the active theme tokens.
 * Pass to BottomTab.Navigator as the `tabBar` prop.
 */
export default function GlassTabBar({ state = { routes: [], index: 0 }, descriptors = {}, navigation = null }) {
  const { glass = {}, colors = {} } = useTheme();
  const { blurIntensity, tint } = glass.bar;
  const insets = useSafeAreaInsets();

  return (
    <BlurView
      intensity={blurIntensity}
      tint={tint}
      style={{ paddingBottom: insets.bottom }}
      className="border-t border-glass-bar-border"
    >
      <View className="flex-row">
        {state.routes.map((route, index) => {
          const { options } = descriptors[route.key];
          const label = options.tabBarLabel ?? options.title ?? route.name;
          const isFocused = state.index === index;
          const activeColor = options.tabBarActiveTintColor ?? colors.primary.DEFAULT;
          const iconColor = isFocused ? activeColor : colors.neutral.DEFAULT;

          function onPress() {
            const event = navigation.emit({
              type: "tabPress",
              target: route.key,
              canPreventDefault: true,
            });
            if (!isFocused && !event.defaultPrevented) {
              navigation.navigate(route.name);
            }
          }

          function onLongPress() {
            navigation.emit({ type: "tabLongPress", target: route.key });
          }

          return (
            <Pressable
              key={route.key}
              onPress={onPress}
              onLongPress={onLongPress}
              className="flex-1 items-center justify-center py-2 gap-0.5"
              android_ripple={{ color: colors.ripple.glass }}
            >
              {options.tabBarIcon?.({ color: iconColor, size: 22, focused: isFocused })}
              <Text size="xs" style={{ color: iconColor }} numberOfLines={1}>
                {label}
              </Text>
            </Pressable>
          );
        })}
      </View>
    </BlurView>
  );
}
