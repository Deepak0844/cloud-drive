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
import FilesBrowserContent from "./components/FilesBrowserContent";

export default function FolderScreen({ navigation = {}, route = {} }) {
  const { folderId, folderName = "Folder", path } = route.params ?? {};
  const { colors } = useTheme();

  // Older call sites navigate without a path; fall back to a single segment.
  const breadcrumbPath = path ?? [{ id: folderId, name: folderName }];

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
        title={folderName}
        onBack={() => navigation.goBack()}
        right={headerRight}
        accentColor={colors.primary.DEFAULT}
      />
      <FilesBrowserContent folderId={folderId} path={breadcrumbPath} navigation={navigation} />
    </ScreenLayout>
  );
}
