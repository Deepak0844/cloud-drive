import React from "react";
import { DrawerActions } from "@react-navigation/native";
import { Menu } from "lucide-react-native";

// Theme
import { useTheme } from "@theme/useTheme";

// Components
import IconButton from "@components/ui/icon-button/IconButton";

/**
 * Hamburger button that opens the nearest ancestor drawer navigator.
 * `DrawerActions.openDrawer()` bubbles up through parent navigators, so this
 * works regardless of how deeply the screen is nested inside stacks/tabs.
 */
export default function DrawerMenuButton({ navigation = {} }) {
  const { colors } = useTheme();
  return (
    <IconButton
      icon={<Menu size={20} color={colors.neutral.DEFAULT} />}
      onPress={() => navigation.dispatch(DrawerActions.openDrawer())}
      variant="ghost"
      size="sm"
    />
  );
}
