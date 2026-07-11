import React from "react";
import { Search } from "lucide-react-native";

// Constants
import { AppScreens } from "@constants/appScreens";

// Theme
import { useTheme } from "@theme/useTheme";

// Components
import ScreenLayout from "@components/ui/screen/ScreenLayout";
import GlassHeader from "@components/ui/header/GlassHeader";
import IconButton from "@components/ui/icon-button/IconButton";
import DrawerMenuButton from "@components/ui/glass/DrawerMenuButton";
import FilesBrowserContent from "./components/FilesBrowserContent";

export default function MyFilesScreen({ navigation = {} }) {
  const { colors } = useTheme();

  const headerRight = (
    <IconButton
      icon={<Search size={20} color={colors.neutral.DEFAULT} />}
      onPress={() => navigation.navigate(AppScreens.SEARCH)}
      variant="ghost"
      size="sm"
    />
  );

  return (
    <ScreenLayout>
      <GlassHeader
        title="My Files"
        left={<DrawerMenuButton navigation={navigation} />}
        right={headerRight}
        accentColor={colors.primary.DEFAULT}
      />
      <FilesBrowserContent folderId={null} path={[]} navigation={navigation} />
    </ScreenLayout>
  );
}
