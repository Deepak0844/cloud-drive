import React from "react";
import { View, Pressable } from "react-native";
import { DrawerContentScrollView } from "@react-navigation/drawer";
import { BlurView } from "expo-blur";
import { useColorScheme } from "nativewind";

// Rtk
import { useGetQuotaUsageQuery } from "@api/quotaApi";
import { useGetMeQuery } from "@api/authApi";

// Hooks
import { useIsAdmin } from "@hooks/useIsAdmin";

// Theme
import { useTheme } from "@theme/useTheme";

// Utils
import { NumberUtils } from "@shared-utils/utils";

// Components
import Text from "@components/ui/text/Text";

function getActiveRouteName(state, nested) {
  const route = state.routes[state.index];
  if (nested && route.state) {
    return route.state.routes[route.state.index]?.name;
  }
  return route.name;
}

function DrawerNavItem({ icon: Icon, label, accentColor, isActive, onPress }) {
  const { colors } = useTheme();
  const iconColor = isActive ? accentColor : colors.neutral.DEFAULT;

  return (
    <Pressable
      onPress={onPress}
      className="flex-row items-center gap-3 px-4 py-3 rounded-xl mx-2 mb-1"
      style={isActive ? { backgroundColor: `${accentColor}22` } : undefined}
    >
      <Icon size={20} color={iconColor} />
      <Text size="sm" style={isActive ? { color: accentColor, fontWeight: "600" } : { color: colors.neutral.DEFAULT }}>
        {label}
      </Text>
    </Pressable>
  );
}

/**
 * Reusable glass drawer body — item-set agnostic. Rendered for both the tablet
 * drawer (flat: each item is a direct Drawer.Screen) and the phone drawer
 * (nested: items are screens inside the "Root" stack wrapped by the drawer).
 * @param {{screen: string, icon: React.ComponentType, label: string, accentColor: string}[]} items
 * @param {boolean} [nested=false] - True when items live one level inside a wrapped stack ("Root"),
 * as on phone, rather than being direct Drawer.Screens, as on tablet.
 */
export default function GlassDrawerContent({ items, nested = false, ...props }) {
  const { state, navigation } = props;
  const { colors, glass } = useTheme();
  const { colorScheme } = useColorScheme();
  const isAdmin = useIsAdmin();
  const { data: quotaData } = useGetQuotaUsageQuery(undefined, { skip: isAdmin });
  const { data: me } = useGetMeQuery();

  const activeRouteName = getActiveRouteName(state, nested);

  function handleNavigate(screen) {
    if (nested) {
      navigation.navigate("Root", { screen });
    } else {
      navigation.navigate(screen);
    }
  }

  const used = quotaData?.used_bytes ?? 0;
  const total = quotaData?.quota_bytes ?? 1;
  const pct = Math.min((used / total) * 100, 100);

  const initials = me?.name
    ? me.name
        .split(" ")
        .map((w) => w[0])
        .join("")
        .toUpperCase()
        .slice(0, 2)
    : "?";

  const drawerBackground = colorScheme === "dark" ? `${colors.surface.background}F2` : `${colors.surface.card}F6`;

  return (
    <BlurView
      intensity={glass.modal.blurIntensity}
      tint={glass.modal.tint}
      style={{ flex: 1 }}
      className="border-r border-glass-modal-border"
    >
      <DrawerContentScrollView {...props} className="flex-1" style={{ backgroundColor: drawerBackground }}>
        {/* Logo */}
        <View className="px-4 py-5 flex-row items-center gap-3">
          <View className="w-9 h-9 rounded-xl bg-primary/10 items-center justify-center">
            <Text bold className="text-primary">
              C
            </Text>
          </View>
          <Text bold size="lg">
            Cloud Drive
          </Text>
        </View>

        {/* Nav items */}
        <View className="mt-2">
          {items.map(({ screen, icon, label, accentColor }) => (
            <DrawerNavItem
              key={screen}
              icon={icon}
              label={label}
              accentColor={accentColor}
              isActive={activeRouteName === screen}
              onPress={() => handleNavigate(screen)}
            />
          ))}
        </View>

        {/* Storage widget — non-admin only */}
        {!isAdmin && (
          <View className="mx-4 mt-6 p-4 rounded-2xl bg-glass-surface-bg">
            <View className="flex-row justify-between mb-2">
              <Text size="xs" className="text-secondary font-semibold uppercase tracking-wider">
                Storage
              </Text>
              <Text size="xs" className="text-secondary">
                {pct.toFixed(1)}%
              </Text>
            </View>
            <View className="h-1.5 bg-neutral-subtle rounded-full overflow-hidden mb-2">
              <View className="h-full bg-primary rounded-full" style={{ width: `${pct}%` }} />
            </View>
            <Text size="xs" className="text-secondary">
              {NumberUtils.formatBytes(used)} of {NumberUtils.formatBytes(total)}
            </Text>
          </View>
        )}

        {/* User footer */}
        {me ? (
          <View className="flex-row items-center gap-3 px-4 mt-6 pt-4 border-t border-glass-bar-border">
            <View className="w-9 h-9 rounded-full bg-primary/20 items-center justify-center">
              <Text size="xs" bold className="text-primary">
                {initials}
              </Text>
            </View>
            <View className="flex-1">
              <Text size="sm" bold numberOfLines={1}>
                {me.name ?? me.email}
              </Text>
              <Text size="xs" className="text-secondary" numberOfLines={1}>
                {me.email}
              </Text>
            </View>
          </View>
        ) : null}
      </DrawerContentScrollView>
    </BlurView>
  );
}
